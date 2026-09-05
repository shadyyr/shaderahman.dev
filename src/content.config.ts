import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

/** "2026-05", month precision is all a résumé needs, and it dodges timezones. */
const yearMonth = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "use YYYY-MM, e.g. 2026-05");

/**
 * A skill as claimed in context. `starred` marks the two or three that
 * actually mattered in this role, claiming nine equally is claiming nothing.
 */
const tag = z.object({
  name: z.string(),
  starred: z.boolean().default(false),
});

/**
 * Links are always named for what they are. A row of identical "GitHub"
 * buttons tells the reader nothing about which one to click.
 */
const link = z.object({
  label: z.string(),
  url: z.string().url(),
});

const experience = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/experience" }),
  schema: z.object({
    role: z.string(),
    company: z.string(),
    companyUrl: z.string().url().optional(),
    location: z.string(),
    start: yearMonth,
    /** Omit for a role you currently hold; it renders as "Present". */
    end: yearMonth.optional(),
    /**
     * One or two sentences naming the PROBLEM, not restating the job title.
     * "Replaced dedicated dev hardware with autoscaled simulators" beats
     * "Worked on infrastructure."
     */
    summary: z.string(),
    /**
     * Three to six bullets. Put a number in every one, a duration, a count,
     * a before/after. A bullet without a number is a bullet without a claim.
     */
    bullets: z.array(z.string()).min(1),
    tags: z.array(tag).default([]),
    links: z.array(link).default([]),
    draft: z.boolean().default(false),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/projects" }),
  schema: z.object({
    title: z.string(),
    /**
     * Deliberately free-form: either a date range ("Feb – Mar 2025") or the
     * venue ("HackUSF 2026"). Context beats chronology, and the venue is
     * usually the more informative of the two.
     */
    period: z.string(),
    /**
     * Sorting only, never rendered. Month precision matters: a portfolio
     * built in one busy year has too many ties at year granularity.
     */
    date: yearMonth,
    /**
     * Quantify placements. "1st of 112" is a signal; a bare "Winner" is noise.
     */
    award: z
      .object({
        label: z.string(),
        rank: z.number().int().optional(),
        of: z.number().int().optional(),
      })
      .optional(),
    /** One sentence. Lead with why the problem matters, then what it is. */
    summary: z.string(),
    tech: z.array(z.string()).default([]),
    /** Bolded lead phrase + explanation. Include what broke, not only what shipped. */
    highlights: z
      .array(z.object({ label: z.string(), detail: z.string() }))
      .default([]),
    collaborators: z
      .array(z.object({ name: z.string(), url: z.string().url().optional() }))
      .default([]),
    links: z.array(link).default([]),
    /** Sorts to the top of /projects. Keep it to two or three. */
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

const skills = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/skills" }),
  schema: z.object({
    category: z.string(),
    /** Column/section order, low to high. */
    order: z.number().int().default(50),
    /**
     * `note` is for the honest qualifier, "reading, not writing",
     * "one production service". Breadth without depth is a tell.
     */
    items: z.array(
      z.object({
        name: z.string(),
        note: z.string().optional(),
      }),
    ),
  }),
});

export const collections = { experience, projects, skills };
