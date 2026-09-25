---
# No award field on purpose. Submitted to SASEhack 2026 (Best Finance Hack, and
# Best Education/Accessibility/Social Impact), and results have not been
# announced. Add the placement here only once it is real.
title: "FinePrint"
period: "SASEhack 2026"
date: "2026-09"
summary: >-
  A financial-aid offer letter can advertise a large "financial aid" total
  while mixing money a student keeps, money they repay, and wages they have to
  earn, with no easy way to tell which is which. FinePrint is built for
  first-generation students reading one of these: a model extracts typed claims
  from the letter's PDF, each one is checked against the letter's exact text
  before it can affect any number, and the student sees their real gift aid
  next to the advertised figure.
tech:
  [
    "Next.js",
    "TypeScript",
    "FastAPI",
    "PyMuPDF",
    "OpenAI API",
    "Vercel",
  ]
highlights:
  - label: "Advertised aid is not gift aid"
    detail: "On the synthetic sample letter, **$45,400** is advertised as \"aid\" and **$16,900** of it is confirmed gift aid. The rest is money the student repays or has to earn, and the letter never draws that line for them."
  - label: "Never guess"
    detail: "Every figure links to its exact words in the PDF, and a deterministic evidence gate checks each quote and dollar amount against the source text before it enters any calculation. Unverified claims stay out of the math entirely. When the letter is ambiguous, the app asks instead of assuming: an unlabeled **$20,000** scholarship prompts the student to say whether it is annual or four-year, and shows both outcomes."
  - label: "Math in the browser, the model only where it has to be"
    detail: "All of the financial math runs as pure TypeScript in the browser, so scenarios recompute instantly. **87** API tests, **53** web tests, and **5/5** synthetic corpus layouts passing at last run. Extraction goes to a balanced-cost model by default and a stronger fallback only on validation failure, with SDK retries disabled, so a live run costs about **$0.06** on synthetic stress letters."
  - label: "What got cut, and why"
    detail: "OCR was deferred, because scanned text cannot be verified against a source. Uploads stay stateless, since offer letters contain student PII. Interest-rate modeling and multi-offer comparison were cut to ship on time. One exception was approved: students can manually enter costs a letter omits, clearly labeled as an estimate and never treated as a verified fact."
  - label: "Too much, not too little"
    detail: "The first person to see it called it information overload. The fix was resequencing the flow and revealing detail progressively, not removing evidence, because the evidence is the point."
  - label: "Two agents, one repo"
    detail: "Built with two AI coding agents working one shared repository: Claude on the web app, Codex on the API."
# The Devpost slug suffix is load-bearing, same as EcoStep's:
# devpost.com/software/fineprint with no suffix is a different team's project
# from Hack-Attack 2.0.
links:
  - { label: "Source on GitHub", url: "https://github.com/shadyyr/fineprint" }
  - {
      label: "Writeup on Devpost",
      url: "https://devpost.com/software/fineprint-gctiao",
    }
---

Submitted to SASEhack 2026 for Best Finance Hack and Best Education,
Accessibility, or Social Impact. Results have not been announced yet.
