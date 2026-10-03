import {
  buildAiControlRecommendations,
} from "./recommendations";

import {
  getWebsiteSeoAiEnvironment,
} from "./environment";

import {
  websiteSeoAiControlRepository,
} from "./repository";

import type {
  WebsiteSeoAiControlSnapshot,
} from "./types";

export async function getAiControlSnapshot():
  Promise<WebsiteSeoAiControlSnapshot> {
  const state =
    await websiteSeoAiControlRepository.load();

  const environment =
    getWebsiteSeoAiEnvironment();

  return {
    state,
    environment,
    recommendations:
      buildAiControlRecommendations(
        state,
        environment
      ),
  };
}