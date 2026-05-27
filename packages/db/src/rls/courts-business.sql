-- Courts business tables RLS policies
-- These tables power the Feera Courts operator dashboard.
-- Access is restricted to authenticated users (operator role).
-- courts_partners has public SELECT for the marketing site.

-- ------------------------------------------------------------------ --
--  courts_leads                                                       --
-- ------------------------------------------------------------------ --

ALTER TABLE courts_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE courts_leads FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS courts_leads_select ON courts_leads;
CREATE POLICY courts_leads_select ON courts_leads
  FOR SELECT
  USING (auth.user_id() IS NOT NULL);

DROP POLICY IF EXISTS courts_leads_insert ON courts_leads;
CREATE POLICY courts_leads_insert ON courts_leads
  FOR INSERT
  WITH CHECK (auth.user_id() IS NOT NULL);

DROP POLICY IF EXISTS courts_leads_update ON courts_leads;
CREATE POLICY courts_leads_update ON courts_leads
  FOR UPDATE
  USING (auth.user_id() IS NOT NULL);

-- ------------------------------------------------------------------ --
--  courts_deals                                                       --
-- ------------------------------------------------------------------ --

ALTER TABLE courts_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE courts_deals FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS courts_deals_select ON courts_deals;
CREATE POLICY courts_deals_select ON courts_deals
  FOR SELECT
  USING (auth.user_id() IS NOT NULL);

DROP POLICY IF EXISTS courts_deals_insert ON courts_deals;
CREATE POLICY courts_deals_insert ON courts_deals
  FOR INSERT
  WITH CHECK (auth.user_id() IS NOT NULL);

DROP POLICY IF EXISTS courts_deals_update ON courts_deals;
CREATE POLICY courts_deals_update ON courts_deals
  FOR UPDATE
  USING (auth.user_id() IS NOT NULL);

DROP POLICY IF EXISTS courts_deals_delete ON courts_deals;
CREATE POLICY courts_deals_delete ON courts_deals
  FOR DELETE
  USING (auth.user_id() IS NOT NULL);

-- ------------------------------------------------------------------ --
--  courts_projects                                                    --
-- ------------------------------------------------------------------ --

ALTER TABLE courts_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE courts_projects FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS courts_projects_select ON courts_projects;
CREATE POLICY courts_projects_select ON courts_projects
  FOR SELECT
  USING (auth.user_id() IS NOT NULL);

DROP POLICY IF EXISTS courts_projects_insert ON courts_projects;
CREATE POLICY courts_projects_insert ON courts_projects
  FOR INSERT
  WITH CHECK (auth.user_id() IS NOT NULL);

DROP POLICY IF EXISTS courts_projects_update ON courts_projects;
CREATE POLICY courts_projects_update ON courts_projects
  FOR UPDATE
  USING (auth.user_id() IS NOT NULL);

DROP POLICY IF EXISTS courts_projects_delete ON courts_projects;
CREATE POLICY courts_projects_delete ON courts_projects
  FOR DELETE
  USING (auth.user_id() IS NOT NULL);

-- ------------------------------------------------------------------ --
--  courts_project_documents                                           --
-- ------------------------------------------------------------------ --

ALTER TABLE courts_project_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE courts_project_documents FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS courts_project_documents_select ON courts_project_documents;
CREATE POLICY courts_project_documents_select ON courts_project_documents
  FOR SELECT
  USING (auth.user_id() IS NOT NULL);

DROP POLICY IF EXISTS courts_project_documents_insert ON courts_project_documents;
CREATE POLICY courts_project_documents_insert ON courts_project_documents
  FOR INSERT
  WITH CHECK (auth.user_id() IS NOT NULL);

DROP POLICY IF EXISTS courts_project_documents_update ON courts_project_documents;
CREATE POLICY courts_project_documents_update ON courts_project_documents
  FOR UPDATE
  USING (auth.user_id() IS NOT NULL);

DROP POLICY IF EXISTS courts_project_documents_delete ON courts_project_documents;
CREATE POLICY courts_project_documents_delete ON courts_project_documents
  FOR DELETE
  USING (auth.user_id() IS NOT NULL);

-- ------------------------------------------------------------------ --
--  courts_project_milestones                                          --
-- ------------------------------------------------------------------ --

ALTER TABLE courts_project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE courts_project_milestones FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS courts_project_milestones_select ON courts_project_milestones;
CREATE POLICY courts_project_milestones_select ON courts_project_milestones
  FOR SELECT
  USING (auth.user_id() IS NOT NULL);

DROP POLICY IF EXISTS courts_project_milestones_insert ON courts_project_milestones;
CREATE POLICY courts_project_milestones_insert ON courts_project_milestones
  FOR INSERT
  WITH CHECK (auth.user_id() IS NOT NULL);

DROP POLICY IF EXISTS courts_project_milestones_update ON courts_project_milestones;
CREATE POLICY courts_project_milestones_update ON courts_project_milestones
  FOR UPDATE
  USING (auth.user_id() IS NOT NULL);

DROP POLICY IF EXISTS courts_project_milestones_delete ON courts_project_milestones;
CREATE POLICY courts_project_milestones_delete ON courts_project_milestones
  FOR DELETE
  USING (auth.user_id() IS NOT NULL);

-- ------------------------------------------------------------------ --
--  courts_hardware_orders                                             --
-- ------------------------------------------------------------------ --

ALTER TABLE courts_hardware_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE courts_hardware_orders FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS courts_hardware_orders_select ON courts_hardware_orders;
CREATE POLICY courts_hardware_orders_select ON courts_hardware_orders
  FOR SELECT
  USING (auth.user_id() IS NOT NULL);

DROP POLICY IF EXISTS courts_hardware_orders_insert ON courts_hardware_orders;
CREATE POLICY courts_hardware_orders_insert ON courts_hardware_orders
  FOR INSERT
  WITH CHECK (auth.user_id() IS NOT NULL);

DROP POLICY IF EXISTS courts_hardware_orders_update ON courts_hardware_orders;
CREATE POLICY courts_hardware_orders_update ON courts_hardware_orders
  FOR UPDATE
  USING (auth.user_id() IS NOT NULL);

DROP POLICY IF EXISTS courts_hardware_orders_delete ON courts_hardware_orders;
CREATE POLICY courts_hardware_orders_delete ON courts_hardware_orders
  FOR DELETE
  USING (auth.user_id() IS NOT NULL);

-- ------------------------------------------------------------------ --
--  courts_portfolio_positions                                         --
-- ------------------------------------------------------------------ --

ALTER TABLE courts_portfolio_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE courts_portfolio_positions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS courts_portfolio_positions_select ON courts_portfolio_positions;
CREATE POLICY courts_portfolio_positions_select ON courts_portfolio_positions
  FOR SELECT
  USING (auth.user_id() IS NOT NULL);

DROP POLICY IF EXISTS courts_portfolio_positions_insert ON courts_portfolio_positions;
CREATE POLICY courts_portfolio_positions_insert ON courts_portfolio_positions
  FOR INSERT
  WITH CHECK (auth.user_id() IS NOT NULL);

DROP POLICY IF EXISTS courts_portfolio_positions_update ON courts_portfolio_positions;
CREATE POLICY courts_portfolio_positions_update ON courts_portfolio_positions
  FOR UPDATE
  USING (auth.user_id() IS NOT NULL);

DROP POLICY IF EXISTS courts_portfolio_positions_delete ON courts_portfolio_positions;
CREATE POLICY courts_portfolio_positions_delete ON courts_portfolio_positions
  FOR DELETE
  USING (auth.user_id() IS NOT NULL);

-- ------------------------------------------------------------------ --
--  courts_portfolio_distributions                                     --
-- ------------------------------------------------------------------ --

ALTER TABLE courts_portfolio_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE courts_portfolio_distributions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS courts_portfolio_distributions_select ON courts_portfolio_distributions;
CREATE POLICY courts_portfolio_distributions_select ON courts_portfolio_distributions
  FOR SELECT
  USING (auth.user_id() IS NOT NULL);

DROP POLICY IF EXISTS courts_portfolio_distributions_insert ON courts_portfolio_distributions;
CREATE POLICY courts_portfolio_distributions_insert ON courts_portfolio_distributions
  FOR INSERT
  WITH CHECK (auth.user_id() IS NOT NULL);

DROP POLICY IF EXISTS courts_portfolio_distributions_update ON courts_portfolio_distributions;
CREATE POLICY courts_portfolio_distributions_update ON courts_portfolio_distributions
  FOR UPDATE
  USING (auth.user_id() IS NOT NULL);

DROP POLICY IF EXISTS courts_portfolio_distributions_delete ON courts_portfolio_distributions;
CREATE POLICY courts_portfolio_distributions_delete ON courts_portfolio_distributions
  FOR DELETE
  USING (auth.user_id() IS NOT NULL);

-- ------------------------------------------------------------------ --
--  courts_financial_scenarios                                         --
-- ------------------------------------------------------------------ --

ALTER TABLE courts_financial_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE courts_financial_scenarios FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS courts_financial_scenarios_select ON courts_financial_scenarios;
CREATE POLICY courts_financial_scenarios_select ON courts_financial_scenarios
  FOR SELECT
  USING (auth.user_id() IS NOT NULL);

DROP POLICY IF EXISTS courts_financial_scenarios_insert ON courts_financial_scenarios;
CREATE POLICY courts_financial_scenarios_insert ON courts_financial_scenarios
  FOR INSERT
  WITH CHECK (auth.user_id() IS NOT NULL);

DROP POLICY IF EXISTS courts_financial_scenarios_update ON courts_financial_scenarios;
CREATE POLICY courts_financial_scenarios_update ON courts_financial_scenarios
  FOR UPDATE
  USING (auth.user_id() IS NOT NULL);

DROP POLICY IF EXISTS courts_financial_scenarios_delete ON courts_financial_scenarios;
CREATE POLICY courts_financial_scenarios_delete ON courts_financial_scenarios
  FOR DELETE
  USING (auth.user_id() IS NOT NULL);

-- ------------------------------------------------------------------ --
--  courts_partners (public SELECT for marketing site)                 --
-- ------------------------------------------------------------------ --

ALTER TABLE courts_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE courts_partners FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS courts_partners_select_public ON courts_partners;
CREATE POLICY courts_partners_select_public ON courts_partners
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS courts_partners_insert ON courts_partners;
CREATE POLICY courts_partners_insert ON courts_partners
  FOR INSERT
  WITH CHECK (auth.user_id() IS NOT NULL);

DROP POLICY IF EXISTS courts_partners_update ON courts_partners;
CREATE POLICY courts_partners_update ON courts_partners
  FOR UPDATE
  USING (auth.user_id() IS NOT NULL);

DROP POLICY IF EXISTS courts_partners_delete ON courts_partners;
CREATE POLICY courts_partners_delete ON courts_partners
  FOR DELETE
  USING (auth.user_id() IS NOT NULL);

-- ------------------------------------------------------------------ --
--  courts_documents_library                                           --
-- ------------------------------------------------------------------ --

ALTER TABLE courts_documents_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE courts_documents_library FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS courts_documents_library_select ON courts_documents_library;
CREATE POLICY courts_documents_library_select ON courts_documents_library
  FOR SELECT
  USING (auth.user_id() IS NOT NULL);

DROP POLICY IF EXISTS courts_documents_library_insert ON courts_documents_library;
CREATE POLICY courts_documents_library_insert ON courts_documents_library
  FOR INSERT
  WITH CHECK (auth.user_id() IS NOT NULL);

DROP POLICY IF EXISTS courts_documents_library_update ON courts_documents_library;
CREATE POLICY courts_documents_library_update ON courts_documents_library
  FOR UPDATE
  USING (auth.user_id() IS NOT NULL);

-- ------------------------------------------------------------------ --
--  courts_activity_log                                                --
-- ------------------------------------------------------------------ --

ALTER TABLE courts_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE courts_activity_log FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS courts_activity_log_select ON courts_activity_log;
CREATE POLICY courts_activity_log_select ON courts_activity_log
  FOR SELECT
  USING (auth.user_id() IS NOT NULL);

DROP POLICY IF EXISTS courts_activity_log_insert ON courts_activity_log;
CREATE POLICY courts_activity_log_insert ON courts_activity_log
  FOR INSERT
  WITH CHECK (auth.user_id() IS NOT NULL);

-- ------------------------------------------------------------------ --
--  courts_project_financials                                          --
-- ------------------------------------------------------------------ --

ALTER TABLE courts_project_financials ENABLE ROW LEVEL SECURITY;
ALTER TABLE courts_project_financials FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS courts_project_financials_select ON courts_project_financials;
CREATE POLICY courts_project_financials_select ON courts_project_financials
  FOR SELECT
  USING (auth.user_id() IS NOT NULL);

DROP POLICY IF EXISTS courts_project_financials_insert ON courts_project_financials;
CREATE POLICY courts_project_financials_insert ON courts_project_financials
  FOR INSERT
  WITH CHECK (auth.user_id() IS NOT NULL);

DROP POLICY IF EXISTS courts_project_financials_update ON courts_project_financials;
CREATE POLICY courts_project_financials_update ON courts_project_financials
  FOR UPDATE
  USING (auth.user_id() IS NOT NULL);

DROP POLICY IF EXISTS courts_project_financials_delete ON courts_project_financials;
CREATE POLICY courts_project_financials_delete ON courts_project_financials
  FOR DELETE
  USING (auth.user_id() IS NOT NULL);
