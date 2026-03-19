import { supabase } from '../lib/supabase';

export interface WaterControlRecord {
  id?: string;
  hotel_id: string;
  fecha: string;
  registrado_por?: string;
  punto_muestreo: string;
  cloro_libre?: number;
  cloro_total?: number;
  ph?: number;
  turbidez?: number;
  temperatura?: number;
  bromo?: number;
  acido_isocianurico?: number;
  notas?: string;
  created_at?: string;
}

export const waterService = {
  async getAll(hotelId: string) {
    let query = supabase
      .from('controles_agua')
      .select(`
        *,
        registrador:perfiles!registrado_por(nombre)
      `)
      .order('fecha', { ascending: false });

    if (hotelId && hotelId !== '00000000-0000-0000-0000-000000000000') {
      query = query.eq('hotel_id', hotelId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async create(record: WaterControlRecord) {
    const { data, error } = await supabase
      .from('controles_agua')
      .insert([record])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('controles_agua')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }
};
