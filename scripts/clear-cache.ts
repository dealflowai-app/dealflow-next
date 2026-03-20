import { prisma } from '../lib/prisma'

async function main() {
  const count = await prisma.discoveryProperty.count({
    where: {
      OR: [
        { searchCity: 'fullerton' },
        { city: 'Fullerton' },
      ],
    },
  })
  console.log('Fullerton cached rows:', count)

  if (count > 0) {
    const deleted = await prisma.discoveryProperty.deleteMany({
      where: {
        OR: [
          { searchCity: 'fullerton' },
          { city: 'Fullerton' },
        ],
      },
    })
    console.log('Deleted:', deleted.count)
  } else {
    console.log('No rows to delete')
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
