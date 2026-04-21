/**
 * @talak-web3/orgs - Organization Management System for Web3 Applications
 * 
 * Provides organization, role, and access control types for Web3 applications.
 * Supports multi-tenant organization management with role-based access control.
 * 
 * @example
 * ```typescript
 * import { Role, Organization, OrgGate } from '@talak-web3/orgs';
 * 
 * const org: Organization = {
 *   id: 'org-123',
 *   name: 'My DAO'
 * };
 * ```
 */

export {
  type Role,
  type Organization,
  type OrgGate,
} from '@talak-web3/types';

