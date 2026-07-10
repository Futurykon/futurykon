import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { AuthProvider, useAuth } from './useAuth';
import { getProfile } from '@/services/profiles';

// The global setup (src/test/setup.ts) already mocks '@/integrations/supabase/client'
// and exposes the mock via globalThis.mockSupabase.
const mockSupabase = globalThis.mockSupabase;

vi.mock('./useActivityTracker', () => ({
  useActivityTracker: vi.fn(),
}));

// Mock the profile fetch at the module boundary — useAuth calls getProfile()
// directly to hoist is_admin into the context, so we stub it here rather than
// wiring the generic supabase.from(...) chain mock.
vi.mock('@/services/profiles', () => ({
  getProfile: vi.fn(),
}));

const mockUser = { id: 'user-1', email: 'user@example.com' } as User;
const mockSession = { user: mockUser } as Session;

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    mockSupabase.auth.signOut.mockResolvedValue({ error: null });
    mockSupabase.auth.signInWithOtp.mockResolvedValue({ error: null });
    vi.mocked(getProfile).mockResolvedValue({ data: { is_admin: false }, error: null } as any);

    // Reset window.location.href without triggering an actual navigation
    delete (window as any).location;
    (window as any).location = { origin: 'https://futurykon.test', href: '' };
  });

  test('throws when used outside of AuthProvider', () => {
    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth must be used within an AuthProvider'
    );
  });

  describe('signInWithEmail', () => {
    test('clears stale supabase localStorage keys before signing in', async () => {
      localStorage.setItem('supabase.auth.token', 'stale');
      localStorage.setItem('sb-project-auth-token', 'stale');
      localStorage.setItem('unrelated-key', 'keep-me');

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.signInWithEmail('user@example.com');
      });

      expect(localStorage.getItem('supabase.auth.token')).toBeNull();
      expect(localStorage.getItem('sb-project-auth-token')).toBeNull();
      expect(localStorage.getItem('unrelated-key')).toBe('keep-me');
    });

    test('performs a global sign-out before requesting the OTP', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.signInWithEmail('user@example.com');
      });

      expect(mockSupabase.auth.signOut).toHaveBeenCalledWith({ scope: 'global' });
    });

    test('calls signInWithOtp with the email and emailRedirectTo option', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.signInWithEmail('user@example.com');
      });

      expect(mockSupabase.auth.signInWithOtp).toHaveBeenCalledWith({
        email: 'user@example.com',
        options: {
          emailRedirectTo: 'https://futurykon.test/',
        },
      });
    });

    test('resolves with error: null on success', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      let outcome: { error: unknown } | undefined;
      await act(async () => {
        outcome = await result.current.signInWithEmail('user@example.com');
      });

      expect(outcome).toEqual({ error: null });
    });

    test('resolves with the error returned by signInWithOtp on failure', async () => {
      const otpError = { message: 'Rate limit exceeded' };
      mockSupabase.auth.signInWithOtp.mockResolvedValue({ error: otpError });

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      let outcome: { error: unknown } | undefined;
      await act(async () => {
        outcome = await result.current.signInWithEmail('user@example.com');
      });

      expect(outcome).toEqual({ error: otpError });
    });

    test('still attempts sign-in when the preceding global sign-out throws', async () => {
      mockSupabase.auth.signOut.mockRejectedValue(new Error('network down'));

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      let outcome: { error: unknown } | undefined;
      await act(async () => {
        outcome = await result.current.signInWithEmail('user@example.com');
      });

      expect(mockSupabase.auth.signInWithOtp).toHaveBeenCalled();
      expect(outcome).toEqual({ error: null });
    });
  });

  describe('signOut', () => {
    test('clears stale supabase localStorage keys', async () => {
      localStorage.setItem('supabase.auth.token', 'stale');
      localStorage.setItem('sb-project-auth-token', 'stale');
      localStorage.setItem('unrelated-key', 'keep-me');

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.signOut();
      });

      expect(localStorage.getItem('supabase.auth.token')).toBeNull();
      expect(localStorage.getItem('sb-project-auth-token')).toBeNull();
      expect(localStorage.getItem('unrelated-key')).toBe('keep-me');
    });

    test('calls supabase.auth.signOut with global scope', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockSupabase.auth.signOut).toHaveBeenCalledWith({ scope: 'global' });
    });

    test('redirects to "/" after signing out', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.signOut();
      });

      expect(window.location.href).toBe('/');
    });

    test('still redirects to "/" when supabase.auth.signOut throws', async () => {
      mockSupabase.auth.signOut.mockRejectedValue(new Error('network down'));

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.signOut();
      });

      expect(window.location.href).toBe('/');
    });
  });

  describe('isAdmin', () => {
    test('is false and not loading when signed out', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } });

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.isAdmin).toBe(false);
      expect(result.current.isAdminLoading).toBe(false);
      expect(getProfile).not.toHaveBeenCalled();
    });

    test('fetches the profile once and exposes isAdmin: true for an admin session', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({ data: { session: mockSession } });
      vi.mocked(getProfile).mockResolvedValue({ data: { is_admin: true }, error: null } as any);

      const { result } = renderHook(() => useAuth(), { wrapper });
      // Wait for the session to resolve first — otherwise the admin effect's
      // initial "no user yet" pass (isAdminLoading: false) can satisfy a
      // waitFor on isAdminLoading before the real fetch has even started.
      await waitFor(() => expect(result.current.user).not.toBeNull());
      await waitFor(() => expect(result.current.isAdminLoading).toBe(false));

      expect(result.current.isAdmin).toBe(true);
      expect(getProfile).toHaveBeenCalledWith('user-1');
      expect(getProfile).toHaveBeenCalledTimes(1);
    });

    test('exposes isAdmin: false for a non-admin session', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({ data: { session: mockSession } });
      vi.mocked(getProfile).mockResolvedValue({ data: { is_admin: false }, error: null } as any);

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.user).not.toBeNull());
      await waitFor(() => expect(result.current.isAdminLoading).toBe(false));

      expect(result.current.isAdmin).toBe(false);
    });

    test('treats a profile fetch error as non-admin', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({ data: { session: mockSession } });
      vi.mocked(getProfile).mockResolvedValue({
        data: null,
        error: { message: 'boom' },
      } as any);

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.user).not.toBeNull());
      await waitFor(() => expect(result.current.isAdminLoading).toBe(false));

      expect(result.current.isAdmin).toBe(false);
    });

    test('resets isAdmin to false when the user signs out', async () => {
      let authStateCallback: (event: string, session: Session | null) => void = () => {};
      mockSupabase.auth.onAuthStateChange.mockImplementation((cb: typeof authStateCallback) => {
        authStateCallback = cb;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });
      mockSupabase.auth.getSession.mockResolvedValue({ data: { session: mockSession } });
      vi.mocked(getProfile).mockResolvedValue({ data: { is_admin: true }, error: null } as any);

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isAdmin).toBe(true));

      act(() => {
        authStateCallback('SIGNED_OUT', null);
      });

      await waitFor(() => expect(result.current.isAdmin).toBe(false));
    });
  });
});
