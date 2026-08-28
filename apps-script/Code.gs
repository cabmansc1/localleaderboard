/**
 * LOCAL TOP SPOT — Google Sheets backend
 *
 * This is the database. Paste this into Extensions > Apps Script on your sheet,
 * then Deploy > New deployment > Web app > Execute as ME > Access: ANYONE.
 * Copy the /exec URL into SHEETS_URL in your .env.
 *
 * Two tabs are required. Run setupSheets() once and it builds them for you.
 */

var SECRET = 'CHANGE_ME_TO_A_LONG_RANDOM_STRING'; // must match SHEETS_SECRET in .env

var LISTINGS_HEADERS = [
  'id', 'name', 'category', 'town', 'contact_email', 'phone',
  'self_bid', 'boost_total', 'boost_count', 'status', 'created_at'
];
var BIDS_HEADERS = [
  'bid_id', 'listing_id', 'type', 'amount', 'booster_name',
  'booster_email', 'stripe_session', 'created_at'
];

/** Run this ONCE from the Apps Script editor to build the tabs. */
function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureTab_(ss, 'Listings', LISTINGS_HEADERS);
  ensureTab_(ss, 'Bids', BIDS_HEADERS);
}

function ensureTab_(ss, name, headers) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
  sh.setFrozenRows(1);
  return sh;
}

/* ------------------------------------------------------------------ */
/* READ: the public board                                              */
/* ------------------------------------------------------------------ */

function doGet(e) {
  try {
    var rows = readTab_('Listings');
    // Only live listings are shown publicly.
    var live = rows.filter(function (r) { return r.status === 'live'; });
    return json_({ ok: true, listings: live });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

/* ------------------------------------------------------------------ */
/* WRITE: only ever called by the Stripe webhook, never the browser    */
/* ------------------------------------------------------------------ */

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    // Serialize writes so two boosts landing at once cannot clobber each other.
    lock.waitLock(20000);

    var body = JSON.parse(e.postData.contents);
    if (body.secret !== SECRET) return json_({ ok: false, error: 'bad secret' });

    if (body.action === 'entry') return json_(createListing_(body));
    if (body.action === 'boost') return json_(addBoost_(body));
    return json_({ ok: false, error: 'unknown action' });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (ignored) {}
  }
}

/** A business bids itself onto the board. This is the opt-in. */
function createListing_(b) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('Listings');
  var rows = readTab_('Listings');

  // Idempotency: Stripe can deliver the same webhook twice.
  var already = findBySession_('Bids', b.stripe_session);
  if (already) return { ok: true, duplicate: true, listing_id: already.listing_id };

  var id = 'L' + Date.now() + Math.floor(Math.random() * 1000);
  sh.appendRow([
    id, b.name, b.category, b.town, b.contact_email || '', b.phone || '',
    Number(b.amount), 0, 0, 'live', new Date()
  ]);
  logBid_(id, 'entry', b);
  return { ok: true, listing_id: id };
}

/** A customer boosts a business that is ALREADY on the board. */
function addBoost_(b) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('Listings');

  var already = findBySession_('Bids', b.stripe_session);
  if (already) return { ok: true, duplicate: true };

  var data = sh.getDataRange().getValues();
  var head = data[0];
  var iId = head.indexOf('id');
  var iTotal = head.indexOf('boost_total');
  var iCount = head.indexOf('boost_count');

  for (var r = 1; r < data.length; r++) {
    if (String(data[r][iId]) === String(b.listing_id)) {
      var newTotal = Number(data[r][iTotal] || 0) + Number(b.amount);
      var newCount = Number(data[r][iCount] || 0) + 1;
      sh.getRange(r + 1, iTotal + 1).setValue(newTotal);
      sh.getRange(r + 1, iCount + 1).setValue(newCount);
      logBid_(b.listing_id, 'boost', b);
      return { ok: true, boost_total: newTotal, boost_count: newCount };
    }
  }
  // Enforces the core rule server side: you cannot boost what is not listed.
  return { ok: false, error: 'listing not found' };
}

function logBid_(listingId, type, b) {
  SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Bids').appendRow([
    'B' + Date.now() + Math.floor(Math.random() * 1000),
    listingId, type, Number(b.amount),
    b.booster_name || '', b.booster_email || '', b.stripe_session || '', new Date()
  ]);
}

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function readTab_(name) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) return [];
  var data = sh.getDataRange().getValues();
  if (data.length < 2) return [];
  var head = data[0];
  return data.slice(1).map(function (row) {
    var o = {};
    head.forEach(function (h, i) { o[h] = row[i]; });
    return o;
  });
}

function findBySession_(tab, session) {
  if (!session) return null;
  var rows = readTab_(tab);
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].stripe_session === session) return rows[i];
  }
  return null;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
