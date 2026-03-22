import { supabase } from '../lib/supabase';
import { 
  PreventiveTemplate, 
  PreventiveRevision, 
  PreventiveResult,
  PreventiveAssignment
} from '../types';

export const preventivoData = {
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
    const { data: newTemplate, error: tError } = await supabase
      .from('preventivo_plantillas')
      .insert([template])
      .select()
      .single();
    
    if (tError) throw tError;

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

  async deleteTemplate(templateId: string) {
    const { error } = await supabase
      .from('preventivo_plantillas')
      .delete()
      .eq('id', templateId);
    
    if (error) throw error;
  },

  async saveAssignments(templateId: string, hotelId: string, assignments: Partial<PreventiveAssignment>[]) {
    await supabase
      .from('preventivo_asignaciones')
      .delete()
      .eq('plantilla_id', templateId);

    const { error } = await supabase
      .from('preventivo_asignaciones')
      .insert(assignments.map(a => ({ ...a, plantilla_id: templateId, hotel_id: hotelId })));
    
    if (error) throw error;
  },

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

  async getRecentRevisions(hotelId: string): Promise<PreventiveRevision[]> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

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
      .neq('estado', 'pendiente')
      .gte('created_at', todayStart.toISOString())
      .order('completado_el', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async getAllCompletedRevisions(hotelId: string): Promise<PreventiveRevision[]> {
    const { data, error } = await supabase
      .from('preventivo_revisiones')
      .select(`
        *,
        plantilla:plantilla_id (
          nombre,
          frecuencia
        ),
        ejecutor:ejecutado_por (
          nombre
        )
      `)
      .eq('hotel_id', hotelId)
      .neq('estado', 'pendiente')
      .order('completado_el', { ascending: false });
    
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
    const { error: rError } = await supabase
      .from('preventivo_resultados')
      .insert(results.map(r => ({ ...r, revision_id: revisionId })));
    
    if (rError) throw rError;

    const hasFailures = results.some(r => r.valor === 'nok' || r.valor === 'no');

    const { error: revError } = await supabase
      .from('preventivo_revisiones')
      .update({ 
        estado: hasFailures ? 'fallida' : 'completada',
        completado_el: new Date().toISOString()
      })
      .eq('id', revisionId);
    
    if (revError) throw revError;

    return { hasFailures };
  }
};
