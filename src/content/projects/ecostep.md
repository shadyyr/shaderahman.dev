---
title: "EcoStep"
period: "BloomKnights 2026"
date: "2026-07"
featured: true
summary: >-
  Home energy upgrades are worth thousands in rebates that almost nobody
  claims, because working out which ones you qualify for means reading your own
  appliance labels and utility bills. EcoStep reads both from photos and
  returns a phased upgrade roadmap. The roadmap includes an **EcoScore out of
  100** for how clean the home is currently and the rebates you actually
  qualify for with payback maths run against **your own utility rate** rather
  than a national average.
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
    detail: "The production Gemini model the vision pipelines ran on was retired while the project was still being built. I replaced it with a **4-model automatic fallback chain** and a **9-category error taxonomy** across both pipelines (appliance-label OCR and utility-bill parsing), which took single-model outages off the table entirely."
  - label: "A rebate is not a number, it is paperwork"
    detail: "A generic '$350 rebate' tells you nothing about whether you can actually claim it. Each one carries the eligibility rules it depends on, the documents it needs, how long the filing takes, its deadline, and the official source it came from. That gap between a headline figure and a claimable one is the whole reason the money goes unclaimed."
  - label: "Renters get a different answer"
    detail: "Most electrification advice quietly assumes you own the building. The roadmap splits upgrades into what a tenant can act on themselves and what is landlord-controlled, so a renter gets a list of things they can do rather than a list of things they are not allowed to."
  - label: "Five engines, six routes"
    detail: "Rebate matching, affordability simulation, outage-resilience planning, group-buying, and proactive coaching, across **6 REST API routes**. Benchmarked at **9,600+ evaluations per second**, averaging **0.104ms** per call, with 8 of 8 unit tests passing. Rebate matching and affordability drive the app; the other three are built and tested behind the API but not yet surfaced in the UI."
  - label: "What was broken"
    detail: "Three classes of app-wide UI bug: a dark-mode toggle that was silently ignored, **17 invalid Tailwind color tokens**, and **17 controls that failed contrast**. I fixed all three, added a motion layer across 6 components, and shipped with **zero TypeScript errors** across 13 routes."
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
response to the Gemini model disappearing underneath us partway through, and it
turned out to be the most useful thing in the project. Anything depending on one
model has a single point of failure that a hackathon timeline will happily
expose.
