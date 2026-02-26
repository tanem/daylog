// Global test setup: fake IndexedDB and DB reset between tests.

import * as fakeIdb from 'fake-indexeddb'
import { beforeEach, vi } from 'vitest'

// The idb library accesses several IDB globals beyond indexedDB itself.
// Stub them all from fake-indexeddb so idb's promise wrappers work.
const IDB_GLOBALS = [
  'IDBCursor',
  'IDBCursorWithValue',
  'IDBDatabase',
  'IDBIndex',
  'IDBKeyRange',
  'IDBObjectStore',
  'IDBOpenDBRequest',
  'IDBRequest',
  'IDBTransaction',
] as const

// Replace the global IndexedDB with a brand-new factory before every test.
// Combined with vi.resetModules() in each test file, this guarantees
// db.ts gets a fresh connection and empty stores per test.
beforeEach(() => {
  vi.stubGlobal('indexedDB', new fakeIdb.IDBFactory())
  for (const name of IDB_GLOBALS) {
    vi.stubGlobal(name, fakeIdb[name])
  }
})
