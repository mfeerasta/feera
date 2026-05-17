import { FederationNotImplemented, type FederationAdapter } from '../types';

/**
 * International Padel Federation (FIP) adapter.
 *
 * Phase 1: stub. If FIP does not expose an API we will fall back to scraping
 * padelfip.com via the worker process. Scraping wrapper lives in services/workers
 * (M5).
 */
export const fipAdapter: FederationAdapter = {
  code: 'FIP',
  name: 'International Padel Federation',
  async syncPlayer() {
    throw new FederationNotImplemented('FIP', 'syncPlayer');
  },
  async searchPlayers() {
    throw new FederationNotImplemented('FIP', 'searchPlayers');
  },
  async getRankings() {
    throw new FederationNotImplemented('FIP', 'getRankings');
  },
  async getTournaments() {
    throw new FederationNotImplemented('FIP', 'getTournaments');
  },
};
