import { Templates, TEMPLATE_IDS } from "@talak-web3/templates";
import { describe, it, expect } from "vitest";

describe("Templates", () => {
  describe("nextjs template", () => {
    it("has correct runtime dependencies", () => {
      const tpl = Templates.nextjs;
      expect(tpl).toBeDefined();
      expect(tpl!.id).toBe("nextjs");
      expect(tpl!.dependencies).toHaveProperty("@talak-web3/core");
      expect(tpl!.dependencies).toHaveProperty("next");
      expect(tpl!.dependencies).toHaveProperty("react");
      expect(tpl!.isNextjs).toBe(true);
    });

    it("exposes scripts and devDependencies", () => {
      const tpl = Templates.nextjs!;
      expect(tpl.scripts).toHaveProperty("dev");
      expect(tpl.scripts).toHaveProperty("build");
      expect(tpl.devDependencies).toHaveProperty("typescript");
    });
  });

  describe("hono template", () => {
    it("has correct runtime dependencies", () => {
      const tpl = Templates.hono;
      expect(tpl).toBeDefined();
      expect(tpl!.id).toBe("hono");
      expect(tpl!.dependencies).toHaveProperty("@talak-web3/core");
      expect(tpl!.dependencies).toHaveProperty("hono");
      expect(tpl!.isNextjs).toBe(false);
    });

    it("exposes scripts and devDependencies", () => {
      const tpl = Templates.hono!;
      expect(tpl.scripts).toHaveProperty("dev");
      expect(tpl.scripts).toHaveProperty("build");
      expect(tpl.devDependencies).toHaveProperty("tsx");
    });
  });

  describe("framework templates", () => {
    it.each([
      ["react", "vite"],
      ["express", "express"],
      ["nestjs", "@nestjs/core"],
      ["sveltekit", "vite"],
    ] as const)("%s has a complete template definition", (id, frameworkDep) => {
      const tpl = Templates[id];
      expect(tpl).toBeDefined();
      expect(tpl!.id).toBe(id);
      expect(tpl!.isNextjs).toBe(false);
      expect(tpl!.dependencies).toHaveProperty("@talak-web3/core");
      expect(tpl!.dependencies).toHaveProperty("@talak-web3/auth");
      expect({ ...tpl!.dependencies, ...tpl!.devDependencies }).toHaveProperty(frameworkDep);
      expect(tpl!.scripts).toHaveProperty("dev");
      expect(tpl!.scripts).toHaveProperty("build");
    });
  });

  describe("registry structure", () => {
    it("has both nextjs and hono templates", () => {
      expect(Templates).toHaveProperty("nextjs");
      expect(Templates).toHaveProperty("hono");
    });

    it("TEMPLATE_IDS lists every template exactly once", () => {
      expect(new Set(TEMPLATE_IDS).size).toBe(TEMPLATE_IDS.length);
      expect(TEMPLATE_IDS).toEqual(Object.keys(Templates));
    });

    it("every template has the required shape", () => {
      for (const [key, tpl] of Object.entries(Templates)) {
        expect(tpl.id).toBe(key);
        expect(typeof tpl.dependencies).toBe("object");
        expect(typeof tpl.devDependencies).toBe("object");
        expect(typeof tpl.scripts).toBe("object");
        expect(typeof tpl.isNextjs).toBe("boolean");
      }
    });
  });
});
