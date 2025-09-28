// src/services/addExhiService.js
const prisma = require('../prismaClient');

function normalizeStringArray(v) {
  if (!v) return null;
  if (Array.isArray(v)) return JSON.stringify(v);
  try {
    return JSON.stringify(JSON.parse(v));
  } catch (e) {
    return JSON.stringify([String(v)]);
  }
}

async function createAddExhi(organizerId, payload) {
  if (!organizerId) {
    const e = new Error('Missing organizerId');
    e.status = 400;
    throw e;
  }

  const {
    title,
    contactPhone,
    venueAddress,
    eventImages,
    registrationDocuments,
    eventType,
    startingTicketPrice,
    description,
    totalStalls,
    amenities,
    location,
    termsAccepted,
    status
  } = payload || {};

  if (!title) {
    const e = new Error('Missing title');
    e.status = 400;
    throw e;
  }

  const newRow = await prisma.addexhi.create({
    data: {
      title,
      contactPhone: contactPhone || null,
      venueAddress: venueAddress || null,
      eventImages: normalizeStringArray(eventImages),
      registrationDocuments: normalizeStringArray(registrationDocuments),
      eventType: eventType || null,
      startingTicketPrice: startingTicketPrice ?? null,
      description: description || null,
      totalStalls: totalStalls ?? null,
      amenities: normalizeStringArray(amenities),
      location: location || null,
      termsAccepted: !!termsAccepted,
      status: status || 'DRAFT',
      organizerId
    }
  });

  return newRow;
}

async function listAddExhi(filters = {}) {
  const where = {};
  if (filters.organizerId) where.organizerId = filters.organizerId;
  // add more filters if you want
  const items = await prisma.addexhi.findMany({ where, orderBy: { createdAt: 'desc' }});
  return items;
}

async function getAddExhiById(id) {
  return await prisma.addexhi.findUnique({ where: { id } });
}

async function updateAddExhi(id, data) {
  return await prisma.addexhi.update({ where: { id }, data });
}

async function deleteAddExhi(id) {
  return await prisma.addexhi.delete({ where: { id } });
}

module.exports = {
  createAddExhi,
  listAddExhi,
  getAddExhiById,
  updateAddExhi,
  deleteAddExhi
};
