-- Carry delegation experience: device registrations for hand-back-only notifications
CREATE TABLE IF NOT EXISTS carry_push_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_key text NOT NULL DEFAULT 'alpha-local',
  expo_push_token text NOT NULL UNIQUE,
  platform text,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS carry_push_devices_owner_enabled_idx
  ON carry_push_devices (owner_key, enabled, last_seen_at DESC);
