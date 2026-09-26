import {
  readFileSync,
} from "node:fs";

import {
  describe,
  expect,
  it,
} from "vitest";

const homepage =
  readFileSync(
    "components/website-public/Homepage.tsx",
    "utf8",
  );

const shell =
  readFileSync(
    "components/website-public/PublicShell.tsx",
    "utf8",
  );

const navigation =
  readFileSync(
    "lib/website-public/navigation.ts",
    "utf8",
  );

const homepageConfig =
  readFileSync(
    "lib/website-public/homepage.ts",
    "utf8",
  );

describe(
  "W17 premium live homepage",
  () => {
    it(
      "keeps the real RideGrid marketplace search",
      () => {
        expect(
          homepage,
        ).toContain(
          "<HeroSearch",
        );

        expect(
          homepage,
        ).toContain(
          "/marketplace",
        );
      },
    );

    it(
      "uses the public root instead of the retired preview URL",
      () => {
        expect(
          shell,
        ).toContain(
          'href="/"',
        );

        expect(
          navigation,
        ).not.toContain(
          "/website-preview",
        );

        expect(
          homepageConfig,
        ).not.toContain(
          "/website-preview",
        );
      },
    );

    it(
      "uses dashboard-provided media and navigation",
      () => {
        expect(
          homepage,
        ).toContain(
          "chrome.media",
        );

        expect(
          homepage,
        ).toContain(
          "chrome.navigation",
        );
      },
    );

    it(
      "does not fabricate ratings or customer-volume claims",
      () => {
        expect(
          homepage,
        ).not.toMatch(
          /\b4\.[0-9]\/5\b/,
        );

        expect(
          homepage,
        ).not.toMatch(
          /\b[0-9]{3,},?[0-9]*\+\b/,
        );
      },
    );

    it(
      "preserves Dashboard content blocks",
      () => {
        expect(
          homepage,
        ).toContain(
          'placement="BEFORE_PRIMARY_CONTENT"',
        );

        expect(
          homepage,
        ).toContain(
          'placement="AFTER_PRIMARY_CONTENT"',
        );
      },
    );
  },
);