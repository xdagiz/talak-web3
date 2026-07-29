import { MarkdownPageEvent } from "typedoc-plugin-markdown";

/**
 * @param {import("typedoc-plugin-markdown").MarkdownApplication} app
 */
export function load(app) {
  app.renderer.on(MarkdownPageEvent.BEGIN, (page) => {
    const existing = page.frontmatter ?? {};
    if (existing.title) return;

    const name = page.model?.name;
    if (!name) return;

    page.frontmatter = {
      ...existing,
      title: name,
    };
  });
}
