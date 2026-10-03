import { NextRequest, NextResponse } from "next/server";

type NominatimResult = {
  place_id: number | string;
  display_name?: string;
  lat?: string;
  lon?: string;
  name?: string;
  address?: Record<string, string | undefined>;
};

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() || "";

  if (q.length < 3) {
    return NextResponse.json({ success: true, data: [] });
  }

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", "6");
    url.searchParams.set("countrycodes", "in");
    url.searchParams.set("q", q);

    const response = await fetch(url.toString(), {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "User-Agent": "RideGrid Marketplace Location Search",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: "Location search is temporarily unavailable." },
        { status: 502 }
      );
    }

    const results = (await response.json()) as NominatimResult[];
    const data = results
      .map((item) => {
        const lat = Number(item.lat);
        const lng = Number(item.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || !item.display_name) return null;

        const address = item.address || {};
        const shortName =
          item.name?.trim() ||
          address.road ||
          address.suburb ||
          address.neighbourhood ||
          address.city ||
          item.display_name.split(",")[0]?.trim() ||
          "Selected location";

        return {
          placeId: String(item.place_id),
          displayName: item.display_name,
          shortName,
          lat,
          lng,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json(
      { success: false, message: "Unable to search locations right now." },
      { status: 500 }
    );
  }
}
