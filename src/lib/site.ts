/**
 * Single source of truth for anything that appears in more than one place:
 * meta tags, JSON-LD, the sidebar, the footer, the sitemap.
 *
 * If a string shows up in two files, it belongs here instead.
 */

export const SITE = {
  origin: "https://shaderahman.dev",

  /** Legal name. Used in JSON-LD, og:site_name, and the title suffix. */
  name: "Shade Rahman",

  /**
   * What you actually do, in words a person would say out loud.
   * Keep it concrete. This lands in <title>, JSON-LD jobTitle, and the header.
   */
  role: "Computer Engineering Student",

  /**
   * One sentence for meta description and the OG card. ~150 chars.
   * Say what you build, not how passionate you are about building.
   */
  description:
    "Computer engineering student at UCF. I build full-stack and AI-backed apps, design interfaces, and work on RISC-V hardware. Projects and work history.",

  email: "shaderahman123@gmail.com",

  /** Where you are. Recruiters genuinely search on this. */
  location: "Orlando, FL",

  socials: {
    github: "https://github.com/shadyyr",
    linkedin: "https://www.linkedin.com/in/shaderahman",
  },

  /**
   * Drop the PDF at public/resume/<this>.pdf and the button turns on by
   * itself. See src/lib/resume.ts, the filename is checked at build time,
   * so a missing file renders a disabled button rather than a dead link.
   */
  resumeBasename: "ShadeRahman_Resume",

  /** Shown in the title bar and the status line. Cosmetic. */
  system: {
    label: "SHADE.OS",
    /* 1.1 is the home page remodel: the playlist player where "Now" was, and
       the portrait beside the intro. Bump this when the site changes shape,
       not on content edits. */
    version: "1.1",
  },
} as const;

export const EDUCATION = {
  school: "University of Central Florida",
  url: "https://www.ucf.edu",
  degree: "B.S. Computer Engineering",
  location: "Orlando, FL",
  start: "2024-08",
  end: "2028-05",
  gpa: "4.0",
  coursework: [
    "Data Structures and Algorithms",
    "Object-Oriented Programming",
    "Computer Organization",
    "Digital Systems",
    "Differential Equations",
  ],
} as const;

/**
 * Credentials carry their issuer and date. "Certified User: Inventor" on its
 * own is a claim; "Certiport, May 2021" is a checkable fact. Both lists are
 * newest first.
 */
export const CERTIFICATIONS = [
  {
    name: "AWS AI Practitioner Challenge",
    issuer: "Udacity",
    date: "May 2026",
  },
  {
    name: "Autodesk Revit Architecture Certified User",
    issuer: "Certiport",
    date: "Mar 2023",
  },
  {
    name: "MTA: Introduction to Programming Using Python",
    issuer: "Microsoft",
    date: "Feb 2022",
  },
  {
    name: "Autodesk Inventor Certified User",
    issuer: "Certiport",
    date: "May 2021",
  },
] as const;

export const AWARDS = [
  {
    name: "AP Scholar with Distinction",
    issuer: "College Board",
    date: "2023 and 2024",
  },
  {
    name: "Eda & Cliff Viner Scholar",
    issuer: "Eda and Cliff Viner Community Scholars",
    date: "May 2024",
  },
  {
    name: "Florida Academic Scholar",
    issuer: "Florida Bright Futures Scholarship Program",
    date: "May 2024",
  },
  {
    name: "Pegasus Gold Scholarship",
    issuer: "University of Central Florida",
    date: "Mar 2024",
  },
  {
    name: "President's Honor Roll",
    issuer: "University of Central Florida",
  },
] as const;

/** Every route, in nav order. Drives the sidebar, sitemap, and command palette. */
export const ROUTES = [
  { path: "/", label: "home", title: "Home", key: "h" },
  { path: "/experience", label: "experience", title: "Experience", key: "e" },
  { path: "/projects", label: "projects", title: "Projects", key: "p" },
  { path: "/skills", label: "skills", title: "Skills", key: "s" },
] as const;

export type Route = (typeof ROUTES)[number];

/** Absolute URL for a site-relative path. OG tags and JSON-LD require absolute. */
export function abs(path: string): string {
  return new URL(path, SITE.origin).href;
}
