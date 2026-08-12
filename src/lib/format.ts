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
