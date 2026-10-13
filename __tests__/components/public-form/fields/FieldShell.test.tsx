import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FieldShell, CharCounter } from '@/components/public-form/fields/FieldShell';

describe('FieldShell', () => {
  it('associates the label with the control via htmlFor', () => {
    render(
      <FieldShell fieldId="abc" label="Name">
        <input id="abc" />
      </FieldShell>
    );
    expect(screen.getByLabelText('Name')).toHaveAttribute('id', 'abc');
  });

  it('marks required fields with an asterisk and omits it otherwise', () => {
    const { rerender } = render(
      <FieldShell fieldId="a" label="Name" required>
        <input id="a" />
      </FieldShell>
    );
    expect(screen.getByText('*')).toBeInTheDocument();
    rerender(
      <FieldShell fieldId="a" label="Name">
        <input id="a" />
      </FieldShell>
    );
    expect(screen.queryByText('*')).not.toBeInTheDocument();
  });

  it('renders help text and an alert for the error message', () => {
    render(
      <FieldShell fieldId="a" label="Name" helpText="As on your ID" error={{ type: 'required', message: 'Name is required' }}>
        <input id="a" />
      </FieldShell>
    );
    expect(screen.getByText('As on your ID')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Name is required');
  });

  it('shows no alert when there is no error', () => {
    render(
      <FieldShell fieldId="a" label="Name">
        <input id="a" />
      </FieldShell>
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders the label as a span (not a <label>) in group mode, with an id for aria-labelledby', () => {
    const { container } = render(
      <FieldShell fieldId="grp" label="Pick" asGroup>
        <div role="group" aria-labelledby="grp-label" />
      </FieldShell>
    );
    expect(container.querySelector('label')).toBeNull();
    expect(container.querySelector('span#grp-label')).toHaveTextContent('Pick');
    expect(screen.getByRole('group', { name: 'Pick' })).toBeInTheDocument();
  });

  it('inline mode puts the label beside the content in a flex row', () => {
    const { container } = render(
      <FieldShell fieldId="a" label="Name" inline>
        <input id="a" />
      </FieldShell>
    );
    const row = container.firstElementChild as HTMLElement;
    expect(row.className).toContain('items-start');
    expect(row.firstElementChild?.tagName).toBe('LABEL');
  });
});

describe('CharCounter', () => {
  it('shows current/max and the error colour only at the limit', () => {
    const { rerender } = render(<CharCounter current={3} max={10} />);
    expect(screen.getByText('3/10').className).not.toContain('error');
    rerender(<CharCounter current={10} max={10} />);
    expect(screen.getByText('10/10').className).toContain('error');
  });
});
