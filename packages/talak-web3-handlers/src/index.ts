export type NextRouteHandler = (req: Request) => Promise<Response>;

export function createNextAppRouterHandler(_opts: { basePath?: string }): Record<string, NextRouteHandler> {
  return {
    async health() {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }
  };
}
