import { describe, it, expect } from 'vitest';
import {
  parseCreateRouteParams,
  intentToAssistantMode,
  sourceTypeToAssistantSource,
} from './createRouteParams';

function p(query: string): URLSearchParams {
  return new URLSearchParams(query);
}

describe('parseCreateRouteParams — new contract', () => {
  it('parses intent=campaign', () => {
    const r = parseCreateRouteParams(p('intent=campaign'));
    expect(r.intent).toBe('campaign');
    expect(r.legacyParamsUsed).toBe(false);
  });

  it('parses intent=single_post + sourceType + sourceId', () => {
    const r = parseCreateRouteParams(
      p('intent=single_post&sourceType=property&sourceId=cm123'),
    );
    expect(r.intent).toBe('single_post');
    expect(r.sourceType).toBe('property');
    expect(r.sourceId).toBe('cm123');
    expect(r.legacyParamsUsed).toBe(false);
  });

  it('parses content_asset / idea source types', () => {
    expect(parseCreateRouteParams(p('sourceType=content_asset')).sourceType).toBe(
      'content_asset',
    );
    expect(parseCreateRouteParams(p('sourceType=idea')).sourceType).toBe('idea');
  });

  it('honors campaignType + prompt + channel + guidance', () => {
    const r = parseCreateRouteParams(
      p('intent=campaign&campaignType=just_listed&prompt=hello&channel=INSTAGRAM&guidance=hint'),
    );
    expect(r.campaignType).toBe('just_listed');
    expect(r.prompt).toBe('hello');
    expect(r.channel).toBe('INSTAGRAM');
    expect(r.guidance).toBe('hint');
  });

  it('returns empty params for null search params', () => {
    const r = parseCreateRouteParams(null);
    expect(r.intent).toBeUndefined();
    expect(r.sourceType).toBeUndefined();
    expect(r.legacyParamsUsed).toBe(false);
  });
});

describe('parseCreateRouteParams — legacy aliases', () => {
  it('maps ?mode=campaign → intent=campaign', () => {
    const r = parseCreateRouteParams(p('mode=campaign'));
    expect(r.intent).toBe('campaign');
    expect(r.legacyParamsUsed).toBe(true);
  });

  it('maps ?mode=single → intent=single_post', () => {
    const r = parseCreateRouteParams(p('mode=single'));
    expect(r.intent).toBe('single_post');
    expect(r.legacyParamsUsed).toBe(true);
  });

  it('maps ?listingId=… → property source + sourceId', () => {
    const r = parseCreateRouteParams(p('listingId=cm999'));
    expect(r.sourceType).toBe('property');
    expect(r.sourceId).toBe('cm999');
    expect(r.legacyParamsUsed).toBe(true);
  });

  it('maps ?type=…  → campaignType', () => {
    const r = parseCreateRouteParams(p('type=open_house'));
    expect(r.campaignType).toBe('open_house');
    expect(r.legacyParamsUsed).toBe(true);
  });

  it('maps ?input=… → prompt', () => {
    const r = parseCreateRouteParams(p('input=promote our launch'));
    expect(r.prompt).toBe('promote our launch');
    expect(r.legacyParamsUsed).toBe(true);
  });

  it('combines all legacy aliases into the new shape', () => {
    const r = parseCreateRouteParams(
      p('mode=campaign&listingId=cm123&type=just_listed&input=hello'),
    );
    expect(r.intent).toBe('campaign');
    expect(r.sourceType).toBe('property');
    expect(r.sourceId).toBe('cm123');
    expect(r.campaignType).toBe('just_listed');
    expect(r.prompt).toBe('hello');
    expect(r.legacyParamsUsed).toBe(true);
  });

  it('new params override legacy when both are present', () => {
    const r = parseCreateRouteParams(
      p('intent=single_post&mode=campaign&sourceType=idea&listingId=cm123'),
    );
    expect(r.intent).toBe('single_post');
    expect(r.sourceType).toBe('idea');
    // sourceId still comes from listingId when no new sourceId is set
    expect(r.sourceId).toBe('cm123');
  });

  it('ignores mode=assistant (legacy "open the picker")', () => {
    const r = parseCreateRouteParams(p('mode=assistant'));
    expect(r.intent).toBeUndefined();
    expect(r.legacyParamsUsed).toBe(false);
  });
});

describe('intentToAssistantMode / sourceTypeToAssistantSource', () => {
  it('maps intent to assistant mode (campaign | quick_post)', () => {
    expect(intentToAssistantMode('campaign')).toBe('campaign');
    expect(intentToAssistantMode('single_post')).toBe('quick_post');
    expect(intentToAssistantMode(undefined)).toBeUndefined();
  });

  it('maps source type to assistant source (property | data_item | idea | url)', () => {
    expect(sourceTypeToAssistantSource('property')).toBe('property');
    expect(sourceTypeToAssistantSource('content_asset')).toBe('data_item');
    expect(sourceTypeToAssistantSource('idea')).toBe('idea');
    expect(sourceTypeToAssistantSource('url')).toBe('url');
    expect(sourceTypeToAssistantSource(undefined)).toBeUndefined();
  });
});

// URL-02 — URL source type handling.
describe('parseCreateRouteParams — URL source (URL-02)', () => {
  it('parses sourceType=url + sourceUrl', () => {
    const r = parseCreateRouteParams(
      p('intent=campaign&sourceType=url&sourceUrl=' +
        encodeURIComponent('https://www.zillow.com/homedetails/123')),
    );
    expect(r.intent).toBe('campaign');
    expect(r.sourceType).toBe('url');
    expect(r.sourceUrl).toBe('https://www.zillow.com/homedetails/123');
  });

  it("accepts 'link' as an alias for url", () => {
    expect(parseCreateRouteParams(p('sourceType=link')).sourceType).toBe('url');
  });

  it("normalizes sourceType=idea&prompt=<URL> → url (back-compat for old dashboard links)", () => {
    const r = parseCreateRouteParams(
      p('intent=campaign&sourceType=idea&prompt=' +
        encodeURIComponent('https://example.com/listing/456 with a trailing note')),
    );
    expect(r.sourceType).toBe('url');
    expect(r.sourceUrl).toBe('https://example.com/listing/456');
  });

  it("normalizes sourceType=idea&prompt='www.example.com' → url with https:// prepended", () => {
    const r = parseCreateRouteParams(
      p('sourceType=idea&prompt=' + encodeURIComponent('www.example.com/listing')),
    );
    expect(r.sourceType).toBe('url');
    expect(r.sourceUrl).toBe('https://www.example.com/listing');
  });

  it('leaves a regular idea prompt alone (no URL → no rewrite)', () => {
    const r = parseCreateRouteParams(
      p('sourceType=idea&prompt=' +
        encodeURIComponent('Promote our new buyer concierge service')),
    );
    expect(r.sourceType).toBe('idea');
    expect(r.sourceUrl).toBeUndefined();
    expect(r.prompt).toBe('Promote our new buyer concierge service');
  });

  it('promotes sourceUrl alone to sourceType=url when sourceType is missing', () => {
    const r = parseCreateRouteParams(
      p('sourceUrl=' + encodeURIComponent('https://example.com/listing/789')),
    );
    expect(r.sourceType).toBe('url');
    expect(r.sourceUrl).toBe('https://example.com/listing/789');
  });

  it("preserves existing property + content_asset + idea flows unchanged", () => {
    expect(parseCreateRouteParams(p('sourceType=property&sourceId=p1')).sourceType).toBe('property');
    expect(parseCreateRouteParams(p('sourceType=content_asset&sourceId=c1')).sourceType).toBe('content_asset');
    expect(parseCreateRouteParams(p('sourceType=idea&prompt=plain%20idea')).sourceType).toBe('idea');
  });
});
