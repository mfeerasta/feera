import { adminFetch } from '@/lib/admin/api-client';
import { gateAdmin } from '@/lib/admin/gate';
import { Card, CardBody } from '@/components/ui/card';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { ConvertButton } from './convert-button';
import { StatusSelect } from './status-select';

interface LeadRow {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  city: string | null;
  projectStage: string | null;
  capexRange: string | null;
  message: string | null;
  sourcePage: string | null;
  status: string;
  convertedToDealId: string | null;
}

interface PageProps {
  searchParams: Promise<{ admin?: string }>;
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  triaged: 'bg-yellow-100 text-yellow-800',
  'call-booked': 'bg-purple-100 text-purple-800',
  qualified: 'bg-green-100 text-green-800',
  disqualified: 'bg-red-100 text-red-800',
  converted: 'bg-emerald-100 text-emerald-800',
};

function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-800';
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colors}`}
    >
      {status}
    </span>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default async function AdminCourtsLeadsPage({
  searchParams,
}: PageProps) {
  const sp = await searchParams;
  gateAdmin(sp);

  const res = await adminFetch('/api/v1/courts/leads');
  let leads: LeadRow[] = [];
  let error: string | null = null;
  if (res.ok) {
    const json = (await res.json()) as { data: LeadRow[] };
    leads = json.data;
  } else {
    error = `Failed to load leads (HTTP ${res.status}).`;
  }

  return (
    <section className="mx-auto max-w-6xl">
      <div className="mb-10 flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-ink-deep/50">
            Courts Business
          </p>
          <h1 className="mt-2 font-serif text-4xl tracking-tight">Leads</h1>
          <p className="mt-2 text-sm text-ink-deep/60">
            {leads.length} total
          </p>
        </div>
      </div>

      <Card>
        <CardBody className="p-0">
          {error ? (
            <p className="px-6 py-8 text-sm text-red-600">{error}</p>
          ) : leads.length === 0 ? (
            <p className="px-6 py-8 text-sm text-ink-deep/60">
              No leads yet. They will appear here when someone submits the form
              on feera.ai/courts.
            </p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Date</TH>
                  <TH>Name</TH>
                  <TH>Company</TH>
                  <TH>City</TH>
                  <TH>Stage</TH>
                  <TH>Capex</TH>
                  <TH>Status</TH>
                  <TH>Actions</TH>
                </TR>
              </THead>
              <TBody>
                {leads.map((lead) => (
                  <TR key={lead.id}>
                    <TD className="whitespace-nowrap text-ink-deep/60">
                      {formatDate(lead.createdAt)}
                    </TD>
                    <TD className="font-medium">
                      <div>{lead.name}</div>
                      <div className="text-xs text-ink-deep/50">
                        {lead.email}
                      </div>
                    </TD>
                    <TD>{lead.company ?? '-'}</TD>
                    <TD>{lead.city ?? '-'}</TD>
                    <TD>{lead.projectStage ?? '-'}</TD>
                    <TD>{lead.capexRange ?? '-'}</TD>
                    <TD>
                      <div className="flex flex-col gap-1.5">
                        <StatusBadge status={lead.status} />
                        <StatusSelect
                          leadId={lead.id}
                          currentStatus={lead.status}
                        />
                      </div>
                    </TD>
                    <TD>
                      {lead.status !== 'converted' &&
                        !lead.convertedToDealId && (
                          <ConvertButton leadId={lead.id} />
                        )}
                      {lead.status === 'converted' && (
                        <span className="text-xs text-emerald-600">
                          Converted
                        </span>
                      )}
                    </TD>
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
