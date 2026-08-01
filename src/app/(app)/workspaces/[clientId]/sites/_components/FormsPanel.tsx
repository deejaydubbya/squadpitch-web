'use client';

// Forms panel — the inventory + editor for LeadForms. We render
// the list inline and reveal an inline FormEditor when the user
// clicks Edit, instead of routing to a separate page. Forms are
// small (~6 fields max in practice) so a modal-style inline editor
// is fine.

import { useState } from 'react';
import { Plus, Trash2, AlertCircle, ChevronLeft } from 'lucide-react';
import {
  useForms,
  useCreateForm,
  useUpdateForm,
  useDeleteForm,
  type LeadForm,
  type FormFieldDef,
  type FormFieldType,
  type SuccessAction,
} from '@/hooks/useSites';
import { ApiError } from '@/lib/apiFetch';

interface FormsPanelProps {
  clientId: string;
}

export function FormsPanel({ clientId }: FormsPanelProps) {
  const { data: forms, isLoading } = useForms(clientId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const editingForm = forms?.find((f) => f.id === editingId) ?? null;

  if (editingForm) {
    return (
      <FormEditor
        clientId={clientId}
        form={editingForm}
        onClose={() => setEditingId(null)}
      />
    );
  }

  if (creating) {
    return (
      <FormCreator
        clientId={clientId}
        onCreated={(form) => {
          setCreating(false);
          setEditingId(form.id);
        }}
        onClose={() => setCreating(false)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-white-50">
          Forms collect submissions on lead-form blocks. Embed a form in a
          page block to start capturing leads.
        </p>
        <button
          type="button"
          className="btn btn-primary text-sm inline-flex items-center gap-1.5"
          onClick={() => setCreating(true)}
        >
          <Plus className="w-4 h-4" />
          New form
        </button>
      </div>

      {isLoading && <div className="card p-6 text-sm text-white-50">Loading forms…</div>}

      {!isLoading && forms && forms.length === 0 && (
        <div className="card p-8 text-center space-y-2">
          <p className="text-sm font-medium text-white-80">No forms yet</p>
          <p className="text-xs text-white-50">
            Create a form to embed in any lead-form block on your pages.
          </p>
        </div>
      )}

      {!isLoading && forms && forms.length > 0 && (
        <div className="space-y-2">
          {forms.map((form) => (
            <button
              key={form.id}
              type="button"
              onClick={() => setEditingId(form.id)}
              className="card-hover w-full text-left p-4 flex items-center justify-between gap-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white-90">{form.name}</p>
                <p className="text-xs text-white-40 mt-0.5">
                  {form.fieldsJson.length} field{form.fieldsJson.length === 1 ? '' : 's'}
                  {form._count && form._count.submissions > 0 && (
                    <>
                      {' · '}
                      {form._count.submissions} submission
                      {form._count.submissions === 1 ? '' : 's'}
                    </>
                  )}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Inline editor + creator ────────────────────────────────────────────

interface FormEditorProps {
  clientId: string;
  form: LeadForm;
  onClose: () => void;
}

function FormEditor({ clientId, form, onClose }: FormEditorProps) {
  return (
    <FormShell
      clientId={clientId}
      initial={form}
      onClose={onClose}
      mode="edit"
    />
  );
}

interface FormCreatorProps {
  clientId: string;
  onCreated: (form: LeadForm) => void;
  onClose: () => void;
}

function FormCreator({ clientId, onCreated, onClose }: FormCreatorProps) {
  const initial: LeadForm = {
    id: '',
    name: '',
    fieldsJson: [
      { key: 'name', label: 'Your name', type: 'text', required: true },
      { key: 'email', label: 'Email', type: 'email', required: true },
    ],
    successAction: { type: 'message', message: "Thanks — we'll be in touch." },
    notifyEmail: null,
    createdAt: '',
    updatedAt: '',
  };
  return (
    <FormShell
      clientId={clientId}
      initial={initial}
      onClose={onClose}
      mode="create"
      onCreated={onCreated}
    />
  );
}

// ── Shared editor implementation ───────────────────────────────────────

interface FormShellProps {
  clientId: string;
  initial: LeadForm;
  mode: 'create' | 'edit';
  onClose: () => void;
  onCreated?: (form: LeadForm) => void;
}

function FormShell({ clientId, initial, mode, onClose, onCreated }: FormShellProps) {
  const [name, setName] = useState(initial.name);
  const [fields, setFields] = useState<FormFieldDef[]>(initial.fieldsJson);
  const [successAction, setSuccessAction] = useState<SuccessAction>(initial.successAction);
  const [error, setError] = useState<string | null>(null);

  const createForm = useCreateForm(clientId);
  const updateForm = useUpdateForm(clientId, initial.id);
  const deleteForm = useDeleteForm(clientId);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function save() {
    setError(null);
    try {
      if (!name.trim()) {
        setError('Name is required');
        return;
      }
      if (fields.length === 0) {
        setError('Add at least one field');
        return;
      }
      const seen = new Set<string>();
      for (const f of fields) {
        if (!f.key) {
          setError('Every field needs a key');
          return;
        }
        if (seen.has(f.key)) {
          setError(`Duplicate field key: ${f.key}`);
          return;
        }
        seen.add(f.key);
      }

      const payload = {
        name: name.trim(),
        fieldsJson: fields,
        successAction,
      };
      if (mode === 'create') {
        const result = await createForm.mutateAsync(payload);
        onCreated?.(result.form);
      } else {
        await updateForm.mutateAsync(payload);
        onClose();
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save');
    }
  }

  async function handleDelete() {
    try {
      await deleteForm.mutateAsync(initial.id);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete');
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-sm text-white-50 hover:text-white-100"
          onClick={onClose}
        >
          <ChevronLeft className="w-4 h-4" />
          Back to forms
        </button>
        <div className="flex items-center gap-2">
          {mode === 'edit' && (
            <>
              {confirmDelete ? (
                <>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleteForm.isPending}
                    className="btn btn-danger text-sm"
                  >
                    Confirm delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="btn btn-ghost text-sm"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="btn btn-ghost text-sm text-white-50 hover:text-accent-red"
                >
                  Delete form
                </button>
              )}
            </>
          )}
          <button
            type="button"
            className="btn btn-primary text-sm"
            onClick={save}
            disabled={createForm.isPending || updateForm.isPending}
          >
            {mode === 'create' ? 'Create form' : 'Save changes'}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-accent-red bg-accent-red/10 border border-accent-red/30 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="card p-5 space-y-4">
        <div>
          <label className="block text-xs font-medium text-white-50 uppercase tracking-wider mb-1.5">
            Form name
          </label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contact form"
          />
        </div>
      </div>

      <div className="card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white-80">Fields</h3>
          <button
            type="button"
            className="text-xs font-medium text-accent-green-110 hover:underline inline-flex items-center gap-1"
            onClick={() =>
              setFields((prev) => [
                ...prev,
                { key: `field_${prev.length + 1}`, label: 'New field', type: 'text', required: false },
              ])
            }
          >
            <Plus className="w-3.5 h-3.5" />
            Add field
          </button>
        </div>
        <FieldsEditor fields={fields} onChange={setFields} />
      </div>

      <div className="card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-white-80">After submit</h3>
        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm text-white-70">
            <input
              type="radio"
              checked={successAction.type === 'message'}
              onChange={() =>
                setSuccessAction({ type: 'message', message: 'Thanks!' })
              }
              className="accent-accent-green-110"
            />
            Show message
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-white-70">
            <input
              type="radio"
              checked={successAction.type === 'redirect'}
              onChange={() =>
                setSuccessAction({ type: 'redirect', url: 'https://' })
              }
              className="accent-accent-green-110"
            />
            Redirect to URL
          </label>
        </div>
        {successAction.type === 'message' ? (
          <input
            className="input"
            value={successAction.message}
            onChange={(e) =>
              setSuccessAction({ type: 'message', message: e.target.value })
            }
            placeholder="Thanks — we'll be in touch shortly."
            maxLength={400}
          />
        ) : (
          <input
            className="input font-mono text-xs"
            value={successAction.url}
            onChange={(e) =>
              setSuccessAction({ type: 'redirect', url: e.target.value })
            }
            placeholder="https://example.com/thank-you"
          />
        )}
      </div>
    </div>
  );
}

// ── Fields editor ──────────────────────────────────────────────────────

const FIELD_TYPES: { value: FormFieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'select', label: 'Select' },
  { value: 'checkbox', label: 'Checkbox' },
];

interface FieldsEditorProps {
  fields: FormFieldDef[];
  onChange: (next: FormFieldDef[]) => void;
}

function FieldsEditor({ fields, onChange }: FieldsEditorProps) {
  function update(idx: number, patch: Partial<FormFieldDef>) {
    onChange(fields.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  }

  function remove(idx: number) {
    onChange(fields.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-2">
      {fields.map((f, i) => (
        <div key={i} className="border border-white-10 rounded-xl p-3 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
            <div className="md:col-span-3">
              <label className="block text-[10px] font-semibold text-white-40 uppercase tracking-wider mb-1">
                Key
              </label>
              <input
                className="input font-mono text-xs"
                value={f.key}
                onChange={(e) =>
                  update(i, { key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })
                }
                placeholder="email"
              />
            </div>
            <div className="md:col-span-4">
              <label className="block text-[10px] font-semibold text-white-40 uppercase tracking-wider mb-1">
                Label
              </label>
              <input
                className="input text-sm"
                value={f.label}
                onChange={(e) => update(i, { label: e.target.value })}
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-[10px] font-semibold text-white-40 uppercase tracking-wider mb-1">
                Type
              </label>
              <select
                className="input text-sm"
                value={f.type}
                onChange={(e) =>
                  update(i, {
                    type: e.target.value as FormFieldType,
                    options: e.target.value === 'select' ? f.options ?? [] : undefined,
                  })
                }
              >
                {FIELD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2 flex items-end justify-between gap-2">
              <label className="inline-flex items-center gap-1.5 text-xs text-white-70">
                <input
                  type="checkbox"
                  checked={f.required ?? false}
                  onChange={(e) => update(i, { required: e.target.checked })}
                  className="accent-accent-green-110"
                />
                Required
              </label>
              <button
                type="button"
                className="p-2 rounded text-white-30 hover:text-accent-red hover:bg-accent-red/10"
                onClick={() => remove(i)}
                aria-label="Remove field"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          {f.type === 'select' && (
            <SelectOptionsEditor
              options={f.options ?? []}
              onChange={(opts) => update(i, { options: opts })}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function SelectOptionsEditor({
  options,
  onChange,
}: {
  options: { value: string; label: string }[];
  onChange: (next: { value: string; label: string }[]) => void;
}) {
  return (
    <div className="space-y-2 border-t border-white-10 pt-3">
      <p className="text-[10px] font-semibold text-white-40 uppercase tracking-wider">
        Options
      </p>
      {options.map((opt, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            className="input text-xs font-mono"
            placeholder="value"
            value={opt.value}
            onChange={(e) =>
              onChange(
                options.map((o, idx) => (idx === i ? { ...o, value: e.target.value } : o)),
              )
            }
          />
          <input
            className="input text-xs"
            placeholder="Label"
            value={opt.label}
            onChange={(e) =>
              onChange(
                options.map((o, idx) => (idx === i ? { ...o, label: e.target.value } : o)),
              )
            }
          />
          <button
            type="button"
            className="p-2 rounded text-white-30 hover:text-accent-red hover:bg-accent-red/10"
            onClick={() => onChange(options.filter((_, idx) => idx !== i))}
            aria-label="Remove option"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="text-xs font-medium text-accent-green-110 hover:underline inline-flex items-center gap-1"
        onClick={() => onChange([...options, { value: '', label: '' }])}
      >
        <Plus className="w-3 h-3" />
        Add option
      </button>
    </div>
  );
}
