import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import NotFound from "./not-found";

describe("NotFound", () => {
  it("offers recovery actions and routes to the beta flow", () => {
    const html = renderToStaticMarkup(<NotFound />);

    expect(html).toContain("Go Back");
    expect(html).toContain("Quick links");
    expect(html).toContain('href="/beta"');
  });
});
