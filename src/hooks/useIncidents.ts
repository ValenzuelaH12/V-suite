import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { incidentService } from '../services/incidentService';
import { dbService } from '../lib/db';
import { Incident } from '../types';

export const useIncidents = (hotelId: string | null) => {
  return useQuery<Incident[]>({
    queryKey: ['incidents', hotelId],
    queryFn: () => incidentService.getAll(hotelId),
    enabled: !!hotelId,
  });
};

export const useIncidentMutation = () => {
  const queryClient = useQueryClient();

  const createIncident = useMutation({
    mutationFn: (newIncident: Partial<Incident>) => 
      incidentService.create(newIncident),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin'] });
    },
    onError: async (error: any, variables) => {
      // Si el error parece ser de conexión, guardamos en la cola
      if (error?.message === 'Failed to fetch' || !navigator.onLine) {
        await dbService.addToSyncQueue({
          table: 'incidencias',
          action: 'insert',
          data: variables,
          timestamp: Date.now()
        });
        console.log('[useIncidents] Mutación guardada en cola offline.');
      }
    }
  });

  const updateIncidentStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: any }) =>
      incidentService.updateStatus(id, status as any),
    onSuccess: () => {
      // Invalidar caché local y global
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin'] });
    },
    onError: async (error: any, variables) => {
      if (error?.message === 'Failed to fetch' || !navigator.onLine) {
        await dbService.addToSyncQueue({
          table: 'incidencias',
          action: 'update',
          data: { id: variables.id, status: variables.status },
          timestamp: Date.now()
        });
      }
    }
  });

  const deleteIncident = useMutation({
    mutationFn: (id: string) => incidentService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin'] });
    },
    onError: async (error: any, id: string) => {
      if (error?.message === 'Failed to fetch' || !navigator.onLine) {
        await dbService.addToSyncQueue({
          table: 'incidencias',
          action: 'delete',
          data: { id },
          timestamp: Date.now()
        });
      }
    }
  });

  return { createIncident, updateIncidentStatus, deleteIncident };
};
