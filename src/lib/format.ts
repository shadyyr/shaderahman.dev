const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "2026-05" -> "May 2026" */
export function formatMonth(value: string): string {
  const [year, month] = value.split("-");
  return `${MONTHS[Number(month) - 1]} ${year}`;
}

/** A missing end date means the role is current. */
export function formatRange(start: string, end?: string): string {
  return `${formatMonth(start)} – ${end ? formatMonth(end) : "Present"}`;
}

/**
 * Newest first, by start date, with no special case for ongoing roles.
 *
 * Floating current roles to the top sounds right until a nine-year volunteer
 * commitment outranks an internship from last month purely because it has no
 * end date. Plain reverse chronological is what a reader expects, and "Present"
 * in the date line already says which roles are live.
 */
export function byRecency<T extends { start: string; end?: string }>(
  a: T,
  b: T,
): number {
  return b.start.localeCompare(a.start);
}

type OrgFields = { company: string; start: string; end?: string };

/**
 * Consecutive roles at one organisation, collected into a single unit.
 *
 * Returns an array of runs, newest first. A run of one is an ordinary entry;
 * a run of several is a promotion track and gets drawn as one card.
 *
 * Two rules do the work here, and both matter.
 *
 * **Roles must be contiguous**, meaning each one ends in the month the next
 * begins. This is the honesty condition. Two stints a year apart are two
 * separate things, and drawing one box around them would assert a continuous
 * tenure that never happened. Knight Hacks was exactly that shape before the
 * outreach entry was removed: Jan to May 2025, then nothing until Apr 2026.
 *
 * **Grouping cannot be a scan of adjacent entries**, because roles at one
 * organisation are usually not adjacent once everything is sorted by date.
 * The three BSA roles currently sit at positions 4, 6 and 7 with an unrelated
 * role in between. So bucket by organisation first, then order.
 *
 * A run sorts on its newest role, so a group lands exactly where its most
 * recent title would have landed on its own. That keeps the page readable as
 * plain reverse chronological, which is what the reader is scanning for.
 */
export function groupByOrg<T>(
  entries: T[],
  data: (entry: T) => OrgFields,
): T[][] {
  const buckets = new Map<string, T[]>();
  for (const entry of entries) {
    const key = data(entry).company;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(entry);
    else buckets.set(key, [entry]);
  }

  const runs: T[][] = [];
  for (const bucket of buckets.values()) {
    const sorted = [...bucket].sort((a, b) =>
      data(b).start.localeCompare(data(a).start),
    );

    let run: T[] = [];
    for (const entry of sorted) {
      const previous = run[run.length - 1];
      const joins =
        previous != null &&
        data(entry).end != null &&
        data(entry).end === data(previous).start;

      if (joins) {
        run.push(entry);
      } else {
        if (run.length > 0) runs.push(run);
        run = [entry];
      }
    }
    if (run.length > 0) runs.push(run);
  }

  return runs.sort((a, b) =>
    data(b[0]).start.localeCompare(data(a[0]).start),
  );
}

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * Bullets are plain strings in YAML, but the numbers in them want to be bold,
 * a bolded figure is what makes a card scannable in three seconds. So `**` is
 * honoured and nothing else is.
 *
 * Content is escaped first and the markers applied after, so a stray `<` in a
 * bullet renders as a character rather than as markup.
 */
export function emphasize(text: string): string {
  const escaped = text.replace(/[&<>"']/g, (char) => ESCAPES[char]!);
  return escaped.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

/** "1st of 112 entries" reads as a result. "Winner" reads as decoration. */
export function formatAward(award: {
  label: string;
  rank?: number;
  of?: number;
}): string {
  if (award.rank && award.of) {
    return `${award.label}, ${ordinal(award.rank)} of ${award.of}`;
  }
  return award.label;
}

function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}
