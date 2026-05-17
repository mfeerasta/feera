import Link from 'next/link';
import { notFound } from 'next/navigation';
import { adminFetch } from '@/lib/admin/api-client';
import { gateAdmin } from '@/lib/admin/gate';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';

interface Standing {
  participantId: string;
  rank: number;
  points: number;
  wins: number;
  losses: number;
  teamName: string | null;
}

interface DetailResponse {
  tournament: {
    id: string;
    name: string;
    format: string;
    status: string;
    city: string | null;
    countryCode: string;
    startAt: string;
    pplpEnabled: boolean;
  };
  standings: Standing[];
}

interface Registration {
  id: string;
  userId: string;
  partnerUserId: string | null;
  teamName: string | null;
  status: string;
}

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ admin?: string }>;
}

export default async function AdminTournamentDetail({ params, searchParams }: PageProps) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  gateAdmin(sp);

  const [tournamentRes, regsRes] = await Promise.all([
    adminFetch(`/api/v1/tournaments/${id}`),
    adminFetch(`/api/v1/tournaments/${id}/registrations`),
  ]);
  if (!tournamentRes.ok) notFound();
  const { data } = (await tournamentRes.json()) as { data: DetailResponse };
  const regs: Registration[] = regsRes.ok
    ? ((await regsRes.json()).data as Registration[])
    : [];
  const t = data.tournament;
  const canStart = t.status === 'open' || t.status === 'registration_closed';

  return (
    <section className="mx-auto max-w-5xl">
      <header className="mb-10 flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-ink-deep/50">
            {t.format.replace(/_/g, ' ')}
          </p>
          <h1 className="mt-2 font-serif text-4xl tracking-tight">{t.name}</h1>
          <p className="mt-2 text-sm text-ink-deep/60">
            {t.city ?? 'Online'} . starts {new Date(t.startAt).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href={`/play/tournaments/${t.id}/live`}>
            <Button variant="primary" size="sm">
              Live view
            </Button>
          </Link>
          {canStart ? (
            <form action={`/api/v1/tournaments/${t.id}/start`} method="post">
              <Button type="submit" variant="inverted" size="sm">
                Start tournament
              </Button>
            </form>
          ) : null}
        </div>
      </header>

      <Card>
        <CardBody>
          <h2 className="mb-4 font-serif text-2xl tracking-tight">Registrations</h2>
          {regs.length === 0 ? (
            <p className="text-sm text-ink-deep/60">No one has registered yet.</p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Team</TH>
                  <TH>Player</TH>
                  <TH>Partner</TH>
                  <TH>Status</TH>
                  <TH>Action</TH>
                </TR>
              </THead>
              <TBody>
                {regs.map((r) => (
                  <TR key={r.id}>
                    <TD>{r.teamName ?? '-'}</TD>
                    <TD className="font-mono text-xs">{r.userId.slice(0, 8)}</TD>
                    <TD className="font-mono text-xs">
                      {r.partnerUserId ? r.partnerUserId.slice(0, 8) : '-'}
                    </TD>
                    <TD className="text-ink-deep/70">{r.status}</TD>
                    <TD>
                      <form
                        action={`/api/v1/tournaments/${t.id}/registrations/${r.id}`}
                        method="post"
                        className="flex gap-2"
                      >
                        <input type="hidden" name="_method" value="PATCH" />
                        <Button type="submit" size="sm" variant="primary">
                          Confirm
                        </Button>
                      </form>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>

      <Card className="mt-8">
        <CardBody>
          <h2 className="mb-4 font-serif text-2xl tracking-tight">Standings</h2>
          {data.standings.length === 0 ? (
            <p className="text-sm text-ink-deep/60">Standings appear once the tournament starts.</p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>#</TH>
                  <TH>Team</TH>
                  <TH>W</TH>
                  <TH>L</TH>
                  <TH>Pts</TH>
                </TR>
              </THead>
              <TBody>
                {data.standings.map((s) => (
                  <TR key={s.participantId}>
                    <TD>{s.rank}</TD>
                    <TD>{s.teamName ?? s.participantId.slice(0, 8)}</TD>
                    <TD>{s.wins}</TD>
                    <TD>{s.losses}</TD>
                    <TD className="font-medium">{s.points}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>
    </section>
  );
}
