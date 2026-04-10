import { Auth0Client } from '@auth0/nextjs-auth0/server';

let _auth0: Auth0Client | undefined;

export function getAuth0(): Auth0Client {
  if (!_auth0) {
    _auth0 = new Auth0Client({
      authorizationParameters: {
        audience: process.env.AUTH0_AUDIENCE,
      },
    });
  }
  return _auth0;
}

// Lazily initialized proxy that binds methods to the real Auth0Client instance.
// This avoids build-time crashes (env vars unavailable in Docker build) while
// ensuring private fields are accessible (Auth0Client uses WeakMap-based #private).
export const auth0 = new Proxy({} as Auth0Client, {
  get(_, prop) {
    const target = getAuth0();
    const value = (target as any)[prop];
    if (typeof value === 'function') {
      return value.bind(target);
    }
    return value;
  },
});
