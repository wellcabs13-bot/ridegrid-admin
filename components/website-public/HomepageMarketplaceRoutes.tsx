"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  ArrowRight,
  MapPin,
} from "lucide-react";

import type {
  PricingOption,
} from "@/lib/website-public/marketplace";

import h from "./HomepagePremium.module.css";

interface RouteCard {
  fromCity: string;
  toCity: string;
  categories: Set<string>;
}

export default function HomepageMarketplaceRoutes() {
  const [
    options,
    setOptions,
  ] = useState<PricingOption[]>([]);

  useEffect(() => {
    const controller =
      new AbortController();

    fetch(
      "/api/marketplace/options",
      {
        cache: "no-store",
        signal:
          controller.signal,
      },
    )
      .then(async (response) => {
        const payload =
          await response.json();

        if (
          !response.ok ||
          !payload.success ||
          !Array.isArray(
            payload.data,
          )
        ) {
          return;
        }

        if (
          !controller.signal.aborted
        ) {
          setOptions(
            payload.data,
          );
        }
      })
      .catch(() => {});

    return () =>
      controller.abort();
  }, []);

  const routes =
    useMemo(() => {
      const map =
        new Map<
          string,
          RouteCard
        >();

      for (
        const option of options
      ) {
        if (
          !option.fromCity ||
          !option.toCity
        ) {
          continue;
        }

        const key =
          `${option.fromCity}::${option.toCity}`;

        const existing =
          map.get(key) ?? {
            fromCity:
              option.fromCity,
            toCity:
              option.toCity,
            categories:
              new Set<string>(),
          };

        if (
          option.vehicleCategory
        ) {
          existing.categories.add(
            option.vehicleCategory,
          );
        }

        map.set(
          key,
          existing,
        );
      }

      return Array.from(
        map.values(),
      ).slice(0, 6);
    }, [options]);

  if (!routes.length) {
    return null;
  }

  return (
    <section
      id="popular-routes"
      className={h.routesSection}
    >
      <div className={h.container}>
        <div
          className={h.sectionHeading}
        >
          <div>
            <p
              className={
                h.sectionEyebrow
              }
            >
              CURRENT JOURNEYS
            </p>

            <h2>
              Popular routes available
              on RideGrid
            </h2>

            <p>
              Route availability below
              comes from the current
              RideGrid marketplace
              configuration.
            </p>
          </div>

          <Link
            href="/#ride-search"
            className={h.textLink}
          >
            Search all journeys
            <ArrowRight
              size={16}
            />
          </Link>
        </div>

        <div className={h.routeGrid}>
          {routes.map(
            (route) => (
              <article
                key={`${route.fromCity}-${route.toCity}`}
                className={
                  h.routeCard
                }
              >
                <div
                  className={
                    h.routeVisual
                  }
                >
                  <MapPin
                    size={28}
                  />
                </div>

                <div
                  className={
                    h.routeBody
                  }
                >
                  <span>
                    OUTSTATION
                  </span>

                  <h3>
                    {route.fromCity}
                    {" → "}
                    {route.toCity}
                  </h3>

                  <p>
                    {route.categories
                      .size > 0
                      ? `${route.categories.size} vehicle categor${route.categories.size === 1 ? "y" : "ies"} configured`
                      : "Current RideGrid marketplace route"}
                  </p>

                  <Link
                    href="/#ride-search"
                  >
                    Search this route
                    <ArrowRight
                      size={15}
                    />
                  </Link>
                </div>
              </article>
            ),
          )}
        </div>
      </div>
    </section>
  );
}