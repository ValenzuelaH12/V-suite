import { supabase } from '../lib/supabase';
import { 
  PreventiveTemplate, 
  PreventiveCategory, 
  PreventiveItem, 
  PreventiveAssignment, 
  PreventiveRevision, 
  PreventiveResult 
} from '../types';

export const preventivoService = {
  // --- GESTIÓN DE PLANTILLAS ---
  
  async getTemplates(hotelId: string): Promise<PreventiveTemplate[]> {
    const { data, error } = await supabase
      .from('preventivo_plantillas')
      .select('*')
      .eq('hotel_id', hotelId)
      .order('nombre');
    if (error) throw error;
    return data || [];
  },

  async getTemplateDetail(templateId: string) {
    const { data, error } = await supabase
      .from('preventivo_plantillas')
      .select(`
        *,
        preventivo_categorias (
          *,
          preventivo_items (
            *
          )
        )
      `)
      .eq('id', templateId)
      .single();
    
    if (error) throw error;
    return data;
  },

  async createTemplate(template: Partial<PreventiveTemplate>, categories: any[]) {
    // 1. Crear plantilla
    const { data: newTemplate, error: tError } = await supabase
      .from('preventivo_plantillas')
      .insert([template])
      .select()
      .single();
    
    if (tError) throw tError;

    // 2. Crear categorías e ítems secuencialmente (para mantener orden)
    for (const cat of categories) {
      const { data: newCat, error: cError } = await supabase
        .from('preventivo_categorias')
        .insert([{ 
          plantilla_id: newTemplate.id, 
          nombre: cat.nombre, 
          orden: cat.orden 
        }])
        .select()
        .single();
      
      if (cError) throw cError;

      if (cat.items && cat.items.length > 0) {
        const itemsToInsert = cat.items.map((item: any) => ({
          categoria_id: newCat.id,
          texto: item.texto,
          tipo_respuesta: item.tipo_respuesta,
          criticidad: item.criticidad,
          orden: item.orden
        }));

        const { error: iError } = await supabase
          .from('preventivo_items')
          .insert(itemsToInsert);
        
        if (iError) throw iError;
      }
    }

    return newTemplate;
  },

  // --- EJECUCIÓN DE REVISIONES ---

  async getPendingRevisions(hotelId: string): Promise<PreventiveRevision[]> {
    const { data, error } = await supabase
      .from('preventivo_revisiones')
      .select(`
        *,
        plantilla:plantilla_id (
          nombre,
          frecuencia
        )
      `)
      .eq('hotel_id', hotelId)
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async startRevision(revisionId: string, userId: string) {
    const { error } = await supabase
      .from('preventivo_revisiones')
      .update({ 
        estado: 'en_proceso',
        ejecutado_por: userId 
      })
      .eq('id', revisionId);
    
    if (error) throw error;
  },

  async submitResults(revisionId: string, results: Partial<PreventiveResult>[]) {
    // 1. Insertar resultados detalle
    const { error: rError } = await supabase
      .from('preventivo_resultados')
      .insert(results.map(r => ({ ...r, revision_id: revisionId })));
    
    if (rError) throw rError;

    // 2. Determinar si hay algún fallo (NOK)
    const hasFailures = results.some(r => r.valor === 'nok' || r.valor === 'no');

    // 3. Finalizar la revisión
    const { error: revError } = await supabase
      .from('preventivo_revisiones')
      .update({ 
        estado: hasFailures ? 'fallida' : 'completada',
        completado_el: new Date().toISOString()
      })
      .eq('id', revisionId);
    
    if (revError) throw revError;

    return { hasFailures };
  },

  // --- ASIGNACIONES ---

  async saveAssignments(templateId: string, hotelId: string, assignments: Partial<PreventiveAssignment>[]) {
    // 1. Limpiar asignaciones previas
    await supabase
      .from('preventivo_asignaciones')
      .delete()
      .eq('plantilla_id', templateId);

    // 2. Insertar nuevas
    const { error } = await supabase
      .from('preventivo_asignaciones')
      .insert(assignments.map(a => ({ ...a, plantilla_id: templateId, hotel_id: hotelId })));
    
    if (error) throw error;
  },

  // --- MOTOR DE GENERACIÓN (AUTOMATIZACIÓN) ---

  async reconcileRevisions(hotelId: string) {
    const { data: templates } = await supabase
      .from('preventivo_plantillas')
      .select('*, preventivo_asignaciones(*)')
      .eq('hotel_id', hotelId);
    
    if (!templates) return;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayISO = todayStart.toISOString();

    for (const template of templates) {
      if (template.frecuencia === 'checkout' || template.frecuencia === 'evento') continue;

      // Lógica de validación por frecuencia
      const now = new Date();
      let shouldGenerate = false;

      if (template.frecuencia === 'diaria') shouldGenerate = true;
      else if (template.frecuencia === 'semanal' && now.getDay() === 1) shouldGenerate = true; // Lunes
      else if (template.frecuencia === 'mensual' && now.getDate() === 1) shouldGenerate = true; // Día 1
      else if (template.frecuencia === 'trimestral' && now.getDate() === 1 && (now.getMonth() % 3 === 0)) shouldGenerate = true;
      else if (template.frecuencia === 'anual' && now.getDate() === 1 && now.getMonth() === 0) shouldGenerate = true;

      if (!shouldGenerate) continue;

      for (const asig of (template.preventivo_asignaciones || [])) {
        if (!asig.entidad_id) continue;

        // Comprobar si ya existe una para el periodo actual
        const { data: existing } = await supabase
          .from('preventivo_revisiones')
          .select('id')
          .eq('plantilla_id', template.id)
          .eq('entidad_id', asig.entidad_id)
          .gte('created_at', todayISO)
          .maybeSingle();

        if (!existing) {
          // Resolver nombre de ubicación
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

          await supabase.from('preventivo_revisiones').insert([{
            hotel_id: hotelId,
            plantilla_id: template.id,
            entidad_tipo: asig.entidad_tipo,
            entidad_id: asig.entidad_id,
            ubicacion_nombre: ubicacionNombre,
            estado: 'pendiente'
          }]);
        }
      }
    }
  }
};
