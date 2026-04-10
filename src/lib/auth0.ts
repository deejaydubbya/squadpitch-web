import { Auth0Client } from '@auth0/nextjs-auth0/server';

let _auth0: Auth0Client | undefined;

export function getAuth0(): Auth0Client {
  if (!_auth0) {
    _auth0 = new Auth0Client();
  }
  return _auth0;
}

// Convenience alias — lazily initialized to avoid build-time failures
// when Auth0 env vars aren't available in Docker build stage.
export const auth0 = new Proxy({} as Auth0Client, {
  get(_, prop) {
    return (getAuth0() as any)[prop];
  },
});
