import { execSync } from "node:child_process";

/**
 * Prépare le schéma de la base de test une seule fois pour l'ensemble des
 * suites d'intégration.
 *
 * DATABASE_URL doit pointer sur une base dédiée : les tests la vident entre
 * chaque cas. La variable est lue telle quelle, sans valeur de repli, pour
 * qu'une mauvaise configuration échoue franchement plutôt que d'effacer
 * silencieusement une base de développement.
 */
export default function setup() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL doit être défini pour les tests d'intégration. " +
        "Utilisez une base dédiée : son contenu est effacé entre les tests."
    );
  }

  if (!/test/i.test(databaseUrl)) {
    throw new Error(
      `Garde-fou : la base ciblée par les tests d'intégration doit contenir « test » dans son nom, ` +
        `afin d'écarter tout risque d'effacer une base de développement ou de production. ` +
        `Reçu : ${databaseUrl.replace(/:\/\/[^@]*@/, "://***@")}`
    );
  }

  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: process.env,
  });
}
