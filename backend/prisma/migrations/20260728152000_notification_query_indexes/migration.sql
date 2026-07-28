-- Index de lecture du centre de notifications.
--
-- Les deux requêtes du centre de notifications parcouraient l'intégralité de la
-- table. Ces index partiels correspondent exactement aux deux populations
-- servies, et n'indexent donc chacun qu'une fraction des lignes.
--
-- Mesures sur 30 000 notifications réparties entre 50 techniciens :
--
-- 1. Notifications d'un technicien — le destinataire est porté par le champ JSON
--    `metadata`, qu'un index ordinaire ne peut pas exploiter. Sans cet index,
--    la requête lisait les 10 000 notifications d'attribution pour en écarter
--    9 800.
--      avant : 7,4 ms   après : 0,9 ms
--
-- 2. Alertes de supervision (tout sauf les attributions) — une condition de
--    différence n'est pas indexable sur une colonne ordinaire ; l'index partiel
--    la matérialise et le tri par date devient un simple parcours.
--      avant : 10,3 ms  après : 0,06 ms
--
-- L'écart croît avec l'historique, qui n'est jamais purgé.
--
-- Ces index sont volontairement partiels et portés par des migrations plutôt
-- que par le schéma Prisma, qui ne sait exprimer ni les conditions partielles
-- ni les index sur expression JSON.

-- 1. Notifications d'attribution, filtrées par technicien destinataire
CREATE INDEX IF NOT EXISTS "notifications_technicien_idx"
  ON "notifications" ((metadata->>'technicienId'), "created_at" DESC)
  WHERE "type" = 'new_intervention';

-- 2. Alertes de supervision destinées aux gestionnaires et administrateurs
CREATE INDEX IF NOT EXISTS "notifications_supervision_idx"
  ON "notifications" ("created_at" DESC)
  WHERE "type" <> 'new_intervention';
