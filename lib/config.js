// Everything you are likely to want to change lives here.

export const RULES = {
  MIN_ENTRY: 10,   // dollars a business must bid on itself to get on the board
  MIN_BOOST: 2,    // dollars anyone else can add to a listed business
  MAX_AMOUNT: 5000 // sanity cap so a typo cannot charge someone $50,000
};

export const TOWNS = [
  'Mount Pleasant',
  'West Ashley',
  'James Island',
  'Downtown Charleston',
  'North Charleston',
  'Summerville',
  'Daniel Island',
  'Johns Island',
  'Goose Creek',
  'Isle of Palms'
];

export const CATEGORIES = [
  'Roofing', 'HVAC', 'Plumbing', 'Electrical', 'Landscaping',
  'Pest Control', 'Cleaning', 'Pressure Washing', 'Auto Repair',
  'Dental', 'Med Spa', 'Pools', 'Garage Doors', 'Restaurants'
];

// Total raised = what the business put up + what its customers added.
// The Crown is ranked by total. Category crowns are not — see below.
export const total = (l) => Number(l.self_bid || 0) + Number(l.boost_total || 0);

// Two different games on one board.
//
// The Crown goes to the most money raised: that is the auction, and it buys
// the featured panel. A category crown goes to the most CUSTOMER BOOSTS,
// which is a popularity contest a business with loyal regulars can win
// without the biggest budget.
//
// This split is also what keeps the badges honest. "Most-backed" is a claim
// about how many customers put money behind a business, which is true.
// "Number one" off the back of the largest self-bid would not be.
export const byBoosts = (a, b) =>
  b.boost_count - a.boost_count ||
  total(b) - total(a) ||
  new Date(a.created_at) - new Date(b.created_at);

// A business nobody has boosted is not the most-backed anything, however
// much it bid on itself. Categories with no boosts simply have no crown.
export const MIN_BOOSTS_FOR_CROWN = 1;

/** category name -> the listing holding its crown. */
export const categoryLeaders = (listings) => {
  const best = new Map();
  for (const l of listings) {
    if (Number(l.boost_count || 0) < MIN_BOOSTS_FOR_CROWN) continue;
    const held = best.get(l.category);
    if (!held || byBoosts(l, held) < 0) best.set(l.category, l);
  }
  return best;
};

export const isCategoryKing = (listing, listings) =>
  categoryLeaders(listings).get(listing?.category)?.id === listing?.id;

export const money = (n) =>
  '$' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });

// Boosters type their own name into a public form. Show a first name and an
// initial — enough to feel like a real neighbour, not a full identity.
export const shortName = (n) => {
  const parts = String(n || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'Someone';
  if (parts.length === 1) return parts[0].slice(0, 24);
  return `${parts[0].slice(0, 20)} ${parts[parts.length - 1][0].toUpperCase()}.`;
};

export const slug = (s) =>
  String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// The six mechanisms, shown on /how-it-works.
export const MECHANISMS = [
  ['📊', 'Two crowns',
   'The Crown goes to the most raised overall — own bid plus customer boosts. A category crown goes to the most customer boosts, so the business with the most regulars behind it wins its category even without the biggest budget.'],
  ['💰', 'Entry bid',
   `A business bids itself onto the board from $${RULES.MIN_ENTRY}. That bid is the opt-in. Nobody gets printed on the card without putting their own money in first.`],
  ['🙌', 'Customer boosts',
   `Once a business is listed, anyone can push it up from $${RULES.MIN_BOOST}. Your regulars decide who wins, not just who has the biggest budget.`],
  ['🎲', 'Random spotlight',
   'Every hour, three businesses are featured regardless of bid. Being small does not mean being invisible.'],
  ['💎', 'Underdogs',
   'Businesses on the board 72 hours or longer with fewer than three boosts. A shortcut to the ones nobody has noticed yet.'],
  ['⚔️', 'Dethroned alerts',
   'When someone passes you, you get an email. Defend the crown or let it go.']
];

export const RULES_LIST = [
  'The Crown is determined by total raised: the business own entry bid plus customer boosts.',
  'A category crown is determined by number of customer boosts, not dollars. A business with no boosts holds no category crown.',
  `A business must bid on itself to appear here, minimum $${RULES.MIN_ENTRY}. That bid is its consent to be listed and printed.`,
  `Anyone can boost a business already on the board, minimum $${RULES.MIN_BOOST}. You cannot boost a business that has not entered.`,
  'All bids and boosts are final and non-refundable, except where refunds are required by law.',
  'One listing per business. Duplicate listings will be merged or removed.',
  'Bidding closes 10 days before print. Every ad is approved by the business before it runs.',
  'The month Crown holder gets the featured panel. Second and third get standard panels at credit. Fourth and below rolls over or converts to digital placement.',
  'Every category crown holder gets a line in the category strip on the card, a named mention in the monthly email, a social post, and a shareable badge. Badges state what they measure and carry the month they were earned.',
  'We may remove any listing that misrepresents a business, is not a real operating business, or violates these rules.'
];
