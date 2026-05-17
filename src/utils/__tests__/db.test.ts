import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { WebFxDatabase, __setDbForTesting, getDb } from '../db'
import type { Preset } from '@/types'

function makePreset(id: string, name = 'Test'): Preset {
  return {
    id,
    name,
    type: 'webgpu',
    isCustom: true,
    activeFileName: 'index.html',
    files: {
      'index.html': {
        name: 'index.html',
        content: '<!doctype html><html></html>',
        language: 'html',
        isDirty: false,
      },
    },
  }
}

describe('WebFxDatabase', () => {
  beforeEach(async () => {
    // Reset Dexie state between tests with a fresh DB instance against the
    // fake-indexeddb backing store.
    try {
      await new WebFxDatabase().delete()
    } catch {
      // ignore — DB may not exist on the very first run.
    }
    __setDbForTesting(null)
  })

  it('exposes a customPresets table with the v1 schema', async () => {
    const db = getDb()
    await db.open()
    expect(db.customPresets).toBeDefined()
    const schema = db.customPresets.schema
    expect(schema.primKey.name).toBe('id')
    expect(schema.indexes.map((i) => i.name).sort()).toEqual(['name', 'type'])
  })

  it('round-trips a custom preset put/get', async () => {
    const db = getDb()
    const preset = makePreset('rt-1', 'Round Trip')
    await db.customPresets.put(preset)
    const got = await db.customPresets.get('rt-1')
    expect(got?.name).toBe('Round Trip')
    expect(got?.files['index.html']?.content).toContain('<!doctype html>')
  })

  it('lists multiple presets via toArray', async () => {
    const db = getDb()
    await db.customPresets.put(makePreset('a'))
    await db.customPresets.put(makePreset('b'))
    const rows = await db.customPresets.toArray()
    expect(rows.map((r) => r.id).sort()).toEqual(['a', 'b'])
  })

  it('deletes by id', async () => {
    const db = getDb()
    await db.customPresets.put(makePreset('to-go'))
    await db.customPresets.delete('to-go')
    const got = await db.customPresets.get('to-go')
    expect(got).toBeUndefined()
  })
})
