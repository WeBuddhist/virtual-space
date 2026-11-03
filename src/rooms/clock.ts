import type { TempleDef } from './types';

// `?time=21:30` pins the temple clock, for previewing night and service times
const pinned = /^(\d{1,2}):(\d{2})$/.exec(new URLSearchParams(location.search).get('time') ?? '');

/** hours+minutes of "now" in the temple's own time zone */
export function templeClock(temple: TempleDef, date = new Date()) {
  if (pinned) {
    const h = Number(pinned[1]) % 24, m = Number(pinned[2]), s = date.getSeconds();
    return { h, m, s, dayFraction: (h * 3600 + m * 60 + s) / 86400 };
  }
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: temple.timeZone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const h = get('hour') % 24, m = get('minute'), s = get('second');
  return { h, m, s, dayFraction: (h * 3600 + m * 60 + s) / 86400 };
}

export function isDay(temple: TempleDef, date = new Date()) {
  const { h } = templeClock(temple, date);
  return h >= 6 && h < 18;
}

/** the communal service in progress, with how far into it we are */
export function activeService(temple: TempleDef, chantSeconds: number, date = new Date()) {
  const { h, m, s } = templeClock(temple, date);
  const now = h * 3600 + m * 60 + s;
  for (const svc of temple.services) {
    const offset = now - (svc.hour * 3600 + svc.minute * 60);
    if (offset >= 0 && offset < chantSeconds) return { ...svc, offset };
  }
  return null;
}
