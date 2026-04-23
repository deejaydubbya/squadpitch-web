export type AdminRole = 'admin' | 'developer';

export function hasRole(roles: string[], role: AdminRole): boolean {
  return roles.includes(role);
}

export function isAdmin(roles: string[]): boolean {
  return hasRole(roles, 'admin');
}

export function isDeveloper(roles: string[]): boolean {
  return hasRole(roles, 'developer');
}

export function isInternalUser(roles: string[]): boolean {
  return isAdmin(roles) || isDeveloper(roles);
}
