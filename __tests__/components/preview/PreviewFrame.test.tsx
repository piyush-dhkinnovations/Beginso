import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PreviewFrame } from '@/components/preview/PreviewFrame';

describe('PreviewFrame', () => {
  it('embeds the form preview in a titled iframe', () => {
    render(<PreviewFrame formId="abc" device="desktop" title="Form preview" />);
    const frame = screen.getByTitle('Form preview');
    expect(frame.tagName).toBe('IFRAME');
    expect(frame).toHaveAttribute('src', '/forms/abc/preview?embed=1');
  });

  it('adds a layout override to the query string', () => {
    render(<PreviewFrame formId="abc" device="desktop" layout="split" title="p" />);
    expect(screen.getByTitle('p')).toHaveAttribute('src', '/forms/abc/preview?embed=1&layout=split');
  });

  it.each([
    ['desktop', '1280px'],
    ['tablet', '768px'],
    ['mobile', '375px'],
  ] as const)('sizes the %s frame to %s', (device, width) => {
    render(<PreviewFrame formId="abc" device={device} title="p" />);
    const style = screen.getByTitle('p').style;
    expect(style.width).toBe(width);
    expect(style.maxWidth).toBe('100%');
  });

  it('fills the stage on desktop only when fill is set', () => {
    const { rerender } = render(<PreviewFrame formId="abc" device="desktop" fill title="p" />);
    expect(screen.getByTitle('p').style.width).toBe('100%');
    rerender(<PreviewFrame formId="abc" device="tablet" fill title="p" />);
    expect(screen.getByTitle('p').style.width).toBe('768px');
  });
});
