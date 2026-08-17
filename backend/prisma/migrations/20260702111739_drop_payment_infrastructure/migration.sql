-- Remove TODA a infraestrutura de pagamentos (Asaas/carteira/saque/payout/webhook).
-- Fluxo novo: organizador marca manualmente quem pagou (status CONFIRMED + paidAt).
-- SQL defensivo (IF EXISTS) pois o DB dev estava dessincronizado do schema
-- (tabelas/cols de versões antigas: PayoutAccount, Withdrawal, asaasApiKeyEnc, etc.).

-- 1. Converter inscrições pendentes de pagamento (no-op se tabela vazia, mas seguro).
UPDATE "Registration" SET status = 'PENDING_CONFIRMATION' WHERE status = 'PENDING_PAYMENT';

-- 2. Dropper colunas de pagamento da Registration (manter paidAt).
ALTER TABLE "Registration" DROP COLUMN IF EXISTS "paymentId";
ALTER TABLE "Registration" DROP COLUMN IF EXISTS "paymentStatus";
ALTER TABLE "Registration" DROP COLUMN IF EXISTS "paymentMethod";
ALTER TABLE "Registration" DROP COLUMN IF EXISTS "paymentGateway";
ALTER TABLE "Registration" DROP COLUMN IF EXISTS "asaasPaymentId";

-- 3. Dropper colunas Asaas do User.
ALTER TABLE "User" DROP COLUMN IF EXISTS "asaasCustomerId";
ALTER TABLE "User" DROP COLUMN IF EXISTS "asaasWalletId";
ALTER TABLE "User" DROP COLUMN IF EXISTS "asaasKycStatus";
ALTER TABLE "User" DROP COLUMN IF EXISTS "asaasStatus";
ALTER TABLE "User" DROP COLUMN IF EXISTS "asaasStatusCheckedAt";
ALTER TABLE "User" DROP COLUMN IF EXISTS "asaasApiKeyEnc";
ALTER TABLE "User" DROP COLUMN IF EXISTS "pixKey";

-- 4. Dropper tabelas de pagamento/payout/saque (CASCADE: Withdrawal tem FK p/ PayoutAccount).
DROP TABLE IF EXISTS "withdrawals";
DROP TABLE IF EXISTS "wallet_transactions";
DROP TABLE IF EXISTS "asaas_events";
DROP TABLE IF EXISTS "wallets";
DROP TABLE IF EXISTS "Withdrawal" CASCADE;
DROP TABLE IF EXISTS "PayoutAccount" CASCADE;

-- 5. Recriar enum RegistrationStatus sem PENDING_PAYMENT (compatível com qualquer versão do PG).
ALTER TYPE "RegistrationStatus" RENAME TO "RegistrationStatus_old";
CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING_CONFIRMATION', 'CONFIRMED', 'CANCELLED', 'REJECTED');
ALTER TABLE "Registration" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Registration" ALTER COLUMN "status" TYPE "RegistrationStatus" USING "status"::text::"RegistrationStatus";
ALTER TABLE "Registration" ALTER COLUMN "status" SET DEFAULT 'PENDING_CONFIRMATION';
DROP TYPE "RegistrationStatus_old";

-- 6. Dropper enums de pagamento não usados.
DROP TYPE IF EXISTS "AsaasKycStatus";
DROP TYPE IF EXISTS "AsaasAccountStatus";
DROP TYPE IF EXISTS "WalletTransactionType";
DROP TYPE IF EXISTS "WithdrawalStatus";
DROP TYPE IF EXISTS "PayoutType";
