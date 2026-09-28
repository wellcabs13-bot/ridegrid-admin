import {
  FileText,
  Gauge,
  Home,
  Image as ImageIcon,
  Link2,
  Menu,
  Search,
  Settings2,
  Sparkles,
} from "lucide-react";

// Simplified operator navigation. Technical engines (page factory, automation,
// AI control, search intelligence, performance, indexing sync) run automatically;
// their pages remain reachable from Advanced, not the primary menu.
export const websiteSeoNavigation = [
  { title: "Overview", href: "/website-seo", icon: Gauge },
  { title: "Homepage", href: "/website-seo/website/homepage", icon: Home },
  { title: "Pages", href: "/website-seo/website/pages", icon: FileText },
  { title: "Navigation", href: "/website-seo/website/navigation", icon: Menu },
  { title: "Media", href: "/website-seo/website/media", icon: ImageIcon },
  { title: "Page SEO", href: "/website-seo/seo", icon: Sparkles },
  { title: "Keywords", href: "/website-seo/search-intelligence/keywords", icon: Search },
  { title: "Redirects", href: "/website-seo/seo/redirects", icon: Link2 },
  { title: "Advanced", href: "/website-seo/settings", icon: Settings2 },
] as const;
