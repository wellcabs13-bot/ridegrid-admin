import type {
  LegacyMigrationCategory,
  LegacyMigrationPriority,
  LegacyMigrationStrategy,
} from "./types";

export interface LegacySeedEntry {
  label: string;
  sourcePath: string;
  targetPath: string | null;
  strategy: LegacyMigrationStrategy;
  priority: LegacyMigrationPriority;
  category: LegacyMigrationCategory;
  notes: string;
}

export const VERIFIED_LEGACY_SEED: LegacySeedEntry[] = [
  {
    label: "Pune to Shirdi Cab",
    sourcePath: "/pune-shirdi-cabs-taxi-car-rentals/",
    targetPath: "/routes/pune-to-shirdi",
    strategy: "REDIRECT",
    priority: "HIGH",
    category: "ROUTE",
    notes: "Verified legacy commercial route page.",
  },
  {
    label: "Mumbai Airport to Pune Cab",
    sourcePath: "/mumbai-airport-pune-cabs-taxi-car-rentals/",
    targetPath: "/routes/mumbai-airport-to-pune",
    strategy: "REDIRECT",
    priority: "HIGH",
    category: "ROUTE",
    notes: "Verified legacy airport route page.",
  },
  {
    label: "Pune to Mumbai Airport Cab",
    sourcePath: "/pune-mumbai-airport-cabs-taxi-car-rentals/",
    targetPath: "/routes/pune-to-mumbai-airport",
    strategy: "REDIRECT",
    priority: "HIGH",
    category: "ROUTE",
    notes: "Verified legacy airport route page.",
  },
  {
    label: "Best Cab Service in Pune",
    sourcePath: "/best-cab-service-in-pune/",
    targetPath: "/cities/pune",
    strategy: "REDIRECT",
    priority: "HIGH",
    category: "CITY",
    notes: "Rebuild as the fresh Pune destination/service page.",
  },
  {
    label: "Pune Local Cabs",
    sourcePath: "/pune-local-cabs-taxi-car-rentals/",
    targetPath: "/services/local-cab",
    strategy: "REDIRECT",
    priority: "HIGH",
    category: "SERVICE",
    notes: "Rebuild as the central Local Cab service page.",
  },
  {
    label: "Maharashtra Car Rental",
    sourcePath: "/car-rental/",
    targetPath: "/services/car-rental",
    strategy: "REDIRECT",
    priority: "HIGH",
    category: "SERVICE",
    notes: "Rebuild as fresh car-rental service page.",
  },
  {
    label: "Corporate Car Rental",
    sourcePath: "/corporate-car-rentals/",
    targetPath: "/services/corporate-car-rental",
    strategy: "REDIRECT",
    priority: "HIGH",
    category: "SERVICE",
    notes: "Rebuild as fresh enterprise corporate travel page.",
  },
  {
    label: "Employee Transportation",
    sourcePath: "/employee-transportation-service/",
    targetPath: "/services/employee-transportation",
    strategy: "REDIRECT",
    priority: "HIGH",
    category: "SERVICE",
    notes: "Rebuild as fresh employee transportation service page.",
  },
  {
    label: "Nashik Car Rental",
    sourcePath: "/car-rental-in-nashik/",
    targetPath: "/cities/nashik",
    strategy: "REDIRECT",
    priority: "MEDIUM",
    category: "CITY",
    notes: "Consolidate into strong Nashik city page.",
  },
  {
    label: "Ashtavinayak Tour from Pune",
    sourcePath: "/ashtavinayak-tour-from-pune/",
    targetPath: "/travel-guides/ashtavinayak-tour-from-pune",
    strategy: "GUIDE",
    priority: "HIGH",
    category: "GUIDE",
    notes: "Preserve SEO equity as a refreshed travel guide; do not redirect until guide system/page exists.",
  },
];