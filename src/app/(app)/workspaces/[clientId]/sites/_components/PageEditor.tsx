'use client';

// PageEditor — the block-builder. Holds a local copy of the
// blocksJson so the user can drag/edit/insert/remove without a
// round-trip per change; persistence happens on explicit Save or
// Publish. Drag handles use dnd-kit (already in the project for
// ScheduleReviewCard).

import { useEffect, useMemo, useState } from 'react';
import {
  ExternalLink,
  Save,
  Send,
  Eye,
  EyeOff,
  Plus,
  GripVertical,
  Trash2,
  Type as TypeIcon,
  AlignLeft,
  ImageIcon,
  MousePointerClick,
  ClipboardList,
  ChevronDown,
  Images,
  List,
  Quote,
  HelpCircle,
  Phone,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  useUpdatePage,
  usePublishPage,
  useUnpublishPage,
  type Block,
  type LeadForm,
  type SitePage,
  type SiteSourceType,
  type SitePageGoal,
} from '@/hooks/useSites';
import { ApiError } from '@/lib/apiFetch';
import { cn } from '@/lib/utils';

interface PageEditorProps {
  clientId: string;
  clientSlug: string | null;
  page: SitePage;
  forms: LeadForm[];
}

// Stable per-render ids so dnd-kit can key blocks even when the
// data shape (Block[]) has no id field of its own.
interface IndexedBlock {
  id: string;
  block: Block;
}

function indexBlocks(blocks: Block[]): IndexedBlock[] {
  return blocks.map((block, i) => ({ id: `b-${i}-${block.type}`, block }));
}

const BLOCK_PALETTE: { type: Block['type']; label: string; Icon: typeof TypeIcon }[] = [
  { type: 'hero', label: 'Hero', Icon: TypeIcon },
  { type: 'paragraph', label: 'Paragraph', Icon: AlignLeft },
  { type: 'image', label: 'Image', Icon: ImageIcon },
  { type: 'gallery', label: 'Gallery', Icon: Images },
  { type: 'key_details', label: 'Key details', Icon: List },
  { type: 'testimonial', label: 'Testimonial', Icon: Quote },
  { type: 'faq', label: 'FAQ', Icon: HelpCircle },
  { type: 'cta', label: 'Call to action', Icon: MousePointerClick },
  { type: 'lead_form', label: 'Lead form', Icon: ClipboardList },
  { type: 'contact', label: 'Contact', Icon: Phone },
];

// Mirrors the SiteSourceType enum. Used in the source-attribution
// badge so the user sees "Campaign" rather than the raw enum value.
const SOURCE_TYPE_LABEL: Record<SiteSourceType, string> = {
  CAMPAIGN: 'Campaign',
  PROPERTY: 'Property',
  DATA_ITEM: 'Content asset',
  IDEA: 'Idea',
};

// Mirrors the SitePageGoal enum. Order matches the rough funnel:
// lead capture → listing → offer → event → consultation. The
// dashboard reads from this single source so adding a goal in
// Prisma + this file is enough to surface it.
const PAGE_GOAL_OPTIONS: { value: SitePageGoal; label: string }[] = [
  { value: 'LEAD_CAPTURE', label: 'Lead capture' },
  { value: 'LISTING', label: 'Listing / property promotion' },
  { value: 'OFFER', label: 'Offer / promotion' },
  { value: 'EVENT', label: 'Event / open house' },
  { value: 'CONSULTATION', label: 'Consultation booking' },
];

function makeBlock(type: Block['type']): Block {
  switch (type) {
    case 'hero':
      return { type, headline: '', subheadline: '' };
    case 'paragraph':
      return { type, body: '' };
    case 'image':
      return { type, alt: '', caption: '' };
    case 'cta':
      return { type, label: 'Get in touch', href: 'https://' };
    case 'lead_form':
      return { type, formId: '' };
    case 'gallery':
      return { type, imageUrls: [], layout: 'grid' };
    case 'key_details':
      return { type, heading: 'Key details', items: [{ label: '', value: '' }] };
    case 'testimonial':
      return { type, quote: '', author: '', role: '' };
    case 'faq':
      return { type, heading: 'Frequently asked', items: [{ question: '', answer: '' }] };
    case 'contact':
      return { type, heading: 'Get in touch', phone: '', email: '', address: '' };
  }
}

export function PageEditor({ clientId, clientSlug, page, forms }: PageEditorProps) {
  const [title, setTitle] = useState(page.title);
  const [description, setDescription] = useState(page.description ?? '');
  const [slug, setSlug] = useState(page.slug);
  const [seoTitle, setSeoTitle] = useState(page.seoTitle ?? '');
  const [seoDescription, setSeoDescription] = useState(page.seoDescription ?? '');
  const [pageGoal, setPageGoal] = useState<SitePage['pageGoal']>(page.pageGoal);
  const [noIndex, setNoIndex] = useState<boolean>(page.noIndex);
  const [items, setItems] = useState<IndexedBlock[]>(() => indexBlocks(page.blocksJson));
  const [showAdder, setShowAdder] = useState(false);
  const [showSeo, setShowSeo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');

  // Reset local state when the underlying page changes (e.g. after
  // a publish refetch). useEffect with the row's updatedAt as the
  // dependency is enough — the timestamp moves on every server
  // write.
  useEffect(() => {
    setTitle(page.title);
    setDescription(page.description ?? '');
    setSlug(page.slug);
    setSeoTitle(page.seoTitle ?? '');
    setSeoDescription(page.seoDescription ?? '');
    setPageGoal(page.pageGoal);
    setNoIndex(page.noIndex);
    setItems(indexBlocks(page.blocksJson));
  }, [page.updatedAt, page.id]);
  /* eslint-disable-next-line react-hooks/exhaustive-deps */

  const updatePage = useUpdatePage(clientId, page.id);
  const publishPage = usePublishPage(clientId, page.id);
  const unpublishPage = useUnpublishPage(clientId, page.id);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const oldIndex = prev.findIndex((it) => it.id === active.id);
      const newIndex = prev.findIndex((it) => it.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  function updateBlock(id: string, patch: Partial<Block>) {
    setItems((prev) =>
      prev.map((it) =>
        it.id === id ? { ...it, block: { ...it.block, ...patch } as Block } : it,
      ),
    );
  }

  function removeBlock(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  function addBlock(type: Block['type']) {
    const next = makeBlock(type);
    setItems((prev) => [
      ...prev,
      { id: `b-${prev.length}-${type}-${Date.now()}`, block: next },
    ]);
    setShowAdder(false);
  }

  async function save() {
    setError(null);
    setSaveStatus('idle');
    try {
      const blocksJson = items.map((it) => it.block);
      await updatePage.mutateAsync({
        title: title.trim(),
        description: description.trim() || null,
        slug: slug.trim(),
        seoTitle: seoTitle.trim() || null,
        seoDescription: seoDescription.trim() || null,
        pageGoal,
        noIndex,
        blocksJson,
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save');
    }
  }

  async function publish() {
    setError(null);
    try {
      // Save current edits first, then publish, so the runtime
      // doesn't reveal a stale draft.
      const blocksJson = items.map((it) => it.block);
      await updatePage.mutateAsync({
        title: title.trim(),
        description: description.trim() || null,
        slug: slug.trim(),
        seoTitle: seoTitle.trim() || null,
        seoDescription: seoDescription.trim() || null,
        pageGoal,
        noIndex,
        blocksJson,
      });
      await publishPage.mutateAsync();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to publish');
    }
  }

  async function unpublish() {
    setError(null);
    try {
      await unpublishPage.mutateAsync();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to unpublish');
    }
  }

  const isPublished = page.status === 'PUBLISHED';
  const liveUrl =
    clientSlug && isPublished
      ? `https://${clientSlug}.squadpitchsites.com/${page.slug}`
      : null;
  const previewUrl = clientSlug
    ? `https://${clientSlug}.squadpitchsites.com/${slug}`
    : null;

  const isSaving = updatePage.isPending || publishPage.isPending || unpublishPage.isPending;

  return (
    <div className="space-y-6">
      {/* Header — title + slug + actions */}
      <div className="card p-5 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0 space-y-2">
            <input
              className="text-xl font-bold text-white-100 bg-transparent w-full focus:outline-none placeholder:text-white-30"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled page"
            />
            <div className="flex items-center gap-2 text-xs">
              <span className="text-white-40 font-mono">
                {clientSlug ? `${clientSlug}.squadpitchsites.com` : '<workspace>.squadpitchsites.com'}/
              </span>
              <input
                className="text-xs font-mono bg-white-5 border border-white-10 rounded px-2 py-1 text-white-80 min-w-0 flex-1 max-w-[280px] focus:outline-none focus:border-accent-green-110"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
              />
              <StatusPill status={page.status} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {saveStatus === 'saved' && (
              <span className="text-xs text-accent-green-110">Saved</span>
            )}
            <button
              type="button"
              className="btn btn-ghost border border-white-15 text-sm inline-flex items-center gap-1.5"
              onClick={save}
              disabled={isSaving}
            >
              <Save className="w-4 h-4" />
              Save draft
            </button>
            {isPublished ? (
              <button
                type="button"
                className="btn btn-ghost border border-white-15 text-sm inline-flex items-center gap-1.5"
                onClick={unpublish}
                disabled={isSaving}
              >
                <EyeOff className="w-4 h-4" />
                Unpublish
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary text-sm inline-flex items-center gap-1.5"
                onClick={publish}
                disabled={isSaving}
              >
                <Send className="w-4 h-4" />
                Publish
              </button>
            )}
            {liveUrl && (
              <a
                href={liveUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost border border-white-15 text-sm inline-flex items-center gap-1.5"
              >
                <ExternalLink className="w-4 h-4" />
                View live
              </a>
            )}
          </div>
        </div>

        {error && (
          <div className="text-sm text-accent-red bg-accent-red/10 border border-accent-red/30 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {page.sourceType && (
          <div className="flex items-center gap-2 text-xs text-white-50">
            <span className="text-white-40 uppercase tracking-wider font-medium">
              Source
            </span>
            <span className="px-2 py-0.5 rounded-md bg-white-5 border border-white-10 text-white-70 font-medium">
              {SOURCE_TYPE_LABEL[page.sourceType]}
            </span>
            {page.sourceId && (
              <span className="font-mono text-[10px] text-white-30 truncate max-w-[200px]">
                {page.sourceId}
              </span>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-white-50 uppercase tracking-wider mb-1.5">
              Internal description
            </label>
            <input
              className="input"
              placeholder="What's this page for? Only visible to your team."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white-50 uppercase tracking-wider mb-1.5">
              Page goal
            </label>
            <select
              className="input"
              value={pageGoal ?? ''}
              onChange={(e) =>
                setPageGoal(
                  (e.target.value || null) as SitePage['pageGoal'],
                )
              }
            >
              <option value="">— Not set —</option>
              {PAGE_GOAL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <details className="group">
          <summary
            className="text-xs font-medium text-white-50 uppercase tracking-wider cursor-pointer inline-flex items-center gap-1.5 hover:text-white-70"
            onClick={(e) => {
              e.preventDefault();
              setShowSeo((v) => !v);
            }}
          >
            <ChevronDown
              className={cn('w-3.5 h-3.5 transition-transform', showSeo && 'rotate-180')}
            />
            SEO + social preview
          </summary>
          {showSeo && (
            <div className="mt-3 space-y-3">
              <div>
                <label className="block text-xs font-medium text-white-50 uppercase tracking-wider mb-1.5">
                  SEO title
                </label>
                <input
                  className="input"
                  placeholder="Falls back to page title"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white-50 uppercase tracking-wider mb-1.5">
                  SEO description
                </label>
                <textarea
                  className="input min-h-[80px] resize-y"
                  placeholder="One sentence that summarizes the page for search results."
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  maxLength={400}
                />
              </div>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={noIndex}
                  onChange={(e) => setNoIndex(e.target.checked)}
                  className="mt-0.5 accent-accent-green-110"
                />
                <span className="text-sm">
                  <span className="text-white-80 font-medium">
                    Hide from search engines
                  </span>
                  <span className="block text-xs text-white-50 mt-0.5">
                    Emits <code className="text-white-70">noindex,nofollow</code> in the
                    page metadata. Use for unlisted / share-by-link-only pages.
                  </span>
                </span>
              </label>
            </div>
          )}
        </details>
      </div>

      {/* Block list */}
      <div className="space-y-3">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((it) => it.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {items.map((it) => (
                <SortableBlockCard
                  key={it.id}
                  id={it.id}
                  block={it.block}
                  forms={forms}
                  onChange={(patch) => updateBlock(it.id, patch)}
                  onRemove={() => removeBlock(it.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {items.length === 0 && (
          <div className="card p-8 text-center space-y-2">
            <p className="text-sm font-medium text-white-80">No blocks yet</p>
            <p className="text-xs text-white-50">
              Add a hero, paragraph, image, CTA, or lead-form block to start
              composing this page.
            </p>
          </div>
        )}

        {/* Block adder */}
        <div className="card p-4">
          {!showAdder ? (
            <button
              type="button"
              className="w-full flex items-center justify-center gap-2 text-sm font-medium text-white-60 hover:text-white-100 py-2"
              onClick={() => setShowAdder(true)}
            >
              <Plus className="w-4 h-4" />
              Add block
            </button>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {BLOCK_PALETTE.map(({ type, label, Icon }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => addBlock(type)}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-white-10 hover:border-accent-green-110 hover:bg-accent-green-110/5 transition-colors"
                >
                  <Icon className="w-5 h-5 text-white-50" />
                  <span className="text-xs font-medium text-white-80">{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Preview URL hint */}
      {previewUrl && (
        <p className="text-xs text-white-40 text-center">
          Preview at{' '}
          <span className="font-mono">{previewUrl.replace(/^https:\/\//, '')}</span>{' '}
          after publishing.
        </p>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: SitePage['status'] }) {
  const styles: Record<SitePage['status'], string> = {
    PUBLISHED: 'bg-accent-green-110/15 text-accent-green-110',
    DRAFT: 'bg-amber-300/15 text-amber-300',
    UNPUBLISHED: 'bg-white-10 text-white-40',
    ARCHIVED: 'bg-white-5 text-white-30',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded',
        styles[status],
      )}
    >
      {status.toLowerCase()}
    </span>
  );
}

// ── Sortable block card ────────────────────────────────────────────────

interface SortableBlockCardProps {
  id: string;
  block: Block;
  forms: LeadForm[];
  onChange: (patch: Partial<Block>) => void;
  onRemove: () => void;
}

function SortableBlockCard({ id, block, forms, onChange, onRemove }: SortableBlockCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="card p-4">
      <div className="flex items-start gap-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="text-white-30 hover:text-white-60 cursor-grab active:cursor-grabbing p-1 -ml-1"
          aria-label="Drag to reorder"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs font-semibold text-white-50 uppercase tracking-wider">
              {block.type.replace('_', ' ')}
            </span>
            <button
              type="button"
              onClick={onRemove}
              className="p-1 rounded text-white-30 hover:text-accent-red hover:bg-accent-red/10"
              aria-label="Remove block"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <BlockFields block={block} forms={forms} onChange={onChange} />
        </div>
      </div>
    </div>
  );
}

// ── Per-block field forms ──────────────────────────────────────────────

interface BlockFieldsProps {
  block: Block;
  forms: LeadForm[];
  onChange: (patch: Partial<Block>) => void;
}

function BlockFields({ block, forms, onChange }: BlockFieldsProps) {
  if (block.type === 'hero') {
    return (
      <div className="space-y-3">
        <Field label="Headline">
          <input
            className="input"
            value={block.headline ?? ''}
            onChange={(e) => onChange({ headline: e.target.value } as Partial<Block>)}
            maxLength={240}
          />
        </Field>
        <Field label="Subheadline">
          <textarea
            className="input min-h-[80px] resize-y"
            value={block.subheadline ?? ''}
            onChange={(e) => onChange({ subheadline: e.target.value } as Partial<Block>)}
            maxLength={600}
          />
        </Field>
        <Field label="Image URL (optional)">
          <input
            className="input font-mono text-xs"
            value={block.imageUrl ?? ''}
            placeholder="https://res.cloudinary.com/…"
            onChange={(e) => onChange({ imageUrl: e.target.value || undefined } as Partial<Block>)}
          />
        </Field>
      </div>
    );
  }

  if (block.type === 'paragraph') {
    return (
      <Field label="Body">
        <textarea
          className="input min-h-[120px] resize-y"
          value={block.body ?? ''}
          onChange={(e) => onChange({ body: e.target.value } as Partial<Block>)}
          maxLength={4000}
        />
      </Field>
    );
  }

  if (block.type === 'image') {
    return (
      <div className="space-y-3">
        <Field label="Image URL">
          <input
            className="input font-mono text-xs"
            value={block.imageUrl ?? ''}
            placeholder="https://…"
            onChange={(e) => onChange({ imageUrl: e.target.value || undefined } as Partial<Block>)}
          />
        </Field>
        <Field label="Alt text">
          <input
            className="input"
            value={block.alt ?? ''}
            onChange={(e) => onChange({ alt: e.target.value } as Partial<Block>)}
            maxLength={240}
          />
        </Field>
        <Field label="Caption">
          <input
            className="input"
            value={block.caption ?? ''}
            onChange={(e) => onChange({ caption: e.target.value } as Partial<Block>)}
            maxLength={400}
          />
        </Field>
      </div>
    );
  }

  if (block.type === 'cta') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Button label">
          <input
            className="input"
            value={block.label}
            onChange={(e) => onChange({ label: e.target.value } as Partial<Block>)}
            maxLength={120}
          />
        </Field>
        <Field label="Link URL">
          <input
            className="input font-mono text-xs"
            value={block.href}
            placeholder="https://…"
            onChange={(e) => onChange({ href: e.target.value } as Partial<Block>)}
          />
        </Field>
      </div>
    );
  }

  if (block.type === 'lead_form') {
    return (
      <Field label="Form">
        <select
          className="input"
          value={block.formId}
          onChange={(e) => onChange({ formId: e.target.value } as Partial<Block>)}
        >
          <option value="">Select a form…</option>
          {forms.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        {forms.length === 0 && (
          <p className="text-xs text-amber-300 mt-2">
            No forms in this workspace yet. Create one from the Forms tab first.
          </p>
        )}
      </Field>
    );
  }

  if (block.type === 'gallery') {
    return (
      <div className="space-y-3">
        <Field label="Layout">
          <select
            className="input"
            value={block.layout ?? 'grid'}
            onChange={(e) =>
              onChange({
                layout: e.target.value as 'grid' | 'carousel',
              } as Partial<Block>)
            }
          >
            <option value="grid">Grid</option>
            <option value="carousel">Carousel</option>
          </select>
        </Field>
        <Field label="Image URLs (one per line)">
          <textarea
            className="input min-h-[120px] resize-y font-mono text-xs"
            value={block.imageUrls.join('\n')}
            onChange={(e) =>
              onChange({
                imageUrls: e.target.value
                  .split('\n')
                  .map((s) => s.trim())
                  .filter(Boolean),
              } as Partial<Block>)
            }
            placeholder={'https://...\nhttps://...'}
          />
        </Field>
      </div>
    );
  }

  if (block.type === 'key_details') {
    return (
      <div className="space-y-3">
        <Field label="Heading (optional)">
          <input
            className="input"
            value={block.heading ?? ''}
            onChange={(e) =>
              onChange({ heading: e.target.value } as Partial<Block>)
            }
            maxLength={120}
          />
        </Field>
        <div className="space-y-2">
          {block.items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2">
              <input
                className="input col-span-4"
                placeholder="Label"
                value={item.label}
                onChange={(e) =>
                  onChange({
                    items: block.items.map((it, i) =>
                      i === idx ? { ...it, label: e.target.value } : it,
                    ),
                  } as Partial<Block>)
                }
                maxLength={80}
              />
              <input
                className="input col-span-7"
                placeholder="Value"
                value={item.value}
                onChange={(e) =>
                  onChange({
                    items: block.items.map((it, i) =>
                      i === idx ? { ...it, value: e.target.value } : it,
                    ),
                  } as Partial<Block>)
                }
                maxLength={240}
              />
              <button
                type="button"
                className="col-span-1 p-2 rounded text-white-30 hover:text-accent-red hover:bg-accent-red/10"
                onClick={() =>
                  onChange({
                    items: block.items.filter((_, i) => i !== idx),
                  } as Partial<Block>)
                }
                aria-label="Remove detail"
              >
                <Trash2 className="w-3.5 h-3.5 mx-auto" />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="text-xs font-medium text-accent-green-110 hover:underline inline-flex items-center gap-1"
            onClick={() =>
              onChange({
                items: [...block.items, { label: '', value: '' }],
              } as Partial<Block>)
            }
          >
            <Plus className="w-3.5 h-3.5" />
            Add detail
          </button>
        </div>
      </div>
    );
  }

  if (block.type === 'testimonial') {
    return (
      <div className="space-y-3">
        <Field label="Quote">
          <textarea
            className="input min-h-[100px] resize-y"
            value={block.quote}
            onChange={(e) =>
              onChange({ quote: e.target.value } as Partial<Block>)
            }
            maxLength={800}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Author">
            <input
              className="input"
              value={block.author ?? ''}
              onChange={(e) =>
                onChange({ author: e.target.value } as Partial<Block>)
              }
              maxLength={120}
              placeholder="Jane Doe"
            />
          </Field>
          <Field label="Role / title">
            <input
              className="input"
              value={block.role ?? ''}
              onChange={(e) =>
                onChange({ role: e.target.value } as Partial<Block>)
              }
              maxLength={120}
              placeholder="First-time homebuyer"
            />
          </Field>
        </div>
        <Field label="Headshot URL (optional)">
          <input
            className="input font-mono text-xs"
            value={block.imageUrl ?? ''}
            onChange={(e) =>
              onChange({ imageUrl: e.target.value || undefined } as Partial<Block>)
            }
            placeholder="https://..."
          />
        </Field>
      </div>
    );
  }

  if (block.type === 'faq') {
    return (
      <div className="space-y-3">
        <Field label="Heading (optional)">
          <input
            className="input"
            value={block.heading ?? ''}
            onChange={(e) =>
              onChange({ heading: e.target.value } as Partial<Block>)
            }
            maxLength={120}
          />
        </Field>
        <div className="space-y-3">
          {block.items.map((item, idx) => (
            <div key={idx} className="space-y-2 border border-white-10 rounded-xl p-3">
              <input
                className="input text-sm"
                placeholder="Question"
                value={item.question}
                onChange={(e) =>
                  onChange({
                    items: block.items.map((it, i) =>
                      i === idx ? { ...it, question: e.target.value } : it,
                    ),
                  } as Partial<Block>)
                }
                maxLength={240}
              />
              <textarea
                className="input min-h-[80px] text-sm resize-y"
                placeholder="Answer"
                value={item.answer}
                onChange={(e) =>
                  onChange({
                    items: block.items.map((it, i) =>
                      i === idx ? { ...it, answer: e.target.value } : it,
                    ),
                  } as Partial<Block>)
                }
                maxLength={2000}
              />
              <button
                type="button"
                className="text-xs text-white-40 hover:text-accent-red inline-flex items-center gap-1"
                onClick={() =>
                  onChange({
                    items: block.items.filter((_, i) => i !== idx),
                  } as Partial<Block>)
                }
              >
                <Trash2 className="w-3 h-3" />
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            className="text-xs font-medium text-accent-green-110 hover:underline inline-flex items-center gap-1"
            onClick={() =>
              onChange({
                items: [...block.items, { question: '', answer: '' }],
              } as Partial<Block>)
            }
          >
            <Plus className="w-3.5 h-3.5" />
            Add Q&amp;A
          </button>
        </div>
      </div>
    );
  }

  if (block.type === 'contact') {
    return (
      <div className="space-y-3">
        <Field label="Heading">
          <input
            className="input"
            value={block.heading ?? ''}
            onChange={(e) =>
              onChange({ heading: e.target.value } as Partial<Block>)
            }
            maxLength={120}
            placeholder="Get in touch"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone">
            <input
              className="input"
              value={block.phone ?? ''}
              onChange={(e) =>
                onChange({ phone: e.target.value } as Partial<Block>)
              }
              maxLength={40}
              placeholder="+1 555 555 5555"
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              className="input"
              value={block.email ?? ''}
              onChange={(e) =>
                onChange({ email: e.target.value } as Partial<Block>)
              }
              placeholder="hello@example.com"
            />
          </Field>
        </div>
        <Field label="Address">
          <textarea
            className="input min-h-[60px] resize-y"
            value={block.address ?? ''}
            onChange={(e) =>
              onChange({ address: e.target.value } as Partial<Block>)
            }
            maxLength={400}
          />
        </Field>
      </div>
    );
  }

  return null;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-white-50 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
