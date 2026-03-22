import { supabase } from '../lib/supabase';

export const notificationService = {
  /**
   * Envía una notificación persistente a un usuario específico
   */
  async notifyUser(userId: string, title: string, message: string, type: string = 'system', link: string = '') {
    try {
      const { error } = await supabase
        .from('notificaciones')
        .insert({
          user_id: userId,
          title,
          message,
          type,
          link,
          read: false
        });
      
      if (error) throw error;
    } catch (err) {
      console.error('Error enviando notificación persistente:', err);
    }
  },

  /**
   * Notifica a todos los administradores (útil para nuevas incidencias)
   */
  async notifyAdmins(title: string, message: string, type: string = 'incident', link: string = '') {
    try {
      // 1. Obtener IDs de administradores (flexibilidad en el nombre del rol)
      const { data: admins, error: fetchError } = await supabase
        .from('perfiles')
        .select('id, rol')
        .or('rol.eq.admin,rol.eq.super_admin,rol.eq.super-admin');

      console.log('👥 Administradores encontrados para notificar:', admins, fetchError);

      if (!admins || admins.length === 0) {
        console.warn('⚠️ No se encontraron administradores para notificar');
        return;
      }

      // 2. Insertar notificaciones en bloque
      const notifications = admins.map(admin => ({
        user_id: admin.id,
        title,
        message,
        type,
        link,
        read: false
      }));

      const { error } = await supabase
        .from('notificaciones')
        .insert(notifications);

      if (error) throw error;
    } catch (err) {
      console.error('Error notificando a administradores:', err);
    }
  }
};
