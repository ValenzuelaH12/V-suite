import Dexie, { Table } from 'dexie';

export interface OfflineMutation {
  id?: number;
  action: 'insert' | 'update' | 'delete';
  table: string;
  data: any;
  hotel_id: string;
  timestamp: string;
}

export interface OfflineCache {
  id: string; // Puede ser el uuid de Supabase o uno temporal
  table: string;
  data: any;
  hotel_id: string;
  timestamp: string;
}

export class AppDatabase extends Dexie {
  offline_mutations!: Table<OfflineMutation>;
  offline_cache!: Table<OfflineCache>;

  constructor() {
    super('HotelOpsOfflineDB');
    this.version(1).stores({
      offline_mutations: '++id, table, hotel_id, timestamp',
      offline_cache: 'id, table, hotel_id, timestamp'
    });
  }
}

export const db = new AppDatabase();

// Compatibilidad con SyncManager existente y Planificacion
export const dbService = {
  async getSyncQueue(): Promise<OfflineMutation[]> {
    return await db.offline_mutations.toArray();
  },
  async addToSyncQueue(mutation: any) {
    return await db.offline_mutations.add(mutation);
  },
  async removeFromSyncQueue(id: number) {
    await db.offline_mutations.delete(id);
  },
  async getAll(table: string): Promise<any[]> {
    const cached = await db.offline_cache.where('table').equals(table).toArray();
    return cached.map(c => c.data);
  },
  async putBatch(table: string, data: any[]) {
    await db.offline_cache.bulkPut(data.map(d => ({
      id: d.id,
      table,
      data: d,
      hotel_id: d.hotel_id,
      timestamp: new Date().toISOString()
    })));
  }
};

export type { OfflineMutation as OfflineSync };
