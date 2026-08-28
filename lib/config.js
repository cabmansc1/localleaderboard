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
// Rank is by total. Boost count is what the board shows biggest.
export const total = (l) => Number(l.self_bid || 0) + Number(l.boost_total || 0);

export const money = (n) =>
  '$' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });

export const slug = (s) =>
  String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// The six mechanisms, shown on /how-it-works.
export const MECHANISMS = [
  ['📊', 'Ranking',
   'Businesses are ranked by total raised: their own bid plus everything their customers added. Top of each category is the King.'],
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
  'Ranking is determined by total raised: the business own entry bid plus customer boosts.',
  `A business must bid on itself to appear here, minimum $${RULES.MIN_ENTRY}. That bid is its consent to be listed and printed.`,
  `Anyone can boost a business already on the board, minimum $${RULES.MIN_BOOST}. You cannot boost a business that has not entered.`,
  'All bids and boosts are final and non-refundable, except where refunds are required by law.',
  'One listing per business. Duplicate listings will be merged or removed.',
  'Bidding closes 10 days before print. Every ad is approved by the business before it runs.',
  'The month one holder gets the featured panel. Second and third get standard panels at credit. Fourth and below rolls over or converts to digital placement.',
  'We may remove any listing that misrepresents a business, is not a real operating business, or violates these rules.'
];
