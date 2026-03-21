import { supabase } from '../lib/supabase';
import { Hotel } from '../types';

export const hotelService = {
  async getAll(): Promise<Hotel[]> {
    const { data, error } = await supabase
      .from('hoteles')
      .select('*')
      .order('nombre');

    if (error) throw error;
    return data || [];
  },

  async create(hotel: Partial<Hotel>): Promise<Hotel> {
    const { data, error } = await supabase
      .from('hoteles')
      .insert([hotel])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Hotel>): Promise<Hotel> {
    const { data, error } = await supabase
      .from('hoteles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getStats(hotelId: string) {
    // Basic stats for the hotel
    const [incidents, inventory, users] = await Promise.all([
      supabase.from('incidencias').select('*', { count: 'exact', head: true }).eq('hotel_id', hotelId),
      supabase.from('inventario').select('*', { count: 'exact', head: true }).eq('hotel_id', hotelId),
      supabase.from('perfiles').select('*', { count: 'exact', head: true }).eq('hotel_id', hotelId)
    ]);

    return {
      incidents: incidents.count || 0,
      inventory: inventory.count || 0,
      users: users.count || 0
    };
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('hoteles')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
