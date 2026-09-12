import { ContentInputError } from "../../content/types";
import { SeoInputError } from "../types";
import { websiteSeoPlanRepository } from "../repository";
import { loadSeoInput } from "./load";
import { createSeoPlan } from "./plan";
export { createSeoPlan } from "./plan";

export class WebsiteSeoEngine {
  async generate(input: { entityId: string; pageId?: string; persist?: boolean }) {
    if (!input.entityId.trim()) throw new SeoInputError("Entity id is required.", 400);
    try {
      const loaded = await loadSeoInput(input.entityId, input.pageId);
      const initial = createSeoPlan(loaded.input);
      const duplicates = await websiteSeoPlanRepository.duplicateMetadata(initial.page.id, initial.metadata.title, initial.metadata.description);
      const plan = createSeoPlan({ ...loaded.input, ...duplicates });
      const persistence = input.persist ? await websiteSeoPlanRepository.persist(plan, loaded.revision) : { status: "PREVIEW" as const };
      return { ...plan, persistence };
    } catch (error) {
      if (error instanceof ContentInputError) throw new SeoInputError(error.message, error.status);
      throw error;
    }
  }
}
export const websiteSeoEngine = new WebsiteSeoEngine();
