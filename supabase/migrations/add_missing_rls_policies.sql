-- ============================================================
-- Missing RLS write policies for campaign_calls and deal_matches
-- Run in: Supabase Dashboard > SQL Editor > New Query
-- ============================================================

-- ─── campaign_calls ─────────────────────────────────────────
-- Campaign owners can insert calls (e.g. queuing from the app)
create policy "Campaign owners can insert calls"
  on campaign_calls for insert
  with check (
    auth.uid() = (select user_id from campaigns where id = campaign_id)
  );

-- Campaign owners can update their own call records
create policy "Campaign owners can update calls"
  on campaign_calls for update
  using (
    auth.uid() = (select user_id from campaigns where id = campaign_id)
  );

-- ─── deal_matches ───────────────────────────────────────────
-- Deal owners can insert matches for their own deals
create policy "Deal owners can insert matches"
  on deal_matches for insert
  with check (
    auth.uid() = (select user_id from deals where id = deal_id)
  );

-- Deal owners can update match status on their deals
create policy "Deal owners can update matches"
  on deal_matches for update
  using (
    auth.uid() = (select user_id from deals where id = deal_id)
  );

-- Buyers can update their own match status (e.g. mark as interested/passed)
create policy "Buyers can update own match status"
  on deal_matches for update
  using (auth.uid() = buyer_id);
