'use client';

// Sites-04 — in-app draft preview renderer. Mirrors the public
// renderer at squadpitch-sites/lib/pageBlocks/index.tsx so what
// you see in Preview is what the published page will look like.
//
// Kept as a parallel implementation rather than a shared package
// for now (low risk, no monorepo build wiring needed). Both
// renderers escape every user-authored string through React JSX
// and confine raw URLs to background-image or src after a scheme
// check. Lead-form blocks render as a placeholder card here —
// preview is for layout, not for capturing leads.

import type { Block } from '@/hooks/useSites';

type BlockJson = Record<string, unknown>;

interface PreviewRendererProps {
  blocks: Block[];
}

export function PreviewRenderer({ blocks }: PreviewRendererProps) {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return (
      <div
        style={{
          padding: '4rem 1.5rem',
          textAlign: 'center',
          color: '#9aa0a6',
          fontSize: '0.95rem',
        }}
      >
        No blocks yet — add some on the Edit tab.
      </div>
    );
  }
  return (
    <div data-testid="preview-renderer">
      {blocks.map((raw, idx) => {
        if (!raw || typeof raw !== 'object') return null;
        const block = raw as unknown as BlockJson;
        switch (block.type) {
          case 'hero':
            return <HeroBlock key={idx} block={block} />;
          case 'paragraph':
            return <ParagraphBlock key={idx} block={block} />;
          case 'image':
            return <ImageBlock key={idx} block={block} />;
          case 'cta':
            return <CtaBlock key={idx} block={block} />;
          case 'lead_form':
            return <LeadFormPlaceholder key={idx} block={block} />;
          case 'gallery':
            return <GalleryBlock key={idx} block={block} />;
          case 'key_details':
            return <KeyDetailsBlock key={idx} block={block} />;
          case 'testimonial':
            return <TestimonialBlock key={idx} block={block} />;
          case 'faq':
            return <FaqBlock key={idx} block={block} />;
          case 'contact':
            return <ContactBlock key={idx} block={block} />;
          default:
            return null;
        }
      })}
    </div>
  );
}

function pickString(block: BlockJson, key: string): string | null {
  const v = block[key];
  return typeof v === 'string' && v.length > 0 ? v : null;
}

function pickArray<T = unknown>(block: BlockJson, key: string): T[] {
  const v = block[key];
  return Array.isArray(v) ? (v as T[]) : [];
}

function isSafeUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

// ── Block renderers (mirror public renderer's inline styles) ───────────

function HeroBlock({ block }: { block: BlockJson }) {
  const headline = pickString(block, 'headline');
  const sub = pickString(block, 'subheadline');
  const imageUrl = pickString(block, 'imageUrl');
  return (
    <section
      style={{
        padding: '4rem 1.5rem',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#0b0c0e',
      }}
    >
      {imageUrl && isSafeUrl(imageUrl) && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${JSON.stringify(imageUrl).slice(1, -1)})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.35,
          }}
        />
      )}
      <div style={{ position: 'relative', maxWidth: 720, margin: '0 auto' }}>
        {headline && (
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.25rem)', lineHeight: 1.1, margin: 0, fontWeight: 700 }}>
            {headline}
          </h1>
        )}
        {sub && (
          <p style={{ marginTop: '1rem', fontSize: '1.125rem', color: '#c4c8cd' }}>{sub}</p>
        )}
      </div>
    </section>
  );
}

function ParagraphBlock({ block }: { block: BlockJson }) {
  const body = pickString(block, 'body');
  if (!body) return null;
  return (
    <section style={{ padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {body.split(/\n{2,}/).map((para, idx) => (
          <p key={idx} style={{ fontSize: '1rem', lineHeight: 1.6, color: '#d4d8dc', margin: '0 0 1rem' }}>
            {para}
          </p>
        ))}
      </div>
    </section>
  );
}

function ImageBlock({ block }: { block: BlockJson }) {
  const url = pickString(block, 'imageUrl') ?? pickString(block, 'url');
  const alt = pickString(block, 'alt') ?? '';
  const caption = pickString(block, 'caption');
  if (!url || !isSafeUrl(url)) return null;
  return (
    <section style={{ padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: 920, margin: '0 auto' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={alt} style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 12 }} />
        {caption && (
          <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#9aa0a6', textAlign: 'center' }}>{caption}</p>
        )}
      </div>
    </section>
  );
}

function CtaBlock({ block }: { block: BlockJson }) {
  const label = pickString(block, 'label');
  const href = pickString(block, 'href');
  if (!label || !href) return null;
  return (
    <section style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
      <a
        href={href}
        onClick={(e) => e.preventDefault()}
        style={{
          display: 'inline-block',
          padding: '0.875rem 1.75rem',
          borderRadius: 999,
          backgroundColor: '#5b9979',
          color: '#0b0c0e',
          fontWeight: 600,
          textDecoration: 'none',
          fontSize: '0.95rem',
        }}
      >
        {label}
      </a>
    </section>
  );
}

function LeadFormPlaceholder({ block }: { block: BlockJson }) {
  const formId = typeof block.formId === 'string' ? block.formId : null;
  return (
    <section style={{ padding: '2.5rem 1.5rem' }}>
      <div
        style={{
          maxWidth: 480,
          margin: '0 auto',
          padding: '1.5rem',
          borderRadius: 16,
          border: '1px dashed rgba(255, 255, 255, 0.15)',
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          textAlign: 'center',
          color: '#9aa0a6',
          fontSize: '0.85rem',
        }}
      >
        Lead form will appear here.
        {formId && <span style={{ display: 'block', marginTop: 4, fontSize: '0.7rem', color: '#6f757a' }}>{formId}</span>}
      </div>
    </section>
  );
}

function GalleryBlock({ block }: { block: BlockJson }) {
  const rawUrls = pickArray<unknown>(block, 'imageUrls');
  const urls = rawUrls.filter((u): u is string => typeof u === 'string' && isSafeUrl(u));
  if (urls.length === 0) return null;
  const layout = pickString(block, 'layout') === 'carousel' ? 'carousel' : 'grid';
  if (layout === 'carousel') {
    return (
      <section style={{ padding: '2rem 0' }}>
        <div
          style={{
            display: 'flex',
            gap: 12,
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            padding: '0 1.5rem',
          }}
        >
          {urls.map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={url}
              alt=""
              style={{ flex: '0 0 80%', maxWidth: 720, height: 'auto', borderRadius: 12, scrollSnapAlign: 'start' }}
            />
          ))}
        </div>
      </section>
    );
  }
  return (
    <section style={{ padding: '2rem 1.5rem' }}>
      <div
        style={{
          maxWidth: 1080,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 12,
        }}
      >
        {urls.map((url, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={url}
            alt=""
            style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', borderRadius: 10 }}
          />
        ))}
      </div>
    </section>
  );
}

interface KeyDetailItem {
  label: string;
  value: string;
}
function KeyDetailsBlock({ block }: { block: BlockJson }) {
  const heading = pickString(block, 'heading');
  const items = pickArray<unknown>(block, 'items')
    .filter((it): it is Record<string, unknown> => !!it && typeof it === 'object')
    .map((it): KeyDetailItem | null => {
      const label = typeof it.label === 'string' ? it.label : null;
      const value = typeof it.value === 'string' ? it.value : null;
      if (!label || !value) return null;
      return { label, value };
    })
    .filter((it): it is KeyDetailItem => it !== null);
  if (items.length === 0) return null;
  return (
    <section style={{ padding: '2.5rem 1.5rem' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {heading && (
          <h2 style={{ margin: '0 0 1.25rem', fontSize: '1.4rem', fontWeight: 600 }}>{heading}</h2>
        )}
        <dl
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(120px, max-content) 1fr',
            columnGap: '1.25rem',
            rowGap: '0.75rem',
            margin: 0,
          }}
        >
          {items.map((item, i) => (
            <div key={i} style={{ display: 'contents' }}>
              <dt
                style={{
                  color: '#9aa0a6',
                  fontSize: '0.85rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  fontWeight: 600,
                  alignSelf: 'start',
                }}
              >
                {item.label}
              </dt>
              <dd style={{ margin: 0, color: '#e8e9ea', fontSize: '0.95rem', lineHeight: 1.5 }}>
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function TestimonialBlock({ block }: { block: BlockJson }) {
  const quote = pickString(block, 'quote');
  if (!quote) return null;
  const author = pickString(block, 'author');
  const role = pickString(block, 'role');
  const imageUrl = pickString(block, 'imageUrl');
  return (
    <section style={{ padding: '3rem 1.5rem' }}>
      <div
        style={{
          maxWidth: 640,
          margin: '0 auto',
          padding: '2rem',
          borderRadius: 16,
          backgroundColor: '#15171a',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          textAlign: 'center',
        }}
      >
        <p style={{ margin: 0, fontSize: '1.15rem', lineHeight: 1.55, fontStyle: 'italic', color: '#e8e9ea' }}>
          “{quote}”
        </p>
        {(author || role || imageUrl) && (
          <div
            style={{
              marginTop: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
            }}
          >
            {imageUrl && isSafeUrl(imageUrl) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt=""
                style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
              />
            )}
            <div style={{ textAlign: 'left' }}>
              {author && <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{author}</div>}
              {role && <div style={{ color: '#9aa0a6', fontSize: '0.85rem' }}>{role}</div>}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

interface FaqItem {
  question: string;
  answer: string;
}
function FaqBlock({ block }: { block: BlockJson }) {
  const heading = pickString(block, 'heading');
  const items = pickArray<unknown>(block, 'items')
    .filter((it): it is Record<string, unknown> => !!it && typeof it === 'object')
    .map((it): FaqItem | null => {
      const question = typeof it.question === 'string' ? it.question : null;
      const answer = typeof it.answer === 'string' ? it.answer : null;
      if (!question || !answer) return null;
      return { question, answer };
    })
    .filter((it): it is FaqItem => it !== null);
  if (items.length === 0) return null;
  return (
    <section style={{ padding: '3rem 1.5rem' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {heading && (
          <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.4rem', fontWeight: 600 }}>{heading}</h2>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {items.map((item, i) => (
            <details
              key={i}
              style={{
                borderRadius: 12,
                backgroundColor: '#15171a',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                padding: '0.75rem 1rem',
              }}
            >
              <summary
                style={{
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  color: '#e8e9ea',
                  listStyle: 'none',
                  padding: '0.25rem 0',
                }}
              >
                {item.question}
              </summary>
              {item.answer.split(/\n{2,}/).map((para, j) => (
                <p
                  key={j}
                  style={{
                    color: '#c4c8cd',
                    fontSize: '0.9rem',
                    lineHeight: 1.55,
                    margin: j === 0 ? '0.75rem 0 0' : '0.5rem 0 0',
                  }}
                >
                  {para}
                </p>
              ))}
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

interface SocialLink {
  label: string;
  url: string;
}
function ContactBlock({ block }: { block: BlockJson }) {
  const heading = pickString(block, 'heading') ?? 'Get in touch';
  const phone = pickString(block, 'phone');
  const email = pickString(block, 'email');
  const address = pickString(block, 'address');
  const socials = pickArray<unknown>(block, 'socials')
    .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
    .map((s): SocialLink | null => {
      const label = typeof s.label === 'string' ? s.label : null;
      const url = typeof s.url === 'string' && isSafeUrl(s.url) ? s.url : null;
      if (!label || !url) return null;
      return { label, url };
    })
    .filter((s): s is SocialLink => s !== null);

  if (!phone && !email && !address && socials.length === 0) return null;
  return (
    <section style={{ padding: '3rem 1.5rem' }}>
      <div
        style={{
          maxWidth: 640,
          margin: '0 auto',
          padding: '2rem',
          borderRadius: 16,
          backgroundColor: '#15171a',
          border: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <h2 style={{ margin: '0 0 1.25rem', fontSize: '1.25rem', fontWeight: 600, textAlign: 'center' }}>
          {heading}
        </h2>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
            color: '#d4d8dc',
            fontSize: '0.95rem',
            textAlign: 'center',
          }}
        >
          {phone && (
            <a
              href={`tel:${phone.replace(/[^+0-9]/g, '')}`}
              onClick={(e) => e.preventDefault()}
              style={{ color: '#e8e9ea', textDecoration: 'none' }}
            >
              📞 {phone}
            </a>
          )}
          {email && (
            <a
              href={`mailto:${email}`}
              onClick={(e) => e.preventDefault()}
              style={{ color: '#e8e9ea', textDecoration: 'none' }}
            >
              ✉ {email}
            </a>
          )}
          {address && <div style={{ color: '#c4c8cd', lineHeight: 1.5 }}>📍 {address}</div>}
        </div>
        {socials.length > 0 && (
          <div
            style={{
              marginTop: '1.5rem',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            {socials.map((s, i) => (
              <a
                key={i}
                href={s.url}
                onClick={(e) => e.preventDefault()}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: 999,
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#e8e9ea',
                  textDecoration: 'none',
                  fontSize: '0.85rem',
                }}
              >
                {s.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
