-- CreateEnum
CREATE TYPE "VolleyballPosition" AS ENUM ('LEVANTADOR', 'PONTEIRO', 'OPOSTO', 'CENTRAL', 'LIBERO', 'PONTA');

-- AlterTable
ALTER TABLE "TeamInvitation" ADD COLUMN     "positions" "VolleyballPosition"[] DEFAULT ARRAY[]::"VolleyballPosition"[];

-- AlterTable: add new positions column (drop of legacy `position` happens after data migration)
ALTER TABLE "TeamMember" ADD COLUMN     "positions" "VolleyballPosition"[] DEFAULT ARRAY[]::"VolleyballPosition"[];

-- Data migration: copy legacy single-position string into the new positions array.
-- Only known values are mapped; rows with typos/unknown values keep the empty default.
UPDATE "TeamMember" SET "positions" = ARRAY[
  CASE "position"
    WHEN 'Levantador' THEN 'LEVANTADOR'::"VolleyballPosition"
    WHEN 'Ponteiro' THEN 'PONTEIRO'::"VolleyballPosition"
    WHEN 'Oposto' THEN 'OPOSTO'::"VolleyballPosition"
    WHEN 'Central' THEN 'CENTRAL'::"VolleyballPosition"
    WHEN 'Líbero' THEN 'LIBERO'::"VolleyballPosition"
    WHEN 'Ponta' THEN 'PONTA'::"VolleyballPosition"
  END
]
WHERE "position" IN ('Levantador', 'Ponteiro', 'Oposto', 'Central', 'Líbero', 'Ponta');

-- AlterTable: drop legacy column now that data has been migrated
ALTER TABLE "TeamMember" DROP COLUMN "position";
