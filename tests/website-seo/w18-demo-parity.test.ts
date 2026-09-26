import {
  readFileSync,
} from "node:fs";

import {
  describe,
  expect,
  it,
} from "vitest";

const shell =
  readFileSync(
    "components/website-public/PublicShell.tsx",
    "utf8",
  );

const homepage =
  readFileSync(
    "components/website-public/Homepage.tsx",
    "utf8",
  );

const navigation =
  readFileSync(
    "lib/website-public/navigation.ts",
    "utf8",
  );

const routes =
  readFileSync(
    "components/website-public/HomepageMarketplaceRoutes.tsx",
    "utf8",
  );

describe(
  "W18 demo parity homepage",
  () => {
    it(
      "provides full fallback main navigation",
      () => {
        for (
          const label of [
            "Outstation",
            "Local Cabs",
            "Airport Transfers",
            "Corporate",
            "Travel Guides",
            "About",
          ]
        ) {
          expect(
            navigation,
          ).toContain(label);
        }
      },
    );

    it(
      "keeps dashboard navigation authoritative",
      () => {
        expect(
          navigation,
        ).toContain(
          "if (!configured)",
        );

        expect(
          homepage,
        ).toContain(
          "chrome.navigation",
        );
      },
    );

    it(
      "keeps real RideGrid search",
      () => {
        expect(
          homepage,
        ).toContain(
          "<HeroSearch",
        );

        expect(
          homepage,
        ).toContain(
          "ride-search",
        );
      },
    );

    it(
      "uses live marketplace options for route cards",
      () => {
        expect(
          routes,
        ).toContain(
          "/api/marketplace/options",
        );

        expect(
          routes,
        ).toContain(
          "option.fromCity",
        );

        expect(
          routes,
        ).toContain(
          "option.toCity",
        );
      },
    );

    it(
      "does not hardcode fake ratings, reviews or prices",
      () => {
        expect(
          homepage,
        ).not.toMatch(
          /4\.[0-9]\/5/,
        );

        expect(
          homepage,
        ).not.toContain(
          "10,000+",
        );

        expect(
          homepage,
        ).not.toContain(
          "₹2,",
        );
      },
    );

    it(
      "contains demo structure",
      () => {
        expect(
          homepage,
        ).toContain(
          'id="outstation"',
        );

        expect(
          homepage,
        ).toContain(
          'id="local-cabs"',
        );

        expect(
          homepage,
        ).toContain(
          'id="airport-transfers"',
        );

        expect(
          homepage,
        ).toContain(
          'id="corporate"',
        );

        expect(
          homepage,
        ).toContain(
          'id="travel-guides"',
        );

        expect(
          homepage,
        ).toContain(
          'id="about"',
        );
      },
    );

    it(
      "provides enterprise header CTA",
      () => {
        expect(
          shell,
        ).toContain(
          "Book a Cab",
        );
      },
    );
  },
);