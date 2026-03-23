import { prisma } from '../lib/prisma'

const city = process.argv[2]
if (!city) {
  console.log('Usage: npx tsx scripts/clear-cache.ts <city>')
  console.log('Example: npx tsx scripts/clear-cache.ts "Van Buren Township"')
  process.exit(1)
}

async function main() {
  const where = {
    OR: [
      { searchCity: city.toLowerCase() },
      { city: { equals: city, mode: 'insensitive' as const } },
    ],
  }

  const count = await prisma.discoveryProperty.count({ where })
  console.log(`${city} cached rows: ${count}`)

  if (count > 0) {
    const deleted = await prisma.discoveryProperty.deleteMany({ where })
    console.log(`Deleted: ${deleted.count}`)
  } else {
    console.log('No rows to delete')
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
