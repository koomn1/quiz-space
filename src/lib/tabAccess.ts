export type TabAccessDecision = 'allow' | 'admin-denied' | 'login-required' | 'billing-required';

export interface TabAccessInput {
  tab: string;
  bypassAuth?: boolean;
  userId: string;
  isAuthenticated: boolean;
  isAdminUser: boolean;
  hasActiveMembership: boolean;
}

const GUEST_TABS = ['landing', 'explore', 'support'];

/** Pure navigation guard extracted from App.handleSetTab. Behavior is unchanged. */
export function decideTabAccess(input: TabAccessInput): TabAccessDecision {
  const { tab, bypassAuth = false, userId, isAuthenticated, isAdminUser, hasActiveMembership } = input;
  const isGuest = (!userId || userId.startsWith('user-guest') || userId === '') && !isAuthenticated;
  const isLegalTab = tab.startsWith('legal-');
  if (tab === 'admin' && !isAdminUser) return 'admin-denied';
  if (!bypassAuth && isGuest && !GUEST_TABS.includes(tab) && !isLegalTab) return 'login-required';
  // Cosmo is a paid feature. Do not allow free accounts or direct links to open it.
  if (!bypassAuth && tab === 'aichat' && !hasActiveMembership) return 'billing-required';
  return 'allow';
}
