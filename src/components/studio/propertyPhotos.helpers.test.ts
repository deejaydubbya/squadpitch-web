// Spinstr-sites-01 — property photo helpers.
//
// Pins:
//   - Reading: rich _photos > legacy images[] > legacy imageUrl;
//     dedup by URL; back-compat is preserved.
//   - add/remove/setPrimary keep exactly one primary at all times.
//   - buildPhotoDataJson writes imageUrl + images[] alongside the
//     richer _photos[] shadow.

import { describe, it, expect } from 'vitest';
import {
  readPhotosFromDataJson,
  addPhoto,
  removePhoto,
  setPrimaryPhoto,
  buildPhotoDataJson,
} from './propertyPhotos.helpers';

describe('readPhotosFromDataJson', () => {
  it('returns empty for null/empty data', () => {
    expect(readPhotosFromDataJson(null)).toEqual([]);
    expect(readPhotosFromDataJson({})).toEqual([]);
  });

  it('reads legacy imageUrl as primary', () => {
    const out = readPhotosFromDataJson({ imageUrl: 'https://a/x.jpg' });
    expect(out).toEqual([
      { url: 'https://a/x.jpg', source: 'external_url', isPrimary: true },
    ]);
  });

  it('reads legacy images[] with first as primary', () => {
    const out = readPhotosFromDataJson({
      images: ['https://a/1.jpg', 'https://a/2.jpg'],
    });
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({
      url: 'https://a/1.jpg',
      source: 'external_url',
      isPrimary: true,
    });
    expect(out[1].isPrimary).toBeFalsy();
  });

  it('prefers _photos[] richer shape over legacy', () => {
    const out = readPhotosFromDataJson({
      imageUrl: 'https://a/1.jpg',
      images: ['https://a/1.jpg', 'https://a/2.jpg'],
      _photos: [
        { url: 'https://a/1.jpg', source: 'upload', publicId: 'p1', isPrimary: true },
        { url: 'https://a/2.jpg', source: 'import', alt: 'Front' },
      ],
    });
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({
      url: 'https://a/1.jpg',
      source: 'upload',
      publicId: 'p1',
      alt: undefined,
      isPrimary: true,
    });
    expect(out[1].alt).toBe('Front');
  });

  it('dedups by URL when both _photos and legacy carry the same one', () => {
    const out = readPhotosFromDataJson({
      imageUrl: 'https://a/1.jpg',
      images: ['https://a/1.jpg'],
      _photos: [{ url: 'https://a/1.jpg', source: 'upload', isPrimary: true }],
    });
    expect(out).toHaveLength(1);
    expect(out[0].source).toBe('upload');
  });

  it('elevates imageUrl ahead of images[] when not in _photos', () => {
    const out = readPhotosFromDataJson({
      imageUrl: 'https://a/primary.jpg',
      images: ['https://a/secondary.jpg'],
    });
    expect(out[0].url).toBe('https://a/primary.jpg');
    expect(out[0].isPrimary).toBe(true);
  });
});

describe('addPhoto', () => {
  it('appends a new photo', () => {
    const out = addPhoto(
      [{ url: 'https://a/1.jpg', source: 'external_url', isPrimary: true }],
      { url: 'https://a/2.jpg', source: 'upload' },
    );
    expect(out).toHaveLength(2);
    expect(out[1].url).toBe('https://a/2.jpg');
  });

  it('dedups on URL', () => {
    const start = [{ url: 'https://a/1.jpg', source: 'external_url' as const, isPrimary: true }];
    const out = addPhoto(start, { url: 'https://a/1.jpg', source: 'upload' });
    expect(out).toBe(start);
  });

  it('marks the first photo as primary automatically', () => {
    const out = addPhoto([], { url: 'https://a/1.jpg', source: 'upload' });
    expect(out[0].isPrimary).toBe(true);
  });
});

describe('removePhoto', () => {
  it('removes by URL', () => {
    const out = removePhoto(
      [
        { url: 'https://a/1.jpg', source: 'external_url', isPrimary: true },
        { url: 'https://a/2.jpg', source: 'upload' },
      ],
      'https://a/1.jpg',
    );
    expect(out).toHaveLength(1);
    expect(out[0].url).toBe('https://a/2.jpg');
  });

  it('promotes a new primary when the removed one was primary', () => {
    const out = removePhoto(
      [
        { url: 'https://a/1.jpg', source: 'external_url', isPrimary: true },
        { url: 'https://a/2.jpg', source: 'upload' },
      ],
      'https://a/1.jpg',
    );
    expect(out[0].isPrimary).toBe(true);
  });

  it('returns empty when removing the only photo', () => {
    const out = removePhoto(
      [{ url: 'https://a/1.jpg', source: 'external_url', isPrimary: true }],
      'https://a/1.jpg',
    );
    expect(out).toEqual([]);
  });
});

describe('setPrimaryPhoto', () => {
  it('promotes the target and demotes the rest', () => {
    const out = setPrimaryPhoto(
      [
        { url: 'https://a/1.jpg', source: 'external_url', isPrimary: true },
        { url: 'https://a/2.jpg', source: 'upload' },
      ],
      'https://a/2.jpg',
    );
    expect(out[0].isPrimary).toBe(false);
    expect(out[1].isPrimary).toBe(true);
  });

  it('is a no-op when the URL is not in the list', () => {
    const start = [{ url: 'https://a/1.jpg', source: 'external_url' as const, isPrimary: true }];
    const out = setPrimaryPhoto(start, 'https://a/nope.jpg');
    expect(out).toBe(start);
  });
});

describe('buildPhotoDataJson', () => {
  it('writes imageUrl + images[] + _photos[]', () => {
    const out = buildPhotoDataJson([
      { url: 'https://a/1.jpg', source: 'upload', publicId: 'p1' },
      { url: 'https://a/2.jpg', source: 'external_url', isPrimary: true },
    ]);
    expect(out.imageUrl).toBe('https://a/2.jpg');
    expect(out.images).toEqual(['https://a/1.jpg', 'https://a/2.jpg']);
    expect(out._photos).toHaveLength(2);
    expect(out._photos[1].isPrimary).toBe(true);
    expect(out._photos[0].publicId).toBe('p1');
  });

  it('returns null primary + empty arrays for empty input', () => {
    expect(buildPhotoDataJson([])).toEqual({
      imageUrl: null,
      images: [],
      _photos: [],
    });
  });

  it('defaults primary to the first photo when none flagged', () => {
    const out = buildPhotoDataJson([
      { url: 'https://a/1.jpg', source: 'upload' },
      { url: 'https://a/2.jpg', source: 'upload' },
    ]);
    expect(out.imageUrl).toBe('https://a/1.jpg');
    expect(out._photos[0].isPrimary).toBe(true);
    expect(out._photos[1].isPrimary).toBe(false);
  });
});
