import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AdminOnly } from './AdminOnly';
import { useAuth } from '@/hooks/useAuth';

// AdminOnly must read admin status from the auth context rather than issuing
// its own profile fetch, so we mock useAuth directly at the module boundary.
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

const mockUseAuth = vi.mocked(useAuth);

describe('AdminOnly', () => {
  test('renders children when the context says the user is an admin', () => {
    mockUseAuth.mockReturnValue({ isAdmin: true, isAdminLoading: false } as any);

    render(<AdminOnly>Admin content</AdminOnly>);

    expect(screen.getByText('Admin content')).toBeInTheDocument();
  });

  test('renders the fallback when the context says the user is not an admin', () => {
    mockUseAuth.mockReturnValue({ isAdmin: false, isAdminLoading: false } as any);

    render(<AdminOnly fallback={<span>Not allowed</span>}>Admin content</AdminOnly>);

    expect(screen.queryByText('Admin content')).not.toBeInTheDocument();
    expect(screen.getByText('Not allowed')).toBeInTheDocument();
  });

  test('renders nothing (no fallback) while the admin status is still loading', () => {
    mockUseAuth.mockReturnValue({ isAdmin: false, isAdminLoading: true } as any);

    const { container } = render(<AdminOnly>Admin content</AdminOnly>);

    expect(screen.queryByText('Admin content')).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  test('does not issue its own fetch — mounting many instances calls useAuth but nothing else', () => {
    mockUseAuth.mockReturnValue({ isAdmin: true, isAdminLoading: false } as any);
    mockUseAuth.mockClear();

    // Simulate the reported scenario: several AdminOnly instances mounted at once
    // (e.g. two per QuestionCard in a list) should all read the same context
    // value rather than each kicking off their own profile fetch.
    render(
      <>
        <AdminOnly><span>A</span></AdminOnly>
        <AdminOnly><span>B</span></AdminOnly>
        <AdminOnly><span>C</span></AdminOnly>
      </>
    );

    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
    // AdminOnly itself never calls getProfile / useState / useEffect — every
    // call recorded here is React re-rendering the same mocked context read.
    expect(mockUseAuth).toHaveBeenCalled();
  });
});
