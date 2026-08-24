const GUEST_IDENTITY_KEY = 'quizspace_guest_identity_v1';
const GUEST_ID_PATTERN = /^user-guest-[A-HJ-NP-Z2-9]{6}$/;

type GuestIdentity = {
  id: string;
  name: string;
};

function createGuestSuffix(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const values = typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function'
    ? crypto.getRandomValues(new Uint8Array(6))
    : Uint8Array.from({ length: 6 }, () => Math.floor(Math.random() * 256));
  return Array.from(values, value => alphabet[value % alphabet.length]).join('');
}

function isValidGuestIdentity(value: unknown): value is GuestIdentity {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<GuestIdentity>;
  return typeof candidate.id === 'string'
    && GUEST_ID_PATTERN.test(candidate.id)
    && typeof candidate.name === 'string'
    && candidate.name.trim().length >= 6
    && candidate.name.trim().length <= 80;
}

export function getOrCreateGuestIdentity(lang: 'ar' | 'en' = 'ar'): GuestIdentity {
  if (typeof window === 'undefined') {
    const suffix = createGuestSuffix();
    return { id: `user-guest-${suffix}`, name: lang === 'ar' ? `زائر #${suffix}` : `Guest #${suffix}` };
  }

  try {
    const raw = window.localStorage.getItem(GUEST_IDENTITY_KEY);
    if (raw) {
      const stored = JSON.parse(raw) as unknown;
      if (isValidGuestIdentity(stored)) {
        const suffix = stored.id.slice(-6).toUpperCase();
        const expectedName = lang === 'ar' ? `زائر #${suffix}` : `Guest #${suffix}`;
        if (stored.name !== expectedName) {
          const updated = { id: stored.id, name: expectedName };
          window.localStorage.setItem(GUEST_IDENTITY_KEY, JSON.stringify(updated));
          return updated;
        }
        return stored;
      }
    }

    const suffix = createGuestSuffix();
    const identity = { id: `user-guest-${suffix}`, name: lang === 'ar' ? `زائر #${suffix}` : `Guest #${suffix}` };
    window.localStorage.setItem(GUEST_IDENTITY_KEY, JSON.stringify(identity));
    return identity;
  } catch (_) {
    const suffix = createGuestSuffix();
    return { id: `user-guest-${suffix}`, name: lang === 'ar' ? `زائر #${suffix}` : `Guest #${suffix}` };
  }
}

export function isGuestIdentity(id: string | null | undefined): boolean {
  return !id || id === 'anonymous' || id === 'guest' || id.startsWith('user-guest-') || id.startsWith('local-user-');
}
