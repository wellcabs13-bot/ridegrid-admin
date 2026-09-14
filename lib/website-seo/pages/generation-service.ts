import {
  websitePageGenerator,
} from "./generator";

import {
  websitePageRepository,
} from "./repository";

import type {
  GenerateWebsitePageInput,
} from "./types";
import { autoQueuePageImages } from "../media/ai-image/service";

export class WebsitePageGenerationService {
  async generateAndPersist(
    input: GenerateWebsitePageInput
  ) {
    const definition =
      await websitePageGenerator.generate(input);

    const page =
      await websitePageRepository.persist(
        definition
      );

    return {
      definition,
      page,
      images: await autoQueuePageImages(page.id, input.generateImages),
    };
  }
}

export const websitePageGenerationService =
  new WebsitePageGenerationService();
