---
title: "Bolo"
period: "June 2026"
date: "2026-06"
featured: true
summary: >-
  Plenty of people read English perfectly well, but are slow at writing it, so
  an email reply they could think through in a minute costs them **half an
  hour**. Bolo lets them work in the language they think in, whether it's
  through text or speech, and returns a drafted English reply. It is a
  composition problem, not a comprehension one, which is why it drafts rather
  than translates.
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
  - label: "A screenshot is context, not just text"
    detail: "You can hand it a screenshot of the thread you are answering. The OCR is not there to save typing, it is there so the model can see what is actually being asked: the sender's wording, what was already said above it, and the problem the reply has to solve. A draft written against that thread beats one written against a blank prompt, because the hard part of a reply is usually the context, not the sentences."
  - label: "The measured result"
    detail: "Drafting time dropped from **30 minutes to 4** across 50+ generated emails, an **87% reduction**."
  - label: "Code-switching without losing intent"
    detail: "People writing in a second language mix English words, phrases, and whole sentences into their native text, and those are usually the parts they are most sure about. Prompt flows that passed **35 generation tests** preserve them rather than round-tripping them back out through translation, which is the failure mode that makes a tool feel like it is correcting you."
  - label: "What an adversarial QA pass found"
    detail: "**21 verified bugs**, fixed, with **126 tests** passing afterwards. The fixes were prompt-injection detection, Unicode-aware OCR cleanup, runtime API validation, stale async guards, and an empty-response fallback."
links:
  - { label: "Try Bolo", url: "https://bolo-chi.vercel.app" }
  - { label: "Source on GitHub", url: "https://github.com/shadyyr/bolo" }
---

The OCR path was the fiddly one. Screenshots of emails arrive at every possible
resolution and Tesseract will confidently return Unicode garbage for a
low-quality crop, so a cleanup pass sits between it and the model.
