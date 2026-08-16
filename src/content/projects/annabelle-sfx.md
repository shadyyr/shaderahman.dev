---
# The Vercel deployment for this one is gone (DEPLOYMENT_NOT_FOUND), so it
# ships with a source link only until it is redeployed.
title: "annabelle.sfx"
period: "July 2026"
date: "2026-07"
summary: >-
  A birthday present for my best friend. A mobile-first soundboard styled after
  a Stream Deck with **sixteen tactile keys** in a 4×4 grid, one sound each, no
  build step and no dependencies.
tech: ["JavaScript", "HTML", "CSS", "Web Audio API", "PWA"]
highlights:
  - label: "No framework, deliberately"
    detail: "Vanilla HTML, CSS, and JavaScript. Nothing to install, nothing to build. It registers a service worker and installs as a PWA, so it keeps working with no connection at all, which matters for something meant to be opened on a phone at a party."
  - label: "iOS is the hard part"
    detail: "Safari suspends the Web Audio context until a real user gesture unlocks it, then suspends it again when the page is backgrounded. app.js carries a dedicated recovery path for that, and the repo ships a separate diagnostics page for testing on the phone itself rather than in a desktop simulator."
  - label: "Swappable without touching code"
    detail: "The sixteen keys are built from a manifest.json that maps files to slots, with an optional colour shade per key. Changing the whole sound set means editing one JSON file and reloading."
links:
  - {
      label: "Source on GitHub",
      url: "https://github.com/shadyyr/sfx_soundboard",
    }
---

Not a serious project, and I am keeping it here anyway. It is the only thing on
this page built for exactly one person.
