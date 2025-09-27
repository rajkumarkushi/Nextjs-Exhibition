// src/services/lookupService.js
const prisma = require('../prismaClient');

// tiny slugify helper (used on create)
const slugify = (s = '') =>
  String(s).trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');

async function listLocations(query = {}) {
  const where = {};
  if (query.active !== undefined) where.active = query.active === 'true';
  if (query.q) where.name = { contains: query.q, mode: 'insensitive' };

  const take = Number(query.take) || 100; // safe default
  return prisma.location.findMany({
    where,
    orderBy: { name: 'asc' },
    take
  });
}

async function getLocationById(id) {
  return prisma.location.findUnique({ where: { id } });
}

async function createLocation(payload) {
  const { name, slug, active } = payload || {};
  if (!name) { const e = new Error('Missing name'); e.status = 400; throw e; }
  const s = slug || slugify(name);
  return prisma.location.create({ data: { name: name.trim(), slug: s, active: active ?? true } });
}

async function updateLocation(id, payload) {
  const { name, slug, active } = payload || {};
  const data = {};
  if (name) data.name = name.trim();
  if (slug) data.slug = slug;
  if (active !== undefined) data.active = !!active;
  return prisma.location.update({ where: { id }, data });
}

async function deleteLocation(id) {
  // soft-delete
  return prisma.location.update({ where: { id }, data: { active: false }});
}

/* Event types */
async function listEventTypes(query = {}) {
  const where = {};
  if (query.active !== undefined) where.active = query.active === 'true';
  if (query.q) where.name = { contains: query.q, mode: 'insensitive' };
  const take = Number(query.take) || 100;
  return prisma.eventType.findMany({ where, orderBy: { name: 'asc' }, take });
}
async function getEventTypeById(id) { return prisma.eventType.findUnique({ where: { id } }); }
async function createEventType(payload) {
  const { name, slug, active } = payload || {};
  if (!name) { const e = new Error('Missing name'); e.status = 400; throw e; }
  const s = slug || slugify(name);
  return prisma.eventType.create({ data: { name: name.trim(), slug: s, active: active ?? true }});
}
async function updateEventType(id, payload) {
  const { name, slug, active } = payload || {};
  const data = {};
  if (name) data.name = name.trim();
  if (slug) data.slug = slug;
  if (active !== undefined) data.active = !!active;
  return prisma.eventType.update({ where: { id }, data });
}
async function deleteEventType(id) {
  return prisma.eventType.update({ where: { id }, data: { active: false }});
}

module.exports = {
  listLocations, getLocationById, createLocation, updateLocation, deleteLocation,
  listEventTypes, getEventTypeById, createEventType, updateEventType, deleteEventType
};
