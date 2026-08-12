/**
 * Expansions for the acronyms and jargon that appear as tags.
 *
 * Kept as one shared map rather than a field on every tag, so a term is
 * defined once and expands identically wherever it shows up: experience tags,
 * project tech chips, coursework chips.
 *
 * Anything not in here renders as a plain tag. Only add a term if the
 * expansion actually tells a reader something they did not already know.
 * "API: Application Programming Interface" helps nobody.
 */
export const GLOSSARY: Record<string, string> = {
  ITSM: "IT Service Management",
  "Flow Designer": "ServiceNow's tool for building automated workflows without writing scripts",
  "Now Assist": "ServiceNow's generative AI layer, including its AI agents",
  ServiceNow: "An enterprise platform for automating IT and business workflows",
  "UI/UX": "User interface and user experience design",
  FPGA: "Field-Programmable Gate Array, a chip you configure into whatever circuit you need",
  "RTL Design": "Register-Transfer Level design, describing hardware as data moving between registers",
  "RISC-V": "An open, royalty-free reduced instruction set computer architecture",
  PWA: "Progressive Web App, a site that installs and runs offline like a native app",
  "REST APIs": "Representational State Transfer, the usual convention for HTTP APIs",
  OCR: "Optical Character Recognition, reading text out of an image",
  "Web Audio API": "The browser interface for low-latency audio playback and processing",
  "ARM Assembly": "Assembly language for ARM processors",
  MATLAB: "A numerical computing environment used across engineering coursework",
  Vivado: "AMD's design suite for programming FPGAs",
  Figma: "Collaborative interface design tool",
  Supabase: "Hosted Postgres with auth and storage attached",
  "Tesseract.js": "An OCR engine that runs in the browser",
  Flask: "A small Python web framework",
  "Next.js": "A React framework with server rendering and file-based routing",
};

/** The expansion for a term, or undefined when there is nothing worth adding. */
export function expand(term: string): string | undefined {
  return GLOSSARY[term];
}
