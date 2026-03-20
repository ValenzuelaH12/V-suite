export type UserRole = 'super_admin' | 'admin' | 'direccion' | 'mantenimiento' | 'recepcion' | 'limpieza' | 'gobernanta';

export interface Hotel {
  id: string;
  nombre: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  estado: 'activo' | 'inactivo';
  created_at: string;
}

export interface Profile {
  id: string;
  nombre: string;
  email: string;
  rol: UserRole;
  hotel_id: string;
  avatar_url?: string;
  permisos: string[];
}

export type IncidentStatus = 'pending' | 'in-progress' | 'resolved' | 'cancelled' | 'pendiente' | 'revision' | 'proceso' | 'espera' | 'resuelto';
export type IncidentPriority = 'low' | 'medium' | 'high' | 'urgent' | 'baja' | 'media' | 'alta' | 'urgente';

export interface Incident {
  id: string;
  title: string;
  description?: string;
  descripcion?: string; // Legacy/Spanish name in DB
  location: string;
  status: IncidentStatus;
  priority: IncidentPriority;
  created_at: string;
  created_by?: string;
  reporter_id?: string;
  assigned_to?: string;
  image_url?: string;
  media_urls?: string[];
  zona_id?: string;
  habitacion_id?: string;
  category?: string;
  asset_id?: string;
  activo_id?: string;
  hotel_id?: string;
}

export interface InventoryItem {
  id: string;
  nombre: string;
  categoria: string;
  stock_actual: number;
  stock_minimo: number;
  unidad: string;
  ultima_actualizacion?: string;
  actualizado_por?: string;
  hotel_id?: string;
}

export interface Zone {
  id: string;
  nombre: string;
  descripcion?: string;
}

export interface Room {
  id: string;
  nombre: string;
  zona_id: string;
}

export interface Asset {
  id: string;
  nombre: string;
  tipo: string;
  zona_id: string;
  habitacion_id?: string;
  manual_url?: string;
  especificaciones?: any;
}

export interface Reading {
  id: string;
  contador_id: string;
  valor: number;
  fecha: string;
  registrado_por?: string;
}

export interface Counter {
  id: string;
  nombre: string;
  tipo: 'luz' | 'agua' | 'gas' | 'otros';
}

export interface ActivityLogEvent {
  id: string;
  usuario_id: string;
  accion: string;
  detalles: any;
  created_at: string;
  perfiles?: {
    nombre: string;
    rol: string;
  };
}

export interface NotificationRule {
  enabled: boolean;
  zones: string[]; // 'all' or list of zone IDs
  priorities: string[]; // 'all' or list of priorities ('low', 'medium', 'high', 'urgent')
}

export interface GlobalSettings {
  hotel_name: string;
  currency: string;
  timezone: string;
  logo_url?: string | null;
  welcome_message: string;
  notification_rules?: Record<string, NotificationRule>;
}

export interface IncidentType {
  id: string;
  nombre: string;
  categoria: string;
  hotel_id?: string | null;
  created_at?: string;
}

// --- SISTEMA PREVENTIVO AVANZADO (TIPO TAKHYS) ---

export type PreventiveFrequency = 'diaria' | 'semanal' | 'mensual' | 'trimestral' | 'semestral' | 'anual' | 'evento' | 'checkout';
export type PreventiveTargetType = 'habitacion' | 'zona' | 'activo';
export type PreventiveResponseType = 'ok_nok' | 'si_no' | 'numero' | 'texto';
export type PreventiveCriticality = 'baja' | 'media' | 'alta';
export type PreventiveRevisionStatus = 'pendiente' | 'en_proceso' | 'completada' | 'fallida';

export interface PreventiveTemplate {
  id: string;
  hotel_id: string;
  nombre: string;
  descripcion?: string;
  frecuencia: PreventiveFrequency;
  tipo_objetivo: PreventiveTargetType;
  created_at: string;
  updated_at: string;
}

export interface PreventiveCategory {
  id: string;
  plantilla_id: string;
  nombre: string;
  orden: number;
}

export interface PreventiveItem {
  id: string;
  categoria_id: string;
  texto: string;
  tipo_respuesta: PreventiveResponseType;
  criticidad: PreventiveCriticality;
  orden: number;
}

export interface PreventiveAssignment {
  id: string;
  plantilla_id: string;
  hotel_id: string;
  entidad_tipo: 'habitacion' | 'zona' | 'activo' | 'tipo_habitacion';
  entidad_id?: string;
  entidad_valor?: string;
}

export interface PreventiveRevision {
  id: string;
  plantilla_id: string;
  hotel_id: string;
  entidad_tipo: string;
  entidad_id: string;
  ubicacion_nombre: string;
  estado: PreventiveRevisionStatus;
  ejecutado_por?: string;
  completado_el?: string;
  created_at: string;
  plantilla?: PreventiveTemplate;
}

export interface PreventiveResult {
  id: string;
  revision_id: string;
  item_id: string;
  valor?: string;
  comentario?: string;
  foto_url?: string;
}
