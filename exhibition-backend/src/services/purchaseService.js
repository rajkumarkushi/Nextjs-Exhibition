// src/services/purchaseService.js
const prisma = require('../prismaClient');
const path = require('path');
const fs = require('fs');
const { generateQRCodeToFile } = require('../utils/qrcodeGenerator');
const { sendBookingMessage, toLocal10 } = require('../utils/nearbyWhatsapp');

function ensureDir(dir) { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }

async function createPurchase(payload) {
  const {
    eventId,
    eventTitle,
    selectDate, // fallback
    name,
    mobileNumber,
    phone,
    email,
    tickets,
    quantity,
    ticketPrice,
    uploadImage,
    youtubeUrl
  } = payload || {};

  const buyerName = (name || payload.buyerName || '').trim();
  const buyerPhoneRaw = (mobileNumber || phone || payload.phone || '').trim();
  const qty = Number(tickets ?? quantity ?? 0);

  if (!buyerName || !buyerPhoneRaw || !qty) {
    const e = new Error('Missing required: name, mobileNumber, tickets');
    e.status = 400;
    throw e;
  }
  if (isNaN(qty) || qty <= 0) { const e = new Error('Invalid tickets quantity'); e.status = 400; throw e; }

  // find event: prefer eventId, else fallback to title+date
  let event = null;
  if (eventId) {
    event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      const e = new Error(`Event not found for eventId: ${eventId}`);
      e.status = 404;
      throw e;
    }
  } else if (eventTitle) {
    if (selectDate) {
      const parsed = new Date(selectDate);
      if (!isNaN(parsed)) {
        const start = new Date(parsed); start.setUTCHours(0,0,0,0);
        const end = new Date(parsed); end.setUTCHours(23,59,59,999);
        const matches = await prisma.event.findMany({
          where: { title: eventTitle, date: { gte: start, lte: end } },
          orderBy: { date: 'asc' }
        });
        if (matches.length > 0) event = matches[0];
      }
    }
    if (!event) {
      event = await prisma.event.findFirst({ where: { title: eventTitle }, orderBy: { date: 'asc' } });
    }
  }

  // if no event found, return clear error (because your schema requires eventId)
  if (!event) {
    const e = new Error('Event not found. Provide valid eventId or matching eventTitle + selectDate.');
    e.status = 400;
    throw e;
  }

  // check availability
  if (typeof event.totalTickets === 'number' && event.totalTickets < qty) {
    const e = new Error('Not enough tickets available');
    e.status = 400;
    throw e;
  }

  // compute price
  const priceFromEvent = Number(event.price || 0);
  const pricePerTicket = priceFromEvent || Number(ticketPrice || 0);
  const totalAmount = pricePerTicket * qty;

  // tx: create ticket + decrement
  const txResult = await prisma.$transaction(async (tx) => {
    const ticketPayload = {
      buyerName,
      phone: buyerPhoneRaw,
      email: email ?? null,
      ticketsQty: qty,
      amount: totalAmount,
      status: 'CONFIRMED',
      eventId: event.id,
      uploadImage: uploadImage ?? null,
      youtubeUrl: youtubeUrl ?? null
    };

    const ticket = await tx.ticket.create({ data: ticketPayload });

    if (typeof event.totalTickets === 'number') {
      await tx.event.update({ where: { id: event.id }, data: { totalTickets: event.totalTickets - qty } });
    }

    return { ticket };
  });

  const ticket = txResult.ticket;

  // QR generation
  const qrPayloadObj = {
    ticketId: ticket.id,
    eventId: event.id,
    buyerName,
    phone: ticket.phone,
    quantity: qty,
    amount: totalAmount,
    issuedAt: new Date().toISOString()
  };
  const qrPayload = JSON.stringify(qrPayloadObj);
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'qrcodes');
  ensureDir(uploadsDir);
  const qrFilename = path.join(uploadsDir, `${ticket.id}.png`);
  await generateQRCodeToFile(qrPayload, qrFilename);
  const base = process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 8000}`;
  const qrUrl = `${base.replace(/\/$/, '')}/uploads/qrcodes/${ticket.id}.png`;

  await prisma.ticket.update({ where: { id: ticket.id }, data: { qrCodeUrl: qrUrl, qrPayload } });

  // send booking message via provider -- normalize phone to 10 digits here
  let whatsappResult = null;
  try {
    // normalize for provider
    const phone10 = toLocal10Safe(ticket.phone);
    const bookingMessage = `Your tickets for "${event.title}" are confirmed.\nTickets: ${qty}\nAmount: ₹${totalAmount}\nTicket ID: ${ticket.id}\nQR: ${qrUrl}`;
    whatsappResult = await sendBookingMessage(phone10, bookingMessage);
  } catch (err) {
    // if provider rejected the phone format, return that info but don't undo booking
    console.error('WhatsApp send error:', err.message || err);
    whatsappResult = { error: err.message || String(err) };
  }

  return {
    booking: {
      ticketId: ticket.id,
      eventId: event.id,
      eventTitle: event.title,
      buyerName,
      phone: ticket.phone,
      email: ticket.email,
      quantity: ticket.ticketsQty,
      amount: ticket.amount,
      qrUrl,
      whatsapp: whatsappResult
    }
  };
}

// helper: wrap toLocal10() but return the original phone if provider expects 10-digit only we use it
function toLocal10Safe(phone) {
  try {
    // require the same function from nearbyWhatsapp to normalize
    const { toLocal10 } = require('../utils/nearbyWhatsapp');
    return toLocal10(phone);
  } catch (err) {
    throw err;
  }
}

module.exports = { createPurchase };
