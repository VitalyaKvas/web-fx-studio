import Dexie, { type Table } from 'dexie'
import type { Preset } from '@/types'

export class WebFxDatabase extends Dexie {
  customPresets!: Table<Preset, string>

  constructor() {
    super('WebFxDB')
    // v1 — initial schema. Never delete or change a shipped version() call.
    this.version(1).stores({
      customPresets: 'id, name, type',
    })
  }
}

let dbInstance: WebFxDatabase | null = null

export function getDb(): WebFxDatabase {
  if (!dbInstance) {
    dbInstance = new WebFxDatabase()
  }
  return dbInstance
}

// Test-only — lets tests inject a fresh DB instance after fake-indexeddb reset.
export function __setDbForTesting(db: WebFxDatabase | null): void {
  dbInstance = db
}
