import { LucideIcon } from "lucide-react";

export interface NavigationChild {
  title: string;
  href?: string;

  badge?: string;

  disabled?: boolean;
}

export interface NavigationItem {
  title: string;

  href?: string;

  icon: LucideIcon;

  badge?: string;

  defaultOpen?: boolean;

  children?: NavigationChild[];
}

export interface NavigationGroup {
  title: string;

  defaultOpen?: boolean;

  items: NavigationItem[];
}