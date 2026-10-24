import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExportMenu } from '@/components/responses/ExportMenu';

describe('ExportMenu', () => {
  it('with nothing chosen it exports all responses, as a spreadsheet or a PDF report', async () => {
    const onExport = vi.fn();
    render(<ExportMenu selectedCount={0} onExport={onExport} />);
    await userEvent.click(screen.getByRole('button', { name: 'Export' }));
    expect(screen.getByText('All responses')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('menuitem', { name: 'PDF report' }));
    expect(onExport).toHaveBeenCalledWith('pdf');
  });

  it('with responses chosen it says how many and the PDF is the responses themselves', async () => {
    const onExport = vi.fn();
    render(<ExportMenu selectedCount={3} onExport={onExport} />);
    const trigger = screen.getByRole('button', { name: 'Export 3 selected' });
    expect(trigger).toHaveTextContent('3');
    await userEvent.click(trigger);
    expect(screen.getByText('3 selected')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('menuitem', { name: 'PDF' }));
    expect(onExport).toHaveBeenCalledWith('pdf');
  });

  it('"select all matching" is named as such, and its PDF is the report', async () => {
    render(<ExportMenu selectedCount={1170} allMatching onExport={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Export all 1170 matching' }));
    expect(screen.getByText('All 1170 matching')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'PDF report' })).toBeInTheDocument();
  });
});
