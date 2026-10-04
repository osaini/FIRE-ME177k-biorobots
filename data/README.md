# Data

`raw/` holds files exactly as received. Don't edit them; write derived files to `processed/`.

## raw/treadmill/

Instrumented-treadmill force data from the mentor, recorded 2026-09-25. Pandas DataFrames, roughly 100 Hz with **irregular** spacing (2–30 ms between samples).

GRFs are **already filtered** with a 4th-order Butterworth low-pass at **6 Hz**, so don't filter them again. Filter the kinematics at the same 6 Hz before ID. Still unknown: whether it was zero-lag (`filtfilt`) or a single forward pass, which would delay the GRFs slightly. The first few rows ramp up from 0 N, which is likely the filter's start-up transient, so trim them.

| File | Belt speed | Belt on (rel_time) | Duration |
|---|---|---|---|
| `FIRE_0_8_processed.pkl` | 0.8 m/s | 8.6–28.9 s | 34.0 s |
| `FIRE_1_2_processed.pkl` | 1.2 m/s | 2.2–22.2 s | 25.4 s |

Columns:
- `Fx/Fy/Fz_{L,R}`: GRF in N. x = M-L, y = A-P, z = vertical (z is positive up; standing total is about 735 N).
- `Mx/My/Mz_{L,R}`: moments, **in raw amplifier volts** (confirmed by Finn, 2026-10-03: forces were scaled to N, moments were not). Scale them to N·m with Finn's calibration values before computing COP. Reference point (plate origin) still to confirm.
  - Calibration: `bertec_ITC-11-20_calibration.pdf` (Bertec ITC-11-20). At ±5 V and unity gain: Mx (C4) = 800, My (C5) = 400, Mz (C6) = 400 N·m/V. The sheet's header lists "Mz" twice; the first one is Mx. Forces: Fx, Fy = 500 N/V, Fz = 1000 N/V.
  - **Applying these factors as-is gives implausible COP**, even after filtering the moments at 6 Hz to match the forces. A-P travel is about 1.05 m per stance at 0.8 m/s (the belt only moves about 0.6 m per stance), and M-L sway within a stance is about 0.35 m. All of it would be plausible if every moment were about 2.5–3× smaller, which suggests the amplifier gain was not unity (the sheet says the factors are for unity gain). Ask Finn what gain was used and what factor he applied to the forces.
  - Earlier analysis, kept for reference: the values are about ±1. They are **not plain N·m about a surface origin**: Mx/Fz moves only about 1.3 mm per stance, where the expected travel is about 0.33 m at 0.8 m/s and 0.48 m at 1.2 m/s. They are not kN·m either (that would be about 1.3 m, more than the belt moves). The direction and timing do look like real moments (COP moves backward during stance, and the moments are near 0 in swing). The implied scale factor is about 260–300×, which matches no standard unit. Use the expected travel figures above to check the converted moments: COP should move about 0.33 m per stance at 0.8 m/s and about 0.48 m at 1.2 m/s.
- `rel_time`: s since the recording started.
- `world_time`: Unix time, for syncing with mocap.
- `speed`: set belt speed. The belt ramps down slowly, so cut the data where the set speed drops.
- `position_estimate`: currently identical to `speed`, probably a bug.

Load with `pd.read_pickle(...)`; see `notebooks/load_treadmill.ipynb`.

## raw/mocap_angles/

Joint angles in degrees at 60 Hz, 45 angles per file (hip, knee, ankle, upper body, trunk, neck, pelvis). These are overground trials, **not** the treadmill trials, and have no `world_time`.

| File | Duration | Notes |
|---|---|---|
| `sit_stand.csv` | 18.4 s | clean |
| `levelground.csv` | 10.4 s | first 1 s is NaN; more NaN gaps later |
| `ramp.csv` | 13.75 s | includes a turnaround |
| `stairs.csv` | 13.4 s | includes a turnaround |
| `lg_bars.csv` | 10.9 s | tracking glitches around 4.2–6.2 s; NaN gaps |

## processed/

Outputs of `scripts/`, e.g. OpenSim `.mot` GRF files.
