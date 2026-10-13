/**
 * Url, Time and Currency renderers — thin register()-based inputs.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UrlRenderer } from '@/components/public-form/fields/UrlRenderer';
import { TimeRenderer } from '@/components/public-form/fields/TimeRenderer';
import { CurrencyRenderer } from '@/components/public-form/fields/CurrencyRenderer';
import { Harness, makeField, readValues } from './harness';

describe('UrlRenderer', () => {
  const field = makeField({ type: 'url', label: 'Website' });

  it('renders a labelled text input with the default placeholder and 2048 cap', () => {
    render(<Harness Renderer={UrlRenderer} field={field} />);
    const input = screen.getByLabelText('Website');
    expect(input).toHaveAttribute('placeholder', 'https://example.com');
    expect(input).toHaveAttribute('maxlength', '2048');
    expect(input).toHaveAttribute('inputmode', 'url');
  });

  it('uses the field placeholder when given', () => {
    render(<Harness Renderer={UrlRenderer} field={makeField({ type: 'url', label: 'Website', placeholder: 'https://me.dev' })} />);
    expect(screen.getByLabelText('Website')).toHaveAttribute('placeholder', 'https://me.dev');
  });

  it('writes typed text into the form value', async () => {
    render(<Harness Renderer={UrlRenderer} field={field} />);
    await userEvent.type(screen.getByLabelText('Website'), 'https://a.io');
    expect(readValues(screen.getByTestId('values'))).toEqual({ f1: 'https://a.io' });
  });

  it('is disabled while submitting and shows the error', () => {
    render(<Harness Renderer={UrlRenderer} field={field} disabled error={{ type: 'x', message: 'Enter a valid URL' }} />);
    expect(screen.getByLabelText('Website')).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid URL');
  });
});

describe('TimeRenderer', () => {
  const field = makeField({ type: 'time', label: 'Start time' });

  it('renders a time input labelled by the field', () => {
    render(<Harness Renderer={TimeRenderer} field={field} />);
    expect(screen.getByLabelText('Start time')).toHaveAttribute('type', 'time');
  });

  it('shows a default value and is disabled when asked', () => {
    render(<Harness Renderer={TimeRenderer} field={field} defaultValues={{ f1: '14:30' }} disabled />);
    const input = screen.getByLabelText('Start time');
    expect(input).toHaveValue('14:30');
    expect(input).toBeDisabled();
  });
});

describe('CurrencyRenderer', () => {
  it('defaults to INR with the rupee symbol and 0.00 placeholder', () => {
    render(<Harness Renderer={CurrencyRenderer} field={makeField({ type: 'currency', label: 'Amount' })} />);
    expect(screen.getByText('₹')).toBeInTheDocument();
    const input = screen.getByLabelText('Amount');
    expect(input).toHaveAttribute('type', 'number');
    expect(input).toHaveAttribute('step', '0.01');
    expect(input).toHaveAttribute('placeholder', '0.00');
  });

  it.each([
    ['USD', '$'],
    ['EUR', '€'],
    ['GBP', '£'],
  ])('shows the %s symbol', (currency, symbol) => {
    render(<Harness Renderer={CurrencyRenderer} field={makeField({ type: 'currency', label: 'Amount', currency })} />);
    expect(screen.getByText(symbol)).toBeInTheDocument();
  });

  it('passes min and max through to the input', () => {
    render(<Harness Renderer={CurrencyRenderer} field={makeField({ type: 'currency', label: 'Amount', min: 5, max: 500 })} />);
    const input = screen.getByLabelText('Amount');
    expect(input).toHaveAttribute('min', '5');
    expect(input).toHaveAttribute('max', '500');
  });

  it('records typed amounts', async () => {
    render(<Harness Renderer={CurrencyRenderer} field={makeField({ type: 'currency', label: 'Amount' })} />);
    await userEvent.type(screen.getByLabelText('Amount'), '49.5');
    expect(readValues(screen.getByTestId('values'))).toEqual({ f1: '49.5' });
  });
});
