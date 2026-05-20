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
  ChevronRight,
  Images,
  List,
  Quote,
  HelpCircle,
  Phone,
  ArrowUp,
  ArrowDown,
  Copy,
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
  useFormStats,
  useCreateForm,
  type Block,
  type LeadForm,
  type SitePage,
  type SiteSourceType,
  type SitePageGoal,
  type FormFieldDef,
} from '@/hooks/useSites';
import { useDataItem } from '@/hooks/useSquadpitch';
import { ApiError } from '@/lib/apiFetch';
import {
  normalizeProperty,
  buildKeyDetailItems,
  buildHeroSubheadline,
  buildSafeDescription,
  type NormalizedProperty,
} from '@/lib/property/normalize';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Home as HomeIcon, Sparkles, AlertTriangle } from 'lucide-react';
import { ImageField } from './ImageField';
import { GalleryField } from './GalleryField';
import { PreviewRenderer } from './PreviewRenderer';
import { Monitor, Smartphone, Pencil } from 'lucide-react';

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

// Sites-06 — refined block labels + categorized add-picker.
const BLOCK_LABELS: Record<Block['type'], string> = {
  hero: 'Hero',
  paragraph: 'Paragraph / Story',
  image: 'Image',
  cta: 'Call to action',
  lead_form: 'Lead Capture Form',
  gallery: 'Photo Gallery',
  key_details: 'Property Details',
  testimonial: 'Testimonial',
  faq: 'FAQ',
  contact: 'Agent Contact',
};

interface BlockPaletteEntry {
  type: Block['type'];
  label: string;
  Icon: typeof TypeIcon;
}

const BLOCK_PALETTE: BlockPaletteEntry[] = [
  { type: 'hero', label: BLOCK_LABELS.hero, Icon: TypeIcon },
  { type: 'paragraph', label: BLOCK_LABELS.paragraph, Icon: AlignLeft },
  { type: 'image', label: BLOCK_LABELS.image, Icon: ImageIcon },
  { type: 'gallery', label: BLOCK_LABELS.gallery, Icon: Images },
  { type: 'key_details', label: BLOCK_LABELS.key_details, Icon: List },
  { type: 'testimonial', label: BLOCK_LABELS.testimonial, Icon: Quote },
  { type: 'faq', label: BLOCK_LABELS.faq, Icon: HelpCircle },
  { type: 'cta', label: BLOCK_LABELS.cta, Icon: MousePointerClick },
  { type: 'lead_form', label: BLOCK_LABELS.lead_form, Icon: ClipboardList },
  { type: 'contact', label: BLOCK_LABELS.contact, Icon: Phone },
];

// Block-picker categories for the Add Block flow. "Suggested" is
// computed at render time when the page has a PROPERTY source —
// it shows the blocks that benefit most from autofill.
const BLOCK_CATEGORIES: Array<{
  label: string;
  types: Block['type'][];
}> = [
  { label: 'Headline & copy', types: ['hero', 'paragraph', 'image'] },
  { label: 'Property info', types: ['key_details', 'gallery'] },
  { label: 'Trust & objections', types: ['testimonial', 'faq'] },
  { label: 'Conversion', types: ['cta', 'lead_form', 'contact'] },
];

const PROPERTY_SUGGESTED: Block['type'][] = [
  'hero',
  'key_details',
  'gallery',
  'paragraph',
  'cta',
  'lead_form',
  'contact',
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
  // Sites validation fix — when the API rejects a save with
  // VALIDATION_ERROR, we stash the per-field issues here so the
  // editor can render which field (and which block index)
  // failed. Cleared on every save attempt.
  const [validationIssues, setValidationIssues] = useState<
    Array<{ path: Array<string | number>; message: string }>
  >([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  // Sites-04 — in-app preview. mode toggles between editor and the
  // mirrored public renderer; viewport chooses the iframe width.
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop');

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

  // Sites-02 — load the source property when the page is linked to
  // one. Hook always fires (with undefined id when no source) so
  // the rules-of-hooks contract holds. PROPERTY pages get a rich
  // source pill + per-block "Pull from property" actions.
  const isPropertyPage = page.sourceType === 'PROPERTY' && Boolean(page.sourceId);
  const propertySourceItem = useDataItem(clientId, isPropertyPage ? page.sourceId ?? undefined : undefined);
  const property = isPropertyPage ? normalizeProperty(propertySourceItem.data ?? null) : null;
  const propertyMissing =
    isPropertyPage && !propertySourceItem.isLoading && !propertySourceItem.data;

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

  function duplicateBlock(id: string) {
    setItems((prev) => {
      const idx = prev.findIndex((it) => it.id === id);
      if (idx < 0) return prev;
      const source = prev[idx];
      const copy: IndexedBlock = {
        id: `b-${Date.now()}-${source.block.type}`,
        block: structuredClone(source.block),
      };
      return [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)];
    });
  }

  function moveBlock(id: string, dir: -1 | 1) {
    setItems((prev) => {
      const idx = prev.findIndex((it) => it.id === id);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= prev.length) return prev;
      return arrayMove(prev, idx, target);
    });
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
    setValidationIssues([]);
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
      if (err instanceof ApiError && Array.isArray(err.issues)) {
        setValidationIssues(err.issues);
      }
    }
  }

  async function publish() {
    setError(null);
    setValidationIssues([]);
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
      if (err instanceof ApiError && Array.isArray(err.issues)) {
        setValidationIssues(err.issues);
      }
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
          <div className="flex items-center gap-2 flex-wrap">
            {saveStatus === 'saved' && (
              <span className="text-xs text-accent-green-110">Saved</span>
            )}
            <div className="inline-flex rounded-lg border border-white-15 overflow-hidden">
              <button
                type="button"
                data-testid="editor-mode-edit"
                onClick={() => setMode('edit')}
                className={cn(
                  'px-2.5 py-1.5 text-xs font-medium inline-flex items-center gap-1.5 transition-colors',
                  mode === 'edit'
                    ? 'bg-accent-green-110/10 text-accent-green-110'
                    : 'text-white-50 hover:bg-white-5',
                )}
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </button>
              <button
                type="button"
                data-testid="editor-mode-preview"
                onClick={() => setMode('preview')}
                className={cn(
                  'px-2.5 py-1.5 text-xs font-medium inline-flex items-center gap-1.5 transition-colors border-l border-white-15',
                  mode === 'preview'
                    ? 'bg-accent-green-110/10 text-accent-green-110'
                    : 'text-white-50 hover:bg-white-5',
                )}
              >
                <Eye className="w-3.5 h-3.5" />
                Preview
              </button>
            </div>
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
                data-testid="editor-view-live"
                className="btn btn-ghost border border-white-15 text-sm inline-flex items-center gap-1.5"
              >
                <ExternalLink className="w-4 h-4" />
                View live
              </a>
            )}
          </div>
        </div>

        {error && (
          <div className="text-sm text-accent-red bg-accent-red/10 border border-accent-red/30 rounded-lg px-3 py-2 space-y-1.5">
            <p>{error}</p>
            {/* Sites validation fix: surface zod issue paths inline so
                a save failure tells the user WHICH field (and for
                blocksJson, WHICH block) needs fixing instead of just
                "Validation failed". Reads ApiError.issues forwarded
                by apiFetch.ts. */}
            {validationIssues.length > 0 && (
              <ul className="list-disc list-inside text-xs text-accent-red/90 space-y-0.5 pl-1">
                {validationIssues.map((iss, i) => (
                  <li key={`${formatIssuePath(iss.path)}-${i}`}>
                    <code className="text-accent-red">{formatIssuePath(iss.path)}</code>
                    {' — '}
                    {iss.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Sites-04 — be truthful about what save/publish does. */}
        {isPublished ? (
          <p
            data-testid="page-editor-status-note-published"
            className="text-xs text-yellow-300 bg-yellow-500/5 border border-yellow-500/20 rounded-lg px-3 py-2"
          >
            <span className="font-semibold">This page is published.</span>{' '}
            Saving changes updates the working page and may appear live after the site refreshes.
          </p>
        ) : (
          <p
            data-testid="page-editor-status-note-draft"
            className="text-xs text-white-60 bg-white-3 border border-white-10 rounded-lg px-3 py-2"
          >
            <span className="font-semibold">Drafts are private until you publish.</span>{' '}
            Use Preview to see what the page will look like.
          </p>
        )}

        {isPropertyPage && property ? (
          <PropertySourcePanel clientId={clientId} property={property} />
        ) : propertyMissing ? (
          <div
            data-testid="page-editor-source-missing"
            className="flex items-start gap-2 text-xs text-yellow-300 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2"
          >
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>
              Linked property not found — it may have been archived. Existing page
              content is safe; edits won&apos;t affect any property.
            </span>
          </div>
        ) : page.sourceType ? (
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
        ) : null}

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

      {/* Sites-04 — Edit vs Preview swap. Preview reuses local
          unsaved state so what you see is what the page will look
          like after Save (and Publish, if you're on a draft). */}
      {mode === 'preview' ? (
        <PreviewViewport
          viewport={viewport}
          onViewportChange={setViewport}
          blocks={items.map((it) => it.block)}
        />
      ) : (
        /* Block list */
        <div className="space-y-3">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map((it) => it.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {items.map((it, idx) => (
                  <SortableBlockCard
                    key={it.id}
                    id={it.id}
                    block={it.block}
                    forms={forms}
                    property={property}
                    clientId={clientId}
                    pageId={page.id}
                    pageSourceType={page.sourceType}
                    isFirst={idx === 0}
                    isLast={idx === items.length - 1}
                    onChange={(patch) => updateBlock(it.id, patch)}
                    onRemove={() => removeBlock(it.id)}
                    onDuplicate={() => duplicateBlock(it.id)}
                    onMove={(dir) => moveBlock(it.id, dir)}
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
            <BlockPicker
              showSuggested={Boolean(property)}
              onAdd={(type) => {
                addBlock(type);
                setShowAdder(false);
              }}
            />
          )}
        </div>
        </div>
      )}

      {/* Preview URL hint */}
      {previewUrl && mode === 'edit' && (
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
  property: NormalizedProperty | null;
  clientId: string;
  pageId: string;
  pageSourceType: SiteSourceType | null;
  isFirst: boolean;
  isLast: boolean;
  onChange: (patch: Partial<Block>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMove: (dir: -1 | 1) => void;
}

function SortableBlockCard({
  id,
  block,
  forms,
  property,
  clientId,
  pageId,
  pageSourceType,
  isFirst,
  isLast,
  onChange,
  onRemove,
  onDuplicate,
  onMove,
}: SortableBlockCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const [collapsed, setCollapsed] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="card p-4" data-testid="sortable-block-card">
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
          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              data-testid="block-collapse-toggle"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white-60 hover:text-white-100 uppercase tracking-wider"
            >
              {collapsed ? (
                <ChevronRight className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
              {BLOCK_LABELS[block.type] ?? block.type}
            </button>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => onMove(-1)}
                disabled={isFirst}
                data-testid="block-move-up"
                className="p-1 rounded text-white-30 hover:text-white-100 hover:bg-white-10 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Move up"
                title="Move up"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onMove(1)}
                disabled={isLast}
                data-testid="block-move-down"
                className="p-1 rounded text-white-30 hover:text-white-100 hover:bg-white-10 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Move down"
                title="Move down"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onDuplicate}
                data-testid="block-duplicate"
                className="p-1 rounded text-white-30 hover:text-white-100 hover:bg-white-10"
                aria-label="Duplicate block"
                title="Duplicate"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onRemove}
                className="p-1 rounded text-white-30 hover:text-accent-red hover:bg-accent-red/10"
                aria-label="Remove block"
                title="Remove"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          {!collapsed && (
            <BlockFields
              block={block}
              forms={forms}
              property={property}
              clientId={clientId}
              pageId={pageId}
              pageSourceType={pageSourceType}
              onChange={onChange}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Per-block field forms ──────────────────────────────────────────────

interface BlockFieldsProps {
  block: Block;
  forms: LeadForm[];
  property: NormalizedProperty | null;
  clientId: string;
  pageId: string;
  pageSourceType: SiteSourceType | null;
  onChange: (patch: Partial<Block>) => void;
}

function BlockFields({
  block,
  forms,
  property,
  clientId,
  pageId,
  pageSourceType,
  onChange,
}: BlockFieldsProps) {
  const propertyImages = property?.images ?? undefined;
  if (block.type === 'hero') {
    const pullFromProperty = property
      ? () =>
          onChange({
            headline: property.title,
            subheadline: buildHeroSubheadline(property),
            imageUrl: property.primaryImage ?? undefined,
          } as Partial<Block>)
      : null;
    return (
      <div className="space-y-3">
        {pullFromProperty && (
          <PullFromPropertyButton onClick={pullFromProperty} label="Pull from property" />
        )}
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
        <ImageField
          clientId={clientId}
          label="Hero image (optional)"
          value={{
            imageUrl: block.imageUrl ?? null,
            imageId: (block as { imageId?: string | null }).imageId ?? null,
          }}
          propertyImages={propertyImages}
          onChange={(next) =>
            onChange({
              imageUrl: next.imageUrl ?? undefined,
              imageId: next.imageId ?? undefined,
            } as Partial<Block>)
          }
        />
      </div>
    );
  }

  if (block.type === 'paragraph') {
    const pullFromProperty = property
      ? () => onChange({ body: buildSafeDescription(property) } as Partial<Block>)
      : null;
    return (
      <div className="space-y-3">
        {pullFromProperty && (
          <PullFromPropertyButton onClick={pullFromProperty} label="Pull description from property" />
        )}
        <Field label="Body">
          <textarea
            className="input min-h-[120px] resize-y"
            value={block.body ?? ''}
            onChange={(e) => onChange({ body: e.target.value } as Partial<Block>)}
            maxLength={4000}
          />
        </Field>
      </div>
    );
  }

  if (block.type === 'image') {
    return (
      <div className="space-y-3">
        <ImageField
          clientId={clientId}
          label="Image"
          value={{
            imageUrl: block.imageUrl ?? null,
            imageId: (block as { imageId?: string | null }).imageId ?? null,
          }}
          propertyImages={propertyImages}
          onChange={(next) =>
            onChange({
              imageUrl: next.imageUrl ?? undefined,
              imageId: next.imageId ?? undefined,
            } as Partial<Block>)
          }
        />
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
      <LeadFormBlockFields
        block={block}
        forms={forms}
        clientId={clientId}
        pageId={pageId}
        pageSourceType={pageSourceType}
        onChange={onChange}
      />
    );
  }

  if (block.type === 'gallery') {
    const pullFromProperty =
      property && property.images.length > 0
        ? () => onChange({ imageUrls: property.images } as Partial<Block>)
        : null;
    return (
      <div className="space-y-3">
        {pullFromProperty && (
          <PullFromPropertyButton
            onClick={pullFromProperty}
            label={`Pull ${property!.images.length} photo${property!.images.length === 1 ? '' : 's'} from property`}
          />
        )}
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
        <Field label="Images">
          <GalleryField
            clientId={clientId}
            imageUrls={block.imageUrls}
            propertyImages={propertyImages}
            onChange={(next) => onChange({ imageUrls: next } as Partial<Block>)}
          />
        </Field>
      </div>
    );
  }

  if (block.type === 'key_details') {
    const pullFromProperty = property
      ? () => onChange({ items: buildKeyDetailItems(property) } as Partial<Block>)
      : null;
    return (
      <div className="space-y-3">
        {pullFromProperty && (
          <PullFromPropertyButton onClick={pullFromProperty} label="Pull details from property" />
        )}
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
        <ImageField
          clientId={clientId}
          label="Headshot (optional)"
          value={{
            imageUrl: block.imageUrl ?? null,
            imageId: (block as { imageId?: string | null }).imageId ?? null,
          }}
          onChange={(next) =>
            onChange({
              imageUrl: next.imageUrl ?? undefined,
              imageId: next.imageId ?? undefined,
            } as Partial<Block>)
          }
        />
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

// Spinstr427 — lead-form block field component. Extracted so it
// can own its own state for the stats fetch + inline-create modal.
function LeadFormBlockFields({
  block,
  forms,
  clientId,
  pageId,
  pageSourceType,
  onChange,
}: {
  block: Extract<Block, { type: 'lead_form' }>;
  forms: LeadForm[];
  clientId: string;
  pageId: string;
  pageSourceType: SiteSourceType | null;
  onChange: (patch: Partial<Block>) => void;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const selected = forms.find((f) => f.id === block.formId) ?? null;
  const fieldCount = selected?.fieldsJson?.length ?? 0;
  const { data: stats } = useFormStats(
    clientId,
    selected?.id ?? undefined,
    pageId,
  );

  return (
    <div className="space-y-3" data-testid="lead-form-block-fields">
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
      </Field>

      <button
        type="button"
        onClick={() => setShowCreate(true)}
        data-testid="lead-form-create-new"
        className="text-[11px] text-accent-green-110 hover:underline"
      >
        + Create a new form
      </button>

      {forms.length === 0 && !selected && (
        <p className="text-xs text-amber-300">
          No forms in this workspace yet. Use <em>Create a new form</em> above
          or build one from the Forms tab.
        </p>
      )}
      {forms.length > 0 && !block.formId && (
        <p className="text-xs text-white-50">
          Pick a form so this block can render on the published page.
        </p>
      )}
      {block.formId && !selected && (
        <p className="text-xs text-amber-300">
          Selected form not found. Pick another or create a new one.
        </p>
      )}
      {selected && (
        <div
          data-testid="lead-form-block-context"
          className="rounded-lg border border-white-10 bg-white-3 p-3 text-xs text-white-70 space-y-2"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-white-100">{selected.name}</p>
              <p className="text-[11px] text-white-50">
                {fieldCount} field{fieldCount === 1 ? '' : 's'}
                {selected.notifyEmail ? ` · notifies ${selected.notifyEmail}` : ''}
              </p>
            </div>
            <Link
              href={`/workspaces/${clientId}/sites?tab=forms&formId=${selected.id}`}
              className="text-[11px] text-accent-green-110 hover:underline"
            >
              Edit form →
            </Link>
          </div>
          {stats && stats.count >= 0 && (
            <p
              data-testid="lead-form-stats"
              className="text-[11px] text-white-60"
            >
              {stats.count === 0
                ? 'No submissions on this page yet.'
                : `${stats.count} submission${stats.count === 1 ? '' : 's'} from this page${
                    stats.lastSubmissionAt
                      ? ` · last ${new Date(stats.lastSubmissionAt).toLocaleDateString()}`
                      : ''
                  }`}
            </p>
          )}
          <Link
            href={`/workspaces/${clientId}/sites?tab=submissions&formId=${selected.id}&pageId=${pageId}`}
            className="inline-block text-[11px] text-white-60 hover:text-white-100 hover:underline"
          >
            View submissions
          </Link>
        </div>
      )}

      {showCreate && (
        <CreateLeadFormModal
          clientId={clientId}
          pageSourceType={pageSourceType}
          onClose={() => setShowCreate(false)}
          onCreated={(formId) => {
            onChange({ formId } as Partial<Block>);
            setShowCreate(false);
          }}
        />
      )}
    </div>
  );
}

// Spinstr427 — inline create-form modal so the user never has to
// leave the page editor to wire a lead form. Defaults the field
// set based on the page's source type / template intent.
function CreateLeadFormModal({
  clientId,
  pageSourceType,
  onClose,
  onCreated,
}: {
  clientId: string;
  pageSourceType: SiteSourceType | null;
  onClose: () => void;
  onCreated: (formId: string) => void;
}) {
  const create = useCreateForm(clientId);
  const defaultTemplate: FormTemplate =
    pageSourceType === 'PROPERTY' ? 'property_inquiry' : 'general';
  const [name, setName] = useState(FORM_TEMPLATE_DEFAULT_NAMES[defaultTemplate]);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [template, setTemplate] = useState<FormTemplate>(defaultTemplate);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Form name is required.');
      return;
    }
    try {
      const result = await create.mutateAsync({
        name: name.trim(),
        fieldsJson: FORM_TEMPLATE_FIELDS[template],
        successAction: {
          type: 'message',
          message: "Thanks — we'll be in touch shortly.",
        },
        notifyEmail: notifyEmail.trim() || null,
      });
      onCreated(result.form.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the form.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-sp-card border border-white-10 shadow-2xl">
        <header className="flex items-center justify-between p-4 border-b border-white-10">
          <h2 className="text-sm font-semibold text-white-100">Create a new form</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-white-40 hover:text-white-100 hover:bg-white-10"
            aria-label="Close"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </header>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <Field label="Form name">
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              autoFocus
            />
          </Field>
          <Field label="Template">
            <select
              className="input"
              value={template}
              onChange={(e) => {
                const t = e.target.value as FormTemplate;
                setTemplate(t);
                setName(FORM_TEMPLATE_DEFAULT_NAMES[t]);
              }}
            >
              <option value="general">General lead form</option>
              <option value="property_inquiry">Property inquiry</option>
              <option value="seller_lead">Seller lead</option>
              <option value="buyer_lead">Buyer lead</option>
            </select>
            <p className="text-[11px] text-white-50 mt-1">
              Default fields:{' '}
              {FORM_TEMPLATE_FIELDS[template]
                .map((f) => f.label)
                .join(', ')}
              .
            </p>
          </Field>
          <Field label="Notification email (optional)">
            <input
              className="input"
              type="email"
              value={notifyEmail}
              onChange={(e) => setNotifyEmail(e.target.value)}
              placeholder="agent@example.com"
              maxLength={320}
            />
          </Field>
          {error && (
            <p className="text-xs text-accent-red bg-accent-red/10 border border-accent-red/20 rounded-md px-2 py-1.5">
              {error}
            </p>
          )}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-lg text-sm text-white-60 hover:bg-white-10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={create.isPending}
              className="px-3 py-2 rounded-lg text-sm font-semibold bg-accent-green-110 text-black hover:bg-accent-green-110/90 disabled:opacity-60"
            >
              {create.isPending ? 'Creating…' : 'Create form'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type FormTemplate = 'general' | 'property_inquiry' | 'seller_lead' | 'buyer_lead';

const FORM_TEMPLATE_DEFAULT_NAMES: Record<FormTemplate, string> = {
  general: 'Contact form',
  property_inquiry: 'Property inquiry form',
  seller_lead: 'Seller lead form',
  buyer_lead: 'Buyer lead form',
};

const FORM_TEMPLATE_FIELDS: Record<FormTemplate, FormFieldDef[]> = {
  general: [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'email', label: 'Email', type: 'email', required: true },
    { key: 'phone', label: 'Phone', type: 'phone' },
    { key: 'message', label: 'Message', type: 'textarea' },
  ],
  property_inquiry: [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'email', label: 'Email', type: 'email', required: true },
    { key: 'phone', label: 'Phone', type: 'phone' },
    { key: 'message', label: 'Question about this property', type: 'textarea' },
  ],
  seller_lead: [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'email', label: 'Email', type: 'email', required: true },
    { key: 'phone', label: 'Phone', type: 'phone' },
    { key: 'address', label: 'Property address', type: 'text' },
    { key: 'timeline', label: 'When are you thinking of selling?', type: 'text' },
  ],
  buyer_lead: [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'email', label: 'Email', type: 'email', required: true },
    { key: 'phone', label: 'Phone', type: 'phone' },
    { key: 'budget', label: 'Budget range', type: 'text' },
    { key: 'preferences', label: 'What are you looking for?', type: 'textarea' },
  ],
};

// Sites-06 — categorized block picker. Shows a "Suggested" group at
// the top for property-linked pages, then standard categories.
function BlockPicker({
  showSuggested,
  onAdd,
}: {
  showSuggested: boolean;
  onAdd: (type: Block['type']) => void;
}) {
  const paletteByType = new Map(BLOCK_PALETTE.map((e) => [e.type, e] as const));
  const groups: Array<{ label: string; types: Block['type'][] }> = [
    ...(showSuggested
      ? [{ label: 'Suggested for property pages', types: PROPERTY_SUGGESTED }]
      : []),
    ...BLOCK_CATEGORIES,
  ];

  return (
    <div className="space-y-4" data-testid="block-picker">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="text-[10px] uppercase tracking-wider font-semibold text-white-40 mb-2">
            {group.label}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {group.types
              .map((t) => paletteByType.get(t))
              .filter((e): e is BlockPaletteEntry => Boolean(e))
              .map(({ type, label, Icon }) => (
                <button
                  key={`${group.label}-${type}`}
                  type="button"
                  onClick={() => onAdd(type)}
                  data-testid={`block-picker-${type}`}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border border-white-10 hover:border-accent-green-110 hover:bg-accent-green-110/5 transition-colors"
                >
                  <Icon className="w-4 h-4 text-white-50" />
                  <span className="text-[11px] font-medium text-white-80 text-center">
                    {label}
                  </span>
                </button>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Sites-04 — preview viewport. Renders the local unsaved blocks in
// the mirrored PreviewRenderer with a Desktop/Mobile width toggle.
// "Draft Preview" label is explicit so the user knows this is not
// the live URL.
function PreviewViewport({
  viewport,
  onViewportChange,
  blocks,
}: {
  viewport: 'desktop' | 'mobile';
  onViewportChange: (v: 'desktop' | 'mobile') => void;
  blocks: Block[];
}) {
  const width = viewport === 'mobile' ? 390 : 1080;
  return (
    <div className="space-y-3" data-testid="preview-viewport">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] uppercase tracking-wider font-semibold bg-yellow-500/15 text-yellow-300 border border-yellow-500/20">
          <Eye className="w-3 h-3" />
          Draft preview
        </span>
        <div className="inline-flex rounded-lg border border-white-10 overflow-hidden">
          <button
            type="button"
            data-testid="preview-viewport-desktop"
            onClick={() => onViewportChange('desktop')}
            className={cn(
              'px-2 py-1.5 text-xs inline-flex items-center gap-1.5 transition-colors',
              viewport === 'desktop'
                ? 'bg-white-10 text-white-100'
                : 'text-white-50 hover:bg-white-5',
            )}
          >
            <Monitor className="w-3.5 h-3.5" />
            Desktop
          </button>
          <button
            type="button"
            data-testid="preview-viewport-mobile"
            onClick={() => onViewportChange('mobile')}
            className={cn(
              'px-2 py-1.5 text-xs inline-flex items-center gap-1.5 transition-colors border-l border-white-10',
              viewport === 'mobile'
                ? 'bg-white-10 text-white-100'
                : 'text-white-50 hover:bg-white-5',
            )}
          >
            <Smartphone className="w-3.5 h-3.5" />
            Mobile
          </button>
        </div>
      </div>
      <div className="flex justify-center">
        <div
          style={{
            width,
            maxWidth: '100%',
            backgroundColor: '#0b0c0e',
            color: '#e8e9ea',
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 6px 30px rgba(0,0,0,0.4)',
          }}
        >
          <PreviewRenderer blocks={blocks} />
        </div>
      </div>
    </div>
  );
}

// Sites-02 — explicit one-shot autofill button. Re-clicking overwrites
// the block's relevant fields. Kept visually distinct so the user
// knows this isn't a passive bind — it's a deliberate action.
function PullFromPropertyButton({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="pull-from-property-button"
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold bg-teal-500/10 text-teal-300 border border-teal-500/20 hover:bg-teal-500/20 transition-colors"
    >
      <Sparkles className="w-3 h-3" />
      {label}
    </button>
  );
}

// Sites-02 — source context panel. Replaces the bare "Source: Property
// <id>" pill with address / price / specs / thumbnail when the linked
// property loads.
function PropertySourcePanel({
  clientId,
  property,
}: {
  clientId: string;
  property: NormalizedProperty;
}) {
  return (
    <div
      data-testid="page-editor-source-panel"
      className="flex items-start gap-3 rounded-xl border border-teal-500/20 bg-teal-500/5 p-3"
    >
      <div className="shrink-0">
        {property.primaryImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={property.primaryImage}
            alt={property.title}
            className="w-16 h-16 rounded-lg object-cover border border-white-10"
          />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-white-5 border border-white-10 flex items-center justify-center">
            <HomeIcon className="w-5 h-5 text-teal-300" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-teal-300">
            Linked property
          </span>
          {property.status && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-white-5 text-white-60">
              {property.status.replace(/_/g, ' ')}
            </span>
          )}
        </div>
        <p className="text-sm font-semibold text-white-100 truncate">{property.title}</p>
        {property.addressLine !== property.title && (
          <p className="text-xs text-white-50 truncate">{property.addressLine}</p>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-white-60">
          {property.priceFormatted && <span className="font-medium">{property.priceFormatted}</span>}
          {property.beds != null && <span>{property.beds} bd</span>}
          {property.baths != null && <span>{property.baths} ba</span>}
          {property.sqft != null && <span>{property.sqft.toLocaleString()} sqft</span>}
          {property.propertyType && <span>{property.propertyType}</span>}
        </div>
      </div>
      <Link
        href={`/workspaces/${clientId}/data?tab=properties`}
        className="text-[11px] text-teal-300 hover:underline shrink-0"
      >
        View
      </Link>
    </div>
  );
}

// Format a Zod issue path tuple like ['blocksJson', 5, 'imageUrls']
// into a humane string ('blocksJson[5].imageUrls') so the editor
// can show where the validation failed without dumping the raw
// JSON path array.
function formatIssuePath(path: Array<string | number>): string {
  if (!Array.isArray(path) || path.length === 0) return '(unknown field)';
  let out = String(path[0]);
  for (let i = 1; i < path.length; i++) {
    const seg = path[i];
    if (typeof seg === 'number') {
      out += `[${seg}]`;
    } else {
      out += `.${seg}`;
    }
  }
  return out;
}
