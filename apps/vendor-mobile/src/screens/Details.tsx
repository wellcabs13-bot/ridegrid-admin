import React, { useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import {
  Badge,
  BookingCard,
  Button,
  Card,
  Documents,
  Label,
  LinkButton,
  Screen,
  State,
  dateTime,
  money,
  name,
} from "../components/ui";
import { useSave, useVendor } from "../services/vendor";
import { useApp } from "../state/Providers";
import type { Booking, Driver, Vehicle, Page } from "../types";
export default function Details({
  kind,
}: {
  kind: "booking" | "vehicle" | "driver";
}) {
  const { id } = useLocalSearchParams<{ id: string }>(),
    section =
      kind === "booking"
        ? "bookings"
        : kind === "vehicle"
          ? "fleet"
          : "drivers";
  const q = useVendor<Booking & Vehicle & Driver>(
      section,
      `?id=${encodeURIComponent(id || "")}`,
    ),
    d = q.data;
  const save = useSave(section),
    assignment = useSave("assignment"),
    { online } = useApp();
  const [message, setMessage] = useState("");
  async function status(value: string) {
    setMessage("");
    try {
      await save.mutateAsync({ id, action: "status", status: value });
      setMessage("Status saved.");
    } catch {}
  }
  async function confirm() {
    if (!d) return;
    setMessage("");
    try {
      await assignment.mutateAsync({
        bookingId: d.id,
        vehicleId: d.vehicleId,
        driverId: d.vehicle.driverId,
      });
      setMessage("Assignment confirmed by RideGrid.");
    } catch {}
  }
  return (
    <Screen
      title={
        kind === "booking"
          ? "Booking details"
          : kind === "vehicle"
            ? "Vehicle details"
            : "Driver details"
      }
      refresh={() => q.refetch()}
      refreshing={q.isRefetching}
    >
      <State loading={q.isPending} error={q.error} retry={() => q.refetch()} />
      {d && (
        <>
          <Card>
            <Badge value={d.status} />
            <Label large>
              {kind === "booking"
                ? d.bookingNumber
                : kind === "vehicle"
                  ? `${d.make} ${d.model}`
                  : name(d)}
            </Label>
            {kind === "booking" ? (
              <>
                <Label>
                  {d.pickupLocation} → {d.dropLocation}
                </Label>
                <Label>{dateTime(d.pickupDateTime)}</Label>
                <Label muted>
                  {d.pricingPackage?.packageType || d.tripType} · {d.tripDays}{" "}
                  day(s)
                </Label>
                <Label muted>Reserved until {dateTime(d.reservedUntil)}</Label>
                <Label>
                  Customer: {d.customer.firstName} {d.customer.lastName}
                </Label>
                <LinkButton
                  title={`${d.vehicle.registrationNumber} · ${d.vehicle.make} ${d.vehicle.model}`}
                  href={`/vehicle?id=${d.vehicleId}`}
                />
                <Label>Driver: {name(d.driver)}</Label>
                {d.driverId && (
                  <LinkButton
                    title="Driver details"
                    href={`/driver?id=${d.driverId}`}
                  />
                )}
                <Label>Vendor earning: {money(d.vendorEarning)}</Label>
                {d.transactions?.map((t, i) => (
                  <Label key={i}>
                    Payment: {t.paymentMethod} · {t.paymentStatus}
                  </Label>
                ))}
                {!d.transactions?.length && (
                  <Label muted>Payment status not recorded.</Label>
                )}
                {d.trip && <Badge value={`TRIP ${d.trip.status}`} />}
              </>
            ) : kind === "vehicle" ? (
              <>
                <Label>{d.registrationNumber}</Label>
                <Label muted>
                  {d.category} · {d.seatingCapacity} seats
                </Label>
                <Label muted>
                  {d.fuelType} · {d.transmission}
                </Label>
                <Label>{d.homeCity}</Label>
                <Badge
                  value={d.isVerified ? "VERIFIED" : "PENDING_VERIFICATION"}
                />
                <Label>Driver: {name(d.driver)}</Label>
              </>
            ) : (
              <>
                <Label>Licence: {d.licenseNumber}</Label>
                <Label>{d.city || "City not recorded"}</Label>
                <Label>{d.user.mobile || "Phone not recorded"}</Label>
                {d.vehicles.map((v) => (
                  <LinkButton
                    key={v.id}
                    title={v.registrationNumber}
                    href={`/vehicle?id=${v.id}`}
                  />
                ))}
              </>
            )}
          </Card>
          {!!message && <Label>{message}</Label>}
          <State error={save.error || assignment.error} />
          {kind === "booking" ? (
            <>
              {["PENDING", "CONFIRMED"].includes(d.status) &&
                d.vehicle.driverId && (
                  <Button
                    title="Confirm aligned driver"
                    disabled={!online || assignment.isPending}
                    onPress={confirm}
                  />
                )}
              <LinkButton
                title="Booking support"
                href={`/support?booking=${encodeURIComponent(d.bookingNumber)}`}
              />
              <Label large>History</Label>
              {d.statusHistory?.map((h) => (
                <Card key={h.id}>
                  <Badge value={h.currentStatus} />
                  <Label muted>
                    {h.action} · {dateTime(h.changedAt)}
                  </Label>
                </Card>
              ))}
            </>
          ) : (
            <>
              <Button
                title="Edit details"
                onPress={() =>
                  router.push({
                    pathname:
                      kind === "vehicle" ? "/edit-vehicle" : "/edit-driver",
                    params: { id },
                  })
                }
              />
              {kind === "vehicle" &&
                ["AVAILABLE", "MAINTENANCE"].includes(d.status) && (
                  <Button
                    title={
                      d.status === "AVAILABLE"
                        ? "Set maintenance"
                        : "Mark available"
                    }
                    disabled={!online || save.isPending}
                    onPress={() =>
                      status(
                        d.status === "AVAILABLE" ? "MAINTENANCE" : "AVAILABLE",
                      )
                    }
                  />
                )}
              {kind === "driver" && d.status !== "SUSPENDED" && (
                <Button
                  title={d.status === "ACTIVE" ? "Set inactive" : "Mark active"}
                  disabled={!online || save.isPending}
                  onPress={() =>
                    status(d.status === "ACTIVE" ? "INACTIVE" : "ACTIVE")
                  }
                />
              )}
              {kind === "vehicle" && (
                <LinkButton
                  title="Align a driver"
                  href={`/assignment?vehicleId=${d.id}`}
                />
              )}
              <LinkButton title="Date availability" href="/availability" />
              <Documents items={d.documents} />
              <LinkButton
                title="Upload document"
                href={`/document-upload?entity=${kind}&entityId=${d.id}`}
              />
              {kind === "driver" && (
                <>
                  <Label large>Upcoming assignments</Label>
                  {d.bookings.map((b) => (
                    <BookingCard key={b.id} booking={b} />
                  ))}
                  {!d.bookings.length && (
                    <Label muted>No upcoming assignments.</Label>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}
    </Screen>
  );
}
