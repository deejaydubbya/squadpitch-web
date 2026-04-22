import { ExternalLink } from 'lucide-react';
import { buildSearchUrls } from './utils';

interface FindListingPhotosProps {
  propertyData: Record<string, unknown>;
}

export function FindListingPhotos({ propertyData }: FindListingPhotosProps) {
  const urls = buildSearchUrls(propertyData);
  const listingUrl = typeof propertyData.listingUrl === 'string' ? propertyData.listingUrl : null;
  const hasAnyUrl = listingUrl || urls.zillow || urls.realtor || urls.redfin;

  if (!hasAnyUrl) return null;

  return (
    <div className="rounded-lg border border-white-5 p-2.5 space-y-1.5">
      <p className="text-[10px] font-medium text-white-60 uppercase tracking-wider">Find Listing Photos</p>
      <p className="text-[10px] text-white-40">Open the listing page to grab photos, then upload here.</p>
      <div className="flex flex-wrap gap-1.5">
        {listingUrl && (
          <a
            href={listingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-white-60 bg-white-5 hover:bg-white-10 transition-colors"
          >
            <ExternalLink className="w-2.5 h-2.5" />
            Original listing
          </a>
        )}
        {urls.zillow && (
          <a
            href={urls.zillow}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-white-60 bg-white-5 hover:bg-white-10 transition-colors"
          >
            <ExternalLink className="w-2.5 h-2.5" />
            Zillow
          </a>
        )}
        {urls.realtor && (
          <a
            href={urls.realtor}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-white-60 bg-white-5 hover:bg-white-10 transition-colors"
          >
            <ExternalLink className="w-2.5 h-2.5" />
            Realtor.com
          </a>
        )}
        {urls.redfin && (
          <a
            href={urls.redfin}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-white-60 bg-white-5 hover:bg-white-10 transition-colors"
          >
            <ExternalLink className="w-2.5 h-2.5" />
            Redfin
          </a>
        )}
      </div>
    </div>
  );
}
