import { FederationNotImplemented, type FederationAdapter } from '../types';

/** Saudi Padel Committee adapter. Phase 1: stub. Real wiring in M5+. */
export const spcAdapter: FederationAdapter = {
  code: 'SPC',
  name: 'Saudi Padel Committee',
  async syncPlayer() {
    throw new FederationNotImplemented('SPC', 'syncPlayer');
  },
  async searchPlayers() {
    throw new FederationNotImplemented('SPC', 'searchPlayers');
  },
  async getRankings() {
    throw new FederationNotImplemented('SPC', 'getRankings');
  },
  async getTournaments() {
    throw new FederationNotImplemented('SPC', 'getTournaments');
  },
};
