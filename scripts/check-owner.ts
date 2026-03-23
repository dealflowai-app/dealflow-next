import 'dotenv/config'
import { prisma } from '../lib/prisma'

async function main() {
  const total = await prisma.discoveryProperty.count()
  const nullOwner = await prisma.discoveryProperty.count({ where: { ownerName: null } })
  console.log('Total:', total, 'Null ownerName:', nullOwner)

  // Check a sample row
  const sample = await prisma.discoveryProperty.findMany({
    take: 3,
    select: { addressLine1: true, city: true, state: true, ownerName: true, rawResponse: true }
  })
  for (const r of sample) {
    const raw = r.rawResponse as any
    const bdOwner = raw?.batchdata?.owner?.fullName
    console.log(`${r.addressLine1}, ${r.city} ${r.state} | DB ownerName: "${r.ownerName}" | BD fullName: "${bdOwner}"`)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
