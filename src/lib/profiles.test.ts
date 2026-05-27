import { describe, test, expect } from 'vitest';
import { getDisplayName } from './profiles';

describe('getDisplayName', () => {
  test('returns display_name when present', () => {
    expect(getDisplayName({ display_name: 'Jan', email: 'jan@example.com' })).toBe('Jan');
  });

  test('falls back to email when display_name is null', () => {
    expect(getDisplayName({ display_name: null, email: 'jan@example.com' })).toBe('jan@example.com');
  });

  test('falls back to email when display_name is undefined', () => {
    expect(getDisplayName({ display_name: undefined, email: 'jan@example.com' })).toBe('jan@example.com');
  });

  test('falls back to email when display_name is empty string', () => {
    expect(getDisplayName({ display_name: '', email: 'jan@example.com' })).toBe('jan@example.com');
  });

  test('returns default fallback when both are null', () => {
    expect(getDisplayName({ display_name: null, email: null })).toBe('Anonim');
  });

  test('returns default fallback when both are undefined', () => {
    expect(getDisplayName({})).toBe('Anonim');
  });

  test('returns default fallback for null profile', () => {
    expect(getDisplayName(null)).toBe('Anonim');
  });

  test('returns default fallback for undefined profile', () => {
    expect(getDisplayName(undefined)).toBe('Anonim');
  });

  test('custom fallback string is used when no name available', () => {
    expect(getDisplayName(null, 'Nieznany')).toBe('Nieznany');
  });

  test('custom fallback is not used when email is present', () => {
    expect(getDisplayName({ email: 'jan@example.com' }, 'Nieznany')).toBe('jan@example.com');
  });

  test('display_name takes priority over both email and fallback', () => {
    expect(getDisplayName({ display_name: 'Jan', email: 'jan@example.com' }, 'Nieznany')).toBe('Jan');
  });
});
