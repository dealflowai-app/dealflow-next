import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  // Use DIRECT_URL (session mode, port 5432) - Prisma's pg adapter doesn't work with PgBouncer
  const poolSize = parseInt(process.env.DB_POOL_SIZE || '10', 10) || 10
  const pool = new Pool({
    connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
    max: poolSize,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    ssl: { rejectUnauthorized: false },
  })
  const adapter = new PrismaPg(pool as any)
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

// Cache in all environments to prevent creating multiple pools in serverless
globalForPrisma.prisma = prisma
