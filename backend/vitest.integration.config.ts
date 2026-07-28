import { defineConfig } from "vitest/config";

// Tests d'intégration : montent l'application Express complète contre une
// véritable base PostgreSQL. Ils vérifient ce que les tests unitaires ne
// peuvent pas voir — routage, validation express-validator, middlewares
// d'autorisation et contraintes réelles de la base.
//
// La base ciblée est effacée entre chaque cas : elle doit être dédiée aux
// tests. Un garde-fou dans global-setup.ts refuse toute URL dont le nom de
// base ne contient pas « test ».
const DEFAULT_TEST_DATABASE_URL =
  "postgresql://stock_user:stock_password@localhost:5433/telcomanager_test?schema=public";

process.env.DATABASE_URL = process.env.DATABASE_URL || DEFAULT_TEST_DATABASE_URL;
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "integration-test-secret";

export default defineConfig({
  test: {
    include: ["src/integration/**/*.test.ts"],
    globalSetup: ["src/integration/global-setup.ts"],
    env: {
      DATABASE_URL: process.env.DATABASE_URL,
      NODE_ENV: "test",
      JWT_SECRET: process.env.JWT_SECRET,
    },
    // Les suites partagent la même base : elles doivent s'exécuter en série.
    fileParallelism: false,
    sequence: { concurrent: false },
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
