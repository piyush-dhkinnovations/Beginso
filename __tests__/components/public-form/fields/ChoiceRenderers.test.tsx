/**
 * MultipleChoice, Checkbox, YesNo and Rating renderers (Controller-based choice inputs).
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MultipleChoiceRenderer } from '@/components/public-form/fields/MultipleChoiceRenderer';
import { CheckboxRenderer } from '@/components/public-form/fields/CheckboxRenderer';
import { YesNoRenderer } from '@/components/public-form/fields/YesNoRenderer';
import { RatingRenderer } from '@/components/public-form/fields/RatingRenderer';
import { Harness, makeField, readValues } from './harness';

const values = () => readValues(screen.getByTestId('values'));

describe('MultipleChoiceRenderer', () => {
  const field = makeField({ type: 'multiple_choice', label: 'Colour', options: ['Red', 'Green'] });

  it('renders a labelled radio group with one radio per option', () => {
    render(<Harness Renderer={MultipleChoiceRenderer} field={field} />);
    expect(screen.getByRole('group', { name: 'Colour' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(2);
  });

  it('selects one option at a time and stores it', async () => {
    render(<Harness Renderer={MultipleChoiceRenderer} field={field} />);
    await userEvent.click(screen.getByLabelText('Red'));
    expect(values()).toEqual({ f1: 'Red' });
    await userEvent.click(screen.getByLabelText('Green'));
    expect(values()).toEqual({ f1: 'Green' });
    expect(screen.getByLabelText('Red')).not.toBeChecked();
  });

  it('reflects a default value and disables every option when disabled', () => {
    render(<Harness Renderer={MultipleChoiceRenderer} field={field} defaultValues={{ f1: 'Green' }} disabled />);
    expect(screen.getByLabelText('Green')).toBeChecked();
    screen.getAllByRole('radio').forEach((r) => expect(r).toBeDisabled());
  });

  it('renders no radios for a non-choice field type', () => {
    render(<Harness Renderer={MultipleChoiceRenderer} field={makeField({ type: 'short_text' })} />);
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
  });
});

describe('CheckboxRenderer', () => {
  const field = makeField({ type: 'checkbox', label: 'Toppings', options: ['Cheese', 'Olives', 'Basil'] });

  it('accumulates and removes selections in order of clicking', async () => {
    render(<Harness Renderer={CheckboxRenderer} field={field} />);
    await userEvent.click(screen.getByLabelText('Cheese'));
    await userEvent.click(screen.getByLabelText('Basil'));
    expect(values()).toEqual({ f1: ['Cheese', 'Basil'] });
    await userEvent.click(screen.getByLabelText('Cheese'));
    expect(values()).toEqual({ f1: ['Basil'] });
  });

  it('checks the defaults and exposes the group name', () => {
    render(<Harness Renderer={CheckboxRenderer} field={field} defaultValues={{ f1: ['Olives'] }} />);
    expect(screen.getByRole('group', { name: 'Toppings' })).toBeInTheDocument();
    expect(screen.getByLabelText('Olives')).toBeChecked();
    expect(screen.getByLabelText('Cheese')).not.toBeChecked();
  });

  it('is disabled while submitting', () => {
    render(<Harness Renderer={CheckboxRenderer} field={field} disabled />);
    screen.getAllByRole('checkbox').forEach((c) => expect(c).toBeDisabled());
  });

  it('shows the validation error', () => {
    render(<Harness Renderer={CheckboxRenderer} field={field} error={{ type: 'required', message: 'Pick at least one' }} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Pick at least one');
  });
});

describe('YesNoRenderer', () => {
  const field = makeField({ type: 'yes_no', label: 'Agree?' });

  it('renders a radiogroup with Yes and No, neither selected', () => {
    render(<Harness Renderer={YesNoRenderer} field={field} />);
    expect(screen.getByRole('radiogroup', { name: 'Agree?' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Yes' })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('radio', { name: 'No' })).toHaveAttribute('aria-checked', 'false');
  });

  it('stores the clicked answer and moves the selection', async () => {
    render(<Harness Renderer={YesNoRenderer} field={field} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Yes' }));
    expect(values()).toEqual({ f1: 'Yes' });
    expect(screen.getByRole('radio', { name: 'Yes' })).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(screen.getByRole('radio', { name: 'No' }));
    expect(values()).toEqual({ f1: 'No' });
    expect(screen.getByRole('radio', { name: 'Yes' })).toHaveAttribute('aria-checked', 'false');
  });

  it('cannot be clicked while disabled', async () => {
    render(<Harness Renderer={YesNoRenderer} field={field} disabled />);
    await userEvent.click(screen.getByRole('radio', { name: 'Yes' }));
    expect(values()).toEqual({});
  });
});

describe('RatingRenderer', () => {
  const field = makeField({ type: 'rating', label: 'Score' });

  it('renders five star radios with singular/plural labels', () => {
    render(<Harness Renderer={RatingRenderer} field={field} />);
    expect(screen.getAllByRole('radio')).toHaveLength(5);
    expect(screen.getByRole('radio', { name: '1 star' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '5 stars' })).toBeInTheDocument();
    expect(screen.queryByText(/\/ 5/)).not.toBeInTheDocument();
  });

  it('stores the clicked rating as a number and shows "n / 5"', async () => {
    render(<Harness Renderer={RatingRenderer} field={field} />);
    await userEvent.click(screen.getByRole('radio', { name: '4 stars' }));
    expect(values()).toEqual({ f1: 4 });
    expect(screen.getByRole('radio', { name: '4 stars' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('4 / 5')).toBeInTheDocument();
  });

  it('clicking the chosen star again clears the rating', async () => {
    render(<Harness Renderer={RatingRenderer} field={field} />);
    await userEvent.click(screen.getByRole('radio', { name: '3 stars' }));
    expect(values()).toEqual({ f1: 3 });
    await userEvent.click(screen.getByRole('radio', { name: '3 stars' }));
    expect(values()).toEqual({ f1: '' });
    expect(screen.queryByText('3 / 5')).not.toBeInTheDocument();
  });

  it('clears a rating that came from a restored draft or prefill (a default value)', async () => {
    render(<Harness Renderer={RatingRenderer} field={field} defaultValues={{ f1: 4 }} />);
    expect(screen.getByText('4 / 5')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: '4 stars' }));
    expect(screen.queryByText('4 / 5')).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '4 stars' })).toHaveAttribute('aria-checked', 'false');
  });

  it('disables every star when disabled', () => {
    render(<Harness Renderer={RatingRenderer} field={field} disabled />);
    screen.getAllByRole('radio').forEach((r) => expect(r).toBeDisabled());
  });
});
