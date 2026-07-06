import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { SITE_URL } from '@/lib/seo';

export interface Crumb {
  name: string;
  href: string;
}

// Shared breadcrumb trail. Renders the visible nav and, unless emitJsonLd is
// false, a BreadcrumbList structured-data block for rich results.
export function Breadcrumbs({
  items,
  emitJsonLd = true,
}: {
  items: Crumb[];
  emitJsonLd?: boolean;
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: `${SITE_URL}${c.href}`,
    })),
  };

  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-4 flex flex-wrap items-center gap-1 text-sm text-muted-foreground"
    >
      {items.map((c, i) => {
        const last = i === items.length - 1;
        return (
          <span key={`${c.href}-${i}`} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />}
            {last ? (
              <span className="text-foreground/80 truncate max-w-[16rem]">{c.name}</span>
            ) : (
              <Link href={c.href} className="hover:text-foreground transition-colors">
                {c.name}
              </Link>
            )}
          </span>
        );
      })}
      {emitJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
    </nav>
  );
}
