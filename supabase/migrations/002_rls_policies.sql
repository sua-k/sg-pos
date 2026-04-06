-- ============================================================
-- RLS Policies — Defense-in-depth for direct Supabase access
-- Prisma uses service role and bypasses RLS.
-- ============================================================

-- Helper: extract branch_id from JWT
CREATE OR REPLACE FUNCTION public.requesting_branch_id()
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT coalesce(
    (current_setting('request.jwt.claims', true)::jsonb ->> 'branch_id'),
    ''
  )
$$;

-- Helper: extract user_role from JWT
CREATE OR REPLACE FUNCTION public.requesting_user_role()
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT coalesce(
    (current_setting('request.jwt.claims', true)::jsonb ->> 'user_role'),
    'staff'
  )
$$;

-- ── Enable RLS on all tables ──────────────────────────────

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_layers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_layer_consumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zoho_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliation_matches ENABLE ROW LEVEL SECURITY;

-- ── BRANCHES ──────────────────────────────────────────────

CREATE POLICY "branches_select" ON public.branches
  FOR SELECT TO authenticated
  USING (
    requesting_user_role() = 'admin'
    OR id = requesting_branch_id()
  );

-- ── USERS ─────────────────────────────────────────────────

CREATE POLICY "users_select" ON public.users
  FOR SELECT TO authenticated
  USING (
    requesting_user_role() = 'admin'
    OR branch_id = requesting_branch_id()
  );

CREATE POLICY "users_modify" ON public.users
  FOR ALL TO authenticated
  USING (requesting_user_role() = 'admin')
  WITH CHECK (requesting_user_role() = 'admin');

-- ── PRODUCTS (shared catalog, admin/manager can modify) ───

CREATE POLICY "products_select" ON public.products
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "products_modify" ON public.products
  FOR ALL TO authenticated
  USING (requesting_user_role() IN ('admin', 'manager'))
  WITH CHECK (requesting_user_role() IN ('admin', 'manager'));

-- ── CATEGORIES ────────────────────────────────────────────

CREATE POLICY "categories_select" ON public.categories
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "categories_modify" ON public.categories
  FOR ALL TO authenticated
  USING (requesting_user_role() IN ('admin', 'manager'))
  WITH CHECK (requesting_user_role() IN ('admin', 'manager'));

-- ── SUPPLIERS ─────────────────────────────────────────────

CREATE POLICY "suppliers_select" ON public.suppliers
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "suppliers_modify" ON public.suppliers
  FOR ALL TO authenticated
  USING (requesting_user_role() IN ('admin', 'manager'))
  WITH CHECK (requesting_user_role() IN ('admin', 'manager'));

-- ── INVENTORY (branch-scoped) ─────────────────────────────

CREATE POLICY "inventory_select" ON public.inventory
  FOR SELECT TO authenticated
  USING (
    requesting_user_role() = 'admin'
    OR branch_id = requesting_branch_id()
  );

CREATE POLICY "inventory_modify" ON public.inventory
  FOR ALL TO authenticated
  USING (requesting_user_role() IN ('admin', 'manager'))
  WITH CHECK (requesting_user_role() IN ('admin', 'manager'));

-- ── STOCK ADJUSTMENTS (branch-scoped via inventory) ───────

CREATE POLICY "stock_adjustments_select" ON public.stock_adjustments
  FOR SELECT TO authenticated
  USING (
    requesting_user_role() = 'admin'
    OR branch_id = requesting_branch_id()
  );

CREATE POLICY "stock_adjustments_modify" ON public.stock_adjustments
  FOR ALL TO authenticated
  USING (requesting_user_role() IN ('admin', 'manager'))
  WITH CHECK (requesting_user_role() IN ('admin', 'manager'));

-- ── COST LAYERS (branch-scoped) ───────────────────────────

CREATE POLICY "cost_layers_select" ON public.cost_layers
  FOR SELECT TO authenticated
  USING (
    requesting_user_role() = 'admin'
    OR branch_id = requesting_branch_id()
  );

CREATE POLICY "cost_layers_modify" ON public.cost_layers
  FOR ALL TO authenticated
  USING (requesting_user_role() IN ('admin', 'manager'))
  WITH CHECK (requesting_user_role() IN ('admin', 'manager'));

-- ── COST LAYER CONSUMPTIONS ───────────────────────────────

CREATE POLICY "cost_layer_consumptions_select" ON public.cost_layer_consumptions
  FOR SELECT TO authenticated
  USING (
    requesting_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.cost_layers cl
      WHERE cl.id = cost_layer_id AND cl.branch_id = requesting_branch_id()
    )
  );

-- ── PURCHASES (branch-scoped via user) ────────────────────

CREATE POLICY "purchases_select" ON public.purchases
  FOR SELECT TO authenticated
  USING (
    requesting_user_role() = 'admin'
    OR branch_id = requesting_branch_id()
  );

CREATE POLICY "purchases_modify" ON public.purchases
  FOR ALL TO authenticated
  USING (requesting_user_role() IN ('admin', 'manager'))
  WITH CHECK (requesting_user_role() IN ('admin', 'manager'));

-- ── PURCHASE ITEMS ────────────────────────────────────────

CREATE POLICY "purchase_items_select" ON public.purchase_items
  FOR SELECT TO authenticated
  USING (
    requesting_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.purchases p
      WHERE p.id = purchase_id AND p.branch_id = requesting_branch_id()
    )
  );

-- ── CUSTOMERS (shared across branches) ────────────────────

CREATE POLICY "customers_select" ON public.customers
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "customers_modify" ON public.customers
  FOR ALL TO authenticated
  USING (requesting_user_role() IN ('admin', 'manager', 'staff'))
  WITH CHECK (requesting_user_role() IN ('admin', 'manager', 'staff'));

-- ── PRESCRIPTIONS (branch-scoped) ─────────────────────────

CREATE POLICY "prescriptions_select" ON public.prescriptions
  FOR SELECT TO authenticated
  USING (
    requesting_user_role() = 'admin'
    OR branch_id = requesting_branch_id()
  );

CREATE POLICY "prescriptions_modify" ON public.prescriptions
  FOR ALL TO authenticated
  USING (requesting_user_role() IN ('admin', 'manager', 'staff'))
  WITH CHECK (requesting_user_role() IN ('admin', 'manager', 'staff'));

-- ── PRESCRIBERS ───────────────────────────────────────────

CREATE POLICY "prescribers_select" ON public.prescribers
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "prescribers_modify" ON public.prescribers
  FOR ALL TO authenticated
  USING (requesting_user_role() IN ('admin', 'manager'))
  WITH CHECK (requesting_user_role() IN ('admin', 'manager'));

-- ── TRANSACTIONS (branch-scoped) ──────────────────────────

CREATE POLICY "transactions_select" ON public.transactions
  FOR SELECT TO authenticated
  USING (
    requesting_user_role() = 'admin'
    OR branch_id = requesting_branch_id()
  );

CREATE POLICY "transactions_modify" ON public.transactions
  FOR ALL TO authenticated
  USING (
    requesting_user_role() = 'admin'
    OR branch_id = requesting_branch_id()
  )
  WITH CHECK (
    requesting_user_role() = 'admin'
    OR branch_id = requesting_branch_id()
  );

-- ── TRANSACTION ITEMS ─────────────────────────────────────

CREATE POLICY "transaction_items_select" ON public.transaction_items
  FOR SELECT TO authenticated
  USING (
    requesting_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = transaction_id AND t.branch_id = requesting_branch_id()
    )
  );

-- ── TRANSACTION PRESCRIPTIONS ─────────────────────────────

CREATE POLICY "transaction_prescriptions_select" ON public.transaction_prescriptions
  FOR SELECT TO authenticated
  USING (
    requesting_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = transaction_id AND t.branch_id = requesting_branch_id()
    )
  );

-- ── CASH SESSIONS (branch-scoped) ─────────────────────────

CREATE POLICY "cash_sessions_select" ON public.cash_sessions
  FOR SELECT TO authenticated
  USING (
    requesting_user_role() = 'admin'
    OR branch_id = requesting_branch_id()
  );

CREATE POLICY "cash_sessions_modify" ON public.cash_sessions
  FOR ALL TO authenticated
  USING (
    requesting_user_role() = 'admin'
    OR branch_id = requesting_branch_id()
  )
  WITH CHECK (
    requesting_user_role() = 'admin'
    OR branch_id = requesting_branch_id()
  );

-- ── STOCK TRANSFERS ───────────────────────────────────────

CREATE POLICY "stock_transfers_select" ON public.stock_transfers
  FOR SELECT TO authenticated
  USING (
    requesting_user_role() = 'admin'
    OR from_branch_id = requesting_branch_id()
    OR to_branch_id = requesting_branch_id()
  );

CREATE POLICY "stock_transfers_modify" ON public.stock_transfers
  FOR ALL TO authenticated
  USING (requesting_user_role() IN ('admin', 'manager'))
  WITH CHECK (requesting_user_role() IN ('admin', 'manager'));

-- ── ZOHO SYNC LOG (admin only) ────────────────────────────

CREATE POLICY "zoho_sync_log_select" ON public.zoho_sync_log
  FOR SELECT TO authenticated
  USING (requesting_user_role() = 'admin');

CREATE POLICY "zoho_sync_log_modify" ON public.zoho_sync_log
  FOR ALL TO authenticated
  USING (requesting_user_role() = 'admin')
  WITH CHECK (requesting_user_role() = 'admin');

-- ── BANK TRANSACTIONS (admin only) ────────────────────────

CREATE POLICY "bank_transactions_select" ON public.bank_transactions
  FOR SELECT TO authenticated
  USING (requesting_user_role() = 'admin');

CREATE POLICY "bank_transactions_modify" ON public.bank_transactions
  FOR ALL TO authenticated
  USING (requesting_user_role() = 'admin')
  WITH CHECK (requesting_user_role() = 'admin');

-- ── RECONCILIATION MATCHES (admin only) ───────────────────

CREATE POLICY "reconciliation_matches_select" ON public.reconciliation_matches
  FOR SELECT TO authenticated
  USING (requesting_user_role() = 'admin');

CREATE POLICY "reconciliation_matches_modify" ON public.reconciliation_matches
  FOR ALL TO authenticated
  USING (requesting_user_role() = 'admin')
  WITH CHECK (requesting_user_role() = 'admin');
