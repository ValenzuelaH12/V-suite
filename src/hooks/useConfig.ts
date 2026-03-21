import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { configService } from '../services/configService';
import { dbService } from '../lib/db';
import { Zone, Room, Asset, IncidentType, Profile, Counter } from '../types';

async function withOfflineCache<T>(
  fetchFn: () => Promise<T[]>,
  tableName: string
): Promise<T[]> {
  try {
    const data = await fetchFn();
    await dbService.putBatch(tableName, data);
    return data;
  } catch (err: any) {
    if (err?.message === 'Failed to fetch' || !navigator.onLine) {
      console.warn(`[Offline Cache] Cargando ${tableName} desde local`, err);
      const cached = await dbService.getAll(tableName);
      const queue = await dbService.getSyncQueue();
      const pending = queue.filter(q => q.table === tableName);
      
      return pending.reduce((acc, curr) => {
         if (curr.action === 'insert') {
           return [{ ...curr.data, id: curr.data.id || `temp_${curr.timestamp}` }, ...acc];
         }
         if (curr.action === 'update') {
           const idx = acc.findIndex((i: any) => i.id === curr.data.id);
           if (idx >= 0) acc[idx] = { ...acc[idx], ...curr.data };
         }
         if (curr.action === 'delete') {
           return acc.filter((i: any) => i.id !== curr.data.id);
         }
         return acc;
      }, [...cached]) as T[];
    }
    throw err;
  }
}

export const useUsers = (hotelId: string | null) => {
  return useQuery<Profile[]>({
    queryKey: ['users', hotelId],
    queryFn: () => withOfflineCache(() => configService.getUsers(hotelId), 'perfiles'),
    enabled: !!hotelId,
  });
};

export const useZones = (hotelId: string | null) => {
  return useQuery<Zone[]>({
    queryKey: ['zones', hotelId],
    queryFn: () => withOfflineCache(() => configService.getZones(hotelId), 'zonas'),
    enabled: !!hotelId,
  });
};

export const useRooms = (hotelId: string | null) => {
  return useQuery<Room[]>({
    queryKey: ['rooms', hotelId],
    queryFn: () => withOfflineCache(() => configService.getRooms(hotelId), 'habitaciones'),
    enabled: !!hotelId,
  });
};

export const useAssets = (hotelId: string | null) => {
  return useQuery<Asset[]>({
    queryKey: ['assets', hotelId],
    queryFn: () => withOfflineCache(() => configService.getAssets(hotelId), 'activos'),
    enabled: !!hotelId,
  });
};

export const useIncidentTypes = (hotelId: string | null) => {
  return useQuery<IncidentType[]>({
    queryKey: ['incident-types', hotelId],
    queryFn: () => withOfflineCache(() => configService.getIncidentTypes(hotelId), 'tipos_problemas'),
    enabled: !!hotelId,
  });
};

export const useCounters = (hotelId: string | null) => {
  return useQuery<Counter[]>({
    queryKey: ['counters', hotelId],
    queryFn: () => withOfflineCache(() => configService.getCounters(hotelId), 'contadores'),
    enabled: !!hotelId,
  });
};

export const useConfigMutation = () => {
  const queryClient = useQueryClient();

  const handleQueueMutation = async (error: any, table: string, action: 'insert'|'update'|'delete', data: any, hotelId: string | null = null) => {
    if (error?.message === 'Failed to fetch' || !navigator.onLine) {
      await dbService.addToSyncQueue({
        table,
        action,
        data,
        hotel_id: hotelId || data.hotel_id,
        timestamp: Date.now()
      });
      console.warn(`[useConfigMutation] Guardado en cola offline: ${table} (${action})`);
    }
  };

  const createMutation = useMutation({
    mutationFn: ({ table, data, hotelId }: { table: string; data: any; hotelId: string | null }) => 
      configService.create(table, data, hotelId),
    onSuccess: (_, variables) => {
      const map: Record<string, string> = {
        'zonas': 'zones', 'habitaciones': 'rooms', 'activos': 'assets', 'tipos_problemas': 'incident-types', 'perfiles': 'users'
      };
      if (map[variables.table]) queryClient.invalidateQueries({ queryKey: [map[variables.table]] });
    },
    onError: (error, variables) => handleQueueMutation(error, variables.table, 'insert', variables.data, variables.hotelId)
  });

  const updateMutation = useMutation({
    mutationFn: ({ table, id, data }: { table: string; id: string; data: any }) => 
      configService.update(table, id, data),
    onSuccess: (_, variables) => {
      const map: Record<string, string> = {
        'zonas': 'zones', 'habitaciones': 'rooms', 'activos': 'assets', 'tipos_problemas': 'incident-types', 'perfiles': 'users'
      };
      if (map[variables.table]) queryClient.invalidateQueries({ queryKey: [map[variables.table]] });
    },
    onError: (error, variables) => handleQueueMutation(error, variables.table, 'update', { ...variables.data, id: variables.id })
  });

  const deleteMutation = useMutation({
    mutationFn: ({ table, id }: { table: string; id: string }) => 
      configService.delete(table, id),
    onSuccess: (_, variables) => {
      const map: Record<string, string> = {
        'zonas': 'zones', 'habitaciones': 'rooms', 'activos': 'assets', 'tipos_problemas': 'incident-types', 'perfiles': 'users'
      };
      if (map[variables.table]) queryClient.invalidateQueries({ queryKey: [map[variables.table]] });
    },
    onError: (error, variables) => handleQueueMutation(error, variables.table, 'delete', { id: variables.id })
  });

  return { createMutation, updateMutation, deleteMutation };
};
