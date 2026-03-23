import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL
console.log('URL:', url?.replace(/:[^@]+@/, ':***@'))

const pool = new Pool({
  connectionString: url,
  max: 2,
  ssl: { rejectUnauthorized: false },
})

// Test raw pg first
console.log('Testing raw pg...')
pool.query('SELECT 1 as ok')
  .then(r => {
    console.log('Raw pg OK:', r.rows)

    // Now test Prisma adapter
    console.log('Testing Prisma adapter...')
    const adapter = new PrismaPg(pool as any)
    const prisma = new PrismaClient({ adapter })

    return prisma.$queryRawUnsafe('SELECT 1 as ok')
      .then((r: unknown) => console.log('Prisma OK:', r))
      .catch((e: any) => console.error('Prisma error:', e.code, e.message))
      .finally(() => prisma.$disconnect())
  })
  .catch(e => console.error('Raw pg error:', e.message))
  .finally(() => pool.end())
