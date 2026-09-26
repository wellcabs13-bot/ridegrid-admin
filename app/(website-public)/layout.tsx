import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.wellcabs.com"),
  robots: { index: true, follow: true },
  title: {
    default:
      "Wellcabs | Cab & Ground Transportation Marketplace",
    template:
      "%s | Wellcabs",
  },

  description:
    "Search and book cab, taxi, airport, local and outstation ground transportation with Wellcabs.",

  openGraph: {
    type: "website",
    siteName:
      "Wellcabs",
    images: [],
  },

  twitter: {
    card:
      "summary_large_image",
    images: [],
  },
};

export default function PublicLayout({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return children;
}