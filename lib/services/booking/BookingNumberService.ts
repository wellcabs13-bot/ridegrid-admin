import { Prisma } from "@prisma/client";

const BOOKING_SEQUENCE_ID = "BOOKING";

export async function generateBookingNumber(
  tx: Prisma.TransactionClient
): Promise<string> {
  await tx.bookingSequence.upsert({
    where: { id: BOOKING_SEQUENCE_ID },
    create: {
      id: BOOKING_SEQUENCE_ID,
      nextValue: 1001,
    },
    update: {},
  });

  const sequence = await tx.bookingSequence.update({
    where: { id: BOOKING_SEQUENCE_ID },
    data: {
      nextValue: {
        increment: 1,
      },
    },
    select: {
      nextValue: true,
    },
  });

  return `WC${sequence.nextValue - 1}`;
}
