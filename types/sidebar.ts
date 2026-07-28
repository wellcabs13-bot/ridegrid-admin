export interface SidebarSubMenu {
  title: string;
  href: string;
  badge?: number;
}

export interface SidebarMenu {
  title: string;
  icon: string;
  href?: string;
  children?: SidebarSubMenu[];
}
