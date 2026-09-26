import type { ContentBrief, ContentSection, ContentBindingResource } from "../types";
import { generateContentFAQs, liveBinding } from "../faq";

const contextGuidance = {
  ROUTE: "Confirm the pickup and drop locations, travel date and passenger requirements before reviewing trip options.",
  CITY: "Start with the pickup area and destination within or beyond the city, then specify the date and passenger needs.",
  SERVICE: "Match the service to your itinerary and review the trip terms before making a booking decision.",
  AIRPORT: "Specify the airport pickup or drop and check your terminal details and travel date when planning the transfer.",
  AREA: "Use the exact pickup address and destination to make the trip search relevant to this area.",
  VEHICLE: "Check the vehicle details returned for your trip against passenger and luggage requirements before selecting an option.",
} satisfies Record<ContentBrief["entity"]["type"], string>;

const liveTypes = new Set(["SEARCH", "MARKETPLACE", "PRICING", "VEHICLES", "REVIEWS", "TRUST"]);
export function generateContentSections(brief: ContentBrief): ContentSection[] {
  return brief.recommendedSections.map(section => {
    const result: ContentSection = { id: section.id, type: section.type,
      heading: "", paragraphs: [], benefits: [], context: {}, faqs: [], links: [], binding: null, cta: null };
    if (liveTypes.has(section.type)) {
      result.heading = ({ SEARCH: "Plan your trip", MARKETPLACE: "Trip options", PRICING: "Current trip quote",
        VEHICLES: "Vehicle details", REVIEWS: "Verified review information", TRUST: "Service credentials" } as Record<string, string>)[section.type];
      result.binding = liveBinding(brief, section.type as ContentBindingResource);
      return result;
    }
    switch (section.type) {
      case "HERO":
        result.heading = brief.primaryKeyword?.keyword ?? brief.entity.name;
        result.paragraphs = [`Plan your journey with information for ${brief.entity.name}.`];
        break;
      case "OVERVIEW":
        result.heading = `Planning for ${brief.entity.name}`;
        result.paragraphs = [contextGuidance[brief.entity.type]];
        result.context = brief.context;
        break;
      case "CONTENT":
        result.heading = "Before you choose";
        result.paragraphs = ["Review the trip details and any applicable terms before proceeding. Use current trip information to assess whether an option meets your needs."];
        result.benefits = ["Compare options against your itinerary.", "Keep pickup details and passenger requirements together."];
        break;
      case "FAQ": result.heading = "Trip planning questions"; result.faqs = generateContentFAQs(brief); break;
      case "CTA":
        result.heading = "Your next step";
        result.paragraphs = ["Prepare your pickup, destination and travel date to continue planning."];
        result.cta = { label: brief.ctaIntent === "EXPLORE_INFORMATION" ? "Explore trip information" : "Check trip options", intent: brief.ctaIntent };
        break;
      default:
        result.heading = `Related ${section.type.toLowerCase()}`;
        result.links = brief.internalLinks;
        break;
    }
    return result;
  });
}
