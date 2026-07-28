import { defineConfig } from "vitest/config";

// Tests unitaires : accès Prisma simulés, aucune base de données requise.
// Les tests d'intégration vivent dans src/integration et disposent de leur
// propre configuration (vitest.integration.config.ts).
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    exclude: ["src/integration/**", "node_modules/**", "dist/**"],
  },
});
