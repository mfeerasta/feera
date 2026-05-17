import { FederationNotImplemented, type FederationAdapter } from '../types';

/**
 * Pakistan Padel Federation adapter.
 *
 * Phase 1: stub. PPF does not yet publish a public API as of 2026. The Feera team
 * will work with PPF to either consume an API once it lands, or maintain a manual
 * data ingest tool that operators upload CSVs into (see services/workers TBD).
 */
export const ppfAdapter: FederationAdapter = {
  code: 'PPF',
  name: 'Pakistan Padel Federation',
  async syncPlayer() {
    throw new FederationNotImplemented('PPF', 'syncPlayer');
  },
  async searchPlayers() {
    throw new FederationNotImplemented('PPF', 'searchPlayers');
  },
  async getRankings() {
    throw new FederationNotImplemented('PPF', 'getRankings');
  },
  async getTournaments() {
    throw new FederationNotImplemented('PPF', 'getTournaments');
  },
};
