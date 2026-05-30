'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiFetch';

// ── Types ────────────────────────────────────────────────────────────────

// Mirrors the Prisma enums. Earlier Phase C had ARCHIVED / RESOLVED
// here but the actual DB enums use UNPUBLISHED / PROCESSED — the
// dashboard would have 500'd the first time a user tried to flip
// either status. Fixed alongside the source-aware metadata add.
export type SiteStatus = 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED' | 'ARCHIVED';
export type PageStatus = 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED' | 'ARCHIVED';
export type SubmissionStatus = 'NEW' | 'PROCESSED' | 'SPAM';

export type SiteSourceType = 'CAMPAIGN' | 'PROPERTY' | 'DATA_ITEM' | 'IDEA';
export type SitePageGoal =
  | 'LEAD_CAPTURE'
  | 'LISTING'
  | 'OFFER'
  | 'EVENT'
  | 'CONSULTATION';

export type FormFieldType =
  | 'text'
  | 'email'
  | 'phone'
  | 'textarea'
  | 'select'
  | 'checkbox';

export interface FormFieldDef {
  key: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
}

export type SuccessAction =
  | { type: 'message'; message: string }
  | { type: 'redirect'; url: string };

export interface SiteTheme {
  accent?: string;
  bg?: string;
  fontFamily?: string;
  [key: string]: unknown;
}

export interface Site {
  id: string;
  clientId: string;
  status: SiteStatus;
  themeJson: SiteTheme | null;
  faviconUrl: string | null;
  ogDefaultImageId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface KeyDetailItem {
  label: string;
  value: string;
}
export interface FaqItem {
  question: string;
  answer: string;
}
export interface SocialLink {
  label: string;
  url: string;
}

export type Block =
  | { type: 'hero'; headline?: string; subheadline?: string; imageId?: string; imageUrl?: string }
  | { type: 'paragraph'; body?: string }
  | { type: 'image'; imageId?: string; imageUrl?: string; alt?: string; caption?: string }
  | { type: 'cta'; label: string; href: string }
  | { type: 'lead_form'; formId: string }
  | { type: 'gallery'; imageUrls: string[]; layout?: 'grid' | 'carousel' }
  | { type: 'key_details'; heading?: string; items: KeyDetailItem[] }
  | { type: 'testimonial'; quote: string; author?: string; role?: string; imageUrl?: string }
  | { type: 'faq'; heading?: string; items: FaqItem[] }
  | {
      type: 'contact';
      heading?: string;
      phone?: string;
      email?: string;
      address?: string;
      socials?: SocialLink[];
    };

export interface SitePage {
  id: string;
  siteId?: string;
  clientId?: string;
  slug: string;
  title: string;
  description: string | null;
  status: PageStatus;
  blocksJson: Block[];
  campaignId: string | null;
  sourceType: SiteSourceType | null;
  sourceId: string | null;
  pageGoal: SitePageGoal | null;
  noIndex: boolean;
  heroImageId: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  ogImageId: string | null;
  revalidateSec: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PageListItem {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: PageStatus;
  campaignId: string | null;
  sourceType: SiteSourceType | null;
  sourceId: string | null;
  pageGoal: SitePageGoal | null;
  noIndex: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeadForm {
  id: string;
  siteId?: string;
  clientId?: string;
  name: string;
  fieldsJson: FormFieldDef[];
  successAction: SuccessAction;
  notifyEmail: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { submissions: number };
}

// Spinstr427 — sourceContext joined through pageId by the API so
// the submissions page can render "Property: 508 King George
// Court" without N+1 round-trips. Null when the submission has no
// pageId (older submissions, direct API submits, etc.).
export interface SubmissionSourceContext {
  pageId: string;
  pageTitle: string;
  pageSlug: string;
  sourceType: 'CAMPAIGN' | 'PROPERTY' | 'DATA_ITEM' | 'IDEA' | null;
  sourceId: string | null;
  /** Title of the underlying property when sourceType === PROPERTY. */
  sourceTitle: string | null;
}

export interface FormSubmission {
  id: string;
  formId: string;
  campaignId: string | null;
  pageId: string | null;
  dataJson: Record<string, unknown>;
  contactEmail: string | null;
  contactPhone: string | null;
  status: SubmissionStatus;
  createdAt: string;
  form: { id: string; name: string };
  // Conversation created by Inbox intake for this submission. Null
  // when intake skipped the submission (no usable email/phone).
  inboxConversationId: string | null;
  // Spinstr427.
  sourceContext: SubmissionSourceContext | null;
}

// Spinstr427 — form stats for the editor's lead-form block card.
export interface FormStats {
  formId: string;
  pageId: string | null;
  count: number;
  lastSubmissionAt: string | null;
}

// ── Query keys ───────────────────────────────────────────────────────────

export const sitesKeys = {
  all: ['sites'] as const,
  site: (clientId: string) => [...sitesKeys.all, 'site', clientId] as const,
  pages: (clientId: string) => [...sitesKeys.all, 'pages', clientId] as const,
  page: (clientId: string, pageId: string) =>
    [...sitesKeys.all, 'page', clientId, pageId] as const,
  forms: (clientId: string) => [...sitesKeys.all, 'forms', clientId] as const,
  form: (clientId: string, formId: string) =>
    [...sitesKeys.all, 'form', clientId, formId] as const,
  submissions: (clientId: string, filters?: Record<string, unknown>) =>
    [...sitesKeys.all, 'submissions', clientId, filters ?? {}] as const,
};

const base = (clientId: string) => `workspaces/${clientId}/site`;

// ── Site ─────────────────────────────────────────────────────────────────

export function useSite(clientId: string | undefined) {
  return useQuery({
    queryKey: sitesKeys.site(clientId ?? ''),
    queryFn: () => apiFetch<{ site: Site }>(`${base(clientId!)}`),
    enabled: Boolean(clientId),
    select: (data) => data.site,
  });
}

export function useUpdateSite(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Pick<Site, 'status' | 'themeJson' | 'faviconUrl' | 'ogDefaultImageId'>>) =>
      apiFetch<{ site: Site }>(`${base(clientId)}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sitesKeys.site(clientId) });
    },
  });
}

// ── Pages ────────────────────────────────────────────────────────────────

export function usePages(clientId: string | undefined) {
  return useQuery({
    queryKey: sitesKeys.pages(clientId ?? ''),
    queryFn: () => apiFetch<{ pages: PageListItem[] }>(`${base(clientId!)}/pages`),
    enabled: Boolean(clientId),
    select: (data) => data.pages,
  });
}

/**
 * Filter the workspace's pages to those generated from a specific
 * source (campaign / property / data_item). Used by the "Create
 * landing page" action in CampaignSection / PropertyDetailDrawer
 * / DataItemCard to decide whether to show "Create" vs "View".
 *
 * Client-side filter against the existing pages query — keeps it
 * cheap (one fetch shared across the dashboard) and avoids a new
 * API surface for what's a sub-100 row lookup.
 */
export function useSitePagesForSource(
  clientId: string | undefined,
  sourceType: SiteSourceType | null | undefined,
  sourceId: string | null | undefined,
) {
  const { data: pages, isLoading } = usePages(clientId);
  const matches =
    sourceType && sourceId && pages
      ? pages.filter((p) => p.sourceType === sourceType && p.sourceId === sourceId)
      : [];
  return { matches, isLoading };
}

export function usePage(clientId: string | undefined, pageId: string | undefined) {
  return useQuery({
    queryKey: sitesKeys.page(clientId ?? '', pageId ?? ''),
    queryFn: () =>
      apiFetch<{ page: SitePage }>(`${base(clientId!)}/pages/${pageId}`),
    enabled: Boolean(clientId) && Boolean(pageId),
    select: (data) => data.page,
  });
}

export interface CreatePageInput {
  slug: string;
  title: string;
  description?: string;
  blocksJson?: Block[];
  sourceType?: SiteSourceType | null;
  sourceId?: string | null;
  pageGoal?: SitePageGoal | null;
  noIndex?: boolean;
}

export function useCreatePage(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePageInput) =>
      apiFetch<{ page: SitePage }>(`${base(clientId)}/pages`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sitesKeys.pages(clientId) });
    },
  });
}

// ── AI page generation ──────────────────────────────────────────────────

// Sites-05 — template hint. When set, biases the LLM toward a
// specific scaffold + page intent. Catalog kept in lockstep with
// SITE_TEMPLATES on the API.
export type SiteTemplate =
  | 'property_listing'
  | 'open_house'
  | 'just_sold'
  | 'seller_lead'
  | 'buyer_lead'
  | 'neighborhood_guide';

export interface GeneratePageInput {
  sourceType: SiteSourceType;
  sourceId?: string;
  pageGoal: SitePageGoal;
  customPrompt?: string;
  template?: SiteTemplate;
}

/**
 * Generate + persist a SitePage in one call. The API creates the
 * LeadForm (if the generated page uses one) and the SitePage as
 * DRAFT, then returns the new page so the caller can route into
 * the editor.
 */
export function useGeneratePageFromSource(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: GeneratePageInput) =>
      apiFetch<{ page: SitePage; generation: { model: string } }>(
        `${base(clientId)}/pages/from-source`,
        {
          method: 'POST',
          body: JSON.stringify(input),
        },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sitesKeys.pages(clientId) });
      qc.invalidateQueries({ queryKey: sitesKeys.forms(clientId) });
    },
  });
}

export type UpdatePageInput = Partial<{
  slug: string;
  title: string;
  description: string | null;
  status: PageStatus;
  blocksJson: Block[];
  campaignId: string | null;
  sourceType: SiteSourceType | null;
  sourceId: string | null;
  pageGoal: SitePageGoal | null;
  noIndex: boolean;
  heroImageId: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  ogImageId: string | null;
  revalidateSec: number;
}>;

export function useUpdatePage(clientId: string, pageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: UpdatePageInput) =>
      apiFetch<{ page: SitePage }>(`${base(clientId)}/pages/${pageId}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sitesKeys.page(clientId, pageId) });
      qc.invalidateQueries({ queryKey: sitesKeys.pages(clientId) });
    },
  });
}

export function usePublishPage(clientId: string, pageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ page: SitePage }>(`${base(clientId)}/pages/${pageId}/publish`, {
        method: 'POST',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sitesKeys.page(clientId, pageId) });
      qc.invalidateQueries({ queryKey: sitesKeys.pages(clientId) });
      qc.invalidateQueries({ queryKey: sitesKeys.site(clientId) });
    },
  });
}

export function useUnpublishPage(clientId: string, pageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ page: SitePage }>(`${base(clientId)}/pages/${pageId}/unpublish`, {
        method: 'POST',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sitesKeys.page(clientId, pageId) });
      qc.invalidateQueries({ queryKey: sitesKeys.pages(clientId) });
    },
  });
}

export function useDeletePage(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (pageId: string) =>
      apiFetch<{ id: string }>(`${base(clientId)}/pages/${pageId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sitesKeys.pages(clientId) });
    },
  });
}

// ── Forms ────────────────────────────────────────────────────────────────

export function useForms(clientId: string | undefined) {
  return useQuery({
    queryKey: sitesKeys.forms(clientId ?? ''),
    queryFn: () => apiFetch<{ forms: LeadForm[] }>(`${base(clientId!)}/forms`),
    enabled: Boolean(clientId),
    select: (data) => data.forms,
  });
}

export function useForm(clientId: string | undefined, formId: string | undefined) {
  return useQuery({
    queryKey: sitesKeys.form(clientId ?? '', formId ?? ''),
    queryFn: () =>
      apiFetch<{ form: LeadForm }>(`${base(clientId!)}/forms/${formId}`),
    enabled: Boolean(clientId) && Boolean(formId),
    select: (data) => data.form,
  });
}

export interface CreateFormInput {
  name: string;
  fieldsJson: FormFieldDef[];
  successAction: SuccessAction;
  notifyEmail?: string | null;
}

export function useCreateForm(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFormInput) =>
      apiFetch<{ form: LeadForm }>(`${base(clientId)}/forms`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sitesKeys.forms(clientId) });
    },
  });
}

export type UpdateFormInput = Partial<CreateFormInput>;

export function useUpdateForm(clientId: string, formId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: UpdateFormInput) =>
      apiFetch<{ form: LeadForm }>(`${base(clientId)}/forms/${formId}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sitesKeys.form(clientId, formId) });
      qc.invalidateQueries({ queryKey: sitesKeys.forms(clientId) });
    },
  });
}

export function useDeleteForm(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formId: string) =>
      apiFetch<{ id: string }>(`${base(clientId)}/forms/${formId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sitesKeys.forms(clientId) });
    },
  });
}

// ── Submissions ─────────────────────────────────────────────────────────

export interface SubmissionFilters {
  status?: SubmissionStatus;
  formId?: string;
  /** Spinstr427 — narrow to submissions from a single page. */
  pageId?: string;
  limit?: number;
  cursor?: string;
}

export function useSubmissions(
  clientId: string | undefined,
  filters: SubmissionFilters = {},
) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.formId) params.set('formId', filters.formId);
  if (filters.pageId) params.set('pageId', filters.pageId);
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.cursor) params.set('cursor', filters.cursor);
  const qs = params.toString();
  const path = `${base(clientId ?? '')}/submissions${qs ? `?${qs}` : ''}`;

  return useQuery({
    queryKey: sitesKeys.submissions(clientId ?? '', filters as Record<string, unknown>),
    queryFn: () =>
      apiFetch<{ submissions: FormSubmission[]; nextCursor: string | null }>(path),
    enabled: Boolean(clientId),
  });
}

// Spinstr427 — lightweight form stats for the lead-form context
// card. Returns null silently on 404 / failure so the card
// doesn't block editing if stats are unavailable.
export function useFormStats(
  clientId: string | undefined,
  formId: string | undefined,
  pageId?: string,
) {
  const params = new URLSearchParams();
  if (pageId) params.set('pageId', pageId);
  const qs = params.toString();
  const path =
    clientId && formId
      ? `${base(clientId)}/forms/${formId}/stats${qs ? `?${qs}` : ''}`
      : null;
  return useQuery({
    queryKey: [...sitesKeys.all, 'form-stats', clientId ?? '', formId ?? '', pageId ?? ''],
    queryFn: () => apiFetch<FormStats>(path!),
    enabled: Boolean(path),
    retry: false,
    staleTime: 30_000,
  });
}

export function useUpdateSubmissionStatus(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: SubmissionStatus }) =>
      apiFetch<{ submission: FormSubmission }>(
        `${base(clientId)}/submissions/${id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        },
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [...sitesKeys.all, 'submissions', clientId],
      });
    },
  });
}
