-- DropTable
-- Stripe removed; payment migrated to Asaas (wallet/subconta). See
-- docs/asaas-spike-findings.md. Equivalent idempotency now lives in
-- the asaas_events table (added in 20260618170000_add_asaas_wallet).
DROP TABLE IF EXISTS "stripe_events";
