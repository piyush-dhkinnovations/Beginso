/**
 * The thank-you screen: the usual one for a form that sets nothing, and the owner's own headline, picture, accent colour, confetti and redirect.
 * The redirect names the place, counts down, can be stopped, and in the studio's preview moves nobody.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SuccessScreen } from '@/components/public-form/SuccessScreen';
import type { FormTheme } from '@/types/form';

const draw = (theme?: FormTheme, over: Partial<React.ComponentProps<typeof SuccessScreen>> = {}) =>
  render(<SuccessScreen title="Event Registration" message="Your response has been submitted successfully." branding={{ primaryColor: '#7c3aed', theme }} again="/f/abc" {...over} />);

describe('SuccessScreen: the usual screen', () => {
  it('says Thank you!, the message, the form name, and offers another response', () => {
    const { container } = draw();
    expect(screen.getByRole('heading', { name: 'Thank you!' })).toBeInTheDocument();
    expect(screen.getByText('Your response has been submitted successfully.')).toBeInTheDocument();
    expect(screen.getByText('Event Registration')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Submit another response' })).toHaveAttribute('href', '/f/abc');
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('.aa-confetti')).toBeNull();
    expect(screen.queryByTestId('redirect-notice')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create your own form' })).toBeInTheDocument();
  });
});

describe('SuccessScreen: the owner\'s own', () => {
  it('shows their headline instead of Thank you!', () => {
    draw({ v: 1, success: { headline: "You're in!" } });
    expect(screen.getByRole('heading', { name: "You're in!" })).toBeInTheDocument();
    expect(screen.queryByText('Thank you!')).not.toBeInTheDocument();
  });

  it('tints the check with their accent colour, over the form\'s own colour', () => {
    const { container } = draw({ v: 1, success: { colour: '#16A34A' } });
    expect(container.innerHTML).toContain('background-color: rgb(22, 163, 74)');
    expect(container.innerHTML).not.toContain('rgb(124, 58, 237)');
  });

  it('shows their picture above the message, as decoration', () => {
    const { container } = draw({ v: 1, success: { picture: '/form-pictures/aurora-mint.jpg' } });
    const img = container.querySelector('img')!;
    expect(img).toHaveAttribute('src', '/form-pictures/aurora-mint.jpg');
    expect(img).toHaveAttribute('alt', '');
  });

  it('falls confetti once, as decoration, in the form\'s colours', () => {
    const { container } = draw({ v: 1, success: { confetti: true } });
    expect(container.querySelectorAll('.aa-confetti')).toHaveLength(36);
    expect(container.querySelector('.aa-confetti')?.closest('[aria-hidden="true"]')).not.toBeNull();
  });
});

describe('SuccessScreen: the redirect', () => {
  const assign = vi.fn();
  const realLocation = window.location;
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    assign.mockReset();
    Object.defineProperty(window, 'location', { configurable: true, value: { ...realLocation, assign } });
  });
  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(window, 'location', { configurable: true, value: realLocation });
  });

  const theme: FormTheme = { v: 1, success: { redirect: { url: 'https://example.com/welcome', seconds: 3 } } };
  const tick = (ms: number) => act(async () => void vi.advanceTimersByTime(ms));

  it('names the place and counts down, then moves on', async () => {
    draw(theme);
    const notice = screen.getByTestId('redirect-notice');
    expect(notice).toHaveTextContent('Taking you to example.com in 3 seconds.');
    await tick(1000);
    expect(notice).toHaveTextContent('in 2 seconds');
    await tick(1000);
    expect(notice).toHaveTextContent('in 1 second.');
    expect(assign).not.toHaveBeenCalled();
    await tick(2100);
    expect(assign).toHaveBeenCalledWith('https://example.com/welcome');
  });

  it('Stay here stops it, and leaves a link to go on by hand', async () => {
    draw(theme);
    await userEvent.click(screen.getByRole('button', { name: 'Stay here' }));
    await tick(10_000);
    expect(assign).not.toHaveBeenCalled();
    const link = screen.getByRole('link', { name: 'Go to example.com' });
    expect(link).toHaveAttribute('href', 'https://example.com/welcome');
    expect(link.getAttribute('rel')).toContain('noopener');
  });

  it('uses 5 seconds when none was chosen', () => {
    draw({ v: 1, success: { redirect: { url: 'https://example.com' } } });
    expect(screen.getByTestId('redirect-notice')).toHaveTextContent('in 5 seconds');
  });

  it('never moves anyone from the studio\'s preview, and only says what would happen', async () => {
    draw(theme, { preview: true, again: null });
    expect(screen.queryByTestId('redirect-notice')).not.toBeInTheDocument();
    expect(screen.getByText(/After 3 seconds people are taken to/)).toHaveTextContent('example.com');
    await tick(10_000);
    expect(assign).not.toHaveBeenCalled();
  });

  it('shows no redirect for an address that is not https', () => {
    draw({ v: 1, success: { redirect: { url: 'http://example.com' } } });
    expect(screen.queryByTestId('redirect-notice')).not.toBeInTheDocument();
  });
});

describe('SuccessScreen: in the studio\'s preview and in an embed', () => {
  it('in the preview there is no Beginso footer and the button is only drawn, not a link', () => {
    draw(undefined, { preview: true, again: null });
    expect(screen.queryByRole('link', { name: 'Create your own form' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Submit another response' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit another response' })).toBeInTheDocument();
  });

  it('inside an embed the Beginso footer is hidden', () => {
    draw(undefined, { embed: true });
    expect(screen.queryByRole('link', { name: 'Create your own form' })).not.toBeInTheDocument();
  });
});
