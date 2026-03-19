-- ELIMINACIÓN DE V-TAKHYIS / V-SUITE (REVERSIÓN TOTAL)

DROP TABLE IF EXISTS public.operacion_alertas CASCADE;
DROP TABLE IF EXISTS public.operacion_registros CASCADE;
DROP TABLE IF EXISTS public.operacion_tareas CASCADE;
DROP TABLE IF EXISTS public.operacion_procedimientos CASCADE;

-- Si se crearon columnas en otras tablas, eliminarlas aquí (en este caso no se agregaron a tablas existentes en el último paso)
