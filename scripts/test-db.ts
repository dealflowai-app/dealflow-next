import 'dotenv/config'
import { prisma } from '../lib/prisma'

async function main() {
  console.log('Testing DB connection...')
  const result = await prisma.$queryRawUnsafe('SELECT 1 as ok')
  console.log('DB connected:', JSON.stringify(result))

  const count = await prisma.discoveryProperty.count()
  console.log('Total cached discovery rows:', count)
}

main()
  .catch(e => console.error('DB error:', e.code, e.message))
  .finally(() => prisma.$disconnect())
