'use client';

import { Eye, HardDriveDownload, Save, UploadCloud } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Switch } from '@/components/ui/Switch';
import { storeAutoSave, useAutoSave } from '@/lib/builderPrefs';

const MANUAL_NOTES = [
  { icon: Save, title: 'Save when you are ready', text: 'Click Save beside Undo, or press Ctrl + S (⌘ S on a Mac).' },
  { icon: HardDriveDownload, title: 'Nothing is lost', text: 'Unsaved changes are kept in this browser, and you are asked before you leave.' },
  { icon: Eye, title: 'Preview first', text: 'Preview shows your unsaved changes. Only you can see them.' },
  { icon: UploadCloud, title: 'Publishing saves for you', text: 'Publish and Publish changes save first.' },
];

/** Account settings → Form builder: whether the builder saves by itself. A choice for this device. */
export function BuilderSettingsTab() {
  const autoSave = useAutoSave();

  return (
    <section className="flex flex-col gap-3" aria-labelledby="builder-saving">
      <div>
        <h3 id="builder-saving" className="flex items-center gap-2 bg-h5 font-bold text-(--text-primary)">
          <Save size={18} aria-hidden="true" />
          Saving your forms
        </h3>
        <p className="bg-body-sm text-(--text-muted)">Choose when the form builder saves your changes. This is remembered on this device.</p>
      </div>

      <Card>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <label htmlFor="builder-auto-save" className="bg-body font-semibold text-(--text-primary)">
              Auto save
            </label>
            <p id="builder-auto-save-help" className="mt-1 bg-body-sm text-(--text-muted)">
              {autoSave
                ? 'On: the builder saves by itself a few seconds after you stop making changes. The Save button still works.'
                : 'Off: your changes are saved only when you save them.'}
            </p>
          </div>
          <Switch id="builder-auto-save" className="shrink-0" aria-describedby="builder-auto-save-help" checked={autoSave} onChange={storeAutoSave} />
        </div>
      </Card>

      {!autoSave && (
        <ul className="m-0 flex list-none flex-col gap-3 rounded-lg border border-(--border-default) bg-(--surface-card) p-4">
          {MANUAL_NOTES.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-start gap-3">
              <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-md bg-(--surface-hover) text-(--text-secondary)">
                <Icon size={16} />
              </span>
              <span className="min-w-0">
                <span className="block bg-body-sm font-semibold text-(--text-primary)">{title}</span>
                <span className="block bg-body-sm text-(--text-muted)">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
