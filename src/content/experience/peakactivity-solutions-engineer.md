---
role: "Solutions Engineer Intern"
company: "PeakActivity"
companyUrl: "https://www.peakactivity.com"
location: "Orlando, FL / Remote"
start: "2026-08"
summary: >-
  Turning the operational problems internal teams and prospective clients
  describe into working agent pipelines on PeakActivity's SteelEngine platform.
  The demos have to hold up live, in front of the client.
bullets:
  - "Built and deployed a **35-block** pharmaceutical intake workflow on the **SteelEngine** platform, validating **6** acceptance scenarios across webhook intake, program lookup, document classification and extraction, confidence-based routing, and human-review queues."
  - "Prototyped an anomaly-reporting tool on **SteelEngine** using hybrid baselines (prior-day, week-over-week, year-over-year, same-weekday) and materiality gates, sorting movement into stable, context-explained, residual-watch, and incident classes. Validated with a **four-case** fixture suite and calibrated across **8** dates (**0 to 3** incidents on quiet days, **8** on a high-signal day)."
  - "Built a Jira-to-**Playwright** QA-automation proof of concept: a deterministic compiler that turns tickets into versioned test cases, limited to HTTPS domains and allowlisted actions and rejecting destructive checkout and payment steps. Browser execution is not yet connected."
  - "Deployed a Gmail-to-Slack demo-request automation that claims each email by Gmail message ID to block duplicates, strips signatures and scripts, and posts attachments in a Slack thread with a recorded receipt; **8** deliveries logged."
  - "Benchmarked **3** workflow-authoring approaches across **9** People Ops workflows, totalling **218** blocks and **234** edges, and identified structured raw-transcript input as the fastest path to an executable automation, keeping decision trees and technical specs for review and controls."
tags:
  - { name: "Agent pipelines", starred: true }
  - { name: "Workflow automation", starred: true }
  - { name: "QA automation" }
  - { name: "Playwright" }
  - { name: "Prototyping" }
  - { name: "Client demos" }
---

The anomaly tool started from stakeholder feedback that campaign peaks were
skewing the alerts. Two calls shaped it after that: a residual-watch class
instead of a binary normal-or-incident split, and holding off on scheduling it
until it worked on test data.
