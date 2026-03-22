import { preventivoData } from './preventivoData';
import { preventivoEngine } from './preventivoEngine';
import { PreventiveRevision } from '../types';
import { supabase } from '../lib/supabase';

/**
 * SERVICIO PREVENTIVO (FACADE)
 * Este servicio unifica la gestión de datos y el motor de generación.
 * Se mantiene el nombre histórico para compatibilidad total con el resto de la app.
 */
export const preventivoService = {
  // Delegación de Datos CRUD
  ...preventivoData,

  // Delegación de Motor de Lógica
  ...preventivoEngine,

  // Lógica de presentación / Agrupación (mantenida aquí por ser post-procesamiento de UI)
  async getGroupedHistory(hotelId: string) {
    const revisions = await this.getAllCompletedRevisions(hotelId);
    const groups: Record<string, any> = {};

    revisions.forEach(rev => {
      const dateKey = new Date(rev.created_at).toLocaleDateString();
      const planKey = rev.plantilla_id;
      const groupKey = `${planKey}_${dateKey}`;

      if (!groups[groupKey]) {
        groups[groupKey] = {
          id: groupKey,
          plantilla_id: rev.plantilla_id,
          plantilla_nombre: rev.plantilla?.nombre || 'Plan Eliminado',
          fecha_ciclo: rev.created_at,
          ultima_fecha_completado: rev.completado_el,
          total_tareas: 0,
          tareas_ok: 0,
          tareas_fallidas: 0,
          revision_ids: [],
          ejecutores: new Set()
        };
      }

      const group = groups[groupKey];
      group.total_tareas++;
      if (rev.estado === 'fallida') group.tareas_fallidas++;
      else group.tareas_ok++;
      
      group.revision_ids.push(rev.id);
      if (rev.ejecutor?.nombre) group.ejecutores.add(rev.ejecutor.nombre);
      
      if (new Date(rev.completado_el) > new Date(group.ultima_fecha_completado)) {
        group.ultima_fecha_completado = rev.completado_el;
      }
    });

    return Object.values(groups).sort((a, b) => 
      new Date(b.ultima_fecha_completado).getTime() - new Date(a.ultima_fecha_completado).getTime()
    );
  },

  async getRevisionBulkFullDetail(revisionIds: string[]) {
    // Implementación rápida usando el servicio de datos
    // (A futuro se puede mover a Data si es necesario)
    const { data: revisions, error } = await (this as any)._getFullBulkFromSupabase(revisionIds);
    if (error) throw error;
    return revisions;
  },

  // Helper interno (se mantiene aquí por contexto de unión)
  async _getFullBulkFromSupabase(revisionIds: string[]) {
    return await supabase
      .from('preventivo_revisiones')
      .select(`
        *,
        plantilla:plantilla_id (
          nombre,
          frecuencia,
          preventivo_categorias (
            *,
            preventivo_items (
              *
            )
          )
        ),
        resultados:preventivo_resultados (
          *
        ),
        ejecutor:ejecutado_por (
          nombre
        )
      `)
      .in('id', revisionIds);
  }
};
