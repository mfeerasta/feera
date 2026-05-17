export function fmtRange(startIso: string, endIso: string): string {
  const s = new Date(startIso);
  const e = new Date(endIso);
  const date = s.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const time = `${s.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })} - ${e.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
  return `${date} . ${time}`;
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function daysFromToday(n: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d;
}
