import 'dotenv/config'
import { prisma } from '../lib/prisma'

async function main() {
  const count = await prisma.discoveryProperty.count()
  console.log(`Total cached rows: ${count}`)

  if (count > 0) {
    const deleted = await prisma.discoveryProperty.deleteMany()
    console.log(`Deleted all ${deleted.count} stale cached rows`)
    console.log('Fresh searches will re-fetch with correct owner data')
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
