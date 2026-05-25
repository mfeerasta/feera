import { desc, eq } from 'drizzle-orm';
import { courtsHardwareOrders, courtsProjects } from '@feera/db';
import { ok, serverError } from '@/lib/api/responses';
import { getSession, withRequestContext } from '@/lib/api/request-context';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();

    const rows = await withRequestContext(session, (tx) =>
      tx
        .select({
          id: courtsHardwareOrders.id,
          projectId: courtsHardwareOrders.projectId,
          projectName: courtsProjects.projectName,
          vendor: courtsHardwareOrders.vendor,
          courtsOrdered: courtsHardwareOrders.courtsOrdered,
          wholesaleUnit: courtsHardwareOrders.wholesaleUnit,
          sellUnit: courtsHardwareOrders.sellUnit,
          marginPerCourt: courtsHardwareOrders.marginPerCourt,
          totalMargin: courtsHardwareOrders.totalMargin,
          status: courtsHardwareOrders.status,
          orderDate: courtsHardwareOrders.orderDate,
          shipDate: courtsHardwareOrders.shipDate,
          installDate: courtsHardwareOrders.installDate,
          paidDate: courtsHardwareOrders.paidDate,
        })
        .from(courtsHardwareOrders)
        .leftJoin(
          courtsProjects,
          eq(courtsHardwareOrders.projectId, courtsProjects.id),
        )
        .orderBy(desc(courtsHardwareOrders.orderDate)),
    );

    const currentYear = new Date().getFullYear();

    const courtsPlacedYtd = rows
      .filter(
        (r) =>
          r.status === 'installed' &&
          r.orderDate &&
          new Date(r.orderDate).getFullYear() === currentYear,
      )
      .reduce((sum, r) => sum + (r.courtsOrdered ?? 0), 0);

    const wholesaleSpendYtd = rows
      .filter(
        (r) => r.orderDate && new Date(r.orderDate).getFullYear() === currentYear,
      )
      .reduce(
        (sum, r) => sum + (r.wholesaleUnit ?? 0) * (r.courtsOrdered ?? 0),
        0,
      );

    const marginCapturedYtd = rows
      .filter(
        (r) => r.orderDate && new Date(r.orderDate).getFullYear() === currentYear,
      )
      .reduce((sum, r) => sum + (r.totalMargin ?? 0), 0);

    const ordersPending = rows.filter(
      (r) => r.status && !['installed', 'paid'].includes(r.status),
    ).length;

    return ok({
      data: rows,
      stats: {
        courtsPlacedYtd,
        wholesaleSpendYtd,
        marginCapturedYtd,
        ordersPending,
      },
    });
  } catch (err) {
    return serverError('courts/hardware:GET', err);
  }
}
