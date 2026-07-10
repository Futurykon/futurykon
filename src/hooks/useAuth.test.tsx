import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AuthProvider, useAuth } from './useAuth';

// The global setup (src/test/setup.ts) already mocks '@/integrations/supabase/client'
// and exposes the mock via globalThis.mockSupabase.
const mockSupabase = globalThis.mockSupabase;

vi.mock('./useActivityTracker', () => ({
  useActivityTracker: vi.fn(),
}));

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
});
