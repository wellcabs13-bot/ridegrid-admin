import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "RideGrid Admin",
  description: "RideGrid Unified Ground Transportation Platform",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}