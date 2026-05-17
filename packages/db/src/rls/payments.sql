-- payments + payouts
-- Read if payer or payee user, or club staff of the payee club. No client inserts.

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payments_select_payer ON payments;
CREATE POLICY payments_select_payer ON payments
  FOR SELECT
  USING (payer_user_id = auth.user_id());

DROP POLICY IF EXISTS payments_select_payee ON payments;
CREATE POLICY payments_select_payee ON payments
  FOR SELECT
  USING (payee_user_id = auth.user_id());

DROP POLICY IF EXISTS payments_select_payee_club_staff ON payments;
CREATE POLICY payments_select_payee_club_staff ON payments
  FOR SELECT
  USING (
    payee_club_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM club_staff cs
      WHERE cs.club_id = payments.payee_club_id
        AND cs.user_id = auth.user_id()
        AND cs.is_active = true
        AND cs.role IN ('owner', 'manager')
    )
  );

DROP POLICY IF EXISTS payments_write_service ON payments;
CREATE POLICY payments_write_service ON payments
  FOR ALL
  USING (auth.role() IN ('service_role', 'admin'))
  WITH CHECK (auth.role() IN ('service_role', 'admin'));

ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payouts_select_payee ON payouts;
CREATE POLICY payouts_select_payee ON payouts
  FOR SELECT
  USING (payee_user_id = auth.user_id());

DROP POLICY IF EXISTS payouts_select_payee_club_staff ON payouts;
CREATE POLICY payouts_select_payee_club_staff ON payouts
  FOR SELECT
  USING (
    payee_club_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM club_staff cs
      WHERE cs.club_id = payouts.payee_club_id
        AND cs.user_id = auth.user_id()
        AND cs.is_active = true
        AND cs.role IN ('owner', 'manager')
    )
  );

DROP POLICY IF EXISTS payouts_write_service ON payouts;
CREATE POLICY payouts_write_service ON payouts
  FOR ALL
  USING (auth.role() IN ('service_role', 'admin'))
  WITH CHECK (auth.role() IN ('service_role', 'admin'));
