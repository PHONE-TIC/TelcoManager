-- Normalisation des numéros de série et durcissement de l'index unique.
--
-- Contexte : l'index unique partiel précédent portait sur lower("numero_serie")
-- sans trim. Deux saisies du même matériel physique (" sn123 " et "SN123")
-- pouvaient donc coexister, dupliquant le parc et rendant l'une des deux lignes
-- invisible aux recherches par numéro de série.

-- 1. Préflight : détecter les collisions que la normalisation ferait apparaître.
--    On échoue explicitement plutôt que de fusionner ou supprimer des lignes
--    automatiquement : l'arbitrage entre deux doublons est une décision métier.
DO $$
DECLARE
  conflicts text;
BEGIN
  SELECT string_agg(sn, ', ')
  INTO conflicts
  FROM (
    SELECT upper(trim("numero_serie")) AS sn
    FROM "stock"
    WHERE trim("numero_serie") <> ''
    GROUP BY upper(trim("numero_serie"))
    HAVING count(*) > 1
  ) AS duplicates;

  IF conflicts IS NOT NULL THEN
    RAISE EXCEPTION 'DB_PREFLIGHT_FAIL: numéros de série en doublon une fois normalisés : %. Fusionnez ou corrigez ces lignes de la table "stock" avant de rejouer la migration.', conflicts;
  END IF;
END $$;

-- 2. Normaliser les valeurs déjà en base sur la forme canonique (trim + majuscules).
UPDATE "stock"
SET "numero_serie" = upper(trim("numero_serie"))
WHERE "numero_serie" <> upper(trim("numero_serie"));

-- 3. Aligner la traçabilité des équipements d'intervention sur la même forme.
UPDATE "intervention_equipments"
SET "serial_number" = upper(trim("serial_number"))
WHERE "serial_number" IS NOT NULL
  AND "serial_number" <> upper(trim("serial_number"));

-- 4. Remplacer l'index unique par une version insensible aux espaces parasites.
DROP INDEX IF EXISTS "stock_numero_serie_unique_not_empty";

CREATE UNIQUE INDEX "stock_numero_serie_unique_not_empty"
  ON "stock" (upper(trim("numero_serie")))
  WHERE trim("numero_serie") <> '';
