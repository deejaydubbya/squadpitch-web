const SENSITIVE_KEY = /authorization|cookie|token|secret|password|passwd|api[-_]?key|phone|email|message|body|content/i;

function redactRecord(value: unknown, depth = 0): unknown {
  if (depth > 5) return '[Truncated]';
  if (Array.isArray(value)) return value.map((item) => redactRecord(item, depth + 1));
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      SENSITIVE_KEY.test(key) ? '[Filtered]' : redactRecord(item, depth + 1),
    ]),
  );
}

export function redactSentryEvent<T extends Record<string, any>>(event: T): T {
  const sanitized = redactRecord(event) as T;
  if (sanitized.request) {
    if (typeof sanitized.request.url === 'string') {
      sanitized.request.url = sanitized.request.url.split('?')[0];
    }
    sanitized.request.headers = undefined;
    sanitized.request.cookies = undefined;
    sanitized.request.data = undefined;
  }
  if (sanitized.user) {
    sanitized.user.email = undefined;
    sanitized.user.ip_address = undefined;
    sanitized.user.username = undefined;
  }
  return sanitized;
}
