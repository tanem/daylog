// Global test setup: fake IndexedDB and DB reset between tests.

import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'
import { beforeEach, vi } from 'vitest'

// Replace the global IndexedDB with a brand-new factory before every test.
// Combined with vi.resetModules() in each test file, this guarantees
// db.ts gets a fresh connection and empty stores per test.
beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory())
  vi.stubGlobal('IDBKeyRange', IDBKeyRange)
})
