import {
  websitePageGenerator,
} from "./generator";

import {
  websitePageRepository,
} from "./repository";

import type {
  GenerateWebsitePageInput,
} from "./types";

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
    };
  }
}

export const websitePageGenerationService =
  new WebsitePageGenerationService();
