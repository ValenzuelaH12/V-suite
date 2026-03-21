import { 
  LayoutDashboard, 
  AlertTriangle, 
  Activity, 
  MessageSquare, 
  CalendarDays, 
  Package, 
  Settings,
  ClipboardCheck,
  Zap,
  Globe,
  Calendar
} from 'lucide-react';

export const AVAILABLE_MODULES = [
  { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, desc: 'Vista general y estadísticas' },
  { id: 'incidencias', name: 'Incidencias', icon: AlertTriangle, desc: 'Gestión de reportes y averías' },
  { id: 'inspecciones', name: 'Inspecciones', icon: ClipboardCheck, desc: 'Control de calidad y checklists' },
  { id: 'calendario', name: 'Calendario', icon: CalendarDays, desc: 'Agenda y eventos operativos' },
  { id: 'inventario', name: 'Inventario', icon: Package, desc: 'Control de stock y activos' },
  { id: 'lecturas', name: 'Lecturas', icon: Activity, desc: 'Control de suministros' },
  { id: 'chat', name: 'Chat', icon: MessageSquare, desc: 'Comunicación interna' },
  { id: 'insights', name: 'V-Insights', icon: Zap, desc: 'Inteligencia de datos y reportes' },
  { id: 'cadenas', name: 'Cadenas', icon: Globe, desc: 'Gestión multi-propiedad' },
  { id: 'configuracion', name: 'Configuración', icon: Settings, desc: 'Ajustes del sistema' }
];
