import { FederationNotImplemented, type FederationAdapter } from '../types';

/** UAE Padel Association adapter. Phase 1: stub. Real wiring in M5+. */
export const uaepaAdapter: FederationAdapter = {
  code: 'UAEPA',
  name: 'UAE Padel Association',
  async syncPlayer() {
    throw new FederationNotImplemented('UAEPA', 'syncPlayer');
  },
  async searchPlayers() {
    throw new FederationNotImplemented('UAEPA', 'searchPlayers');
  },
  async getRankings() {
    throw new FederationNotImplemented('UAEPA', 'getRankings');
  },
  async getTournaments() {
    throw new FederationNotImplemented('UAEPA', 'getTournaments');
  },
};
