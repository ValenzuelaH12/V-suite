import { supabase } from '../lib/supabase';

export const preventivoEngine = {
  _isReconciling: false,

  async reconcileRevisions(hotelId: string) {
    if ((this as any)._isReconciling) return;
    (this as any)._isReconciling = true;

    try {
      // 1. Obtener todas las plantillas y sus asignaciones
      const { data: templates, error: tError } = await supabase
        .from('preventivo_plantillas')
        .select('*, preventivo_asignaciones(*)')
        .eq('hotel_id', hotelId);
      
      if (tError) throw tError;

      // 2. Obtener TODAS las revisiones para determinar duplicados
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayISO = todayStart.toISOString();

      const { data: allRevisions, error: rError } = await supabase
        .from('preventivo_revisiones')
        .select('plantilla_id, entidad_id, created_at')
        .eq('hotel_id', hotelId);
      
      if (rError) throw rError;

      // Sets para búsqueda rápida
      const existingTodaySet = new Set();
      const existingHistorySet = new Set();

      (allRevisions || []).forEach(r => {
        const key = `${r.plantilla_id}-${r.entidad_id}`;
        existingHistorySet.add(key);
        if (r.created_at >= todayISO) {
          existingTodaySet.add(key);
        }
      });

      const now = new Date();
      const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
      const dayOfMonth = now.getDate();
      const month = now.getMonth();

      const revisionsToInsert: any[] = [];

      for (const template of (templates || [])) {
        if (template.frecuencia === 'checkout' || template.frecuencia === 'evento') continue;

        let isCronDue = false;
        if (template.frecuencia === 'diaria') isCronDue = true;
        else if (template.frecuencia === 'semanal' && dayOfWeek === 1) isCronDue = true;
        else if (template.frecuencia === 'mensual' && dayOfMonth === 1) isCronDue = true;
        else if (template.frecuencia === 'trimestral' && dayOfMonth === 1 && (month % 3 === 0)) isCronDue = true;
        else if (template.frecuencia === 'anual' && dayOfMonth === 1 && month === 0) isCronDue = true;

        const asigs = template.preventivo_asignaciones || [];

        for (const asig of asigs) {
          const key = `${template.id}-${asig.entidad_id}`;
          
          if (existingTodaySet.has(key)) continue;

          const isNewAssignment = !existingHistorySet.has(key);

          if (isCronDue || isNewAssignment) {
            let ubicacionNombre = 'Ubicación';
            if (asig.entidad_tipo === 'habitacion') {
              const { data } = await supabase.from('habitaciones').select('nombre').eq('id', asig.entidad_id).single();
              ubicacionNombre = data?.nombre || 'Hab';
            } else if (asig.entidad_tipo === 'zona') {
              const { data } = await supabase.from('zonas').select('nombre').eq('id', asig.entidad_id).single();
              ubicacionNombre = data?.nombre || 'Zona';
            } else if (asig.entidad_tipo === 'activo') {
              const { data } = await supabase.from('activos').select('nombre').eq('id', asig.entidad_id).single();
              ubicacionNombre = data?.nombre || 'Activo';
            }

            revisionsToInsert.push({
              hotel_id: hotelId,
              plantilla_id: template.id,
              entidad_tipo: asig.entidad_tipo,
              entidad_id: asig.entidad_id,
              ubicacion_nombre: ubicacionNombre,
              estado: 'pendiente'
            });

            existingTodaySet.add(key);
          }
        }
      }

      if (revisionsToInsert.length > 0) {
        const { error: insError } = await supabase
          .from('preventivo_revisiones')
          .insert(revisionsToInsert);
        if (insError) throw insError;
      }

    } catch (err) {
      console.error('CRITICAL: Error in reconcileRevisions:', err);
    } finally {
      (this as any)._isReconciling = false;
    }
  }
};
