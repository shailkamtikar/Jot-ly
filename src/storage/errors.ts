export class StorageError extends Error {
  readonly kind: 'quota' | 'unavailable' | 'unknown'
  constructor(kind: StorageError['kind'], message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'StorageError'
    this.kind = kind
  }
}

export function toStorageError(e: unknown): StorageError {
  if (e instanceof StorageError) return e
  const name = (e as { name?: string } | null)?.name
  if (name === 'QuotaExceededError') {
    return new StorageError('quota', 'Storage is full. Export a backup and free some space.', { cause: e })
  }
  return new StorageError('unknown', 'Could not save to this device.', { cause: e })
}
