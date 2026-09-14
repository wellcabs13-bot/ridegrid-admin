import type { WebsiteTemplateSectionType } from "../website-seo/templates/types";
import type { WebsitePublicNavigationLocation } from "../website-seo/public-navigation/types";
import type { WebsiteContentBlockCategory, WebsiteContentBlockPlacement } from "../website-seo/content-blocks/types";
import type { SeoSchema } from "../website-seo/seo/types";
export interface PublicLink { label: string; href: string; newTab?: boolean }
export interface PublicNavLink extends PublicLink { location: WebsitePublicNavigationLocation }
export interface PublicMedia { src: string; alt: string; caption: string }
export interface PublicBlock { id: string; category: WebsiteContentBlockCategory; placement: WebsiteContentBlockPlacement; eyebrow: string; heading: string; body: string; cta: PublicLink | null }
export interface PublicSection { id: string; type: WebsiteTemplateSectionType; heading: string; paragraphs: string[]; benefits: string[]; faqs: { question: string; answer: string }[]; links: PublicLink[]; cta: PublicLink | null }
export interface PublicSeo { title: string; description: string; canonical: string; robots: { index: boolean; follow: boolean }; schema: SeoSchema; ogImage?: PublicMedia }
export interface PublicPage { title: string; entityName: string; entityType: string; pathname: string; seo: PublicSeo; sections: PublicSection[]; links: PublicLink[]; breadcrumbs: PublicLink[]; images?: import("../website-seo/media/ai-image/public").PublicImageSlots }
export interface PublicChrome { navigation: PublicNavLink[]; blocks: PublicBlock[]; media: { category: string; asset: PublicMedia }[]; images?: import("../website-seo/media/ai-image/public").PublicImageSlots }
