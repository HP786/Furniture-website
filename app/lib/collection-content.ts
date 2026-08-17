/**
 * What a collection page says after the grid: a short piece of copy beside a
 * photograph, then the questions people ask before they buy from that shelf.
 *
 * Every collection page gets both, and no page is allowed to fall through to
 * nothing — a handle this file has never heard of takes the store-wide answers.
 * Where a collection is a kind of piece, the copy and the questions come from
 * `product-spec.ts` rather than being written a second time here: the sofa
 * shelf and a sofa's own page should not disagree about sofas.
 */

import { EDITORIAL_IMAGES } from "./navigation";
import { ROOM_IMAGE_OVERRIDES } from "./rooms";
import { SHARED_FAQS, specForType, type Faq } from "./product-spec";

export type CollectionStory = {
  overline: string;
  title: string;
  body: string;
  image: { url: string; altText: string };
};

/**
 * Collection handle to piece type. Matched on the tail of the handle, so the
 * material shelves under a type — `boucle-armchairs`, `steel-side-tables` —
 * inherit that type's copy without an entry each. Order matters: `side-tables`
 * has to be read before anything shorter could claim it.
 */
const TYPE_BY_SUFFIX: ReadonlyArray<readonly [RegExp, string]> = [
  [/(^|-)sofas$/, "sofa"],
  [/(^|-)armchairs$/, "armchair"],
  [/(^|-)ottomans$/, "ottoman"],
  [/(^|-)coffee-tables$/, "coffee_table"],
  [/(^|-)side-tables$/, "side_table"],
  [/(^|-)bedside-tables$/, "bedside_table"],
  [/(^|-)dining-tables$/, "dining_table"],
];

/** The piece type this collection sells, or null where it is a room or a mood. */
export function typeForCollection(handle: string): string | null {
  for (const [pattern, type] of TYPE_BY_SUFFIX) {
    if (pattern.test(handle)) return type;
  }
  return null;
}

const STORE_IMAGE = EDITORIAL_IMAGES.bandVisit;

/** The photograph beside the copy, per collection. Never the banner's own. */
const STORY_IMAGES: Record<string, { url: string; altText: string }> = {
  "living-room-1": EDITORIAL_IMAGES.hero,
  "dining-room-1": EDITORIAL_IMAGES.bandLook,
  "bedroom-1": ROOM_IMAGE_OVERRIDES["bedroom-1"],
  outdoor: ROOM_IMAGE_OVERRIDES.outdoor,
  bathroom: ROOM_IMAGE_OVERRIDES.bathroom,

  "long-afternoons": EDITORIAL_IMAGES.hero,
  "soft-texture": EDITORIAL_IMAGES.bandVisit,
  "warm-timber": EDITORIAL_IMAGES.bandLook,
  "pale-and-quiet": EDITORIAL_IMAGES.editorialColour,
  "lived-in-leather": EDITORIAL_IMAGES.featureLeather,
  "small-spaces": EDITORIAL_IMAGES.editorialColour,

  sofa: EDITORIAL_IMAGES.hero,
  armchair: EDITORIAL_IMAGES.featureLeather,
  ottoman: { url: "/editorial/ottoman.webp", altText: "A bouclé ottoman on a wool rug" },
  coffee_table: EDITORIAL_IMAGES.editorialColour,
  side_table: EDITORIAL_IMAGES.editorialColour,
  bedside_table: ROOM_IMAGE_OVERRIDES["bedroom-1"],
  dining_table: EDITORIAL_IMAGES.bandLook,

  chairs: EDITORIAL_IMAGES.featureLeather,
  tables: EDITORIAL_IMAGES.bandLook,
};

/** Copy for the shelves that are not a kind of piece. */
const STORIES: Record<string, Omit<CollectionStory, "image">> = {
  "living-room-1": {
    overline: "Living room",
    title: "The room you actually live in",
    body: "A living room has to hold a Tuesday night and a full house on Saturday, usually with the same four pieces. Start with the sofa and the walkway around it — 80 cm to get past comfortably — then let the tables follow. Everything here is sized for Australian rooms rather than for showroom floors, and it is all made to be sat on rather than looked at.",
  },
  "dining-room-1": {
    overline: "Dining room",
    title: "A table is a decision you make once",
    body: "Allow 60 cm of edge per person and a metre of clear floor for chairs to push back, and the rest is finish and shape. Solid oak on a pedestal base means no leg where somebody's knees want to be, and a hardwax oil finish means the marks a family leaves can be sanded and oiled out rather than lived with.",
  },
  "bedroom-1": {
    overline: "Bedroom",
    title: "Quiet, and nothing you do not need",
    body: "A bedroom asks for fewer pieces than any other room and punishes the wrong height more than any other. Measure from the floor to the top of your mattress with the bedding on — that number, not the height of the frame, is the one a bedside table has to match. We make ours short and tall for exactly that reason.",
  },
  outdoor: {
    overline: "Outdoor",
    title: "Where the inside stops",
    body: "Everything we make is built for indoors: kiln-dried hardwood frames, hardwax-oiled timber and upholstery that does not want weather. A covered verandah out of the rain and the western sun is as far outside as any of it should go. If you want a piece to live properly outdoors, tell us and we will point you somewhere honest.",
  },
  bathroom: {
    overline: "Bathroom",
    title: "Timber in a wet room",
    body: "Oiled timber survives a bathroom as long as the room is ventilated and the piece is not sitting in splash range — a stool by the bath, a small plinth for towels. Wipe standing water rather than letting it sit, re-oil once a year instead of every second year, and it will age the way the rest of the house does.",
  },

  "long-afternoons": {
    overline: "Curated",
    title: "Pieces chosen to sit together",
    body: "A curated collection is not a matched suite. These are pieces that agree — the same warmth of timber, fabrics within a shade or two of each other — so you can take two or three from here and know the room will hold together. Mix them with what you already own; nothing in this collection needs the rest of it.",
  },
  "soft-texture": {
    overline: "Curated",
    title: "Bouclé, and what it is really like",
    body: "Bouclé is tougher than it looks: the loops are woven rather than brushed, so it does not flatten the way a velvet pile does. Claws are the real risk, and a snagged loop should be trimmed flat with scissors rather than pulled. Vacuum weekly on a low setting, blot spills rather than rubbing them, and every cover here comes off to be washed.",
  },
  "warm-timber": {
    overline: "Curated",
    title: "Solid timber, no veneer",
    body: "Everything on this shelf is solid timber finished in hardwax oil, which soaks in rather than sitting on top. That is the whole argument for it: a ring or a scratch is sanded and oiled on the spot and the repair blends in, where a lacquered top has to be stripped and resprayed. Grain and tone vary piece to piece — that is the timber, not a fault.",
  },
  "pale-and-quiet": {
    overline: "Curated",
    title: "The colours you will not tire of",
    body: "Warm neutrals — natural, oyster, chalk, haze — sit quietly under whatever else changes in a room, and they hide wear far better than a true white. If you want the room to be loud, do it in a rug or a cushion you can change your mind about. Order the swatch wallet and live with the tones in your own light for a week first.",
  },
  "lived-in-leather": {
    overline: "Curated",
    title: "Leather gets better, then keeps going",
    body: "Leather starts firmer than fabric and then breaks in: after a couple of years the tan carries a patina you cannot buy new. It also wipes clean, which matters more than it sounds in a house with children. Keep it out of direct afternoon sun, feed it once a year, and it will outlast everything else in the room.",
  },
  "small-spaces": {
    overline: "Curated",
    title: "Small rooms, measured properly",
    body: "In a small room the piece that fits is the one that got measured twice — the wall, the doorway, the hallway and any turn on the stairs. Round tables beat rectangles where people have to walk past, an ottoman seats someone without taking a chair's footprint, and legs you can see under make a room read larger than a solid base does.",
  },

  chairs: {
    overline: "Seating",
    title: "Somewhere to sit, and somewhere to put your feet",
    body: "An armchair has to hold you comfortably for an hour and look right in the room for the other twenty-three; an ottoman turns it into the seat you actually stay in. Ours share frames, fabrics and glides, so a chair and an ottoman bought a year apart still read as a pair.",
  },
  tables: {
    overline: "Tables",
    title: "One finish, four heights",
    body: "Coffee, side, bedside and dining — all in the same solid timbers under the same hardwax oil, so the pieces in a room agree without matching. Each is sized against the thing it sits beside: level with the sofa arm, a little below the seat cushion, level with the top of your mattress.",
  },

  "shop-all": {
    overline: "Walnur",
    title: "Made in small runs, from solid timber and honest cloth",
    body: "We have made furniture in Melbourne since 2011: kiln-dried hardwood frames, solid timber tops with no veneer anywhere, and covers that come off to be washed. Every frame carries a ten-year guarantee, samples are free, and you have thirty days from delivery to change your mind.",
  },
};

const STORE_STORY = STORIES["shop-all"];

/** The copy and photograph for this collection. Never null — see the file note. */
export function storyForCollection(handle: string): CollectionStory {
  const type = typeForCollection(handle);
  const spec = type ? specForType(type) : null;

  if (spec) {
    return {
      overline: spec.plural,
      title: spec.intro.title,
      body: spec.intro.body,
      image: (type && STORY_IMAGES[type]) || STORE_IMAGE,
    };
  }

  const story = STORIES[handle] ?? STORE_STORY;
  return { ...story, image: STORY_IMAGES[handle] ?? STORE_IMAGE };
}

/** Questions for the shelves that are not a kind of piece. */
const FAQS: Record<string, Faq[]> = {
  "living-room-1": [
    {
      question: "How do I lay out a living room?",
      answer:
        "Start with the sofa against the longest usable wall, then leave at least 80 cm of walking space in front of it and 40 to 45 cm between it and the coffee table — close enough to reach your cup without standing up. Everything else is arranged around that walkway rather than around the television.",
    },
    {
      question: "Should the sofa and armchairs match?",
      answer:
        "They should agree, not match. Pick up one thing the sofa is already doing — the tone of the fabric, the timber of the legs — and let everything else differ. A fully matched suite makes a room look bought rather than gathered.",
    },
    {
      question: "What size rug goes under a living room setting?",
      answer:
        "Large enough that the front legs of every seat sit on it. A rug that floats between the pieces makes the room read smaller and shifts underfoot; one that reaches under the seating ties the group together.",
    },
    {
      question: "Will it fit through my door?",
      answer:
        "Measure the doorway, the hallway and any turn on the stairs before you order — a sofa that fits the room but not the corridor is the most common return we see. Send us the measurements and we will check them against the piece for you.",
    },
  ],
  "dining-room-1": [
    {
      question: "What size dining table do I need?",
      answer:
        "Allow 60 cm of table edge per person and a metre of clear floor around it so chairs can be pushed back. A 120 cm round table seats four comfortably and six at a push, which is the shape most Australian dining rooms actually want.",
    },
    {
      question: "Round or rectangular?",
      answer:
        "Round for conversation and for tight rooms — everyone can see everyone and there is no corner to walk into. Rectangular when you regularly seat more than six, or when the room is long enough that a round table would leave the ends empty.",
    },
    {
      question: "Which timber is best for a dining table?",
      answer:
        "Solid oak, for our money: hard enough to take daily use, pale enough to sit under any palette, and open-grained so a repair blends in. What matters more than the species is that it is solid rather than veneered, because only solid timber can be sanded back.",
    },
    {
      question: "How do I look after an oiled table?",
      answer:
        "Wipe with a barely damp cloth, use a mat under anything hot, and re-oil once a year or whenever the surface starts to look dry and pale rather than warm. It takes about twenty minutes and a cloth.",
    },
  ],
  "bedroom-1": [
    {
      question: "What height should a bedside table be?",
      answer:
        "Level with the top of your mattress, or within about five centimetres of it. Measure from the floor to the mattress top with the bedding on — that number, not the height of the bed frame, is the one that matters. We make a short plinth and a tall one for that reason.",
    },
    {
      question: "What furniture actually belongs in a bedroom?",
      answer:
        "Less than you think. A bedside each, somewhere to put clothes down, and — if the room takes it — a chair in the corner. Every extra surface in a bedroom becomes storage for things that should be somewhere else.",
    },
    {
      question: "Do I need a drawer in a bedside table?",
      answer:
        "Only if you use one. A drawer hides the charger, the reading glasses and the half-finished book; an open plinth keeps the room calm and forces you to keep it that way.",
    },
    {
      question: "Which finishes suit a bedroom?",
      answer:
        "Warm neutrals and open-grained timber, because you see them first thing in the morning in whatever light the room has. Pale oak and chalk tones lift a dark room; a smoke oak settles a bright one.",
    },
  ],
  outdoor: [
    {
      question: "Can I use this furniture outside?",
      answer:
        "No — everything we make is built for indoors. A covered verandah, out of the rain and the western sun, is as far outside as any of it should go. Left in weather, an oiled top will grey and lift and an upholstered piece will hold damp.",
    },
    {
      question: "What about a sunroom or a covered deck?",
      answer:
        "Both are fine if the piece stays dry. Keep timber out of direct afternoon sun, which fades a finish unevenly, and re-oil once a year rather than every second year. Bring cushions in when the weather turns.",
    },
    {
      question: "Do you make an outdoor range?",
      answer:
        "Not yet. When we do it will be because we have found a timber and a fabric that survive an Australian summer honestly, rather than because there was a gap in the catalogue.",
    },
  ],
  bathroom: [
    {
      question: "Will timber survive a bathroom?",
      answer:
        "In a ventilated room, yes. Keep the piece out of splash range, wipe standing water rather than letting it sit, and re-oil once a year. Hardwax oil soaks into the timber rather than sitting on top of it, so humidity does not lift it the way it lifts a lacquer.",
    },
    {
      question: "What pieces work in a bathroom?",
      answer:
        "Small ones with air under them: a stool beside the bath, a plinth for folded towels, a side table for everything that would otherwise sit on the edge of the basin. Anything upholstered is a bad idea in a room that gets steamed twice a day.",
    },
    {
      question: "How do I stop water marks?",
      answer:
        "Blot rather than wipe, and deal with them early. On an oiled finish a ring is sanded lightly and re-oiled on the spot, and the repair blends in — which is the whole reason we finish timber this way.",
    },
  ],

  "long-afternoons": [
    {
      question: "What makes this a collection?",
      answer:
        "The pieces were chosen to sit together: the same warmth of timber, fabrics within a shade or two of each other, and scale that works in one room. It is not a matched suite, and nothing here needs the rest of it to make sense.",
    },
    {
      question: "Can I mix pieces from different collections?",
      answer:
        "Yes, and most rooms read better for it. Keep one thing consistent — the timber tone or the fabric family — and let the shapes differ. That is what stops a room looking like a catalogue page.",
    },
    {
      question: "Can I see the fabrics and finishes first?",
      answer:
        "Order the swatch wallet: up to six fabric and timber samples, free, sent in a linen wallet. Live with them for a week in your own light before you commit — colour on a screen is a suggestion, not a promise.",
    },
  ],
  "soft-texture": [
    {
      question: "Is bouclé practical with children or pets?",
      answer:
        "It is tougher than it looks: the loops are woven rather than brushed, so it does not flatten the way a velvet pile does. Claws are the real risk — a snagged loop should be trimmed flat with scissors, never pulled. If you have an enthusiastic cat, a flat-weave fabric is the safer choice.",
    },
    {
      question: "How do I clean bouclé?",
      answer:
        "Vacuum weekly on a low setting with the upholstery head, and blot spills rather than rubbing them. Every cover on this shelf comes off, so a bad afternoon is a wash rather than a write-off.",
    },
    {
      question: "Does bouclé pill?",
      answer:
        "A new piece will shed a little in the first months, which is loose fibre working its way out rather than the weave breaking down. Vacuum it off; it settles.",
    },
  ],
  "warm-timber": [
    {
      question: "Is this solid timber or veneer?",
      answer:
        "Solid, everywhere — tops, legs and edges. It costs more and weighs more, and it is the only reason a scratched surface can be sanded back rather than replaced.",
    },
    {
      question: "Why does the colour vary between pieces?",
      answer:
        "Because it is timber. Grain and tone vary board to board and darken slightly with light over the first year. Two pieces bought a year apart will settle into each other rather than match on day one.",
    },
    {
      question: "How often does an oiled finish need redoing?",
      answer:
        "Once a year for most households, or whenever the surface starts to look dry and pale rather than warm. Twenty minutes and a cloth, and it can be done on the spot rather than in a workshop.",
    },
  ],
  "pale-and-quiet": [
    {
      question: "Do pale fabrics mark easily?",
      answer:
        "Less than a true white, which is exactly why these tones exist. Warm neutrals hide wear and dust far better, and every cover here comes off to be washed. Blot spills rather than rubbing them and most of them never become marks.",
    },
    {
      question: "Will a pale room feel cold?",
      answer:
        "Not if the neutrals are warm ones. Natural, oyster and chalk carry enough yellow to sit comfortably against timber; it is the blue-greys that read as cold under Australian light.",
    },
    {
      question: "How do I choose between the tones?",
      answer:
        "Order the swatch wallet and put the samples against your floor and your walls, in the morning and again at four in the afternoon. Screens flatten the differences between these four; daylight does not.",
    },
  ],
  "lived-in-leather": [
    {
      question: "How does leather age?",
      answer:
        "It starts firmer than fabric and then breaks in. After a couple of years the tan carries a patina you cannot buy new, and the seat takes the shape of the people who use it. That is the point of it.",
    },
    {
      question: "How do I care for leather?",
      answer:
        "Keep it out of direct afternoon sun, wipe it with a dry cloth, and feed it with a leather conditioner once a year. Spills wipe off, which matters more than it sounds in a house with children.",
    },
    {
      question: "Will it scratch?",
      answer:
        "Yes, and it should. These are aniline-finished hides rather than a coated leather, so a scratch buffs out with a thumb and the surface keeps its character. A fully coated leather resists marks and never develops any.",
    },
  ],
  "small-spaces": [
    {
      question: "How do I choose furniture for a small room?",
      answer:
        "Measure the wall, the doorway, the hallway and any turn on the stairs, then leave 80 cm of walkway before you spend the rest. Legs you can see under make a room read larger than a solid base does, and a round table takes a tight room better than a rectangle.",
    },
    {
      question: "What is the most useful piece in a small room?",
      answer:
        "An ottoman. It seats an extra person without taking a chair's footprint, holds your feet the rest of the time, becomes a side table with a tray on it, and pushes under a console when it is not needed.",
    },
    {
      question: "Two-seat sofa or a pair of armchairs?",
      answer:
        "Two chairs in a small room, most of the time — they can be angled, moved and split across the space, where a sofa commits an entire wall. A sofa wins when someone actually lies on it.",
    },
  ],

  chairs: [
    {
      question: "How much space does an armchair need?",
      answer:
        "Allow the width of the chair plus about 30 cm either side so it does not feel wedged, and 60 cm in front for your legs and for walking past. A chair set at an angle in a corner usually reads better than one squared up to a wall.",
    },
    {
      question: "How high should an ottoman be?",
      answer:
        "Level with the seat of the chair it belongs to, or a couple of centimetres below it. Any higher and your legs end up above your hips, which is comfortable for about ten minutes.",
    },
    {
      question: "Fabric or leather?",
      answer:
        "Fabric is softer to sit on straight away and comes in more colours. Leather starts firmer, then breaks in and wipes clean. If the chair is the one you will read in every night, sit in both before deciding.",
    },
  ],
  tables: [
    {
      question: "What height should each table be?",
      answer:
        "A coffee table sits level with the sofa cushion or a little below it; a side table level with the arm beside it; a bedside table level with the top of your mattress. Get the height right and the shape mostly looks after itself.",
    },
    {
      question: "How big should a coffee table be?",
      answer:
        "Around two-thirds the length of your sofa, with 40 to 45 cm between the two — enough to walk past, close enough to reach your cup without standing up.",
    },
    {
      question: "Do the finishes match across the tables?",
      answer:
        "They agree rather than match. Every top here is solid timber under the same hardwax oil, so pieces bought at different times settle into each other as they age.",
    },
  ],

  "shop-all": [
    {
      question: "Where is your furniture made?",
      answer:
        "In small runs, from kiln-dried hardwood frames and solid timber with no veneer anywhere. We have worked out of Melbourne since 2011, and everything ships from our warehouse here.",
    },
    {
      question: "Can I see a fabric or a timber before I order?",
      answer:
        "Order the swatch wallet — up to six fabric and timber samples, free, sent in a linen wallet. Live with them for a week in your own light before you commit.",
    },
    {
      question: "How do I know a piece will fit?",
      answer:
        "Measure the room, then the doorway, the hallway and any turn on the stairs. Every dimension we hold is on the product page; send us your measurements and we will check them against the piece before you order.",
    },
  ],
};

/**
 * The questions for this collection, ending on the two that are asked of
 * everything. A type shelf takes its type's questions; a room or a mood takes
 * its own; anything unrecognised takes the store's.
 */
export function faqsForCollection(handle: string): Faq[] {
  const type = typeForCollection(handle);
  const spec = type ? specForType(type) : null;
  const own = spec ? spec.faqs : (FAQS[handle] ?? FAQS["shop-all"]);
  return [...own, ...SHARED_FAQS];
}
