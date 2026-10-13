/**
 * Address, DateTime and Phone renderers — each packs several inputs into ONE stored string.
 */
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddressRenderer } from '@/components/public-form/fields/AddressRenderer';
import { DateTimeRenderer } from '@/components/public-form/fields/DateTimeRenderer';
import { PhoneRenderer } from '@/components/public-form/fields/PhoneRenderer';
import { Harness, makeField, readValues } from './harness';

const values = () => readValues(screen.getByTestId('values'));

describe('AddressRenderer', () => {
  const field = makeField({ type: 'address', label: 'Home address' });

  it('renders four labelled inputs inside a named group', () => {
    render(<Harness Renderer={AddressRenderer} field={field} />);
    expect(screen.getByRole('group', { name: 'Home address' })).toBeInTheDocument();
    for (const part of ['Street', 'City', 'State', 'ZIP / PIN']) {
      expect(screen.getByLabelText(part)).toBeInTheDocument();
    }
  });

  it('stores the parts as four newline-separated lines', async () => {
    render(<Harness Renderer={AddressRenderer} field={field} />);
    await userEvent.type(screen.getByLabelText('Street'), '1 Main');
    await userEvent.type(screen.getByLabelText('City'), 'Pune');
    expect(values()).toEqual({ f1: '1 Main\nPune\n\n' });
  });

  it('restores each line into its own input', () => {
    render(<Harness Renderer={AddressRenderer} field={field} defaultValues={{ f1: '1 Main\nPune\nMH\n411001' }} />);
    expect(screen.getByLabelText('Street')).toHaveValue('1 Main');
    expect(screen.getByLabelText('City')).toHaveValue('Pune');
    expect(screen.getByLabelText('State')).toHaveValue('MH');
    expect(screen.getByLabelText('ZIP / PIN')).toHaveValue('411001');
  });

  it('collapses to an empty answer once every part is cleared', async () => {
    render(<Harness Renderer={AddressRenderer} field={field} defaultValues={{ f1: 'X\n\n\n' }} />);
    await userEvent.clear(screen.getByLabelText('Street'));
    expect(values()).toEqual({ f1: '' });
  });

  it('caps each part at 120 characters and disables when asked', () => {
    render(<Harness Renderer={AddressRenderer} field={field} disabled />);
    const street = screen.getByLabelText('Street');
    expect(street).toHaveAttribute('maxlength', '120');
    expect(street).toBeDisabled();
  });
});

describe('DateTimeRenderer', () => {
  const field = makeField({ type: 'datetime', label: 'Appointment' });

  it('renders separate date and time inputs in a named group', () => {
    render(<Harness Renderer={DateTimeRenderer} field={field} />);
    expect(screen.getByRole('group', { name: 'Appointment' })).toBeInTheDocument();
    expect(screen.getByLabelText('Date')).toHaveAttribute('type', 'date');
    expect(screen.getByLabelText('Time')).toHaveAttribute('type', 'time');
  });

  it('joins date and time into YYYY-MM-DDTHH:mm', () => {
    render(<Harness Renderer={DateTimeRenderer} field={field} />);
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-10-03' } });
    fireEvent.change(screen.getByLabelText('Time'), { target: { value: '09:15' } });
    expect(values()).toEqual({ f1: '2026-10-03T09:15' });
  });

  it('keeps a half-filled pair so validation can ask for the missing part', () => {
    render(<Harness Renderer={DateTimeRenderer} field={field} />);
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-10-03' } });
    expect(values()).toEqual({ f1: '2026-10-03T' });
    expect(screen.getByLabelText('Date')).toHaveValue('2026-10-03');
  });

  it('splits an existing value across both inputs', () => {
    render(<Harness Renderer={DateTimeRenderer} field={field} defaultValues={{ f1: '2026-01-02T23:45' }} />);
    expect(screen.getByLabelText('Date')).toHaveValue('2026-01-02');
    expect(screen.getByLabelText('Time')).toHaveValue('23:45');
  });

  it('clearing both parts resets to an empty answer', () => {
    render(<Harness Renderer={DateTimeRenderer} field={field} defaultValues={{ f1: '2026-01-02T23:45' }} />);
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Time'), { target: { value: '' } });
    expect(values()).toEqual({ f1: '' });
  });
});

describe('PhoneRenderer', () => {
  const field = makeField({ type: 'phone', label: 'Mobile' });

  it('defaults to India (+91) and offers a dialling-code select', () => {
    render(<Harness Renderer={PhoneRenderer} field={field} />);
    expect(screen.getByLabelText('Dialling code')).toHaveValue('IN');
    expect(screen.getByText('+91')).toBeInTheDocument();
    expect(screen.getByLabelText('Mobile')).toHaveAttribute('type', 'tel');
  });

  it('stores the number as +<code><digits>, dropping non-digits', async () => {
    render(<Harness Renderer={PhoneRenderer} field={field} />);
    await userEvent.type(screen.getByLabelText('Mobile'), '98765 43210');
    expect(values()).toEqual({ f1: '+919876543210' });
  });

  it('changing the country re-prefixes the existing digits', () => {
    render(<Harness Renderer={PhoneRenderer} field={field} defaultValues={{ f1: '+919876543210' }} />);
    expect(screen.getByLabelText('Mobile')).toHaveValue('9876543210');
    fireEvent.change(screen.getByLabelText('Dialling code'), { target: { value: 'GB' } });
    expect(values()).toEqual({ f1: '+449876543210' });
    expect(screen.getByLabelText('Dialling code')).toHaveValue('GB');
  });

  it('remembers a +1 country choice (US vs CA) even though the digits are identical', () => {
    render(<Harness Renderer={PhoneRenderer} field={field} />);
    fireEvent.change(screen.getByLabelText('Dialling code'), { target: { value: 'CA' } });
    fireEvent.change(screen.getByLabelText('Mobile'), { target: { value: '4165550100' } });
    expect(values()).toEqual({ f1: '+14165550100' });
    expect(screen.getByLabelText('Dialling code')).toHaveValue('CA');
  });

  it('clearing the digits stores an empty answer', async () => {
    render(<Harness Renderer={PhoneRenderer} field={field} defaultValues={{ f1: '+911234' }} />);
    await userEvent.clear(screen.getByLabelText('Mobile'));
    expect(values()).toEqual({ f1: '' });
  });

  it('strips a leading +code from the placeholder and disables both controls', () => {
    render(<Harness Renderer={PhoneRenderer} field={makeField({ type: 'phone', label: 'Mobile', placeholder: '+91 98765' })} disabled />);
    expect(screen.getByLabelText('Mobile')).toHaveAttribute('placeholder', '98765');
    expect(screen.getByLabelText('Mobile')).toBeDisabled();
    expect(screen.getByLabelText('Dialling code')).toBeDisabled();
  });
});
