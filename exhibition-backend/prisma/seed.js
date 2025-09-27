// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// small slugify helper
function slugify(s = '') {
  return String(s)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
    .replace(/\-+/g, '-')
    .replace(/^\-|\-$/g, '');
}

const DEFAULT_LOCATIONS = [
  { name: 'Mumbai' },
  { name: 'Delhi' },
  { name: 'Bengaluru' },
  { name: 'Hyderabad' },
  { name: 'Chennai' },
  { name: 'Kolkata' },
  { name: 'Pune' },
  { name: 'Ahmedabad' }
];

const DEFAULT_EVENT_TYPES = [
  { name: 'Exhibition' },
  { name: 'Conference' },
  { name: 'Workshop' },
  { name: 'Concert' },
  { name: 'Food & Beverage' },
  { name: 'Fashion & Lifestyle' },
  { name: 'Art & Culture' },
  { name: 'Trade Fair' }
];

async function seedEvents() {
  const existing = await prisma.event.findFirst();
  if (existing) {
    console.log('Event already exists:', existing.id);
    return;
  }

  const event = await prisma.event.create({
    data: {
      title: 'Sample Exhibition Event',
      description: 'Seeded event for testing',
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // one week from now
      price: 100.0,
      totalTickets: 500
    }
  });

  console.log('Seeded event id:', event.id);
}

async function seedLocations() {
  console.log('Seeding Locations...');
  for (const loc of DEFAULT_LOCATIONS) {
    const slug = slugify(loc.name);
    await prisma.location.upsert({
      where: { slug },
      update: { name: loc.name, active: true },
      create: { name: loc.name, slug, active: true }
    });
  }
}

async function seedEventTypes() {
  console.log('Seeding EventTypes...');
  for (const et of DEFAULT_EVENT_TYPES) {
    const slug = slugify(et.name);
    await prisma.eventType.upsert({
      where: { slug },
      update: { name: et.name, active: true },
      create: { name: et.name, slug, active: true }
    });
  }
}

async function main() {
  await seedEvents();
  await seedLocations();
  await seedEventTypes();
  console.log('✅ All seeding done.');
}

main()
  .catch(e => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
