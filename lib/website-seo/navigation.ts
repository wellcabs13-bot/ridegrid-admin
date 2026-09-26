import {
  Activity,
  Bot,
  BrainCircuit,
  FileStack,
  Gauge,
  Globe2,
  Search,
  Settings2,
  Sparkles,
  Workflow,
} from "lucide-react";

export const websiteSeoNavigation = [
  {
    title: "Command Center",
    href: "/website-seo",
    icon: Gauge,
  },
  {
    title: "Website",
    href: "/website-seo/website",
    icon: Globe2,
  },
  {
    title: "Page Factory",
    href: "/website-seo/page-factory",
    icon: FileStack,
  },
  {
    title: "Search Intelligence",
    href: "/website-seo/search-intelligence",
    icon: Search,
  },
  {
    title: "Content",
    href: "/website-seo/content",
    icon: BrainCircuit,
  },
  {
    title: "SEO",
    href: "/website-seo/seo",
    icon: Sparkles,
  },
  {
    title: "Indexing",
    href: "/website-seo/indexing",
    icon: Activity,
  },
  {
    title: "Performance",
    href: "/website-seo/performance",
    icon: Activity,
  },
  {
    title: "Automation",
    href: "/website-seo/automation",
    icon: Workflow,
  },
  {
    title: "AI Control",
    href: "/website-seo/ai-control",
    icon: Bot,
  },
  {
    title: "Settings",
    href: "/website-seo/settings",
    icon: Settings2,
  },
] as const;
