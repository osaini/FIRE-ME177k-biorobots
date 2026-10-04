# FIRE ME 177K — Biorobotics / ExoBoot Preference Learning
## Prep brief

**Team:** Ojas Saini, Asiya, Tarun
**Graduate mentor:** Finn Eagen (note spelling — *Eagen*, not Eagan)
**Faculty:** Dr. Nicholas P. Fey, Associate Professor, Walker Dept. of Mechanical Engineering
**Lab:** Systems for Augmenting Human Mechanics (SAHM) Laboratory, UT Austin / Texas Robotics
**Compiled:** 2026-09-04

---

## 1. The assignment, restated

From slide 3 (Topic #2), verbatim problem statement:

> Human mobility is a central goal for happiness and quality of life. Yet, mobility-impaired individuals have few options with respect to wearable assistive technologies that enable movement during the widely-varying scenarios that are encountered during daily life. The Dephy ExoBoot is an ankle exoskeleton designed to assist users when walking or running, but currently there is little control for the user to personalize their experience and comfort while using the ExoBoot. Patients who cannot tune the ExoBoot to their preferences face discomfort, reduced mobility and a general lack of autonomy over how they are assisted. The project in the Systems for Augmenting Human Mechanics Lab will explore different online learning methods to incorporate user preference when using the ExoBoot, and to extend these methods across variable ambulation scenarios that are encountered during daily life.

### Translated into an engineering problem

The ExoBoot applies an assistive torque profile at the ankle each stride. That profile is defined by a handful of numbers — typically **peak torque magnitude, peak timing (% of stride), rise time, and fall time**. Different settings feel different to different people, and the "best" setting is not the same as the most metabolically efficient one.

Your two research questions are:

1. **Online preference learning.** Given that a human can only reliably say *"A feels better than B"* (not *"my optimal peak torque is 22.4 Nm"*), how do you search a continuous parameter space using only noisy, pairwise, real-time human feedback — in a small enough number of trials that a person will actually sit through it?

2. **Generalization across ambulation scenarios.** A preference learned on a treadmill at 1.2 m/s is one point in a space. Real life is stairs, ramps, sit-to-stand, speed changes, jogging, uneven ground. Do you re-run the whole optimization for every context? Or can you learn a *context-conditioned* preference model that warm-starts or interpolates?

Question 2 is the genuinely open one. Question 1 has strong published prior art you will be building on, not inventing.

---

## 2. The hardware: Dephy ExoBoot

| Property | Value |
|---|---|
| Type | Powered ankle exoskeleton, boot-mounted |
| Actuation | Brushless DC motor on a rigid shank, belt-drive transmission onto a boot-mounted strut |
| Assists | Ankle plantarflexion (push-off), primarily |
| Mass | ~3.4 lb (~1.5 kg) per side |
| Sensing | IMU(s) + ankle joint encoder |
| Models in the literature | EB-51, EB60 |
| Power | Battery module on shin pad, below the knee |
| Commercial name | Dephy Sidekick |

It's the workhorse research ankle exo — the Michigan Neurobionics Lab, Georgia Tech (Aaron Young), and Northeastern all publish on it. That's good news: there is a lot of open code and open data you can stand on.

### Software you should clone and read before week 3

- **`DephyInc/Actuator-Package`** — Dephy's official Python API (`flexsea`). This is how you read sensor streams and command torque. Start here.
- **`neurobionics/opensourceleg`** — an SDK that wraps Dephy actuators behind a clean, consistent API. `pip install opensourceleg[dephy]`. Docs at neurobionics.github.io/opensourceleg. Likely the fastest path to a working control loop.
- **`neurobionics/Exoboot-Controller-VAS`** — a mid-level controller for EB-51 boots, written for a study that mapped a user's *value landscape* across a range of exoskeleton torques. This is almost exactly your problem shape. Read it closely.
- **`maxshep/Exoboot_Code`** — Max Shepherd's ExoBoot code (Northeastern; co-author on the uncertainty-aware paper below).

---

## 3. The people

### Dr. Nicholas Fey
BS (2006), MS (2008), PhD (2011) in ME, all from UT Austin. Postdoc at Shirley Ryan AbilityLab / Northwestern Feinberg. Now Associate Professor in Walker ME, core faculty in Texas Robotics. Directs the SAHM Lab.

Research spans rehabilitation robotics ∩ neuromuscular biomechanics: lower-limb prostheses and orthoses, intent recognition, optimal control, human-robot interaction, sonomyographic (wearable ultrasound) and myoelectric sensing, and — the recurring theme — **diverse and transient forms of human ambulation**. That last phrase is the through-line of his whole program, and it's why your project's second half exists. Funded by DoD, NIH, NSF (including the National Robotics Initiative).

Contact: nfey@utexas.edu, AHG 2.304MB.

### Finn Eagen
PhD student / Graduate Research Assistant in Walker ME. His stated focus is **applied machine learning for biomechanics and human movement, targeted at control of robotic assistive devices** (prostheses and exoskeletons), including using *mobile/wearable sensors to predict biomechanical objectives outside a traditional lab space*.

That last part matters a lot for you. "Outside the lab" is the same instinct as "variable ambulation scenarios encountered during daily life." Expect him to care about methods that survive contact with the real world, not just treadmill results.

**He is your day-to-day contact.** In FIRE, the grad mentor sets the actual weekly agenda; the faculty member reviews. Optimize for being useful to Finn.

---

## 4. Reading list, in priority order

Read the first three before your first real lab meeting. Skim the rest by week 4.

### Tier 1 — read properly

**1. Lee, Shetty, Franks, Tan, Evangelopoulos, Ha, Rouse (2023). "User preference optimization for control of ankle exoskeletons using sample efficient active learning." *Science Robotics* 8(83).**
This is the closest published ancestor of your project. Ankle exoskeleton, preference-only feedback, real time. Method: an evolutionary algorithm proposes candidate parameter sets, ranked by a **RankNet** neural network pretrained on previously collected human preference data. Results: converged to preferred settings in **43 ± 7 queries**, 88% accuracy vs. randomly generated parameters. Popular writeup framed the interface as "choosing exoskeleton settings like tuning a radio station" — that framing is worth stealing for your poster.
**Bonus: the data is public.** The Dryad dataset (doi:10.5061/dryad.p5hqbzktp, ~712 KB, freely licensed) has 13 subjects × 3 trials of forced-choice comparisons between parameter pairs at 1.2 m/s, in Excel + README. **You can start doing real analysis on this in week 1, before you ever touch a boot.** This is the single highest-leverage thing in this document.

**2. Zhang, Fiers, Witte, Jackson, Poggensee, Atkeson, Collins (2017). "Human-in-the-loop optimization of exoskeleton assistance during walking." *Science* 356:1280–1284.**
The foundational HIL paper. CMA-ES over a 4-parameter ankle torque profile, objective = metabolic rate via indirect calorimetry. 24.2 ± 7.4% metabolic reduction vs. zero torque. But it took **~1+ hour per participant**. Read this specifically to understand *why preference-based methods exist*: metabolic measurement is slow, noisy, expensive, tethered, and — critically — **not what the user actually wants**. Your project is a reaction to this paper's limitations.

**3. Tourk, Galoaa, Shajan, Everett, Young, Shepherd (2025). "Uncertainty-Aware Ankle Exoskeleton Control." arXiv:2508.21221.**
Directly on the Dephy ExoBoot EB60. An ensemble of seven temporal convolutional networks predicts gait phase; a parallel uncertainty estimator classifies incoming sensor data as in-distribution or out-of-distribution. Familiar movement → apply assistive torque. Novel movement → drop to zero assistance for safety. Trained on treadmill walking/jogging at varied speeds and inclines; tested online across level walking, ramps, stairs, jogging, jumping, sit-to-stand, and plyometrics. 97.7% F1 offline, 89.2% online on a novel user.
**This is the state of the art on your "variable ambulation scenarios" half.** Note what it does *not* do: it handles novelty by refusing to help. Your project could ask what happens if, instead, you carry preference knowledge across contexts.

### Tier 2 — skim for method

**4. Ingraham, Remy, Rouse (2022). "The role of user preference in the customized control of robotic exoskeletons." *Science Robotics*.**
Why preference is a legitimate objective at all, and how it relates to (and diverges from) metabolic cost. Also: at faster walking speeds, people are *more precise* at identifying their preferred assistance magnitude — a useful experimental-design fact.

**5. Tucker et al. (2019/2020). "Preference-Based Learning for Exoskeleton Gait Optimization" (arXiv:1909.12316) and "Human Preference-Based Learning for High-dimensional Optimization of Exoskeleton Walking Gaits" (arXiv:2003.06495).**
Introduces **CoSpar**, which asks for pairwise preferences *and* "coactive" suggestions ("make it more like X"). Good example of an algorithm designed around what humans can actually report.

**6. "Rapid Online Learning of Hip Exoskeleton Assistance Preferences" (arXiv:2502.15366, 2025).**
Hip rather than ankle, but the protocol is a clean template you could adapt. Bayesian preference learning via Metropolis-Hastings using the **APReL** library. Six torque-profile features (extension/flexion peak torque, peak time, rise time). Linear reward R(ξ) = wᵀΦ(ξ), soft-max human response model. **Only 12 pairwise comparisons per session**: 20 s on profile A → 5 s rest → 20 s on profile B → verbal preference. Their own stated limitations — single walking speed, linear reward assumption, no energetics — are literally your project's opening.

**7. Slade, Kochenderfer, Delp, Collins (2022). "Personalizing exoskeleton assistance while walking in the real world." *Nature*.**
Data-driven optimization outdoors using wearable sensors instead of a metabolic cart. As effective as lab methods and **4× faster**. The "get out of the lab" argument, and squarely aligned with Finn's stated interest.

**8. "AI-driven universal lower-limb exoskeleton system for community ambulation." *Science Advances*.**
Switches assistance type between locomotion modes and modulates by ground slope, user-independent, no separate mode classifier. Useful as a foil: it generalizes across *contexts* but not across *people's preferences*. Your project sits at the intersection those two literatures leave empty.

---

## 5. Technical background to shore up

Be honest about which of these you already have. The gaps are what to spend September on.

### Biomechanics
- The gait cycle: stance vs. swing, heel strike, mid-stance, push-off, toe-off; everything is parameterized as **% of stride**.
- Ankle kinematics: plantarflexion vs. dorsiflexion; which muscles the boot is offloading (soleus, gastrocnemius) and why push-off is where the energy is.
- **Gait phase estimation** — the core real-time problem. How you turn a noisy IMU + encoder stream into "we are 47% through this stride" so torque lands at the right moment.
- Why ambulation modes differ: stairs, ramps, and level ground have genuinely different ankle moment profiles, not just scaled versions of one another.

### Machine learning / optimization
- **Bayesian optimization** and Gaussian processes — the standard tool for expensive, noisy, low-dimensional black-box objectives. This is the mathematical heart of the project.
- **Preference / dueling models**: Bradley-Terry, the soft-max response model, RankNet. How to build a utility function out of ordinal comparisons.
- **Active learning and acquisition functions** — how the algorithm decides *which* pair to show you next. "Sample efficient" in the Lee et al. title is doing real work; every wasted query is 45 seconds of a participant's patience.
- **CMA-ES** and evolutionary strategies (Zhang et al.'s choice).
- **Contextual bandits / transfer learning / warm-starting** — the tools for part 2. If you learn a preference on level ground, what's the right prior for a ramp?
- Why human feedback is hard: it's **noisy, non-stationary, order-dependent, and subject to habituation**. People change their minds. Design your protocol assuming this.

### Engineering practice
- Python: numpy, scipy, pandas, matplotlib. scikit-learn. PyTorch only if you get to the RankNet-style stuff.
- Real-time loops: sampling rates, latency, why a 500–1000 Hz control loop can't wait on a slow Python callback.
- Reading sensor streams from hardware; logging and timestamping data you can actually analyze later.
- Git, from day one. Three people on one codebase.

---

## 6. Non-technical prep — do not skip

- **Human subjects / IRB.** This is human-subjects research. You will likely need **CITI human subjects research training** completed before you can be listed on a protocol or run participants. Ask Finn about this in your *first* meeting — the certification takes a few hours and the approval paperwork has lead time. This is the most common thing that silently blocks freshmen for a month.
- **Lab safety training** and any required orientation for the SAHM Lab space (AHG).
- **Serving as a pilot participant.** You will almost certainly wear the boot yourself. Expect it, and pay attention to what the experience actually feels like — that intuition is genuinely useful for designing a preference interface.

---

## 7. Course logistics — ME 177K / FIRE

FIRE = Freshman Introduction to Research in Engineering. Invitation-only, semester-long, faculty-sponsored, with a graduate student as direct mentor.

Structure and deliverables to plan around:
- **3–5 laboratory hours + 1 consultation hour with your faculty supervisor per week.**
- A **project proposal** early in the term, and a **final report** — both evaluated by a faculty committee.
- **Bi-weekly lectures** on ME research topics and career paths.
- An **end-of-semester poster session.**
- A **7-minute team presentation with 3 minutes of Q&A**, covering Process, Results, and Deliverables.

Practical read: the proposal is due early enough that you'll be writing it while still learning the field. Having the reading list above already digested is what makes that proposal good instead of vague. And the "Process" framing of the final talk means **document your dead ends** — in a one-semester research project, a well-characterized failure is a legitimate result.

---

## 8. Questions to bring to your first meeting with Finn

Bringing specific questions signals you did the reading. These are ordered so the early ones scope the work.

**Scope**
1. Are we building on the Lee et al. RankNet + evolutionary approach, or exploring Bayesian optimization / CoSpar-style methods as alternatives?
2. Is the deliverable a working real-time controller on the boot, or an offline simulation/analysis study using existing preference data? What does success look like by December?
3. Which torque profile parameters are we tuning — the standard four (peak magnitude, peak timing, rise, fall), or something else?

**Ambulation scenarios**
4. Which specific scenarios are in scope? Treadmill speeds only, or ramps and stairs too?
5. For generalization: are we thinking context-conditioned models, transfer/warm-starting, or per-context re-optimization as a baseline?

**Logistics**
6. Do we need CITI human subjects training, and when should we start it?
7. Which ExoBoot model does the lab have — EB-51 or EB60 — and what's the existing codebase? Are we starting from `opensourceleg`, Dephy's `flexsea` directly, or a lab fork?
8. Is there existing SAHM Lab preference data we can analyze while we're getting up to speed on hardware?
9. How do you want to split work across three of us? (One suggestion: hardware/control, learning algorithm, experimental protocol + analysis — with everyone reading everything.)

**Framing**
10. What's the intended user population — people with mobility impairment, older adults, unimpaired augmentation? It changes the whole framing of "preference."

---

## 9. Concrete plan for the next three weeks

**Week 1 — orient**
- Read Lee et al. 2023 properly. Read Zhang et al. 2017 for context.
- **Download the Dryad dataset** (doi:10.5061/dryad.p5hqbzktp) and load it in Python. Reproduce something simple: plot one subject's parameter trajectory across their forced-choice comparisons. This is real work you can do on day one with no hardware and no IRB.
- Email Finn with your questions from §8. Set a recurring meeting.
- Start CITI training if it's required.

**Week 2 — get technical**
- Read the uncertainty-aware ExoBoot paper (arXiv:2508.21221). Clone `opensourceleg` and `Exoboot-Controller-VAS`; read the control loop even if you can't run it yet.
- Implement a toy 1-D or 2-D preference-based Bayesian optimization in Python against a simulated "user" with a known hidden optimum plus noise. This is the single best way to build intuition for sample efficiency, and it's a figure you can put straight in your proposal.
- Get into the lab. See the boot. Wear it if allowed.

**Week 3 — converge on a proposal**
- Read Tier 2 papers.
- With Finn, pin down the specific question. A one-semester FIRE project needs to be narrow: *"can a preference model learned on level-ground walking warm-start optimization on a 5° incline and cut the number of queries needed?"* is a good shape — falsifiable, measurable, and it slots into the exact gap the literature leaves open.
- Draft the proposal. Set up the shared repo.

---

## 10. Where the real opportunity is

The literature has converged on preference-based tuning working well **in one context** (Lee et al.: 43 queries, one speed, one grade). It has separately converged on mode-aware control working **without personalization** (the Science Advances universal system; the Northeastern uncertainty-aware controller, which handles novelty by *withholding* assistance).

Nobody has cleanly solved: *how do you carry a person's learned preference across contexts without re-running the whole 40-query procedure every time the terrain changes?* If a full re-optimization takes 40 queries and there are six daily-life ambulation modes, that's 240 queries — nobody will do that. Any result that meaningfully reduces that number is a real contribution.

That's your project. It's a good one.

---

## Sources

- [Nick Fey — Walker Dept. of Mechanical Engineering](https://www.me.utexas.edu/people/faculty-directory/fey)
- [Nick Fey — Texas Robotics](https://robotics.utexas.edu/news/230)
- [SAHM Lab at RehabWeek 2025 — Texas Robotics](https://robotics.utexas.edu/news/314)
- [Nicholas P. Fey — Google Scholar](https://scholar.google.com/citations?user=OsTih1gAAAAJ&hl=en)
- [Finn Eagen — LinkedIn](https://www.linkedin.com/in/finn-eagen-2114631a1/)
- [Lee et al., User preference optimization for control of ankle exoskeletons — Science Robotics](https://www.science.org/doi/10.1126/scirobotics.adg3705)
- [Dryad dataset — user preference optimization](https://datadryad.org/dataset/doi:10.5061/dryad.p5hqbzktp)
- [Zhang et al., Human-in-the-loop optimization — Science](https://www.science.org/doi/10.1126/science.aal5054)
- [Ingraham et al., The role of user preference — Science Robotics](https://www.science.org/doi/10.1126/scirobotics.abj3487)
- [Tourk et al., Uncertainty-Aware Ankle Exoskeleton Control — arXiv](https://arxiv.org/html/2508.21221v1)
- [Rapid Online Learning of Hip Exoskeleton Assistance Preferences — arXiv](https://arxiv.org/html/2502.15366v1)
- [Tucker et al., Preference-Based Learning for Exoskeleton Gait Optimization — arXiv](https://arxiv.org/abs/1909.12316)
- [Human Preference-Based Learning for High-dimensional Optimization — arXiv](https://arxiv.org/pdf/2003.06495)
- [Slade et al., Personalizing exoskeleton assistance in the real world — Nature](https://www.nature.com/articles/s41586-022-05191-1)
- [AI-driven universal lower-limb exoskeleton — Science Advances](https://www.science.org/doi/10.1126/sciadv.adq0288)
- [Dephy Sidekick / ExoBoot — Exoskeleton Report](https://exoskeletonreport.com/product/exoboot/)
- [Dephy ankle exoskeletons — Michigan Neurobionics Lab](https://neurobionics.robotics.umich.edu/research/biomechanical-science/dephy-ankle-exoskeletons/)
- [DephyInc/Actuator-Package — GitHub](https://github.com/DephyInc/Actuator-Package)
- [neurobionics/opensourceleg — GitHub](https://github.com/neurobionics/opensourceleg)
- [neurobionics/Exoboot-Controller-VAS — GitHub](https://github.com/neurobionics/Exoboot-Controller-VAS)
- [FIRE program — UT Austin FISD](https://fisd.utexas.edu/grants-fellowships/provosts-teaching-fellows/initiatives/freshman-introduction-research-engineering)
- [ME 177K — UT Austin catalog](https://catalog.utexas.edu/search/?P=M+E+177K)
