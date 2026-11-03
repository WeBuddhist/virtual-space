// Texture and view prompts for bodhgaya. One file per temple so several people or agents
// can work on different temples at once. Run: npm run textures -- bodhgaya [name…]
import { TILE, PANEL, type Job } from '../jobs.ts';

export const jobs: Record<string, Job> = {
    'tower-niches': {
      aspect: '1:1', size: '2K', maxPx: 1536, quality: 58,
      prompt: TILE + 'The carved surface of the Mahabodhi Temple tower in Bodh Gaya, India: warm golden-tan weathered sandstone and old brick stucco, ' +
        'three horizontal bands of deep horseshoe-shaped chaitya-arch niches (gavaksha), each niche holding a small seated Buddha figure in earth-touching gesture, ' +
        'narrow projecting mouldings between the bands, small pilasters between niches, crisp carved relief with dark recesses. Pala-era Indian temple architecture.',
    },
    stucco: {
      aspect: '1:1', size: '1K', maxPx: 1024, quality: 58,
      prompt: TILE + 'Plain weathered buff-ochre lime stucco over old brick on an ancient Indian temple wall, subtle hairline cracks, faint water stains, gentle tonal variation, warm sandstone colour.',
    },
    flagstones: {
      aspect: '1:1', size: '2K', maxPx: 1536, quality: 58,
      prompt: TILE + 'Top-down view of a temple courtyard paved with large rectangular pale sandstone flagstones in a running bond, warm beige and light grey, worn smooth by pilgrims\' bare feet, thin dark joints, a few marigold petals.',
    },
    marble: {
      aspect: '1:1', size: '2K', maxPx: 1536, quality: 58,
      prompt: TILE + 'Top-down view of a polished marble walkway of square slabs laid on the diagonal, alternating pale grey, rose-pink and cream Indian marble with soft veining, glossy, clean grout lines.',
    },
    railing: {
      aspect: '1:1', size: '1K', maxPx: 1024, quality: 58,
      prompt: TILE + 'Close flat view of ancient Sunga-period carved red sandstone railing surface: round lotus medallions and shallow floral relief on pinkish-buff sandstone, softly weathered.',
    },
    bark: {
      aspect: '1:1', size: '1K', maxPx: 1024, quality: 58,
      prompt: TILE + 'Bark of an old sacred fig (peepal, Ficus religiosa) tree trunk: smooth grey-brown bark with pale patches, vertical ridges and folds, lichen spots.',
    },
    lawn: {
      aspect: '1:1', size: '1K', maxPx: 1024, quality: 58,
      prompt: TILE + 'Top-down view of a short, well-kept lawn in Bihar, India, in the dry season: mixed green and yellowing grass blades, a few small fallen peepal leaves.',
    },
  };
