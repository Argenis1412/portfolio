# Service Level Objectives (SLOs)

## Overview
This document defines the realistic Service Level Objectives (SLOs) and internal thresholds for the backend API. These metrics guide the system's "survival mode" and degradation responses.

---

## 1. Latency Objectives

### Target Latency (p95)
**Objective:** 95% of all non-administrative requests must complete in under **250ms**.
**Warning Threshold:** If p95 latency exceeds **400ms** over a 1-minute rolling window, the system enters internal warning state.
**Critical Threshold:** If p95 latency exceeds **800ms**, the system triggers the Circuit Breaker and sheds load.

---

## 2. Error Rate Objectives

### Target Error Rate
**Objective:** We commit to a maximum error rate (5xx responses) of **0.5%** over any 15-minute rolling window during normal operation.
**Warning Threshold:** If the error rate surpasses **2%**, alert the on-call systems and degrade non-essential features on the frontend.
**Critical Chaos Threshold:** If the error rate hits **5%** (e.g. during a Chaos Spike), the "Panic Button" state is verified as successfully breached, and emergency queues must drain.

---

## 3. Availability

### Overall Uptime
**Objective:** Provide **99.9%** availability for critical endpoints (data reads, core functionality) by aggressively sacrificing background workers and heavy aggregations during times of stress.
