// src/services/purchaseService.js
const prisma = require('../prismaClient');
// const { generateQrForTicket, sendBookingMessage } = require('../utils/purchaseHelpers'); // optional helper functions you may have

/**
 * Create ticket purchase for an exhibition (addexhi)
 * payload: { eventId, name, mobileNumber, tickets }
 */
async function createPurchase(payload) {
  const { eventId, name, mobileNumber, tickets } = payload || {};

  if (!eventId || !name || !mobileNumber || !tickets) {
    const e = new Error('Missing required fields: eventId, name, mobileNumber, tickets');
    e.status = 400;
    throw e;
  }

  // find the exhibition in addexhi
  const exhibition = await prisma.addexhi.findUnique({ where: { id: eventId }});
  if (!exhibition) {
    const e = new Error(`Exhibition not found for eventId: ${eventId}`);
    e.status = 404;
    throw e;
  }

  // optionally, use totalStalls or a separate totalTickets field to limit tickets
  const available = typeof exhibition.totalStalls === 'number' ? exhibition.totalStalls : null;
  if (available !== null && tickets > available) {
    const e = new Error('Not enough tickets available');
    e.status = 400;
    throw e;
  }

  const amount = (exhibition.startingTicketPrice || 0) * tickets;

  // create ticket and decrement availability in a transaction
  const created = await prisma.$transaction(async (tx) => {
    const t = await tx.ticket.create({
      data: {
        buyerName: name,
        phone: mobileNumber,
        ticketsQty: tickets,
        amount,
        eventId,
        status: 'CONFIRMED'
      }
    });

    // decrement available seats if field present
    if (available !== null) {
      await tx.addexhi.update({
        where: { id: eventId },
        data: { totalStalls: { decrement: tickets } }
      });
    }

    return t;
  });

  // Generate a QR code or payload if you have helpers (optional)
  try {
    if (typeof generateQrForTicket === 'function') {
      const qrUrl = await generateQrForTicket(created.id);
      await prisma.ticket.update({ where: { id: created.id }, data: { qrCodeUrl: qrUrl }});
      created.qrCodeUrl = qrUrl;
    }
  } catch (err) {
    console.warn('QR generation failed for ticket', created.id, err && err.message);
  }

  // Send WhatsApp confirmation if you have helper
  try {
    if (typeof sendBookingMessage === 'function') {
      await sendBookingMessage({
        to: mobileNumber,
        name,
        ticketId: created.id,
        eventTitle: exhibition.title,
        amount,
        tickets
      });
    }
  } catch (err) {
    console.warn('WhatsApp send failed for ticket', created.id, err && err.message);
  }

  return created;
}

/**
 * List all bookings for exhibitions owned by an organizer
 */
async function listMyBookings(organizerId) {
  if (!organizerId) {
    const e = new Error('Organizer ID required');
    e.status = 400;
    throw e;
  }

  const tickets = await prisma.ticket.findMany({
    where: { event: { organizerId } }, // event is addexhi relation
    include: {
      event: {
        select: { id: true, title: true, venueAddress: true, location: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return tickets;
}

module.exports = {
  createPurchase,
  listMyBookings
};
