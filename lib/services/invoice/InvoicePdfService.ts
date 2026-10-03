import { prisma } from "@/lib/prisma";

function escapePdfText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\r?\n/g, " ");
}

function money(value: unknown) {
  return `INR ${Number(value ?? 0).toFixed(2)}`;
}

export async function generateInvoicePdf(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      booking: true,
      customer: true,
      vendor: true,
    },
  });

  if (!invoice) {
    throw new Error("Invoice not found.");
  }

  const customerName =
    `${invoice.customer.firstName} ${invoice.customer.lastName}`.trim();

  const lines = [
    "RIDEGRID",
    "TAX INVOICE",
    "",
    `Invoice Number: ${invoice.invoiceNumber}`,
    `Invoice Date: ${invoice.invoiceDate.toISOString().slice(0, 10)}`,
    "",
    `Customer: ${customerName}`,
    `Vendor: ${invoice.vendor.companyName}`,
    `Booking: ${invoice.booking.bookingNumber}`,
    `Pickup: ${invoice.booking.pickupLocation}`,
    `Drop: ${invoice.booking.dropLocation}`,
    "",
    `Subtotal: ${money(invoice.subtotal)}`,
    `Tax: ${money(invoice.taxAmount)}`,
    `Discount: ${money(invoice.discountAmount)}`,
    `Total: ${money(invoice.totalAmount)}`,
    `Payment Status: ${invoice.paymentStatus}`,
  ];

  const content = [
    "BT",
    "/F1 16 Tf",
    "50 780 Td",
    `(${escapePdfText(lines[0])}) Tj`,
    "/F1 13 Tf",
    "0 -28 Td",
    `(${escapePdfText(lines[1])}) Tj`,
    "/F1 10 Tf",
    ...lines.slice(2).flatMap((line) => [
      "0 -20 Td",
      `(${escapePdfText(line)}) Tj`,
    ]),
    "ET",
  ].join("\n");

  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content, "utf8")} >>\nstream\n${content}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];

  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, "utf8");

  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF`;

  return {
    invoice,
    buffer: Buffer.from(pdf, "utf8"),
    filename: `${invoice.invoiceNumber}.pdf`,
  };
}
