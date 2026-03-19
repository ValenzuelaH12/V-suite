-- FIX: Add unique constraint to avoid ON CONFLICT errors
-- Author: Antigravity
-- Date: 2024-03-19

-- 1. Ensure any duplicate records are cleaned up before adding the constraint
-- (Keeps only the most recent inspection for the same room in the same session)
DELETE FROM public.mantenimiento_entidades a
USING (
    SELECT MIN(ctid) as ctid, ejecucion_id, entidad_id
    FROM public.mantenimiento_entidades
    GROUP BY ejecucion_id, entidad_id
    HAVING COUNT(*) > 1
) b
WHERE a.ejecucion_id = b.ejecucion_id 
AND a.entidad_id = b.entidad_id 
AND a.ctid <> b.ctid;

-- 2. Add the unique constraint
ALTER TABLE public.mantenimiento_entidades
ADD CONSTRAINT unique_inspection_per_session 
UNIQUE (ejecucion_id, entidad_id);

-- 3. Add comment
COMMENT ON CONSTRAINT unique_inspection_per_session ON public.mantenimiento_entidades IS 'Evita registros duplicados para una misma habitación en la misma sesión de ejecución.';
