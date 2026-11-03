// Texture and view prompts for theravada (Wat Phra Si Rattana Mahathat, Phitsanulok; Phra Buddha Chinnarat).
// One file per temple so several people or agents can work on different temples at once.
// Run: npm run textures -- theravada [name…]. view-* files are reference targets for the 3D build, not shipped.
// Prompts were drafted by Gemini 4 Argon from docs/rooms/theravada/reference.md and refined after its critiques
// (see docs/rooms/theravada/views.md).
import { TILE, PANEL, type Job } from '../jobs.ts';

export const jobs: Record<string, Job> = {
  'view-exterior': {
    aspect: '16:9', size: '2K', maxPx: 2048, quality: 50,
    prompt: "Eye-level three-quarter 28mm photograph from the west-north-west of a single freestanding longitudinal Thai temple hall (viharn) and one single rear prang tower, standing completely alone on a flat stone-paved forecourt (#D8D2C7) surrounded by a flat green lawn and open hazy sky (#CFE0EA). The west front porch has four equal-height round whitewashed cylindrical columns (#EEE9DE) with gilded lotus capitals (#C9962C) supporting a low hipped porch roof apron whose front tiled eave runs horizontally across the facade. Inside the porch stands a tall ornate gilded central doorway flanked by two smaller gilded portals. Rising behind and above the low porch roof is the main triangular gable divided into horizontal rectangular boxed panels (luk fak) on a pale ground with gilded carving (#C9962C) and blue mosaic, topped by a chofa (#F6D57A). Two lidded white bulbous urns on gold bases and stone lions flank the steps. The three-tier orange-red glazed roof (#B4472B) with green borders (#3F5E3A) sweeps low along the north side wall on the left, which has vertical slit windows and thick round white pilasters with gilded lotus capitals supporting the eaves (no golden brackets). Directly behind the roof rises a SINGLE Ayutthaya prang: weathered dark grey-black stucco base, gilded fluted upper tower (#D9A83A) with a multi-pronged trident finial. Strictly no attached side cloister wings, no other buildings, no second prang, no trees, no people, no text.",
  },
  'view-approach': {
    aspect: '16:9', size: '2K', maxPx: 2048, quality: 50,
    prompt: "Eye-level 24mm photograph looking straight east along a stone-paved path across a flat green lawn toward the west front of a single freestanding longitudinal Thai viharn. The building extends straight back along the viewing axis with NO perpendicular cloister walls extending left or right. Its wide three-tier roof of orange-red glazed tiles (#B4472B) with green borders (#3F5E3A) and gilded naga bargeboards (#F6D57A) telescopes down toward the viewer in stepped layers, with the lowest eaves sweeping near head height on both sides. The front porch features four bright-white cylindrical columns (#EEE9DE) with gilded lotus capitals (#C9962C) supporting a low hipped tiled roof whose front edge runs horizontally. Rising behind and above this porch roof is the main triangular gable divided into a rectangular grid of gilded and blue-mosaic coffered panels (#C9962C) on a pale ground, crowned by a single chofa. Inside the porch, a single central ornate gilded doorway opens into the dark nave, flanked by two smaller portals. Two white bulbous urns with pointed lids on gilded pedestals and small stone lions flank the entrance. Directly behind the gable apex rises ONLY ONE central Ayutthaya prang with a dark grey lower body, gilded corncob upper tower (#D9A83A), and trident finial. Open sky (#CFE0EA), no other buildings, no second prang, no trees, no people, no text.",
  },
  'view-nave': {
    aspect: '16:9', size: '2K', maxPx: 2048, quality: 50,
    prompt: "Low-angle interior photograph from just inside the west doors at kneeling eye height (1.1m) using a 35mm lens, looking east down the dim nave of the Wat Yai viharn. Two symmetrical rows of tall cylindrical columns in black lacquer (#141614) covered in vertical rows of gold lozenge kranok stencils (#C9962C) with gilded lotus capitals frame the view. Above is a dark red coffered ceiling (#7E1A16) with dark wood beams, gilded trim, and hanging crystal chandeliers glowing warmly (#FFB04A). In the foreground, glossy encaustic floor tiles with dark brown, slate blue, and cream interlocking circles lead to a red kneeling carpet (#7E1A16). At the far end, centrally framed beneath a gilded carved valance, glows the Phra Buddha Chinnarat in mirror-like warm gold (#D9A83A) with its gilded flame-edged naga aureole against a black lacquer backdrop (#141614) sprinkled with gold rosettes. Respectful depiction. No text, no watermark, no identifiable faces.",
  },
  'view-chinnarat': {
    aspect: '16:9', size: '2K', maxPx: 2048, quality: 50,
    prompt: "Medium close-up frontal photograph from a low kneeling angle (1.1m height, 50mm lens) of the Phra Buddha Chinnarat on its stepped gilded pedestal (#C9962C). The sacred statue has a smooth, mirror-like warm gold surface (#D9A83A) with soft specular highlights (#F6D57A), seated in Maravijaya pose: right hand over right knee with all four fingers of equal length pointing straight down, left hand in lap, left shoulder draped in an orange cloth over the serrated sanghati flap, round serene face, arched eyebrows, snail-shell curls, and tall flame finial. Hugging the body is the slim gilded aureole: two naga bodies rising from makaras at the knees, curling outward at shoulder height into crescent hooks, and rising to a pointed arch of kranok flames. Behind is a black lacquer wall (#141614) with small gold flower rosettes and two flying gold thephanom angels at the upper corners. Small bronze guardians Thao Wessuwan and Alavaka flank the knees; offering tables with lotus vases and candles (#FFB04A) sit in the foreground. Respectful depiction. No text, no watermark, no identifiable faces.",
  },
  'view-devotees': {
    aspect: '16:9', size: '2K', maxPx: 2048, quality: 50,
    prompt: "Interior photograph at kneeling eye height (1.1m, 35mm lens) inside the Wat Yai nave, seen from behind a group of devotees kneeling on the glossy interlocking-circle patterned floor tiles and red carpet (#7E1A16). In the foreground and midground, men and women in modest white and pastel shirts sit side-saddle (phap phiab) with feet tucked away, while others perform the five-point bow (benjangkapradit) with forearms, palms, and foreheads touching the floor toward the altar. All people are seen strictly from behind, showing no faces. Flanking the nave are massive black lacquer columns (#141614) with gold diamond kranok stencils (#C9962C) and hanging crystal chandeliers (#FFB04A). In the center background, brilliantly spot-lit, rises the golden Phra Buddha Chinnarat (#D9A83A) framed by its hooked naga flame aureole against the black and gold-rosette backdrop. Dim, reverent atmosphere with warm 2900K lighting. No text, no watermark, no identifiable faces.",
  },
  'view-doors': {
    aspect: '16:9', size: '2K', maxPx: 2048, quality: 50,
    prompt: "Symmetrical front-on architectural photograph (35mm lens, eye level) of the pair of tall late-Ayutthaya mother-of-pearl inlaid doors under the west porch of the Wat Yai viharn. The two vertical door panels (each 1m wide by 4.5m tall) sit centered within an ornate gilded carved wooden doorframe (#C9962C). Each door leaf features a deep black lacquer ground (#141614) inlaid with iridescent mother-of-pearl nacre (#D8E2E6 with pink and green shimmer) arranged in a central vertical column of large circular roundels containing Himmaphan creatures and kranok foliage, bordered by strips of diamond lozenges and scrolling vines. Flanking the doorway are sections of whitewashed porch walls (#EEE9DE) and gilded pilasters. Soft, even shade under the porch roof with gentle warm highlights reflecting off the gold and nacre. No text, no watermark, no people, no identifiable faces.",
  },
  'aureole': {
    aspect: '3:4', size: '2K', maxPx: 1536, quality: 55,
    prompt: PANEL + "The carved gilded teak aureole (sum ruean kaeo) of Phra Buddha Chinnarat alone, centered and isolated on a pure flat black #000000 background, with the interior space completely empty and pure black #000000 (no Buddha statue inside). The slim arch is rendered in warm metallic gold (#D9A83A) with bright highlights (#F6D57A) and deep relief shadows (#8C6516). At the bottom left and right ends sit ornate makara creatures disgorging two vertical naga bodies that rise straight up, curl sharply outward at shoulder height into prominent symmetrical crescent-shaped naga-head hooks, and continue upward into a tall pointed Gothic-like arch lined along its outer edge with intricate serrated kranok flame tongues meeting at a high finial apex.",
  },
  'backdrop': {
    aspect: '1:1', size: '1K', maxPx: 1024, quality: 55,
    prompt: TILE + "A deep black lacquer sanctuary wall surface (#141614) with a subtle satin sheen, decorated with a regular staggered diamond-grid pattern of small stenciled gold flower rosettes (dok phikun / hanging floral clusters) in warm metallic gold (#C9962C and #D9A83A). Each small floral motif is finely detailed in traditional Thai lai rot nam gilt stencil style, spaced evenly across the dark #141614 lacquer field.",
  },
  'column': {
    aspect: '1:1', size: '2K', maxPx: 1024, quality: 48,
    prompt: TILE + "A traditional Thai temple column surface in glossy black lacquer (#141614) completely covered in dense vertical rows of repeating diamond-shaped lozenge medallions in metallic gold leaf stencil (#C9962C and #D9A83A). Inside each diamond lozenge is an intricate Thai kranok flame-leaf motif pointing upward, bordered by delicate gold beaded lines and smaller interlocking floral interstices, designed to wrap cleanly around a cylinder.",
  },
  'mural': {
    aspect: '16:9', size: '2K', maxPx: 1536, quality: 55,
    prompt: PANEL + "A Rattanakosin-era (19th century) Thai Buddhist Jataka mural painting on an aged plaster wall. The composition shows traditional Thai court figures, celestial beings with pointed crowns, a classical tiered pavilion on the left, and stylized trees and rock formations on the right. Painted in an earthy mineral palette: warm ochre (#B8894F), brick red (#7E1A16), muted sage green (#3F5E3A), and deep indigo on a weathered cream plaster ground (#E6D7B4), accented with fine metallic gold leaf (#C9962C) on crowns and architecture. Subtle age craquelure. No identifiable modern faces.",
  },
  'door-pearl': {
    aspect: '9:16', size: '2K', maxPx: 1536, quality: 48,
    prompt: PANEL + "A single full-height vertical Thai temple door leaf (9:16 proportion) in polished black lacquer (#141614) inlaid with intricate late-Ayutthaya mother-of-pearl nacre (#D8E2E6 with subtle pink and green iridescence). Running down the center is a vertical column of five large circular medallions; each roundel contains a mythical Himmaphan creature surrounded by tight scrolling kranok vines and a ring of tiny nacre circle and diamond studs. Framing the central column on both left and right sides are vertical border bands of repeating diamond lozenges and dense floral scroll-work.",
  },
  'roof-tiles': {
    aspect: '1:1', size: '1K', maxPx: 1024, quality: 55,
    prompt: TILE + "Close-up architectural surface made of overlapping horizontal courses of traditional Thai glazed terracotta flat fish-scale roof tiles (krabueang klet) with pointed triangular lower tips. The ceramic tiles are finished in a rich kilned burnt-sienna and orange-red vitreous glaze (#B4472B) with subtle kiln-fired tonal variation between #9E381E and #C85636, showing fine craze lines, slight handmade undulations, and thin dark mortar overlap lines (#4A1C12) beneath each pointed row. Orthographic flat-on surface, uniform diffuse daylight, no roof edges, no sky, no text, no watermark.",
  },
  'roof-border': {
    aspect: '1:1', size: '1K', maxPx: 1024, quality: 55,
    prompt: TILE + "Traditional Thai temple glazed ceramic roof tiles in deep emerald-forest green (#3F5E3A) laid in tight overlapping horizontal rows. The tiles feature classic pointed fish-scale lower tips and a glossy ceramic glaze with subtle natural tonal shifts between dark green (#3F5E3A) and rich olive-jade, matching the exact geometry of the main roof tiles.",
  },
  'gable': {
    aspect: '4:3', size: '2K', maxPx: 1536, quality: 55,
    prompt: PANEL + "A triangular Thai temple gable panel (na ban) in carved gilded teak (#C9962C and #D9A83A), filling the 4:3 frame against a pure flat black #000000 background outside the triangle. The triangular frame is edged by gilded naga bargeboards with flame-like bai raka blades along the upper slopes and upturned hang hong naga heads at the lower corners, crowned by a chofa finial base. The interior of the triangle is divided into tiered rectangular registers of dense gilded kranok floral relief over a deep red ground (#7E1A16) and inset with dark blue glass mosaic panels.",
  },
  'bargeboard': {
    aspect: '21:9', size: '2K', maxPx: 2048, quality: 55,
    prompt: PANEL + "A horizontal architectural strip of a gilded Thai temple naga bargeboard (lamyong) isolated on a pure flat black #000000 background. The undulating body is carved in high relief and finished in bright metallic gold (#D9A83A and #F6D57A) with recessed shadows (#8C6516) and small mirror-glass inlays. Along the entire top edge runs a rhythmic row of sharp, curved flame-like fin blades (bai raka), and at the right end it terminates in a gracefully upturned five-headed naga finial (hang hong).",
  },
  'floor': {
    aspect: '1:1', size: '1K', maxPx: 1024, quality: 48,
    prompt: TILE + "Historic late-19th-century Victorian/Rama V antique encaustic ceramic floor tiles from a Thai temple nave, arranged in a regular square grid with fine dark grout lines. The intricate multi-layered pattern features ornate scalloped circular medallions, stepped diamond centers, and delicate foliate cross motifs. The overall value is predominantly dark and rich, dominated by deep espresso brown (#3A2A20), muted slate grey-blue (#3B4954), and aged terracotta-red (#7E1A16) grounds, with aged warm cream (#E6D7B4) restricted strictly to thin outline accents and tiny central floral details (no large bright cream background fields). The surface has a smooth, antique semi-gloss waxed patina with subtle age wear, under completely flat diffuse lighting with no directional shadows, no perspective, no text, no watermark.",
  },
  'carpet': {
    aspect: '1:1', size: '1K', maxPx: 768, quality: 55,
    prompt: TILE + "Close-up textile surface of a heavy woven crimson-red (#7E1A16) ceremonial temple floor runner rug. The dense low-pile wool weave displays a subtle tonal damask-like lattice of small traditional Thai floral-diamond motifs woven in deep burgundy (#58100D) and muted antique gold thread (#B88928) across the #7E1A16 red field, with a fine braided texture and light foot-traffic compression. Orthographic flat-on view, even diffuse lighting, no floor visible around it, no fringes, no folds, no text, no watermark.",
  },
  'ceiling': {
    aspect: '1:1', size: '1K', maxPx: 1024, quality: 55,
    prompt: TILE + "Traditional Thai viharn wooden ceiling coffers. A grid of dark stained teak beams with gilded trim moldings (#C9962C) frames square recessed panels painted a deep lacquer red (#7E1A16). Centered inside each red square coffer is a finely carved and gilded rosette star medallion (dao phedan) in warm metallic gold (#D9A83A and #F6D57A) surrounded by four small corner lotus buds.",
  },
  'pedestal': {
    aspect: '21:9', size: '2K', maxPx: 2048, quality: 55,
    prompt: PANEL + "Seamless horizontal trim-sheet texture filling the entire 21:9 frame edge-to-edge from top to bottom and left to right, zero studio background, strictly orthographic 2D flat front elevation with no visible top planes or perspective recession. The stepped gilded lotus throne base (chukchi) of Phra Buddha Chinnarat rendered in bright reflective warm gold leaf (#D9A83A and #F6D57A) with deep shadow crevices (#8C6516). The elevation consists of clean stacked horizontal architectural bands: an upper register of wide, smooth, classic Sukhothai/Ayutthaya upturned and downturned lotus petals (bua), a recessed waisted middle band (thong mai) inlaid with thin horizontal strips of red (#7E1A16), green (#3F5E3A), and silver mirror mosaic, and lower stepped horizontal gilded plinth mouldings. Strictly no garuda or demon caryatid figures, no diamond-trellis wooden altar panels, no curved furniture legs, no borders or margins, no text, no watermark.",
  },
  'wall': {
    aspect: '1:1', size: '1K', maxPx: 768, quality: 55,
    prompt: TILE + "Exterior whitewashed brick masonry wall (#EEE9DE) of a historic Thai temple. The surface shows hand-troweled lime plaster painted off-white (#EEE9DE) with very subtle warm undertones (#E6D7B4), gentle surface undulations, fine hairline plaster texture, and clean, minimal tropical weathering.",
  },
  'prang-gilt': {
    aspect: '1:1', size: '1K', maxPx: 1024, quality: 48,
    prompt: TILE + "The gilded exterior surface of the upper corncob tower of an Ayutthaya-style prang. Horizontal tiers of deeply carved Khmer-derived architectural mouldings, vertical ribbing, antefixes, and small shallow arched niches containing tiny relief seated Buddha figures, all covered in bright metallic gold leaf (#D9A83A) with brilliant specular highlights (#F6D57A) and deep bronze-gold crevices (#8C6516).",
  },
  'lawn': {
    aspect: '1:1', size: '1K', maxPx: 768, quality: 55,
    prompt: TILE + "Top-down view of a short, well-kept tropical lawn in central Thailand: dense green carpet grass (Axonopus) with broad soft blades in mixed fresh and deeper greens, a few slightly yellowed patches, tiny fallen leaves, sunlit.",
  },
};
