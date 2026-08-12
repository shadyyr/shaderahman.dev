import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { SITE } from "./site";

const RESUME_DIR = "public/resume";

export type ResumeStatus =
  | { available: true; href: string; filename: string; updated: Date }
  | { available: false; expected: string };

/**
 * Looks for public/resume/ShadeRahman_Resume.pdf at build time.
 *
 * Matching is case-insensitive on both the basename and the extension,
 * because a file that came off a phone or out of Google Docs is as likely
 * to arrive as `shaderahman_resume.PDF`. Anything else in the folder is
 * ignored, so old copies can sit there without breaking the button.
 *
 * When the file is absent the button renders disabled with a real
 * explanation rather than href="#", a dead link is worse than an honest
 * missing one, and it is one of the things that makes a site look unfinished.
 */
export function findResume(): ResumeStatus {
  const expected = `${SITE.resumeBasename}.pdf`;

  if (!existsSync(RESUME_DIR)) {
    return { available: false, expected };
  }

  const wanted = SITE.resumeBasename.toLowerCase();
  const match = readdirSync(RESUME_DIR).find((entry) => {
    const lower = entry.toLowerCase();
    return lower === `${wanted}.pdf`;
  });

  if (!match) {
    return { available: false, expected };
  }

  return {
    available: true,
    href: `/resume/${match}`,
    filename: match,
    updated: statSync(join(RESUME_DIR, match)).mtime,
  };
}
