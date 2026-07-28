# 📝 Notes de Passation & Dette Technique — TelcoManager

Ce document consigne les points de dette technique identifiés lors de l'audit de mai 2026. Ils concernent des choix historiques d'architecture, des écarts de cohérence fonctionnelle mineurs et des simplifications futures recommandées.

---

## 📊 État au 28 juillet 2026

| Point | Sujet | État |
| --- | --- | --- |
| C1 | Triple mécanisme de Service Worker | ✅ Résolu |
| C2 | `moveToHS` non transactionnel & perte du numéro de série | ✅ Résolu |
| C3 | Normalisation manquante sur le retrait d'intervention | ✅ Résolu |
| C4 | Absence de `stockMovement` sur installations/retraits | ⏳ Ouvert — arbitrage produit requis |
| C5 | Méthodes mortes de l'API Inventaire | ✅ Résolu |
| C6 | Incohérences documentaires | ✅ Résolu |

Le détail de chaque point est conservé ci-dessous à titre d'historique.

---

## 🚀 Synthèse des Écarts Identifiés

### C1 — Triple mécanisme de Service Worker (PWA)
L'application comporte actuellement des mécanismes redondants d'enregistrement et de gestion du Service Worker :
- `webapp/vite.config.ts` configure `vite-plugin-pwa` avec l'option `autoUpdate`.
- `webapp/src/main.tsx` et `webapp/src/hooks/useNotifications.ts` effectuent des enregistrements manuels du script `/sw.js`.
- `ReloadPrompt.tsx` s'appuie sur le hook `useRegisterSW` fourni par le plugin.

> [!WARNING]
> **Risque de conflits** : Ces mécanismes risquent de se faire concurrence ou de s'écraser selon le mode de build, pouvant rendre les notifications push web instables.
> **Action recommandée** : Transitionner vers une stratégie unique, idéalement en adoptant le mode `injectManifest` de `vite-plugin-pwa` pour y regrouper proprement l'ensemble des handlers de push dans un Service Worker source unifié.

> [!TIP]
> **✅ Résolu (juillet 2026)** : les deux enregistrements manuels de `/sw.js` ont été supprimés. Le hook `useRegisterSW` de `vite-plugin-pwa`, utilisé par `ReloadPrompt`, est désormais l'unique mécanisme ; les appels qui en dépendaient s'appuient sur `navigator.serviceWorker.ready`. Le passage à `injectManifest` reste envisageable si des handlers de push sur mesure deviennent nécessaires.

---

### C2 — `moveToHS` non transactionnel & Perte de traçabilité des numéros de série
Dans `backend/src/services/stock-write.service.ts` :
- L'opération de déplacement d'un article vers le stock Hors Service (HS) effectue une lecture, une décrémentation et une création séparées au lieu d'utiliser un bloc transactionnel `prisma.$transaction`.
- Pour le matériel sérialisé (avec `numeroSerie`), l'opération crée une ligne HS générique en omettant de conserver le numéro de série d'origine.

> [!NOTE]
> **Action recommandée** : Lors de la prochaine refonte de ce module, encapsuler l'opération dans une transaction Prisma interactive et aligner la structure pour conserver `numeroSerie`, de la même manière que le flux de stock véhicule technicien le fait déjà.

> [!TIP]
> **✅ Résolu (juillet 2026)** : `moveStockToHs` est encapsulé dans `prisma.$transaction`. Un article sérialisé bascule sa ligne d'origine en HS — ce qui conserve son numéro de série et évite de violer l'index unique — tandis qu'un article non sérialisé est agrégé sur la ligne HS correspondante en conservant marque, modèle et fournisseur. Le déplacement partiel d'un article sérialisé est refusé, et l'opération journalise désormais un `stockMovement`.

---

### C3 — Normalisation manquante sur le flux de Retrait d'Intervention
Dans `backend/src/services/intervention-equipment.service.ts` :
- Lors de la création d'un équipement de retrait, la valeur `numeroSerie: input.serialNumber || ""` est insérée sans nettoyage de caractères (`trim().toUpperCase()`).
- L'index unique PostgreSQL partiel portant sur `lower(numero_serie)` n'applique pas de `trim`. Deux saisies comme `" SN123 "` et `"SN123"` peuvent ainsi coexister en base, contournant la contrainte de déduplication.

> [!TIP]
> **Action recommandée** : Centraliser un helper unique `normalizeSerialNumber` (effectuant le `.trim().toUpperCase()`) et l'appliquer uniformément dans tous les flux d'écriture (création manuelle, import CSV, retraits d'intervention et transfert HS).

> [!TIP]
> **✅ Résolu (juillet 2026)** : le helper `normalizeSerialNumber` de `backend/src/utils/serial.ts` est appliqué à tous les flux d'écriture, et l'index unique partiel porte désormais sur `upper(trim(numero_serie))` — la contrainte n'est donc plus contournable par des espaces parasites, y compris en écriture SQL directe. Le défaut était reproductible avant correction ; il est couvert par des tests de non-régression.

---

### C4 — Absence de `stockMovement` pour les Installations/Retraits d'Intervention *(ouvert)*
- Les flux d'installation et de retrait d'équipements sur intervention modifient directement les tables `technicianStock` et `clientEquipment` sans journaliser d'entrées dans la table d'audit centralisée `stockMovement`.
- Actuellement, ces opérations ne sont tracées que via la table de liaison `interventionEquipment`.

> [!NOTE]
> **Action recommandée** : Une décision produit doit arbitrer si `stockMovement` doit constituer le journal d'audit universel de l'application. Si oui, intégrer l'écriture de mouvements de stock transactionnels dans le service d'équipements d'interventions.

---

### C5 — Méthodes mortes de l'API Inventaire côté Frontend
Dans `webapp/src/services/api.service.ts` :
- Plusieurs endpoints historiques sont déclarés (`/inventaire/session/start`, `/session/:id/add`, `/sessions/:id/finish`) alors que le backend expose un routage moderne et restructuré (`/sessions`, `/sessions/:id/items`, `/sessions/:id/finalize`).
- Bien que ces méthodes frontend obsolètes ne soient pas appelées par l'interface courante, elles induisent en erreur.

> [!TIP]
> **Action recommandée** : Supprimer purement et simplement ces déclarations inutilisées dans le service d'API frontend pour simplifier la base de code.

> [!TIP]
> **✅ Résolu (juillet 2026)** : les trois méthodes ont été supprimées. Elles étaient inutilisées et pointaient de surcroît vers des routes que le backend n'expose pas.

---

### C6 — Incohérences Documentation (README & Liens)
- Le badge de statut de la stack technique dans `README.md` utilisait une option de style Shields.io invalide (`style=flat-sounding`).
- Un lien vers le fichier de variables d'environnement `.env.example` pointait vers un chemin local absolu sur la machine de développement (`file:///home/...`).

> [!x] **Corrigé** : Ces deux anomalies documentaires ont été immédiatement rectifiées (style de badge corrigé en `flat-square` et lien converti en chemin relatif propre).
