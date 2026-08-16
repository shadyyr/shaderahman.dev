---
title: "Cooked!"
period: "HackUSF 2026"
date: "2026-03"
featured: true
summary: >-
  Recipe sites want you to already have the ingredients. Cooked! goes the other
  way: type in what is actually in your fridge and it ranks recipes by **match
  percentage**, showing what you are short of and how much more of it you need,
  with the instructions and a video for each one. The point is cooking from
  what you have in your pantry instead of shopping for a recipe you picked
  first.
# The full project stack. The body says which parts were mine, because listing
# a team's whole stack without saying what you touched reads as taking credit
# for the rest of it.
tech:
  [
    "Python",
    "Flask",
    "Next.js",
    "TypeScript",
    "REST APIs",
    "TheMealDB API",
    "Gemini API",
  ]
highlights:
  - label: "Ranking, not just matching"
    detail: "A tiered ingredient-matching algorithm with coverage-based scoring ranks **12+ recipes per query**, rather than dumping back everything that happens to contain one ingredient you own. A recipe you can make nine tenths of is a different answer from one you can make a third of, and a flat match cannot tell you which is which."
  - label: "Cutting redundant calls"
    detail: "In-memory caching and API error handling reduced redundant external API calls by **73.6%** across overlapping query benchmarks."
  - label: "People type messily"
    detail: "Nobody enters ingredients consistently. '2 cups', '2c', and 'two cups' all show up. Real-time validation, unit normalization, and unit suggestions resolve that before anything reaches the matcher."
  - label: "The recipe data is messy too"
    detail: "TheMealDB is the source, and it is incomplete and inconsistent: missing fields, ambiguous units, the same ingredient written several ways. The matcher has to degrade around all of that and still return a ranking that means something, which is most of the reason the scoring is tiered rather than one string comparison."
collaborators:
  - { name: "Natalie Reese", url: "https://www.linkedin.com/in/nat-reese/" }
links:
  - { label: "Source on GitHub", url: "https://github.com/shadyyr/cooked" }
  - {
      label: "Writeup on Devpost",
      url: "https://devpost.com/software/cooked-m9206r",
    }
---

Built at HackUSF 2026 with Natalie Reese. I worked mainly on the backend: the
Flask service, the matching and scoring, the caching, and the input
normalization. I also did the wiring between the frontend and backend, and the
UI/UX. Natalie built the frontend UI and handled integration and deployment.
