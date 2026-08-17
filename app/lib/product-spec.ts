/**
 * What a piece is, per kind of piece.
 *
 * The catalogue carries no dimensions, materials or care metafields — only
 * `Type_*`, `Material_*`, `Size_*` and `Shape_*` tags — so the page builds its
 * spec sheet from the type. Every field below is a property of the *type*, not
 * of one product: an Otis coffee table and a Bower coffee table are described
 * the same way, because that is all the catalogue knows.
 *
 * When per-product measurements land in Shopify (metafields on the product),
 * read them there and fall back to this table; nothing else has to change.
 */

import { typeFromTags } from "./swatches";

export type SpecRow = { label: string; value: string };

export type Faq = { question: string; answer: string };

export type PieceSpec = {
  /** Plural name of the type, for headings and copy. */
  plural: string;
  /** What the colourway selector is called on this type. */
  finishLabel: string;
  /** The spec sheet, before any size override. */
  dimensions: SpecRow[];
  /** Measurements that change with the `Size_*` tag, keyed by tag suffix. */
  bySize?: Record<string, SpecRow[]>;
  /** Construction notes — the "Details" panel. */
  details: string[];
  /** One line on what arrives flat and what does not. */
  assembly: string;
  /** How to look after it. */
  care: string;
  /** Types that go with this one, best first, for "Pair it with". */
  pairsWith: string[];
  /** The editorial block under the range: a headline and a paragraph. */
  intro: { title: string; body: string };
  /** The three things worth knowing, for the picture cards under the buy box. */
  highlights: Array<{ title: string; body: string }>;
  /** Questions asked about this type. The shared pair is appended to them. */
  faqs: Faq[];
};

/**
 * Asked of everything we sell, so they are appended to each type's own list
 * rather than written out seven times. Exported because the collection pages
 * end on the same two questions — there is one delivery policy, not eight.
 */
export const SHARED_FAQS: Faq[] = [
  {
    question: "Do you deliver to all states in Australia?",
    answer:
      "Yes. Everything ships from our Melbourne warehouse, and delivery is calculated per shipment at checkout \u2014 it depends on the size of the piece and how far it is going. Orders over $1,500 travel free by white-glove courier, who will carry it in, place it in the room and take the packaging away.",
  },
  {
    question: "What is the warranty and return policy?",
    answer:
      "Every frame carries a ten-year guarantee, and fabrics and finishes are covered for two years against manufacturing faults. If a piece is not right, you have thirty days from delivery to send it back for a refund, as long as it is in the condition it arrived in.",
  },
];

const SPECS: Record<string, PieceSpec> = {
  sofa: {
    plural: "Sofas",
    finishLabel: "Fabric",
    dimensions: [
      { label: "Width", value: "210 cm" },
      { label: "Depth", value: "95 cm" },
      { label: "Height", value: "78 cm" },
      { label: "Seat height", value: "43 cm" },
      { label: "Seats", value: "Three" },
    ],
    details: [
      "Kiln-dried hardwood frame, corner-blocked and dowelled.",
      "Serpentine suspension under a high-resilience foam and feather-blend seat.",
      "Removable, replaceable covers on every cushion.",
      "Solid oak legs, screwed rather than glued, so they can be swapped.",
    ],
    assembly: "Arrives fully built. The legs screw on by hand — no tools, about five minutes.",
    care: "Vacuum weekly on a low setting, rotate the cushions monthly, and blot spills rather than rubbing them.",
    pairsWith: ["coffee_table", "side_table", "ottoman"],
    intro: {
      title: "Sofas for real life",
      body:
        "A sofa is the piece a room is built around, and the one that takes the most punishment. Ours sit on kiln-dried hardwood frames with serpentine suspension, in fabrics chosen because they survive a household rather than because they photograph well. Covers come off every cushion, so a bad afternoon is a wash rather than a write-off.",
    },
    highlights: [
      {
        title: "Built to be sat on",
        body: "A kiln-dried hardwood frame over serpentine springs, under a foam and feather-blend seat. Made for the tenth year, not the photograph.",
      },
      {
        title: "Covers that come off",
        body: "Every cushion cover unzips and washes, so a spilt glass costs you an afternoon rather than a sofa.",
      },
      {
        title: "Legs you can replace",
        body: "Solid oak legs are screwed on rather than glued, so a scratched one is swapped in five minutes.",
      },
    ],
    faqs: [
      {
        question: "What is the difference between a sofa, a couch and a lounge?",
        answer:
          "Nothing, in practice. Australians say all three. Lounge is the most common here, couch travelled in from American television, and sofa is what the trade tends to write down. We say sofa on the site so the search results stay tidy.",
      },
      {
        question: "How do I choose the right sofa for my living room?",
        answer:
          "Measure the wall it will sit against and leave at least 80 cm of walking space in front of it. Then measure your doorways, your hallway and any turn on the stairs \u2014 a sofa that fits the room but not the corridor is the most common return we see. Send us the measurements if you are unsure and we will check them for you.",
      },
      {
        question: "What are the best colours for a sofa?",
        answer:
          "The ones you will not tire of. Warm neutrals \u2014 natural, oyster, chalk, haze \u2014 sit quietly under whatever else changes in a room, and they hide wear far better than a true white. If you want the sofa to be the loud thing, try it in a rug or a cushion first and live with it for a week.",
      },
      {
        question: "Is boucl\u00e9 practical with children or pets?",
        answer:
          "It is tougher than it looks: the loops are woven rather than brushed, so it does not flatten the way a velvet pile does. Claws are the real risk \u2014 a snagged loop should be trimmed flat with scissors, never pulled. If you have an enthusiastic cat, a flat-weave fabric is the safer choice.",
      },
    ],
  },
  armchair: {
    plural: "Armchairs",
    finishLabel: "Fabric",
    dimensions: [
      { label: "Width", value: "78 cm" },
      { label: "Depth", value: "82 cm" },
      { label: "Height", value: "74 cm" },
      { label: "Seat height", value: "42 cm" },
    ],
    details: [
      "Kiln-dried hardwood frame with a webbed and sprung seat platform.",
      "Moulded foam back, wrapped in a feather-blend jacket.",
      "Covers are removable for cleaning.",
      "Felted glides underfoot, so it moves without marking a floor.",
    ],
    assembly: "Arrives fully built. Legs screw on by hand where the design has them.",
    care: "Vacuum weekly on a low setting; blot spills, never rub. Keep out of direct afternoon sun.",
    pairsWith: ["ottoman", "side_table", "coffee_table"],
    intro: {
      title: "Armchairs that earn their corner",
      body:
        "An armchair has to do two things at once: hold you comfortably for an hour, and look right in the room for the other twenty-three. Ours are sized for Australian living rooms rather than showroom floors \u2014 deep enough to sink into, narrow enough that a pair still leaves room to walk past.",
    },
    highlights: [
      {
        title: "Sized for real rooms",
        body: "Deep enough to sink into, narrow enough that a pair still leaves somewhere to walk past.",
      },
      {
        title: "Sprung, not stuffed",
        body: "A webbed and sprung seat platform under moulded foam holds its shape long after a stuffed one has given up.",
      },
      {
        title: "Kind to floors",
        body: "Felted glides underfoot, so the chair moves when you want it to and marks nothing when it does.",
      },
    ],
    faqs: [
      {
        question: "How much space does an armchair need?",
        answer:
          "Allow the width of the chair plus about 30 cm either side so it does not feel wedged, and 60 cm in front for your legs and for walking past. A chair set at an angle in a corner usually reads better than one squared up to a wall.",
      },
      {
        question: "Should my armchair match my sofa?",
        answer:
          "It should not match, but it should agree. Pick up one thing the sofa is already doing \u2014 the tone of the fabric, the timber of the legs \u2014 and let everything else differ. A matched suite makes a room look bought rather than gathered.",
      },
      {
        question: "What is the difference between the fabric and the leather chairs?",
        answer:
          "Fabric is softer to sit on straight away and comes in more colours. Leather starts firmer and then breaks in: after a couple of years the tan carries a patina you cannot buy new. It also wipes clean, which matters more than it sounds.",
      },
      {
        question: "Can I see a fabric before I order?",
        answer:
          "Order the swatch wallet \u2014 up to six fabric and timber samples, free, sent in a linen wallet. Live with them for a week in your own light before you commit. Colour on a screen is a suggestion, not a promise.",
      },
    ],
  },
  ottoman: {
    plural: "Ottomans",
    finishLabel: "Fabric",
    dimensions: [
      { label: "Width", value: "60 cm" },
      { label: "Depth", value: "60 cm" },
      { label: "Height", value: "42 cm" },
    ],
    details: [
      "Hardwood frame, foam-topped and hand-upholstered.",
      "Light enough to move one-handed, firm enough to sit on.",
      "Removable cover.",
    ],
    assembly: "Arrives fully built. Nothing to assemble.",
    care: "Vacuum weekly on a low setting; blot spills rather than rubbing.",
    pairsWith: ["armchair", "sofa", "side_table"],
    intro: {
      title: "Ottomans, the most useful thing in the room",
      body:
        "An ottoman is a footrest, a spare seat, a side table with a tray on it, and the thing you move when there are more people than chairs. Light enough to shift one-handed, firm enough to sit on properly, and upholstered in the same fabrics as the seating so it never looks like an afterthought.",
    },
    highlights: [
      {
        title: "The extra seat",
        body: "Firm enough to sit on properly, light enough to carry across the room in one hand.",
      },
      {
        title: "A table with a tray",
        body: "Add a flat tray and it becomes a soft-edged coffee table — the safest surface in a house with small children.",
      },
      {
        title: "The same fabrics",
        body: "Upholstered in the seating fabrics, so it reads as part of the room rather than an afterthought.",
      },
    ],
    faqs: [
      {
        question: "How high should an ottoman be?",
        answer:
          "Level with the seat of the chair it belongs to, or a couple of centimetres below it. Any higher and your legs end up above your hips, which is comfortable for about ten minutes.",
      },
      {
        question: "Can I use an ottoman as a coffee table?",
        answer:
          "Yes, with a tray. A firm ottoman and a flat tray give you a surface that is also soft to knock into, which is worth a great deal in a room with small children.",
      },
      {
        question: "Will an ottoman work in a small room?",
        answer:
          "It is usually the best piece for one. It seats an extra person without taking a chair's footprint, and it pushes under a console or against a wall when it is not needed.",
      },
    ],
  },
  coffee_table: {
    plural: "Coffee tables",
    finishLabel: "Finish",
    dimensions: [
      { label: "Diameter", value: "90 cm" },
      { label: "Height", value: "34 cm" },
      { label: "Weight", value: "24 kg" },
    ],
    details: [
      "Solid timber top and legs — no veneer anywhere.",
      "Finished in hardwax oil, which can be re-oiled rather than resprayed.",
      "Sculptural legs, mortised into the top.",
      "Grain and tone vary piece to piece; that is the timber, not a fault.",
    ],
    assembly: "Legs bolt on with the supplied hex key — about ten minutes, two people to turn it over.",
    care: "Wipe with a barely damp cloth. Re-oil once a year, or wherever the surface starts to look dry.",
    pairsWith: ["sofa", "armchair", "side_table"],
    intro: {
      title: "A table for the middle of things",
      body:
        "Solid timber, no veneer, finished in hardwax oil so a scratch can be oiled out rather than resprayed. The shapes are round and organic on purpose: there is no corner to catch a shin on, and a round table takes a crowded room better than a rectangle does.",
    },
    highlights: [
      {
        title: "Solid timber throughout",
        body: "Top and legs in solid timber, no veneer anywhere — so an edge can be sanded back rather than replaced.",
      },
      {
        title: "A finish you can mend",
        body: "Hardwax oil soaks in rather than sitting on top. A ring or a scratch is oiled out on the spot, and the repair blends in.",
      },
      {
        title: "No corners to catch",
        body: "Round and organic on purpose: nothing to knock a shin on, and it takes a crowded room better than a rectangle.",
      },
    ],
    faqs: [
      {
        question: "How big should a coffee table be?",
        answer:
          "Around two-thirds the length of your sofa, and roughly level with the seat cushion or a little lower. Leave 40 to 45 cm between the table and the sofa \u2014 enough to walk past, close enough to reach your cup without standing up.",
      },
      {
        question: "Round or rectangular?",
        answer:
          "Round for tight rooms, walkways and households with children \u2014 nothing to catch a hip on, and it takes people from any angle. Rectangular when you have a long sofa and want the table to answer it.",
      },
      {
        question: "Will a hardwax oil finish mark?",
        answer:
          "Water and heat will mark it if they sit there, which is why we suggest a mat under anything hot. The trade-off is that the marks come out: a light sand and a re-oil on the spot, and the repair blends in. A lacquered top cannot be mended that way.",
      },
      {
        question: "How often does it need re-oiling?",
        answer:
          "Once a year for most households, or whenever the surface starts to look dry and pale rather than warm. It takes about twenty minutes and a cloth.",
      },
    ],
  },
  side_table: {
    plural: "Side tables",
    finishLabel: "Finish",
    dimensions: [
      { label: "Diameter", value: "40 cm" },
      { label: "Height", value: "52 cm" },
      { label: "Weight", value: "9 kg" },
    ],
    details: [
      "Solid timber or powder-coated steel, depending on the finish.",
      "Sized to sit beside a sofa arm or a bed without crowding it.",
      "Felted base, so it can be slid rather than lifted.",
    ],
    assembly: "Arrives fully built.",
    care: "Wipe with a barely damp cloth. Re-oil timber once a year; steel needs nothing.",
    pairsWith: ["sofa", "armchair", "ottoman"],
    intro: {
      title: "Small tables, quietly essential",
      body:
        "The table you actually use: the one holding the lamp, the glass and the book you are halfway through. Sized to sit beside a sofa arm or a bed without crowding it, in solid timber or powder-coated steel, and light enough to move when the room changes shape.",
    },
    highlights: [
      {
        title: "Beside, not in the way",
        body: "Set level with a sofa arm, so the lamp and the glass land where your hand already is.",
      },
      {
        title: "Timber or steel",
        body: "Solid timber where you want warmth, powder-coated steel where the table needs to disappear a little.",
      },
      {
        title: "Slides, never scrapes",
        body: "A felted base means you move it with a foot rather than lifting it with two hands.",
      },
    ],
    faqs: [
      {
        question: "What height should a side table be?",
        answer:
          "Level with the arm of the chair or sofa it sits beside, or within a few centimetres of it. Too low and you are reaching down for your cup; too high and it looms over the seat.",
      },
      {
        question: "Timber or steel?",
        answer:
          "Timber warms a room and takes a knock softly. Steel is slimmer for the same strength, wipes clean, and is the better answer in a small space where the table needs to disappear a little.",
      },
      {
        question: "Can a side table work beside a bed?",
        answer:
          "Often, yes \u2014 the height is usually right. What you lose is the drawer, so it suits people who keep the surface clear rather than those with a book, a charger and a glass of water all in play.",
      },
    ],
  },
  bedside_table: {
    plural: "Bedside tables",
    finishLabel: "Finish",
    dimensions: [
      { label: "Width", value: "40 cm" },
      { label: "Depth", value: "36 cm" },
      { label: "Height", value: "55 cm" },
    ],
    bySize: {
      short: [
        { label: "Width", value: "40 cm" },
        { label: "Depth", value: "36 cm" },
        { label: "Height", value: "45 cm" },
      ],
      tall: [
        { label: "Width", value: "40 cm" },
        { label: "Depth", value: "36 cm" },
        { label: "Height", value: "70 cm" },
      ],
    },
    details: [
      "Solid oak, finished in hardwax oil.",
      "One soft-close drawer, dovetailed at the corners.",
      "Sized to sit level with a standard mattress top.",
    ],
    assembly: "Arrives fully built.",
    care: "Wipe with a barely damp cloth. Re-oil once a year.",
    pairsWith: ["armchair", "ottoman", "side_table"],
    intro: {
      title: "Bedside tables that stay out of the way",
      body:
        "Solid oak, one soft-close drawer, dovetailed at the corners, and nothing else. A bedside table has one job at three in the morning, and every extra feature is something to knock over. Made in two heights, because mattresses are not all the same.",
    },
    highlights: [
      {
        title: "One quiet drawer",
        body: "Soft-close, dovetailed at the corners, and deep enough for everything you would rather not have on show.",
      },
      {
        title: "Made in two heights",
        body: "A short plinth and a tall one, because a bedside only works when it sits level with the top of your mattress.",
      },
      {
        title: "Nothing to knock over",
        body: "A flat top, a softened edge and no protruding handle — which is the whole job at three in the morning.",
      },
    ],
    faqs: [
      {
        question: "What height should a bedside table be?",
        answer:
          "Level with the top of your mattress, or within about five centimetres of it. Measure from the floor to the mattress top with the bedding on \u2014 that number, not the height of the bed frame, is the one that matters.",
      },
      {
        question: "Short or tall?",
        answer:
          "The short plinth suits a low platform bed or a mattress on a base; the tall one suits a higher frame, or anyone who would rather reach across than lean down. If you are between the two, go taller \u2014 a slightly high bedside reads deliberate, a low one reads like a mistake.",
      },
      {
        question: "Do I need a drawer?",
        answer:
          "Only if you use one. A drawer hides the charger, the reading glasses and the half-finished book; an open plinth keeps the room calm and forces you to keep it that way.",
      },
    ],
  },
  dining_table: {
    plural: "Dining tables",
    finishLabel: "Finish",
    dimensions: [
      { label: "Diameter", value: "120 cm" },
      { label: "Height", value: "75 cm" },
      { label: "Seats", value: "Four comfortably, six at a push" },
      { label: "Weight", value: "48 kg" },
    ],
    details: [
      "Solid oak top on a turned pedestal base — no leg in anyone's way.",
      "Hardwax oil finish, repairable in place.",
      "Levelling feet under the base for uneven floors.",
    ],
    assembly: "The top sits onto the base and bolts from underneath. Two people, about twenty minutes.",
    care: "Wipe with a barely damp cloth, use a mat under anything hot, and re-oil once a year.",
    pairsWith: ["armchair", "side_table", "coffee_table"],
    intro: {
      title: "A table for every version of home",
      body:
        "Solid oak on a turned pedestal base, so there is no leg where somebody's knees want to be and an extra chair can always be squeezed in. Finished in hardwax oil, which means the marks a family leaves on a table can be mended rather than lived with.",
    },
    highlights: [
      {
        title: "No leg in the way",
        body: "A turned pedestal base means an extra chair can always be squeezed in at the corner.",
      },
      {
        title: "Solid oak, oiled",
        body: "Hardwax oil is repairable in place, so the marks a family leaves are mended rather than lived with.",
      },
      {
        title: "Level on any floor",
        body: "Levelling feet under the base take out the wobble that older houses provide for free.",
      },
    ],
    faqs: [
      {
        question: "What size dining table do I need?",
        answer:
          "Allow 60 cm of table edge per person, and a metre of clear floor around the table so chairs can be pushed back. A 120 cm round table seats four comfortably and six at a push, which is the shape most Australian dining rooms actually want.",
      },
      {
        question: "Round or rectangular?",
        answer:
          "Round for conversation and for tight rooms \u2014 everyone can see everyone, and there is no corner to walk into. Rectangular when you regularly seat more than six, or when the room is long enough that a round table would leave the ends empty.",
      },
      {
        question: "Will an oak table mark?",
        answer:
          "Yes, and the finish assumes it. Hardwax oil lets you sand and re-oil a ring or a scratch in place, so the table ages rather than wears out. Use a mat under anything hot and wipe spills before they sit.",
      },
      {
        question: "Do the benches tuck underneath?",
        answer:
          "Yes. The bench height is set to clear the apron and tuck fully under, which is what makes a table workable in a room that also has to be walked through.",
      },
    ],
  },
};

/** Everything a page needs about a piece, or null for a type we do not know. */
export function specFromTags(tags: readonly string[]): PieceSpec | null {
  const type = typeFromTags(tags);
  return type ? (SPECS[type] ?? null) : null;
}

/** The type's own questions, followed by the ones asked of everything. */
export function faqsForType(type: string): Faq[] {
  const spec = SPECS[type];
  return spec ? [...spec.faqs, ...SHARED_FAQS] : [];
}

/** Look a spec up by type slug, for pages that work in types rather than tags. */
export function specForType(type: string): PieceSpec | null {
  return SPECS[type] ?? null;
}

const SIZE_TAG = /^size_(.+)$/i;

/** The spec sheet for this exact product, with any size override applied. */
export function dimensionsFromTags(tags: readonly string[]): SpecRow[] {
  const spec = specFromTags(tags);
  if (!spec) return [];

  for (const tag of tags) {
    const match = SIZE_TAG.exec(tag);
    const rows = match && spec.bySize?.[match[1].toLowerCase()];
    if (rows) return rows;
  }
  return spec.dimensions;
}
