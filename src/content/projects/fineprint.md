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
  earn, with no easy way to tell which is which. FinePrint extracts the claims
  from the letter's PDF, checks each one against the letter's exact text before
  it can affect any number, and shows the student their real gift aid next to
  the advertised figure.
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
  - label: "Nothing counts until it is quoted"
    detail: "A deterministic evidence gate checks every quote and dollar amount against the source PDF text before it enters any calculation. All of the financial math runs as pure TypeScript in the browser, so scenarios recompute instantly. **87** API tests, **53** web tests, and **5/5** synthetic corpus layouts passing at last run."
  - label: "What got cut, and why"
    detail: "OCR was deferred, because scanned text cannot be verified against a source. Uploads stay stateless, since offer letters contain student PII. Interest-rate modeling and multi-offer comparison were cut to ship on time. One exception was approved: students can manually enter costs a letter omits, clearly labeled as an estimate and never treated as a verified fact."
  - label: "Two agents, one repo"
    detail: "Built with two AI coding agents working one shared repository: Claude on the web app, Codex on the API."
links:
  - { label: "Try FinePrint", url: "https://fineprint-aid.vercel.app" }
  - { label: "Source on GitHub", url: "https://github.com/shadyyr/fineprint" }
---

Submitted to SASEhack 2026 for Best Finance Hack and Best Education,
Accessibility, or Social Impact. Results have not been announced yet.
