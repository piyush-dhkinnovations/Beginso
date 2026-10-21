import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const svc = vi.hoisted(() => ({ requestEmailVerification: vi.fn(), getEmailVerification: vi.fn() }));
vi.mock('@/services/publicForm', () => ({ publicFormService: svc }));

import { useEmailVerification } from '@/hooks/useEmailVerification';

const ID = 'vid-1234567890123456789012';
beforeEach(() => {
  sessionStorage.clear();
  svc.requestEmailVerification.mockReset().mockResolvedValue({ verificationId: ID });
  svc.getEmailVerification.mockReset().mockResolvedValue({ status: 'pending' });
});

const mount = (email: string, enabled = true) => renderHook(({ e }) => useEmailVerification('f', enabled, e), { initialProps: { e: email } });

describe('useEmailVerification', () => {
  it('starts idle, goes pending when the email is sent, and verified when the check says so', async () => {
    const { result } = mount('a@b.co');
    expect(result.current.status).toBe('idle');
    await act(async () => {
      await result.current.send('A@B.co');
    });
    expect(svc.requestEmailVerification).toHaveBeenCalledWith('f', 'a@b.co');
    expect(result.current.status).toBe('pending');
    expect(result.current.verificationId).toBeNull(); // not a proof until the link was clicked

    svc.getEmailVerification.mockResolvedValue({ status: 'verified', email: 'a@b.co' });
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    await waitFor(() => expect(result.current.status).toBe('verified'));
    expect(result.current.verificationId).toBe(ID);
  });

  it('says what went wrong when the email could not be sent', async () => {
    svc.requestEmailVerification.mockRejectedValue(new Error('Nope, try later'));
    const { result } = mount('a@b.co');
    await act(async () => {
      await result.current.send('a@b.co');
    });
    expect(result.current.status).toBe('error');
    expect(result.current.message).toBe('Nope, try later');
  });

  it('forgets a verification when the typed address changes, and gets it back when it changes back', async () => {
    svc.getEmailVerification.mockResolvedValue({ status: 'verified', email: 'a@b.co' });
    const { result, rerender } = mount('a@b.co');
    await act(async () => {
      await result.current.send('a@b.co');
    });
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    await waitFor(() => expect(result.current.status).toBe('verified'));

    rerender({ e: 'someone-else@b.co' });
    expect(result.current.status).toBe('idle');
    expect(result.current.verificationId).toBeNull();

    rerender({ e: ' A@b.co ' });
    expect(result.current.status).toBe('verified');
  });

  it('picks up a request this tab already made, after a reload', async () => {
    sessionStorage.setItem('beginso:email-verification:f', JSON.stringify({ email: 'a@b.co', id: ID }));
    svc.getEmailVerification.mockResolvedValue({ status: 'verified', email: 'a@b.co' });
    const { result } = mount('a@b.co');
    await waitFor(() => expect(result.current.status).toBe('verified'));
    expect(svc.getEmailVerification).toHaveBeenCalledWith('f', ID);
    expect(result.current.verificationId).toBe(ID);
  });

  it('drops a stored request the backend no longer knows', async () => {
    sessionStorage.setItem('beginso:email-verification:f', JSON.stringify({ email: 'a@b.co', id: ID }));
    svc.getEmailVerification.mockResolvedValue({ status: 'invalid' });
    const { result } = mount('a@b.co');
    await waitFor(() => expect(svc.getEmailVerification).toHaveBeenCalled());
    expect(result.current.status).toBe('idle');
    expect(sessionStorage.getItem('beginso:email-verification:f')).toBeNull();
  });

  it('does nothing when it is switched off (not a tracked form)', async () => {
    sessionStorage.setItem('beginso:email-verification:f', JSON.stringify({ email: 'a@b.co', id: ID }));
    mount('a@b.co', false);
    await new Promise((r) => setTimeout(r, 20));
    expect(svc.getEmailVerification).not.toHaveBeenCalled();
  });

  it('clear() forgets everything, including what is stored', async () => {
    const { result } = mount('a@b.co');
    await act(async () => {
      await result.current.send('a@b.co');
    });
    expect(sessionStorage.getItem('beginso:email-verification:f')).not.toBeNull();
    act(() => result.current.clear());
    expect(result.current.status).toBe('idle');
    expect(sessionStorage.getItem('beginso:email-verification:f')).toBeNull();
  });
});
