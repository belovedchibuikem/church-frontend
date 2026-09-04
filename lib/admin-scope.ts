/**
 * Admin UI scope query/storage tokens.
 * Laravel ScopeReference types are lowercase identifiers; keys must not contain whitespace.
 */
const NAMED_SCOPES = new Set(['global', 'assigned', 'self']);
const SCOPE_TYPE = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;

export function sanitizeAdminScopeToken(value: string | null | undefined): string | undefined {
  if (value == null) return undefined;
  const token = value.trim().replace(/\+/g, ' ').replace(/\s+/g, ' ');
  if (token === '') return undefined;
  if (NAMED_SCOPES.has(token)) return token;
  const separator = token.indexOf(':');
  if (separator < 1) return undefined;
  const type = token.slice(0, separator).trim();
  const key = token.slice(separator + 1).trim();
  if (!SCOPE_TYPE.test(type) || key === '' || /\s/.test(key)) return undefined;
  return `${type}:${key}`;
}
