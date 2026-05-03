import { describe, it, expect } from 'vitest';
import { extractTextSlides } from './textOverlay';

describe('extractTextSlides', () => {
  it('extracts hook from first sentence', () => {
    const slides = extractTextSlides(
      'Welcome to this stunning property. It features 3 bedrooms. Schedule a tour today!',
      null,
      3,
    );
    expect(slides[0]).toEqual({
      text: 'Welcome to this stunning property.',
      role: 'hook',
      sceneIndex: 0,
    });
  });

  it('extracts CTA from explicit cta param', () => {
    const slides = extractTextSlides(
      'Beautiful home with modern finishes. Spacious living area.',
      'Book your showing today!',
      3,
    );
    const ctaSlide = slides.find((s) => s.role === 'cta');
    expect(ctaSlide).toBeDefined();
    expect(ctaSlide!.text).toBe('Book your showing today!');
    expect(ctaSlide!.sceneIndex).toBe(2);
  });

  it('uses last sentence as CTA when no explicit CTA', () => {
    const slides = extractTextSlides(
      'Great curb appeal. Updated kitchen. Call us now!',
      null,
      3,
    );
    const ctaSlide = slides.find((s) => s.role === 'cta');
    expect(ctaSlide).toBeDefined();
    expect(ctaSlide!.text).toBe('Call us now!');
  });

  it('distributes key points across middle scenes', () => {
    const slides = extractTextSlides(
      'Welcome home. New kitchen. Big backyard. Pool included. Book a tour!',
      null,
      5,
    );
    const keyPoints = slides.filter((s) => s.role === 'key_point');
    expect(keyPoints.length).toBeGreaterThan(0);
    for (const kp of keyPoints) {
      expect(kp.sceneIndex).toBeGreaterThan(0);
      expect(kp.sceneIndex).toBeLessThan(4);
    }
  });

  it('strips hashtags from text', () => {
    const slides = extractTextSlides(
      'Check out this listing! #realestate #forsale Great value.',
      null,
      2,
    );
    expect(slides[0].text).not.toContain('#');
  });

  it('strips URLs from text', () => {
    const slides = extractTextSlides(
      'Visit https://example.com for details. Amazing property!',
      null,
      2,
    );
    expect(slides[0].text).not.toContain('https://');
  });

  it('returns empty array for empty body', () => {
    expect(extractTextSlides('', null, 3)).toEqual([]);
  });

  it('returns empty array for zero scenes', () => {
    expect(extractTextSlides('Some text here.', null, 0)).toEqual([]);
  });

  it('truncates long sentences to 80 chars', () => {
    const longSentence =
      'This is an incredibly long sentence that goes on and on and describes many wonderful features of this absolutely amazing property listing. Another sentence.';
    const slides = extractTextSlides(longSentence, null, 2);
    expect(slides[0].text.length).toBeLessThanOrEqual(81); // 80 + ellipsis char
  });

  it('handles single sentence with single scene', () => {
    const slides = extractTextSlides('Just one sentence.', null, 1);
    expect(slides).toHaveLength(1);
    expect(slides[0].role).toBe('hook');
    expect(slides[0].sceneIndex).toBe(0);
  });
});
