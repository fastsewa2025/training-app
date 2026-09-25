/**
 * Express 5 + @types/express-serve-static-core v5 infers route-param types
 * from the route path string itself, and for some path shapes that
 * inference widens named params to `string | string[]` even though a
 * plain `/foo/:id`-style param is always a single string at runtime.
 *
 * Rather than asserting the type away (`as string`), this actually
 * handles the (extremely unlikely in practice) array case, so it stays
 * correct even if Express ever really did return one.
 */
export function paramStr(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}
