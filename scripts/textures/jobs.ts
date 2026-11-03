// Shared prompt pieces and the job shape for scripts/textures.
export interface Job { prompt: string; aspect: '1:1' | '3:4' | '4:3' | '16:9' | '21:9' | '9:16'; size: '1K' | '2K' | '4K'; maxPx: number; quality: number }

export const TILE = 'Seamless tileable texture, orthographic and flat-on, even diffuse daylight with no cast shadows, no perspective, no vignette, no text, no watermark, edges that wrap cleanly. ';
export const PANEL = 'Flat front-on view, even soft lighting, no perspective distortion, no text, no watermark. ';
