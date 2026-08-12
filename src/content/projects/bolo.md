---
title: "Bolo"
period: "June 2026"
date: "2026-06"
featured: true
summary: >-
  Writing a professional email in a second language is slow, and most tools
  either translate too literally or flatten the English you already wrote
  correctly. Bolo takes text, speech, or a screenshot of an email and returns a
  drafted English reply.
tech:
  [
    "Next.js",
    "React",
    "TypeScript",
    "Tailwind CSS",
    "Tesseract.js",
    "Gemini API",
    "OpenAI API",
    "Vercel",
  ]
highlights:
  - label: "The measured result"
    detail: "Drafting time dropped from 30 minutes to 4 across 50+ generated emails, an 87% reduction."
  - label: "Code-switching without losing intent"
    detail: "People writing in a second language mix English words, phrases, and whole sentences into their native text. Prompt flows that passed 35 generation tests preserve those rather than round-tripping them back out through translation."
  - label: "What an adversarial QA pass found"
    detail: "21 verified bugs, fixed, with 126 tests passing afterwards. The fixes were prompt-injection detection, Unicode-aware OCR cleanup, runtime API validation, stale async guards, and an empty-response fallback."
links:
  - { label: "Try Bolo", url: "https://bolo-chi.vercel.app" }
  - { label: "Source on GitHub", url: "https://github.com/shadyyr/bolo" }
---

The OCR path was the fiddly one. Screenshots of emails arrive at every possible
resolution and Tesseract will confidently return Unicode garbage for a
low-quality crop, so a cleanup pass sits between it and the model.
