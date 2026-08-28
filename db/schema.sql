-- Local Top Spot schema.
-- Safe to run repeatedly; every statement is guarded.

CREATE TABLE IF NOT EXISTS listings (
  id            TEXT PRIMARY KEY,
  name          TEXT        NOT NULL,
  category      TEXT        NOT NULL,
  town          TEXT        NOT NULL,
  contact_email TEXT        NOT NULL DEFAULT '',
  phone         TEXT        NOT NULL DEFAULT '',
  -- Money is stored in whole cents. Never float.
  self_bid      BIGINT      NOT NULL DEFAULT 0 CHECK (self_bid >= 0),
  boost_total   BIGINT      NOT NULL DEFAULT 0 CHECK (boost_total >= 0),
  boost_count   INTEGER     NOT NULL DEFAULT 0 CHECK (boost_count >= 0),
  status        TEXT        NOT NULL DEFAULT 'live',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bids (
  bid_id         BIGSERIAL   PRIMARY KEY,
  listing_id     TEXT        NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  type           TEXT        NOT NULL CHECK (type IN ('entry', 'boost')),
  amount         BIGINT      NOT NULL CHECK (amount > 0),
  booster_name   TEXT        NOT NULL DEFAULT '',
  booster_email  TEXT        NOT NULL DEFAULT '',
  -- The whole idempotency story. Stripe delivers webhooks more than once;
  -- the second insert simply violates this and is discarded.
  stripe_session TEXT        UNIQUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The board is always read in this order, so let the index do the sorting.
CREATE INDEX IF NOT EXISTS listings_rank_idx
  ON listings ((self_bid + boost_total) DESC, created_at ASC)
  WHERE status = 'live';

CREATE INDEX IF NOT EXISTS listings_category_idx ON listings (category) WHERE status = 'live';
CREATE INDEX IF NOT EXISTS listings_town_idx     ON listings (town)     WHERE status = 'live';
CREATE INDEX IF NOT EXISTS bids_listing_idx      ON bids (listing_id);

-- The live feed reads the newest bids first.
CREATE INDEX IF NOT EXISTS bids_recent_idx ON bids (created_at DESC);
