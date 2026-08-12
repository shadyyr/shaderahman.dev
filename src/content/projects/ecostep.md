---
title: "EcoStep"
period: "BloomKnights 2026"
date: "2026-07"
featured: true
summary: >-
  Home energy upgrades are worth thousands in rebates that almost nobody
  claims, because working out which ones you qualify for means reading your own
  appliance labels and utility bills. EcoStep reads them for you.
tech:
  [
    "Next.js",
    "React",
    "TypeScript",
    "Tailwind CSS",
    "Supabase",
    "Gemini API",
    "Vercel",
  ]
highlights:
  - label: "A model was retired mid-build"
    detail: "The production Gemini model the vision pipelines ran on was retired while the project was still being built. I replaced it with a 4-model automatic fallback chain and a 9-category error taxonomy across both pipelines, appliance-label OCR and utility-bill parsing, which took single-model outages off the table entirely."
  - label: "Five engines, six routes"
    detail: "Rebate matching, affordability simulation, outage-resilience planning, group-buying, and proactive coaching, across 6 REST API routes. Benchmarked at 9,600+ evaluations per second, averaging 0.104ms per call, with 8 of 8 unit tests passing."
  - label: "What was broken"
    detail: "Three classes of app-wide UI bug: a dark-mode toggle that was silently ignored, 17 invalid Tailwind color tokens, and 17 controls that failed contrast. I fixed all three, added a motion layer across 6 components, and shipped with zero TypeScript errors across 13 routes."
collaborators:
  - {
      name: "Abeni Rodriguez",
      url: "https://www.linkedin.com/in/abeni-rodriguez-a89445321/",
    }
  - {
      name: "Emma Stefanini",
      url: "https://www.linkedin.com/in/emma-stefanini-amory-609aba352/",
    }
# No live demo link on purpose, because the Vercel deployment is gone. Source
# and writeup only until it is redeployed.
#
# The Devpost slug suffix is load-bearing: devpost.com/software/ecostep with
# no suffix is a different team's project from cuHacking 2020.
links:
  - { label: "Source on GitHub", url: "https://github.com/shadyyr/ecostep" }
  - {
      label: "Writeup on Devpost",
      url: "https://devpost.com/software/ecostep-to16qv",
    }
---

Built at BloomKnights 2026. The reliability work was not planned. It was a
response to the Gemini model disappearing underneath us partway through, which
turned out to be the most useful thing in the project. Anything depending on one
model has a single point of failure that a hackathon timeline will happily
expose.
