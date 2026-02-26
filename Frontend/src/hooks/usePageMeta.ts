import { useEffect } from 'react';

export interface PageMeta {
  title?: string;
  description?: string;
  image?: string;
  // you can extend this with other common metadata fields later (keywords, author, etc.)
}

/**
 * Applies the provided metadata to the document head.  This currently handles
 * the page title along with standard description and Open Graph image tags.
 *
 * You can call this hook from any page component and pass it a static object
 * exported from `src/lib/pageData.ts`.
 */
export function usePageMeta(meta: PageMeta) {
  useEffect(() => {
    if (meta.title) {
      document.title = meta.title;
    }

    if (meta.description) {
      let desc = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
      if (!desc) {
        desc = document.createElement('meta');
        desc.name = 'description';
        document.head.appendChild(desc);
      }
      desc.content = meta.description;
    }

    if (meta.image) {
      let img = document.querySelector('meta[property="og:image"]') as HTMLMetaElement | null;
      if (!img) {
        img = document.createElement('meta');
        img.setAttribute('property', 'og:image');
        document.head.appendChild(img);
      }
      img.content = meta.image;
    }
  }, [meta]);
}
