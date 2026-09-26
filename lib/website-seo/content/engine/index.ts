import { buildContentBrief } from "../brief";
import { localContentProvider } from "../providers";
import { parseGeneratedContent } from "../generation/validate";
import { contentFingerprint, copyFingerprint, validateContentQuality } from "../quality";
import { websiteContentRepository } from "../repository";
import { ContentInputError, type ContentBrief, type ContentGenerationProvider, type ContentResult } from "../types";
import { loadContentSources } from "./load";

export async function generateContentDraft(brief: ContentBrief,
  provider: ContentGenerationProvider = localContentProvider): Promise<ContentResult> {
  const generated = parseGeneratedContent(await provider.generate(structuredClone(brief)));
  return { ...generated, entity: brief.entity, page: brief.page, brief,
    faq: generated.sections.flatMap(s => s.faqs), quality: validateContentQuality(brief, generated),
    generation: { engine: "W5", version: 1, provider: provider.id, editorialStatus: "DRAFT", fingerprint: contentFingerprint(generated) } };
}

export class WebsiteContentEngine {
  constructor(private readonly provider: ContentGenerationProvider = localContentProvider) {}

  async generate(input: { entityId: string; pageId?: string; persist?: boolean }) {
    if (!input.entityId.trim()) throw new ContentInputError("Entity id is required.", 400);
    const source = await loadContentSources(input.entityId, input.pageId);
    const brief = buildContentBrief({ ...source, templateId: source.template.id });
    const result = await generateContentDraft(brief, this.provider);
    const duplicate = await websiteContentRepository.hasDuplicateCopy(copyFingerprint(result), source.page?.id ?? null);
    result.quality = validateContentQuality(brief, result, duplicate);
    const persistence = input.persist ? await websiteContentRepository.persist(result, source.revisions) :
      { status: "PREVIEW" as const };
    return { ...result, persistence };
  }
}
export const websiteContentEngine = new WebsiteContentEngine();
