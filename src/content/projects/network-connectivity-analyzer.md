---
title: "Network Connectivity Analyzer"
period: "June 2026"
date: "2026-06"
summary: >-
  Given a network and a list of connections that fail one after another, how
  connected does the network stay at each step? This answers that in
  O(log n) average time per operation.
tech: ["Java", "Algorithms"]
highlights:
  - label: "Running the problem backwards"
    detail: "Union-Find only merges. It has no way to split a set, so sequential edge removal is the one thing it cannot do directly. Reverse-deletion sidesteps that: replay the removals backwards as insertions, rebuilding the graph bottom-up and tracking size-weighted component merges at each step to recover the connectivity score at every stage."
  - label: "Where the log n comes from"
    detail: "Union-Find with both path compression and union by rank. Either alone is worse; together they give the O(log n) average."
links:
  - {
      label: "Source in my coursework repo",
      url: "https://github.com/shadyyr/cs2/tree/main/pa3",
    }
---

Coursework, and the first time an algorithm felt like a genuine trick rather
than a procedure to memorise. The insight that you can run a destruction problem
backwards as a construction problem is not obvious until someone shows you.
