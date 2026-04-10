export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `/api/proxy/${path.replace(/^\//, '')}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = body?.message || body?.error || `API error ${res.status}`;
    throw new Error(msg);
  }

  return res.json();
}
