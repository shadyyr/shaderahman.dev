/**
 * The graphic design work, and the only hand-written half of it.
 *
 * Everything here is a fact about a piece that no script can read: what it is,
 * who it was for, and when. Everything measurable, the page dimensions and how
 * many slides a carousel runs to, is generated into design-assets.json by
 * `npm run design` and merged in at build time. Keep the two halves separate:
 * a human fact that a script overwrites is a fact that goes stale silently.
 *
 * `date` is never rendered. It sorts the grid, newest first, and month
 * precision matters because one academic year produces a lot of ties.
 *
 * Every date below is traceable to something printed on the piece itself or to
 * the academic year in its own filename. Where only a season is known, the date
 * is that season's start rather than a guess at the day it was drawn.
 *
 * `source` is the filename in art/design/, which is gitignored: the originals
 * are 187MB and live in Drive. Only the derivatives under public/design/ are
 * committed, so a fresh clone can build the page without the sources present.
 */

export type DesignPiece = {
  slug: string;
  /** Filename inside art/design/. Only needed when running npm run design. */
  source: string;
  title: string;
  /** Who it was made for. Groups the grid and is rendered under the title. */
  org: "Bengali Student Association" | "Knight Hacks" | "DECA";
  /** YYYY-MM. Sorting only, never rendered. */
  date: string;
  /**
   * The Instagram post this piece was published in, when there is one.
   *
   * Optional on purpose: only some pieces were feed posts, and a title with no
   * post renders as plain amber text rather than a blue link, because blue on
   * this site means it goes somewhere. Never fill this in from a shortcode
   * that looks right. Instagram is in the link checker's bot-hostile list, so
   * "npm run links" skips these rather than verifying them, which makes a
   * wrong one invisible to every gate the repo has.
   */
  post?: string;
  /**
   * Regions to fill with solid black, as fractions of the page they sit on.
   * `page` is 1-based and matches the slide numbering the site shows.
   *
   * This exists because a poster can publish something the rest of the site
   * refuses to. `npm run audit` reads the built HTML and cannot see inside a
   * picture, so anything printed in the artwork gets exactly one review, and
   * it is this one. Every page of every piece ships, not just the cover, so
   * check all of them for contact details before adding a piece.
   *
   * Nothing is cropped. He asked for the whole page with a bar over the parts
   * that cannot be republished, rather than a page cut short, because a cut
   * page hides the composition along with the phone number.
   */
  redact?: { page: number; left: number; top: number; width: number; height: number }[];
};

export const DESIGN: DesignPiece[] = [
  {
    slug: "knight-hacks-ix-carousel",
    source: "Knight Hacks IX Carousel Instagram Post.pdf",
    title: "Knight Hacks IX announcement carousel",
    org: "Knight Hacks",
    date: "2026-08",
    post: "https://www.instagram.com/p/DatBcDRGRsl/",
  },
  {
    slug: "knight-hacks-ix-flyer",
    source: "Knight Hacks IX Flyer.jpg",
    title: "Knight Hacks IX flyer",
    org: "Knight Hacks",
    date: "2026-08",
  },
  {
    slug: "knight-hacks-mentor-applications",
    source: "[FINAL] mentor apps.png",
    title: "Knight Hacks mentor applications",
    org: "Knight Hacks",
    date: "2026-08",
    post: "https://www.instagram.com/p/Dcd9Q9WRqEX/",
  },
  {
    slug: "knight-hacks-volunteer-applications",
    source: "[FINAL] volunteer apps.png",
    title: "Knight Hacks volunteer applications",
    org: "Knight Hacks",
    date: "2026-08",
    post: "https://www.instagram.com/p/DcbaW_Lxlxy/",
  },
  {
    slug: "bsa-outreach-committee-banner",
    source: "BSA Outreach Committee Form Banner.png",
    title: "Outreach committee form banner",
    org: "Bengali Student Association",
    date: "2026-08",
  },
  {
    slug: "bsa-mock-gaye-holud",
    source: "Mock Gaye Holud 2025 Graphics.pdf",
    title: "Mock Gaye Holud invitation",
    org: "Bengali Student Association",
    date: "2025-10",
    /*
      Page 6 thanks the event's sponsors by reproducing their business cards,
      and two of those cards carry full contact blocks: a phone number, an
      email and a street address each, one of the emails being a personal
      Gmail rather than a company address.

      Only the contact lines go under a bar. The logos, the trading names and
      the people's names stay, because the page exists to thank them and a
      sponsor blacked out entirely is not thanked at all. What is covered is
      what a stranger could act on, which is the same line this site draws for
      its owner: no phone number, and no email in the page source.
    */
    redact: [
      { page: 6, left: 0.028, top: 0.735, width: 0.268, height: 0.05 },
      { page: 6, left: 0.031, top: 0.845, width: 0.125, height: 0.104 },
    ],
  },
  {
    slug: "bsa-mgh-spirit-week",
    source: "BSA MGH Spirit Week Posts.pdf",
    title: "Mock Gaye Holud spirit week",
    org: "Bengali Student Association",
    date: "2025-10",
  },
  {
    slug: "bsa-gbm-1",
    source: "BSA GBM 1 Post.png",
    title: "BSA Feud, general body meeting 1",
    org: "Bengali Student Association",
    date: "2025-09",
  },
  {
    slug: "bsa-opening-knight-2025",
    source: "BSA Opening Knight 2025 Post.png",
    title: "Opening Knight 2025",
    org: "Bengali Student Association",
    date: "2025-08",
  },
  {
    slug: "bsa-membership-flyer",
    source: "BSA 2025-2026 Membership Flyer.png",
    title: "Membership flyer",
    org: "Bengali Student Association",
    date: "2025-08",
    /*
      The dues block prints "zelle: 561-430-7110" and a personal Cash App tag
      beside the club's Venmo. That is a real phone number and an individual's
      payment handle, and this site's standing rule is that no phone number
      appears on it. The club's own Instagram post is theirs to publish and it
      scrolls away; a portfolio page is permanent and indexed, so it does not
      get to carry someone else's number by accident.

      The bar covers all three lines rather than the middle one alone. Leaving
      "venmo:" and "cashapp:" legible either side of a gap would advertise what
      was taken out, and the handle on the third line is a person's, not the
      club's.
    */
    redact: [{ page: 1, left: 0.04, top: 0.51, width: 0.365, height: 0.11 }],
  },
  {
    slug: "bsa-membership-form-banner",
    source: "BSA Membership Form Banner.png",
    title: "Membership form banner",
    org: "Bengali Student Association",
    date: "2025-08",
  },
  {
    slug: "bsa-officer-introductions",
    source: "BSA 2025-2026 Officer Introduction Posts.pdf",
    title: "Officer introductions",
    org: "Bengali Student Association",
    date: "2025-08",
  },
  {
    slug: "bsa-birthday-stories",
    source: "BSA 2025-2026 Birthday Story Posts.pdf",
    title: "Birthday story posts",
    org: "Bengali Student Association",
    date: "2025-08",
  },
  {
    slug: "bsa-class-of-2025",
    source: "BSA CO2025 Graduates Post.pdf",
    title: "Class of 2025 graduates",
    org: "Bengali Student Association",
    date: "2025-05",
  },
  {
    slug: "bsa-aapi-heritage-month",
    source: "BSA AAPI Infographic.pdf",
    title: "AAPI Heritage Month infographic",
    org: "Bengali Student Association",
    date: "2025-05",
  },
  {
    slug: "deca-tarte-campaign",
    source: "DECA _24 Book - tarte Maracuja Juicy Lip Balm.pdf",
    title: "tarte integrated marketing campaign",
    org: "DECA",
    date: "2023-12",
    /*
      The title page carries two things the rest of the site will not print.

      The first is a "prepared by" credit naming the classmate he worked with.
      She worked on the campaign, not on the design, and this is a design page,
      so printing her name here would credit her for the wrong thing.

      The second is the high school's full street address, which is a real
      building a real person attended. The school's name goes under the same
      bar as the address: separating them would leave the name sitting on top
      of an obvious black box, which reads as a redaction of the name itself.
    */
    redact: [
      { page: 1, left: 0.1, top: 0.74, width: 0.46, height: 0.052 },
      { page: 1, left: 0.61, top: 0.856, width: 0.266, height: 0.092 },
    ],
  },
];
