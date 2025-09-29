// src/services/addExhiService.js
const prisma = require('../prismaClient');

/**
 * Helpers to stringify/parse JSON-like fields stored as strings in DB
 */
function _toJsonString(val) {
  if (val === undefined || val === null) return null;
  if (typeof val === 'string') {
    // if already JSON, keep as-is, otherwise stringify
    try {
      JSON.parse(val);
      return val;
    } catch (e) {
      // not valid JSON -> stringify the value
      return JSON.stringify(val);
    }
  }
  // if object/array -> stringify
  return JSON.stringify(val);
}

function _parseJsonField(val) {
  if (val === undefined || val === null) return null;
  if (typeof val !== 'string') return val;
  try {
    return JSON.parse(val);
  } catch (e) {
    return val;
  }
}

/**
 * List exhibitions
 * options: { organizerId, take, skip, q, status }
 */
async function listAddExhi(options = {}) {
  const { organizerId, take = 100, skip = 0, q, status } = options || {};

  const where = {};
  if (organizerId) where.organizerId = organizerId;
  if (status) where.status = status;
  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } }
    ];
  }

  const items = await prisma.addexhi.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take,
    skip
  });

  // parse json fields
  return items.map((it) => ({
    ...it,
    amenities: _parseJsonField(it.amenities),
    eventImages: _parseJsonField(it.eventImages),
    registrationDocuments: _parseJsonField(it.registrationDocuments)
  }));
}

/**
 * Get single exhibition by id
 */
async function getAddExhiById(id) {
  if (!id) return null;
  const item = await prisma.addexhi.findUnique({ where: { id } });
  if (!item) return null;
  return {
    ...item,
    amenities: _parseJsonField(item.amenities),
    eventImages: _parseJsonField(item.eventImages),
    registrationDocuments: _parseJsonField(item.registrationDocuments)
  };
}

/**
 * Create exhibition
 * payload should contain organizerId (string) if called from controller
 */
async function createAddExhi(payload = {}) {
  const {
    title,
    contactPhone,
    venueAddress,
    registrationDocuments,
    eventTypeId,
    eventType,
    startingTicketPrice,
    description,
    totalStalls,
    amenities,
    locationId,
    location,
    termsAccepted,
    organizerId,
    eventImages,
    status
  } = payload || {};

  if (!title) {
    const e = new Error('title required');
    e.status = 400;
    throw e;
  }

  // Validate referenced lookups if provided
  if (locationId) {
    const loc = await prisma.location.findUnique({ where: { id: locationId } });
    if (!loc) throw Object.assign(new Error('Invalid locationId'), { status: 400 });
  }
  if (eventTypeId) {
    const et = await prisma.eventtype.findUnique({ where: { id: eventTypeId } });
    if (!et) throw Object.assign(new Error('Invalid eventTypeId'), { status: 400 });
  }

  const created = await prisma.addexhi.create({
    data: {
      title,
      contactPhone: contactPhone || null,
      venueAddress: venueAddress || null,
      registrationDocuments: _toJsonString(registrationDocuments),
      eventType: eventType || null,
      eventTypeId: eventTypeId || null,
      startingTicketPrice: startingTicketPrice ?? null,
      description: description || null,
      totalStalls: totalStalls ?? null,
      amenities: _toJsonString(amenities),
      location: location || null,
      locationId: locationId || null,
      termsAccepted: !!termsAccepted,
      organizerId: organizerId || null,
      eventImages: _toJsonString(eventImages),
      status: status || 'DRAFT'
    }
  });

  return {
    ...created,
    amenities: _parseJsonField(created.amenities),
    eventImages: _parseJsonField(created.eventImages),
    registrationDocuments: _parseJsonField(created.registrationDocuments)
  };
}

/**
 * Update exhibition
 * Only organiser (owner) or admin should be allowed in controller; here we check ownership
 */
async function updateAddExhi(id, updates = {}, requestingOrganizerId = null) {
  if (!id) {
    const e = new Error('id required');
    e.status = 400;
    throw e;
  }

  const existing = await prisma.addexhi.findUnique({ where: { id } });
  if (!existing) {
    const e = new Error('Not found');
    e.status = 404;
    throw e;
  }

  // if requestingOrganizerId provided and not admin, check ownership
  if (requestingOrganizerId && existing.organizerId !== requestingOrganizerId) {
    const e = new Error('Forbidden');
    e.status = 403;
    throw e;
  }

  const data = { ...updates };

  // stringify JSON-like fields if provided
  if (updates.amenities !== undefined) data.amenities = _toJsonString(updates.amenities);
  if (updates.eventImages !== undefined) data.eventImages = _toJsonString(updates.eventImages);
  if (updates.registrationDocuments !== undefined) data.registrationDocuments = _toJsonString(updates.registrationDocuments);

  if (updates.startingTicketPrice !== undefined) data.startingTicketPrice = updates.startingTicketPrice === '' ? null : Number(updates.startingTicketPrice);
  if (updates.totalStalls !== undefined) data.totalStalls = updates.totalStalls === '' ? null : parseInt(updates.totalStalls, 10);

  // validate foreign keys if provided
  if (updates.locationId) {
    const loc = await prisma.location.findUnique({ where: { id: updates.locationId } });
    if (!loc) throw Object.assign(new Error('Invalid locationId'), { status: 400 });
  }
  if (updates.eventTypeId) {
    const et = await prisma.eventtype.findUnique({ where: { id: updates.eventTypeId } });
    if (!et) throw Object.assign(new Error('Invalid eventTypeId'), { status: 400 });
  }

  const updated = await prisma.addexhi.update({ where: { id }, data });

  return {
    ...updated,
    amenities: _parseJsonField(updated.amenities),
    eventImages: _parseJsonField(updated.eventImages),
    registrationDocuments: _parseJsonField(updated.registrationDocuments)
  };
}

/**
 * Delete exhibition
 */
async function deleteAddExhi(id) {
  if (!id) {
    const e = new Error('id required');
    e.status = 400;
    throw e;
  }
  // Use hard delete here (or implement soft delete if preferred)
  await prisma.addexhi.delete({ where: { id } });
  return true;
}

module.exports = {
  listAddExhi,
  getAddExhiById,
  createAddExhi,
  updateAddExhi,
  deleteAddExhi
};
