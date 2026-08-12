import { SITE, EDUCATION, abs } from "./site";

/**
 * JSON-LD for the site.
 *
 * The point here is not rich results, a portfolio does not get those. It is
 * entity disambiguation: `sameAs` is what lets a search or answer engine
 * connect "Shade Rahman" on this domain to the same person on GitHub and
 * LinkedIn. Every page emits the Person node under a stable @id so crawlers
 * merge them into one entity instead of three.
 */

const PERSON_ID = `${SITE.origin}/#person`;
const SITE_ID = `${SITE.origin}/#website`;

type Crumb = { name: string; path: string };

export function personNode() {
  return {
    "@type": "Person",
    "@id": PERSON_ID,
    name: SITE.name,
    givenName: "Shade",
    familyName: "Rahman",
    url: `${SITE.origin}/`,
    jobTitle: SITE.role,
    /*
      No `email` field. It was harvestable straight out of the JSON-LD, and
      once the contact button was removed there was no reason to leave a
      scrapeable copy in the page source. `sameAs` below already does the
      entity disambiguation work, which is the actual point of this block.
    */
    description: SITE.description,
    address: {
      "@type": "PostalAddress",
      addressLocality: SITE.location,
    },
    alumniOf: {
      "@type": "CollegeOrUniversity",
      name: EDUCATION.school,
      url: EDUCATION.url,
    },
    sameAs: [SITE.socials.github, SITE.socials.linkedin],
  };
}

export function websiteNode() {
  return {
    "@type": "WebSite",
    "@id": SITE_ID,
    url: `${SITE.origin}/`,
    name: SITE.name,
    description: SITE.description,
    inLanguage: "en",
    publisher: { "@id": PERSON_ID },
  };
}

function breadcrumbNode(crumbs: Crumb[]) {
  return {
    "@type": "BreadcrumbList",
    "@id": `${abs(crumbs[crumbs.length - 1]!.path)}#breadcrumb`,
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: abs(crumb.path),
    })),
  };
}

export function buildGraph(opts: {
  path: string;
  title: string;
  description: string;
  /** Home page only, it is the one page that is *about* the person. */
  isHome?: boolean;
  crumbs?: Crumb[];
}) {
  const pageUrl = abs(opts.path);

  const page: Record<string, unknown> = {
    "@type": "WebPage",
    "@id": `${pageUrl}#webpage`,
    url: pageUrl,
    name: opts.title,
    description: opts.description,
    isPartOf: { "@id": SITE_ID },
    inLanguage: "en",
  };

  if (opts.isHome) {
    page.about = { "@id": PERSON_ID };
    page.mainEntity = { "@id": PERSON_ID };
  }

  const graph: Record<string, unknown>[] = [personNode(), websiteNode(), page];

  if (opts.crumbs && opts.crumbs.length > 1) {
    graph.push(breadcrumbNode(opts.crumbs));
  }

  return { "@context": "https://schema.org", "@graph": graph };
}
