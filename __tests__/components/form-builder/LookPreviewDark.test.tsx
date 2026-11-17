/**
 * The light scope keeps a picture of a form from taking the viewer's dark app theme. It must NOT turn a form that is dark by its OWN design (the
 * Midnight look: a dark card on a night sky) into a light one: the owner's colours are set on the form itself, and win over the scope's tokens.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { LookPreview } from '@/components/form-builder/LooksDialog';
import { GALLERY_STYLES } from '@/lib/formStyles';

const look = (id: string) => GALLERY_STYLES.find((g) => g.id === id)!;
const formLook = (container: HTMLElement) => container.querySelector('.form-look') as HTMLElement;

describe('a dark Look inside the light scope', () => {
  it('keeps its own dark card, field and text colours', () => {
    const { container } = render(<LookPreview look={look('midnight')} />);
    // the picture is in the light scope (so a LIGHT look is not darkened by the app)...
    expect(container.querySelector('[data-theme="light"]')).not.toBeNull();
    // ...and the Midnight look's colours are set inline on the form, so the scope's light tokens cannot lighten them
    const style = formLook(container).style;
    expect(style.getPropertyValue('--surface-card').toLowerCase()).toBe('#111827');
    expect(style.getPropertyValue('--text-primary').toLowerCase()).toBe('#f3f4f6');
    expect(style.getPropertyValue('--form-field-bg').toLowerCase()).toBe('#1f2937');
  });

  it('a light look sets no colours of its own, so it takes the light scope', () => {
    const { container } = render(<LookPreview look={look('clean')} />);
    expect(container.querySelector('[data-theme="light"]')).not.toBeNull();
    expect(formLook(container).style.getPropertyValue('--surface-card')).toBe('');
  });
});
