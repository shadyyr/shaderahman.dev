---
# The Devpost slug is "robolook", the project's working name before it became
# Rescuebot. It is the right page; do not "fix" it to /software/rescuebot.
#
# The repository lives under Kevin's account, and the ROS 2 work was committed
# from Alvaro's (a1vcm), per the README's team section. The contributor graph
# undercounts my part for that reason, so the body says what was mine.
title: "Rescuebot"
period: "ShellHacks 2026"
date: "2026-09-27"
summary: >-
  When a building is burning or might collapse, someone still has to go in and
  look for people. Rescuebot goes first: a mecanum-wheel robot driven from a
  browser that spots people with an **AI camera**, maps the room with
  **LiDAR**, and reports who it found and whether they seem to need help.
tech:
  [
    "Python",
    "FastAPI",
    "asyncio",
    "ROS 2",
    "Docker",
    "ESP32",
    "Raspberry Pi",
    "I2C",
  ]
highlights:
  - label: "Every link stops the motors on its own"
    detail: "Driving has to be armed on purpose and Stop overrides everything. The browser, the control service, and the motor bridge each stop the robot after **250 ms** without fresh input, and the ESP32 has its own **500 ms** watchdog, so the motors shut off even if the whole Pi freezes. Boot, faults, and reconnects always leave it disarmed."
  - label: "A serial link that cannot replay the past"
    detail: "Pi-to-ESP32 control is a newline-delimited JSON protocol with session and sequence numbers. Stale or repeated commands are dropped and never queued, so a network hiccup cannot make the robot replay a backlog of old movements. The Python and firmware sides both replay **35 shared test vectors** so they cannot drift apart. I also tracked down I2C stalls caused by **8.6 ms** transactions, ending at **38/38** ACKs with a **53 ms** longest silence."
  - label: "ROS 2 on a Pi that has no ROS 2"
    detail: "The Pi runs Debian 13, which has no ROS 2 packages, so ROS 2 Jazzy (SLAM Toolbox and Nav2) runs in Docker and reads the LiDAR and IMU through the dashboard's HTTP API. Autonomy can only drive through the same socket and safety checks as a person at the keyboard. The wheels stalled under Nav2's small commands until I added a minimum PWM and had it drive one axis at a time."
collaborators:
  - {
      name: "Alvaro Canseco-Martinez",
      url: "https://www.linkedin.com/in/alvaro-canseco-martinez/",
    }
  - {
      name: "Isabelle Mathew",
      url: "https://www.linkedin.com/in/isabelle-mathew-21159a3ab/",
    }
  - { name: "Kevin Li", url: "https://www.linkedin.com/in/kevin-li7673/" }
links:
  - {
      label: "Source on GitHub",
      url: "https://github.com/Kevinli7673/shellhacks2026",
    }
  - {
      label: "Writeup on Devpost",
      url: "https://devpost.com/software/robolook",
    }
---

Built at ShellHacks 2026 by a team of four. I built the web dashboard and the
driving software: the control service, the motor bridge, the serial protocol,
integration and hardware bring-up, and the ROS 2 mapping and autonomy on the
physical robot. Alvaro did the AI camera detection, the LiDAR and sensor tools,
the voice, and the Gemini triage. Isabelle wrote the ESP32 firmware and the
buzzer and light. Kevin built the robot itself: chassis, motors, and wiring.
