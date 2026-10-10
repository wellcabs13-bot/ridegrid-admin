CREATE SEQUENCE IF NOT EXISTS booking_number_seq
    START WITH 1000
    INCREMENT BY 1
    MINVALUE 1000;

WITH numbered AS (
    SELECT
        id,
        'WC' || (999 + ROW_NUMBER() OVER (ORDER BY "createdAt", id))::text AS booking_number
    FROM "Booking"
)
UPDATE "Booking" b
SET "bookingNumber" = n.booking_number
FROM numbered n
WHERE b.id = n.id;

SELECT setval(
    'booking_number_seq',
    COALESCE(
        (
            SELECT MAX(CAST(SUBSTRING("bookingNumber" FROM 3) AS BIGINT))
            FROM "Booking"
            WHERE "bookingNumber" ~ '^WC[0-9]+$'
        ),
        999
    ),
    true
);

ALTER TABLE "Booking"
    ALTER COLUMN "bookingNumber"
    SET DEFAULT ('WC' || nextval('booking_number_seq')::text);