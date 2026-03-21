import { supabase } from '../lib/supabase';

export type AuditAccion = 'CREACION' | 'ACTUALIZACION' | 'ELIMINACION' | 'CAMBIO_ESTADO' | 'LOGIN';
export type AuditEntidad = 'USUARIO' | 'HOTEL' | 'INCIDENCIA' | 'ZONA' | 'ACTIVO' | 'SUMINISTRO' | 'TIPO_INCIDENCIA';

export interface AuditLog {
  id: string;
  created_at: string;
  user_id: string;
  user_nombre?: string;
  hotel_id?: string;
  accion: AuditAccion;
  entidad: AuditEntidad;
  descripcion: string;
  detalles: any;
  ip_address?: string;
}

export const auditService = {
  async log(entry: {
    accion: AuditAccion;
    entidad: AuditEntidad;
    descripcion: string;
    detalles?: any;
    hotel_id?: string;
  }) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Obtener el nombre del usuario si es posible
      const { data: profile } = await supabase
        .from('perfiles')
        .select('nombre, hotel_id')
        .eq('id', user.id)
        .single();

      const { error } = await supabase
        .from('audit_logs')
        .insert([{
          user_id: user.id,
          user_nombre: profile?.nombre || 'SISTEMA',
          hotel_id: entry.hotel_id || profile?.hotel_id,
          accion: entry.accion,
          entidad: entry.entidad,
          descripcion: entry.descripcion,
          detalles: entry.detalles || {},
        }]);

      if (error) console.error('Error recording audit log:', error);
    } catch (e) {
      console.warn('Silent audit log failure (likely table not created yet):', e);
    }
  },

  async getAll(hotelId?: string): Promise<AuditLog[]> {
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (hotelId) {
      query = query.eq('hotel_id', hotelId);
    }

    const { data, error } = await query;
    if (error) {
      // Si la tabla no existe, devolvemos un array vacío en lugar de explotar
      if (error.code === '42P01') return [];
      throw error;
    }
    return data || [];
  }
};
