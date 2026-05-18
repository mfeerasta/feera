/**
 * Pure-SVG knockout bracket renderer. Server Component, no JS shipped.
 * Left-to-right elimination tree with curved connector lines between rounds.
 *
 * Layout strategy:
 *   - Each round is a column of fixed width (ROUND_WIDTH px).
 *   - Match cards in round N are spaced vertically so each pair maps to the
 *     midpoint of the parent slot in round N+1.
 *   - Round 1 baseline spacing = SLOT_HEIGHT. Round R spacing doubles each
 *     time so the connector lines meet cleanly at the parent card midpoint.
 *
 * Responsive: the SVG declares its intrinsic width/height and a viewBox; the
 * wrapping div switches to vertical stacked cards below 768px via Tailwind
 * `md:` breakpoint so the renderer never needs JS to reflow.
 */

import type { BracketData, BracketMatch } from '@/lib/tournaments/bracket';

interface Props {
  data: BracketData;
}

const ROUND_WIDTH = 240;
const CARD_WIDTH = 200;
const CARD_HEIGHT = 78;
const SLOT_HEIGHT = 96;
const ROUND_HEADER_HEIGHT = 32;
const PADDING = 16;

function statusColors(status: BracketMatch['status']): {
  border: string;
  accent: string;
} {
  switch (status) {
    case 'in_progress':
      return { border: 'var(--color-court, #1c5e3a)', accent: 'var(--color-court, #1c5e3a)' };
    case 'completed':
      return { border: 'var(--color-fg, #1a1a1a)', accent: 'var(--color-fg, #1a1a1a)' };
    case 'pending':
    default:
      return { border: 'rgba(26,26,26,0.2)', accent: 'rgba(26,26,26,0.4)' };
  }
}

function teamLabel(p1: string, p2: string): string {
  if (!p2) return p1;
  const shorten = (s: string) => (s.length > 16 ? `${s.slice(0, 14)}.` : s);
  return `${shorten(p1)} / ${shorten(p2)}`;
}

export function BracketSvg({ data }: Props) {
  if (data.rounds.length === 0) {
    return (
      <p className="border border-dashed border-ink-deep/20 px-4 py-12 text-center text-sm text-ink-deep/60">
        Bracket appears once the tournament starts.
      </p>
    );
  }

  const totalRounds = data.totalRounds;
  const firstRoundMatchCount = Math.max(
    1,
    data.rounds[0]?.matches.length ?? 1,
  );
  // Total visual rows = first-round match count. Subsequent rounds half that.
  const svgHeight =
    ROUND_HEADER_HEIGHT +
    PADDING * 2 +
    firstRoundMatchCount * SLOT_HEIGHT;
  const svgWidth = PADDING * 2 + totalRounds * ROUND_WIDTH;

  function matchY(roundIdx: number, slotIdx: number): number {
    const spacing = SLOT_HEIGHT * Math.pow(2, roundIdx);
    const offset = spacing / 2;
    return ROUND_HEADER_HEIGHT + PADDING + offset + slotIdx * spacing;
  }

  function matchX(roundIdx: number): number {
    return PADDING + roundIdx * ROUND_WIDTH;
  }

  return (
    <div className="w-full">
      {/* Desktop / tablet SVG bracket */}
      <div className="hidden overflow-x-auto md:block">
        <svg
          width={svgWidth}
          height={svgHeight}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="Tournament bracket"
          className="text-ink-deep"
        >
          {/* Connector lines between round N and round N+1 */}
          {data.rounds.slice(0, -1).map((round, roundIdx) => {
            const nextRound = data.rounds[roundIdx + 1];
            if (!nextRound) return null;
            const x1 = matchX(roundIdx) + CARD_WIDTH;
            const x2 = matchX(roundIdx + 1);
            const mid = (x1 + x2) / 2;
            return round.matches.map((_m, slotIdx) => {
              const parentSlot = Math.floor(slotIdx / 2);
              const yStart = matchY(roundIdx, slotIdx) + CARD_HEIGHT / 2;
              const yEnd = matchY(roundIdx + 1, parentSlot) + CARD_HEIGHT / 2;
              return (
                <path
                  key={`conn-${roundIdx}-${slotIdx}`}
                  d={`M ${x1} ${yStart} C ${mid} ${yStart}, ${mid} ${yEnd}, ${x2} ${yEnd}`}
                  stroke="rgba(26,26,26,0.25)"
                  strokeWidth={1}
                  fill="none"
                />
              );
            });
          })}

          {/* Round headers */}
          {data.rounds.map((round, roundIdx) => (
            <text
              key={`hdr-${round.round}`}
              x={matchX(roundIdx) + CARD_WIDTH / 2}
              y={ROUND_HEADER_HEIGHT - 12}
              textAnchor="middle"
              className="fill-current"
              fontSize={11}
              letterSpacing={2}
              opacity={0.55}
            >
              {round.name.toUpperCase()}
            </text>
          ))}

          {/* Match cards */}
          {data.rounds.map((round, roundIdx) =>
            round.matches.map((m, slotIdx) => {
              const x = matchX(roundIdx);
              const y = matchY(roundIdx, slotIdx);
              const colors = statusColors(m.status);
              const aWin = m.winner === 'A';
              const bWin = m.winner === 'B';
              return (
                <g key={m.id}>
                  <rect
                    x={x}
                    y={y}
                    width={CARD_WIDTH}
                    height={CARD_HEIGHT}
                    fill="var(--color-bg, #faf8f3)"
                    stroke={colors.border}
                    strokeWidth={m.status === 'in_progress' ? 2 : 1}
                  />
                  {/* status pill */}
                  {m.status === 'in_progress' ? (
                    <circle
                      cx={x + CARD_WIDTH - 10}
                      cy={y + 10}
                      r={4}
                      fill={colors.accent}
                    />
                  ) : null}
                  {/* team A */}
                  <text
                    x={x + 10}
                    y={y + 26}
                    fontSize={12}
                    fontFamily="ui-serif, Georgia, serif"
                    fontWeight={aWin ? 700 : 400}
                    className="fill-current"
                  >
                    {teamLabel(m.teamA.p1Name, m.teamA.p2Name)}
                  </text>
                  <text
                    x={x + CARD_WIDTH - 10}
                    y={y + 26}
                    fontSize={13}
                    textAnchor="end"
                    fontWeight={aWin ? 700 : 400}
                    className="fill-current"
                  >
                    {m.teamASetsWon ?? '-'}
                  </text>
                  {/* divider */}
                  <line
                    x1={x + 8}
                    x2={x + CARD_WIDTH - 8}
                    y1={y + 36}
                    y2={y + 36}
                    stroke="rgba(26,26,26,0.1)"
                  />
                  {/* team B */}
                  <text
                    x={x + 10}
                    y={y + 54}
                    fontSize={12}
                    fontFamily="ui-serif, Georgia, serif"
                    fontWeight={bWin ? 700 : 400}
                    className="fill-current"
                  >
                    {teamLabel(m.teamB.p1Name, m.teamB.p2Name)}
                  </text>
                  <text
                    x={x + CARD_WIDTH - 10}
                    y={y + 54}
                    fontSize={13}
                    textAnchor="end"
                    fontWeight={bWin ? 700 : 400}
                    className="fill-current"
                  >
                    {m.teamBSetsWon ?? '-'}
                  </text>
                  {/* court footer */}
                  {m.courtName ? (
                    <text
                      x={x + 10}
                      y={y + CARD_HEIGHT - 6}
                      fontSize={9}
                      letterSpacing={1}
                      opacity={0.5}
                      className="fill-current"
                    >
                      {m.courtName.toUpperCase()}
                    </text>
                  ) : null}
                  <text
                    x={x + CARD_WIDTH - 10}
                    y={y + CARD_HEIGHT - 6}
                    fontSize={9}
                    letterSpacing={1}
                    textAnchor="end"
                    opacity={0.5}
                    className="fill-current"
                  >
                    {(m.bracketPosition.label ?? '').toUpperCase()}
                  </text>
                </g>
              );
            }),
          )}
        </svg>
      </div>

      {/* Mobile fallback: stacked card list grouped by round */}
      <div className="space-y-8 md:hidden">
        {data.rounds.map((round) => (
          <div key={round.round}>
            <h3 className="mb-3 text-xs uppercase tracking-[0.25em] text-ink-deep/50">
              {round.name}
            </h3>
            <ul className="space-y-3">
              {round.matches.map((m) => {
                const colors = statusColors(m.status);
                return (
                  <li
                    key={m.id}
                    className="border bg-paper p-4"
                    style={{
                      borderColor: colors.border,
                      borderWidth: m.status === 'in_progress' ? 2 : 1,
                    }}
                  >
                    <div className="flex items-baseline justify-between">
                      <span
                        className={
                          m.winner === 'A'
                            ? 'font-serif text-base font-semibold'
                            : 'font-serif text-base'
                        }
                      >
                        {teamLabel(m.teamA.p1Name, m.teamA.p2Name)}
                      </span>
                      <span
                        className={
                          m.winner === 'A' ? 'font-semibold' : ''
                        }
                      >
                        {m.teamASetsWon ?? '-'}
                      </span>
                    </div>
                    <div className="my-2 border-t border-ink-deep/10" />
                    <div className="flex items-baseline justify-between">
                      <span
                        className={
                          m.winner === 'B'
                            ? 'font-serif text-base font-semibold'
                            : 'font-serif text-base'
                        }
                      >
                        {teamLabel(m.teamB.p1Name, m.teamB.p2Name)}
                      </span>
                      <span
                        className={
                          m.winner === 'B' ? 'font-semibold' : ''
                        }
                      >
                        {m.teamBSetsWon ?? '-'}
                      </span>
                    </div>
                    <div className="mt-3 flex justify-between text-[10px] uppercase tracking-[0.2em] text-ink-deep/40">
                      <span>{m.courtName ?? ''}</span>
                      <span>{m.bracketPosition.label ?? ''}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
