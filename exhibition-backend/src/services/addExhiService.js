// src/services/addExhiService.js
const prisma = require('../prismaClient');

function safeJsonArray(arr) {
  if (arr === undefined || arr === null) return null;
  if (typeof arr === 'string') {
    // if it's already a JSON string, keep it; if it's a comma-separated string, convert to array
    try {
      JSON.parse(arr);
      return arr;
    } catch {
      // not JSON, split on comma if contains comma
      if (arr.includes(',')) return JSON.stringify(arr.split(',').map(s => s.trim()));
      return JSON.stringify([arr]);
    }
  }
  if (Array.isArray(arr)) return JSON.stringify(arr);
  // fallback: stringify whatever it is
  return JSON.stringify(arr);
}

/**
 * createAddExhi(organizerId, payload)
 * payload expected to contain fields:
 * title, contactPhone, venueAddress, eventImages (array), registrationDocuments (array),
 * eventType, startingTicketPrice, description, totalStalls, amenities (array), location, termsAccepted
 */
// inside src/services/addExhiService.js - replace createAddExhi with this
async function createAddExhi(organizerId, payload) {
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
    termsAccepted
  } = payload || {};

  if (!title) {
    const e = new Error('Missing required field: title');
    e.status = 400;
    throw e;
  }

  // If organizerId was supplied, verify it exists in User table
  let organizerToUse = null;
  if (organizerId) {
    const user = await prisma.user.findUnique({ where: { id: organizerId } });
    if (!user) {
      const e = new Error(`Invalid organizerId: user not found (${organizerId})`);
      e.status = 400;
      throw e;
    }
    organizerToUse = organizerId;
  }

  // Validate images: require >=2 if provided
  if (eventImages) {
    const imgs = Array.isArray(eventImages) ? eventImages : (typeof eventImages === 'string' ? [eventImages] : []);
    if (imgs.length > 0 && imgs.length < 2) {
      const e = new Error('Please upload at least 2 event images');
      e.status = 400;
      throw e;
    }
  }

  const data = {
    title,
    contactPhone: contactPhone ?? null,
    venueAddress: venueAddress ?? null,
    eventImages: safeJsonArray(eventImages),
    registrationDocuments: safeJsonArray(registrationDocuments),
    eventType: eventType ?? null,
    startingTicketPrice: startingTicketPrice ? Number(startingTicketPrice) : null,
    description: description ?? null,
    totalStalls: totalStalls ? Number(totalStalls) : null,
    amenities: safeJsonArray(amenities),
    location: location ?? null,
    termsAccepted: !!termsAccepted,
    organizerId: organizerToUse // either valid id or null
  };

  const record = await prisma.addExhi.create({ data });
  // parse JSON fields for return
  return {
    ...record,
    eventImages: record.eventImages ? JSON.parse(record.eventImages) : [],
    registrationDocuments: record.registrationDocuments ? JSON.parse(record.registrationDocuments) : [],
    amenities: record.amenities ? JSON.parse(record.amenities) : []
  };
}

async function listAddExhi(query = {}) {
  // support optional filters in query (status, organizerId, location)
  const where = {};
  if (query.status) where.status = query.status;
  if (query.organizerId) where.organizerId = query.organizerId;
  if (query.location) where.location = query.location;

  const items = await prisma.addExhi.findMany({
    where,
    orderBy: { createdAt: 'desc' }
  });

  return items.map(r => ({
    ...r,
    eventImages: r.eventImages ? JSON.parse(r.eventImages) : [],
    registrationDocuments: r.registrationDocuments ? JSON.parse(r.registrationDocuments) : [],
    amenities: r.amenities ? JSON.parse(r.amenities) : []
  }));
}

async function getAddExhiById(id) {
  if (!id) return null;
  const r = await prisma.addExhi.findUnique({ where: { id } });
  if (!r) return null;
  return {
    ...r,
    eventImages: r.eventImages ? JSON.parse(r.eventImages) : [],
    registrationDocuments: r.registrationDocuments ? JSON.parse(r.registrationDocuments) : [],
    amenities: r.amenities ? JSON.parse(r.amenities) : []
  };
}

async function updateAddExhi(id, payload) {
  if (!id) {
    const e = new Error('Missing id');
    e.status = 400;
    throw e;
  }

  const data = {};
  const jsonFields = ['eventImages', 'registrationDocuments', 'amenities'];
  const numericFields = ['startingTicketPrice', 'totalStalls'];

  Object.keys(payload || {}).forEach(key => {
    if (jsonFields.includes(key)) {
      data[key] = safeJsonArray(payload[key]);
    } else if (numericFields.includes(key)) {
      data[key] = payload[key] !== undefined ? Number(payload[key]) : undefined;
    } else if (key === 'termsAccepted') {
      data[key] = !!payload[key];
    } else if (['title','contactPhone','venueAddress','eventType','description','location','status','organizerId'].includes(key)) {
      data[key] = payload[key];
    }
  });

  const updated = await prisma.addExhi.update({ where: { id }, data });
  return {
    ...updated,
    eventImages: updated.eventImages ? JSON.parse(updated.eventImages) : [],
    registrationDocuments: updated.registrationDocuments ? JSON.parse(updated.registrationDocuments) : [],
    amenities: updated.amenities ? JSON.parse(updated.amenities) : []
  };
}

async function deleteAddExhi(id) {
  if (!id) {
    const e = new Error('Missing id');
    e.status = 400;
    throw e;
  }
  // hard delete. If you prefer soft delete, add isDeleted flag to schema and update.
  await prisma.addExhi.delete({ where: { id } });
  return;
}

module.exports = { createAddExhi, listAddExhi, getAddExhiById, updateAddExhi, deleteAddExhi };
