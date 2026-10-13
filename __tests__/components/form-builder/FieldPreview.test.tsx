import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FieldPreview } from '@/components/form-builder/FieldPreview';
import { makeField } from './builderTestUtils';
import type { FieldType } from '@/types/form';

describe('FieldPreview', () => {
  it.each<[FieldType, string]>([
    ['short_text', 'Short answer text'],
    ['email', 'name@example.com'],
    ['phone', '+1 555 000 0000'],
    ['long_text', 'Long answer text'],
    ['number', '0'],
    ['url', 'https://example.com'],
    ['currency', '0.00'],
  ])('%s shows its default hint when there is no placeholder', (type, hint) => {
    render(<FieldPreview field={makeField(type)} />);
    expect(screen.getByText(hint)).toBeInTheDocument();
  });

  it.each<FieldType>(['short_text', 'long_text', 'number', 'url', 'currency'])('%s shows the configured placeholder instead of the default', (type) => {
    render(<FieldPreview field={makeField(type, { placeholder: 'Custom hint' })} />);
    expect(screen.getByText('Custom hint')).toBeInTheDocument();
  });

  it('shows fixed hints for date, time, datetime, dropdown, signature and yes/no', () => {
    const { unmount } = render(<FieldPreview field={makeField('date')} />);
    expect(screen.getByText('dd-mm-yyyy')).toBeInTheDocument();
    unmount();
    const r2 = render(<FieldPreview field={makeField('time')} />);
    expect(screen.getByText('hh:mm')).toBeInTheDocument();
    r2.unmount();
    const r3 = render(<FieldPreview field={makeField('datetime')} />);
    expect(screen.getByText('dd-mm-yyyy, hh:mm')).toBeInTheDocument();
    r3.unmount();
    const r4 = render(<FieldPreview field={makeField('dropdown')} />);
    expect(screen.getByText(/Select an option/)).toBeInTheDocument();
    r4.unmount();
    const r5 = render(<FieldPreview field={makeField('signature')} />);
    expect(screen.getByText('Sign here')).toBeInTheDocument();
    r5.unmount();
    render(<FieldPreview field={makeField('yes_no')} />);
    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
  });

  it('choice fields list up to three options and summarise the rest', () => {
    render(<FieldPreview field={makeField('multiple_choice', { options: ['A', 'B', 'C', 'D', 'E'] } as never)} />);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.queryByText('D')).not.toBeInTheDocument();
    expect(screen.getByText('+ 2 more')).toBeInTheDocument();
  });

  it('choice fields with three or fewer options show no "more" line', () => {
    render(<FieldPreview field={makeField('checkbox', { options: ['A', 'B', 'C'] } as never)} />);
    expect(screen.queryByText(/more/)).not.toBeInTheDocument();
  });

  it('currency shows the symbol of the chosen currency (INR by default)', () => {
    const { unmount } = render(<FieldPreview field={makeField('currency')} />);
    expect(screen.getByText('₹')).toBeInTheDocument();
    unmount();
    render(<FieldPreview field={makeField('currency', { currency: 'USD' } as never)} />);
    expect(screen.getByText('$')).toBeInTheDocument();
  });

  it('file upload says "Upload a file"; image upload says one image or up to N', () => {
    const r1 = render(<FieldPreview field={makeField('file_upload')} />);
    expect(screen.getByText('Upload a file')).toBeInTheDocument();
    r1.unmount();
    const r2 = render(<FieldPreview field={makeField('image_upload')} />);
    expect(screen.getByText('Upload an image')).toBeInTheDocument();
    r2.unmount();
    render(<FieldPreview field={makeField('image_upload', { allowMultiple: true, maxImages: 10 } as never)} />);
    expect(screen.getByText('Upload up to 10 images')).toBeInTheDocument();
  });

  it('address previews all four parts', () => {
    render(<FieldPreview field={makeField('address')} />);
    ['Street', 'City', 'State', 'ZIP / PIN'].forEach((p) => expect(screen.getByText(p)).toBeInTheDocument());
  });

  it('rating is a decorative row of five stars', () => {
    const { container } = render(<FieldPreview field={makeField('rating')} />);
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelectorAll('svg')).toHaveLength(5);
  });
});
