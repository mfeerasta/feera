export * from './types';
export * from './utils';
export { americanoEngine, AmericanoEngine } from './americano';
export { roundRobinEngine, RoundRobinEngine } from './round-robin';
export { knockoutEngine, KnockoutEngine } from './knockout';
export { mexicanoEngine, MexicanoEngine } from './mexicano';
export { kingOfCourtEngine, KingOfCourtEngine } from './king-of-court';
export { ladderEngine, LadderEngine } from './ladder';

import type { TournamentEngine, TournamentFormat } from './types';
import { americanoEngine } from './americano';
import { roundRobinEngine } from './round-robin';
import { knockoutEngine } from './knockout';
import { mexicanoEngine } from './mexicano';
import { kingOfCourtEngine } from './king-of-court';
import { ladderEngine } from './ladder';

/**
 * Factory returning the engine for a given format. Includes alias support:
 * the public spec uses "knockout" but the DB enum stores "single_elimination".
 * PPLP defers to round-robin under the hood; full PPLP rules pending.
 *
 * TODO(PPLP rules doc): implement franchise team scoring per the official
 * Pakistan Padel League Pakistan playbook once it lands.
 */
export function getEngine(
  format: TournamentFormat | 'knockout' | 'king_of_court' | 'double_elimination',
): TournamentEngine {
  switch (format) {
    case 'americano':
      return americanoEngine;
    case 'mexicano':
      return mexicanoEngine;
    case 'round_robin':
      return roundRobinEngine;
    case 'single_elimination':
    case 'knockout':
    case 'double_elimination':
      // TODO(double-elim): true losers bracket. Falls back to single-elim
      // until the dedicated engine ships.
      return knockoutEngine;
    case 'king_of_the_court':
    case 'king_of_court':
      return kingOfCourtEngine;
    case 'ladder':
      return ladderEngine;
    case 'pplp':
      return roundRobinEngine;
  }
}
