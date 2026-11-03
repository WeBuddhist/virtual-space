// Flowers visitors can offer; shared so the server only relays known kinds.
export const FLOWER_IDS = ['lotus', 'marigold', 'rose', 'jasmine', 'frangipani', 'mandarava'] as const;
export type FlowerId = (typeof FLOWER_IDS)[number];
export const isFlower = (x: unknown): x is FlowerId => FLOWER_IDS.includes(x as FlowerId);
