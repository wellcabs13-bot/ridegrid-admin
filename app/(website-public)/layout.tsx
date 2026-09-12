import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "RideGrid by Wellcabs",
    template: "%s | RideGrid",
  },
  description:
    "Search and book cabs, taxis and ground transportation with RideGrid by Wellcabs.",
  openGraph: {
    images: [],
  },
  twitter: {
    images: [],
  },
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}