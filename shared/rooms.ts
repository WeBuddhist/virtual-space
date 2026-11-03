// Room ids shared by the client and the Worker. Each temple has several
// instances ("servers") so a busy temple can spread visitors across copies.

export const TEMPLE_IDS = ['bodhgaya', 'tibetan', 'theravada', 'mahayana'] as const;
export type TempleId = (typeof TEMPLE_IDS)[number];

/** cushion count per temple and the cushions held by resident practitioners */
export const SEATING: Record<TempleId, { cushions: number; residents: number[] }> = {
  bodhgaya: { cushions: 18, residents: [0, 2, 5, 9] },
  tibetan: { cushions: 18, residents: [0, 2, 5, 9] },
  theravada: { cushions: 18, residents: [0, 2, 5, 9] },
  mahayana: { cushions: 18, residents: [0, 2, 5, 9] },
};

export const INSTANCES_PER_TEMPLE = 20;
export const ROOM_CAPACITY = 100;

/** `bodhgaya`, `bodhgaya-02` … `bodhgaya-20` */
export function roomId(temple: TempleId, n = 1) {
  return n === 1 ? temple : `${temple}-${String(n).padStart(2, '0')}`;
}

export function parseRoom(id: string): { temple: TempleId; n: number } | null {
  const m = /^([a-z]+)(?:-(\d{2}))?$/.exec(id);
  if (!m || !(TEMPLE_IDS as readonly string[]).includes(m[1])) return null;
  const n = m[2] ? Number(m[2]) : 1;
  if (n < 1 || n > INSTANCES_PER_TEMPLE || (m[2] && n === 1)) return null;
  return { temple: m[1] as TempleId, n };
}

export const ALL_ROOM_IDS = TEMPLE_IDS.flatMap((t) =>
  Array.from({ length: INSTANCES_PER_TEMPLE }, (_, i) => roomId(t, i + 1)),
);
