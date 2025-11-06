# Behavior Builder (FBM):
Web Instrument for Quantitative Study of Cyborg Habit Formation through the Fogg Behavior Model

**Taechasith Kangkhuntod**  
Harbour.Space Institute of Technology @UTCC (Python1, 2025)  
https://behavior-builder.vercel.app/

---

## Abstract
**Background.** Digital self-tracking systems can enable rigorous observation of behavior change, yet many tools lack research-grade data structures, bias controls, and explicit operationalizations of theory.  
**Objective.** This project presents **Behavior Builder (FBM)**, a client-side web instrument with a companion Python utility designed for quantitative studies of habit formation under the **Fogg Behavior Model (FBM)**, interpreted within a *cyborg psychology* framework in which human–device couplings shape cognition and action.  
**Methods.** The instrument records daily **motivation** and **ability** (0–10) and a binary **execution** outcome (“did/yes|no”) per target behavior, time-stamped at entry. A **focus-first, bias-guarded UX** conceals historical data until the day’s report is committed, reducing anchoring and demand characteristics. A theory-consistent **FBM action boundary** \(m \ge 12 - a\) is encoded for labeling success-zone observations. Exports are tidy **CSV/JSON** with codebook; a **Python analysis script** computes per-behavior summaries (success rates, streaks), daily time series, and an optional A–M scatter with the FBM boundary.  
**Results.** The instrument supports multi-behavior logging, time-aware visualization, reproducible exports, and local-only storage for privacy. The Python utility yields research-ready tables suitable for downstream analyses (e.g., logistic models of “did”, trends in A/M, and sensitivity to bias guards).  
**Conclusions.** The project operationalizes FBM for reproducible, privacy-preserving digital studies and provides a minimal pipeline from in-browser data collection to quantitative analysis, aligning with cyborg psychology’s emphasis on human–technology co-regulation.

---

## 1. Introduction
Quantitative study of habit formation increasingly relies on digital instruments. The **Fogg Behavior Model (FBM)** posits that behavior occurs when sufficient **motivation (M)** and **ability (A)** co-occur with an effective **prompt** [3]. Meanwhile, *cyborg psychology* frames technologies as cognitive and motivational scaffolds that participate in regulation loops [1,2]. Instruments that both **make theory observable** and **control common biases** (e.g., anchoring on prior values) are required for valid inference.

**Project Contributions.**  
1) A **client-side**, privacy-first web instrument that encodes FBM constructs and an action boundary for labeling observations.  
2) A **bias-guarded input workflow** (focus-first) to mitigate anchoring/Hawthorne effects.  
3) **Research-grade exports** (CSV/JSON + codebook) and a lightweight **Python analysis** utility compatible with introductory programming skills.

---

## 2. Related Work
Persuasive technology and behavioral design have long translated FBM into practical interventions [3]. Policy and HCI work emphasize *nudging* and bias awareness [4]. Cyborg-oriented perspectives describe human–device coupling and digital self-control tools as part of distributed cognition [1,2]. This project connects these strands by making FBM variables first-class data, adding bias controls, and enabling exportable, reproducible analyses.

---

## 3. Methods

### 3.1 Constructs and Operationalization
- **Behavior (B):** User-defined target (e.g., “Read 1 page”).  
- **Motivation (M):** Self-report integer \(0\!-\!10\).  
- **Ability (A):** Self-report integer \(0\!-\!10\).  
- **Execution (Did):** Binary yes/no for same-day attempt.  
- **FBM Success-Zone Indicator:** \( \text{in\_zone} = 1 \) if \( m \ge 12 - a \), else 0.  
- **Timestamping:** ISO date/time at entry; per-behavior lineage retained.

### 3.2 Bias Guards
- **Focus-first input:** Historical A/M/Did and graphs are **hidden** until today’s report is saved (reduces anchoring and demand effects).  
- **Private session option:** Encourages truthful reporting by easing privacy concerns (no server).

### 3.3 Instrument & Data Model
The client application (HTML/CSS/JS) runs entirely in the browser (local or session storage). Export schema:

- **CSV columns:** `user_id, behavior_id, behavior_title, date, time, datetime, motivation, ability, did, did_numeric, note, anchor, tiny`.  
- **JSON package:** `{package_version, exported_at, user, prefs, behaviors[], entries[], codebook}`.

### 3.4 Analysis Pipeline (Python Utility)
Given CSV/JSON exports, the script:
- Computes **per-behavior summaries:** \( \bar{M}, \bar{A} \), medians, **success rate** (Did==yes)/N, **in-zone success**, **current/longest streaks**, and date range.  
- Produces **daily time series** aggregates (mean/median A/M, counts of Did and in-zone success).  
- Optionally renders **A–M scatter** with the FBM line.

These tables are suitable for:
- Logistic or probit models of **Did** on A, M, in-zone indicator, time, or intervention flags.  
- Slope/change-point analyses of A/M trajectories.  
- AB/ABA designs examining **focus-first** vs **history-visible** modes (if enabled in future experiments).

---

## 4. Implementation and Availability
- **Public Demo:** https://behavior-builder.vercel.app/  
- **Runtime:** Client-side only; no backend; exports initiated by the participant/researcher.  
- **Privacy:** Data persist locally (or session-scoped); exports are explicit and user-controlled.

---

## 5. Results (Instrument Capabilities)
This project does not include a randomized evaluation; rather, it demonstrates:
1) **Theory observability:** FBM boundary labeling enables immediate mapping from reports to model-consistent regions.  
2) **Bias-aware workflow:** Focus-first input prevents pre-commit inspection of historical data.  
3) **Reproducibility:** Tidy exports with codebook and a deterministic analysis script.  
4) **Extensibility:** Additional predictors (e.g., prompt type, context tags) can be appended while retaining the core schema.

---

## 6. Discussion
Positioned within **cyborg psychology**, the instrument treats the UI as an **active regulator**—not merely a passive recorder—by structuring attention (focus-first) and shaping reflection (post-commit visualization). This fosters ecological validity (participants use their own devices) while enabling **quantitative rigor** via structured data and transparent analysis.

**Use cases.** N-of-1 studies, classroom interventions, pilot RCTs comparing prompts or micro-abilities, and consumer behavior investigations on the relative contributions of A vs M to execution.

---

## 7. Limitations and Threats to Validity
- **Self-report bias:** Although focus-first reduces anchoring, self-report remains vulnerable to recall and social desirability effects.  
- **Boundary simplification:** The linear action boundary is a practical heuristic; different tasks may exhibit non-linear thresholds.  
- **Sampling bias:** Convenience samples and short study windows may limit generalizability.

---

## 8. Ethics and Privacy
All storage and computation are local by default; exports are explicit and user-initiated. Researchers should secure exported files, minimize PII in notes, and follow institutional ethics guidance for consent and de-identification.

---

## 9. Data and Code
- **Instrument (Web):** https://behavior-builder.vercel.app/  
- **Exports:** CSV/JSON with codebook for direct import into statistical pipelines.  
- **Analysis Utility:** Python script generating behavior-level summaries and date-level series.

---

## 10. References
1. Heersmink, R. (2017). *Distributed Cognition and Digital Self-Control Tools: A Cognitive-Integration Approach.* Philosophy & Technology, 30(2), 251–269.  
2. Lyngs, U., et al. (2020). *“I Visited My Habit Garden Everyday” …* CHI ’20.  
3. Fogg, B. J. (2009). *A Behavior Model for Persuasive Design.* Persuasive ’09.  
4. Dolan, P., et al. (2012). *MINDSPACE: Influencing Behaviour through Public Policy.* Institute for Government.

---

## Acknowledgements
The developer thanks **Vetit (Ve) Kanjaras** and **Rujipas (Due) Varathikul** for providing the assignment and coding instruction in the **Python1** module, and **Gary Van Broekhoven** for psychological and research guidance in the **Consumer Behavior** module (2025) at **Harbour.Space Institute of Technology @UTCC**.
