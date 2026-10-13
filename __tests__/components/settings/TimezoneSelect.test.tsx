import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TimezoneSelect } from '@/components/settings/TimezoneSelect';

// jsdom does not implement scrollIntoView.
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

function setup(over: Partial<React.ComponentProps<typeof TimezoneSelect>> = {}) {
  const props = { id: 'tz', label: 'Timezone', value: 'Asia/Tokyo', onChange: vi.fn(), onBlur: vi.fn(), ...over };
  const utils = render(<TimezoneSelect {...props} />);
  return { props, ...utils };
}

const box = () => screen.getByRole('combobox', { name: 'Timezone' });
const options = () => screen.queryAllByRole('option');

describe('TimezoneSelect', () => {
  it('shows the current zone with its offset while closed, and no list', () => {
    setup();
    expect(box()).toHaveValue('Tokyo · Asia (UTC+09:00)');
    expect(box()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('is empty with a prompt when there is no value', () => {
    setup({ value: '' });
    expect(box()).toHaveValue('');
    expect(box()).toHaveAttribute('placeholder', expect.stringContaining('Search a city'));
  });

  it('opens on focus with the whole list and highlights the selected zone', async () => {
    setup();
    await userEvent.click(box());
    expect(screen.getByRole('listbox', { name: 'Timezones' })).toBeInTheDocument();
    expect(box()).toHaveAttribute('aria-expanded', 'true');
    expect(options().length).toBeGreaterThan(50);
    const selected = options().find((o) => o.getAttribute('aria-selected') === 'true');
    expect(selected).toHaveTextContent('Tokyo');
    expect(box()).toHaveAttribute('aria-activedescendant', selected!.id);
  });

  it('filters by city', async () => {
    setup();
    await userEvent.click(box());
    await userEvent.type(box(), 'sydney');
    expect(options().map((o) => o.textContent)).toEqual([expect.stringContaining('Sydney')]);
  });

  it('matches friendly aliases such as a country name', async () => {
    setup({ value: 'UTC' });
    await userEvent.click(box());
    await userEvent.type(box(), 'india');
    expect(options().some((o) => /Kolkata|Calcutta/.test(o.textContent ?? ''))).toBe(true);
  });

  it('requires every search term to match', async () => {
    setup();
    await userEvent.click(box());
    await userEvent.type(box(), 'new york usa');
    expect(options().map((o) => o.textContent)).toEqual([expect.stringContaining('New York')]);
    await userEvent.type(box(), ' tokyo');
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
    expect(screen.getByText(/No timezone matches/)).toBeInTheDocument();
  });

  it('matches by UTC offset', async () => {
    setup();
    await userEvent.click(box());
    await userEvent.type(box(), 'utc+09:00');
    expect(options().some((o) => o.textContent?.includes('Tokyo'))).toBe(true);
    expect(options().every((o) => o.textContent?.includes('UTC+09:00'))).toBe(true);
  });

  it('picks with the mouse: onChange, closes, blurs-notifies and refocuses the input', async () => {
    const { props } = setup();
    await userEvent.click(box());
    await userEvent.type(box(), 'tokyo');
    fireEvent.mouseDown(options()[0]);
    expect(props.onChange).toHaveBeenCalledWith('Asia/Tokyo');
    expect(props.onBlur).toHaveBeenCalled();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(box()).toHaveFocus();
  });

  it('arrow keys move the highlight and Enter picks it without submitting a form', async () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    const onChange = vi.fn();
    render(
      <form onSubmit={onSubmit}>
        <TimezoneSelect id="tz" label="Timezone" value="UTC" onChange={onChange} />
      </form>
    );
    await userEvent.click(box());
    await userEvent.type(box(), 'london');
    await userEvent.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith('Europe/London');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('ArrowDown wraps through results and ArrowUp wraps back', async () => {
    const onChange = vi.fn();
    setup({ onChange });
    await userEvent.click(box());
    await userEvent.type(box(), 'utc+09:00');
    const count = options().length;
    expect(count).toBeGreaterThan(1);
    await userEvent.keyboard('{ArrowUp}');
    expect(box()).toHaveAttribute('aria-activedescendant', `tz-opt-${count - 1}`);
    await userEvent.keyboard('{ArrowDown}');
    expect(box()).toHaveAttribute('aria-activedescendant', 'tz-opt-0');
    await userEvent.keyboard('{ArrowDown}');
    expect(box()).toHaveAttribute('aria-activedescendant', 'tz-opt-1');
  });

  it('ArrowDown opens a closed list', async () => {
    setup();
    box().focus();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('Escape closes without changing the value', async () => {
    const { props } = setup();
    await userEvent.click(box());
    await userEvent.type(box(), 'tok');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(props.onChange).not.toHaveBeenCalled();
    expect(box()).toHaveValue('Tokyo · Asia (UTC+09:00)');
  });

  it('Escape does not bubble to a parent while open', async () => {
    const parent = vi.fn();
    render(
      <div onKeyDown={parent}>
        <TimezoneSelect id="tz" label="Timezone" value="UTC" onChange={vi.fn()} />
      </div>
    );
    await userEvent.click(box());
    await userEvent.keyboard('{Escape}');
    expect(parent).not.toHaveBeenCalledWith(expect.objectContaining({ key: 'Escape' }));
  });

  it('Tab closes the list and reports blur', async () => {
    const { props } = setup();
    await userEvent.click(box());
    await userEvent.tab();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(props.onBlur).toHaveBeenCalled();
  });

  it('closes on an outside mousedown', async () => {
    const { props } = setup();
    await userEvent.click(box());
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(props.onBlur).toHaveBeenCalled();
  });

  it('keeps a legacy value that is not in the IANA list displayable', () => {
    setup({ value: 'Mars/Olympus_Mons' });
    expect((box() as HTMLInputElement).value).toContain('Olympus Mons');
  });

  it('renders the error message', () => {
    setup({ error: 'Pick a timezone' });
    expect(screen.getByText('Pick a timezone')).toBeInTheDocument();
  });
});
