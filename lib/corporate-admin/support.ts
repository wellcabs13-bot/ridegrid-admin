import { TicketCategory, TicketPriority } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { WELLCABS, whatsappLink } from "@/lib/website-public/brand";
import { AdminAccess, auditEntry, CorporateAdminError, id as idOf, text } from "./access";

const CATEGORIES: TicketCategory[] = ["BOOKING", "PAYMENT", "DRIVER", "VEHICLE", "CORPORATE", "ACCOUNT", "TECHNICAL", "OTHER"];
const PRIORITIES: TicketPriority[] = ["LOW", "MEDIUM", "HIGH"];

// Support contacts come from the single central Wellcabs contact record. Tickets are
// the central SupportTicket records RideGrid support works in the Super Admin.
export async function support(a: AdminAccess) {
  const [c, tickets] = await Promise.all([
    prisma.corporate.findUnique({ where: { id: a.corporateId }, select: { accountManagerName: true, accountManagerEmail: true, accountManagerMobile: true } }),
    prisma.supportTicket.findMany({
      where: { corporateId: a.corporateId },
      select: { id: true, ticketNumber: true, subject: true, category: true, priority: true, status: true, createdAt: true, resolvedAt: true, booking: { select: { id: true, bookingNumber: true } } },
      orderBy: { createdAt: "desc" }, take: 25,
    }),
  ]);
  return {
    name: WELLCABS.name, phone: WELLCABS.phone, phoneHref: WELLCABS.phoneHref, email: WELLCABS.email, emailHref: WELLCABS.emailHref,
    whatsapp: whatsappLink(`Hello Wellcabs, I need help with the ${a.company.companyName} corporate travel account.`),
    accountManager: c?.accountManagerName ? { name: c.accountManagerName, email: c.accountManagerEmail, mobile: c.accountManagerMobile } : null,
    tickets: tickets.map((t) => ({ ...t, ticketNumber: t.ticketNumber.slice(0, 8).toUpperCase() })),
    categories: CATEGORIES, priorities: PRIORITIES,
  };
}

export async function createTicket(b: Record<string, unknown>, a: AdminAccess) {
  const category = b.category, priority = b.priority ?? "MEDIUM";
  if (typeof category !== "string" || !CATEGORIES.includes(category as TicketCategory)) throw new CorporateAdminError(400, "Choose a category.");
  if (typeof priority !== "string" || !PRIORITIES.includes(priority as TicketPriority)) throw new CorporateAdminError(400, "Choose a priority.");
  const subject = text(b.subject, "Subject", { max: 150 })!;
  const description = text(b.description, "Description", { max: 2000 })!;
  const bookingId = b.bookingId ? idOf(b.bookingId, "booking") : null;
  if (bookingId && !(await prisma.booking.findFirst({ where: { id: bookingId, corporateId: a.corporateId, deletedAt: null }, select: { id: true } })))
    throw new CorporateAdminError(404, "Booking not found.");
  return prisma.$transaction(async (tx) => {
    const t = await tx.supportTicket.create({
      data: { corporateId: a.corporateId, bookingId, category: category as TicketCategory, priority: priority as TicketPriority, source: "WEB", status: "OPEN", subject, description },
      select: { id: true, ticketNumber: true },
    });
    await auditEntry(tx, a, "CREATE", "SupportTicket", t.id, undefined, { category, priority, subject, bookingId });
    return { id: t.id, ticketNumber: t.ticketNumber.slice(0, 8).toUpperCase() };
  });
}
