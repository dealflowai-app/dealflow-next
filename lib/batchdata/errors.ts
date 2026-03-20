// ─── BatchData Error Types ──────────────────────────────────────────────────

export class BatchDataNotConfiguredError extends Error {
  constructor() {
    super('BatchData not configured — set BATCHDATA_API_KEY environment variable')
    this.name = 'BatchDataNotConfiguredError'
  }
}

export class BatchDataApiError extends Error {
  status: number
  endpoint: string
  code: string | undefined

  constructor(message: string, status: number, endpoint: string, code?: string) {
    super(message)
    this.name = 'BatchDataApiError'
    this.status = status
    this.endpoint = endpoint
    this.code = code
  }
}
