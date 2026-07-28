import { describe, it, expect } from "vitest";
import { normalizeSerialNumber, parseSerialNumbers } from "./utils/serial";

describe("Normalisation des numéros de série", () => {
  describe("normalizeSerialNumber", () => {
    it("supprime les espaces parasites et force les majuscules", () => {
      expect(normalizeSerialNumber("  sn-test-001  ")).toBe("SN-TEST-001");
    });

    it("produit la même valeur canonique quelles que soient casse et espaces", () => {
      const variantes = ["SN123", "sn123", " sn123 ", "  Sn123", "sN123  "];
      const normalisees = new Set(variantes.map(normalizeSerialNumber));
      expect(normalisees.size).toBe(1);
      expect([...normalisees][0]).toBe("SN123");
    });

    it("renvoie une chaîne vide pour null, undefined ou une saisie blanche", () => {
      expect(normalizeSerialNumber(null)).toBe("");
      expect(normalizeSerialNumber(undefined)).toBe("");
      expect(normalizeSerialNumber("   ")).toBe("");
    });

    it("conserve les séparateurs internes du numéro de série", () => {
      expect(normalizeSerialNumber(" ab-12_34/56 ")).toBe("AB-12_34/56");
    });
  });

  describe("parseSerialNumbers", () => {
    it("découpe et normalise une saisie multiple séparée par des virgules", () => {
      expect(parseSerialNumbers(" sn1 , sn2,SN3 ")).toEqual(["SN1", "SN2", "SN3"]);
    });

    it("accepte les retours à la ligne comme séparateurs", () => {
      expect(parseSerialNumbers("sn1\n  sn2  \nsn3")).toEqual(["SN1", "SN2", "SN3"]);
    });

    it("écarte les entrées vides issues de séparateurs consécutifs", () => {
      expect(parseSerialNumbers("sn1,,  ,\nsn2")).toEqual(["SN1", "SN2"]);
    });

    it("renvoie un tableau vide pour une saisie absente", () => {
      expect(parseSerialNumbers(null)).toEqual([]);
      expect(parseSerialNumbers(undefined)).toEqual([]);
      expect(parseSerialNumbers("")).toEqual([]);
    });

    it("expose les doublons après normalisation pour permettre leur détection en amont", () => {
      // Le service de création s'appuie sur cette propriété pour refuser une
      // saisie multiple contenant deux fois le même matériel physique.
      const series = parseSerialNumbers(" sn123 , SN123 ");
      expect(series).toEqual(["SN123", "SN123"]);
      expect(new Set(series).size).not.toBe(series.length);
    });
  });
});
