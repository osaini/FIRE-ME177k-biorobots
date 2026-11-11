# Treadmill GRFs in OpenSim: how the data is handled and how the force arrows were fixed

- **Trial pair:** OpenCap `walking-08` (motion) and Bertec treadmill `FIRE_0_8` (forces, 0.8 m/s)
- **Code:** `scripts/converter.py`, branch `osaini/review-issue10-28-video`
- **Contact:** Oaj Saini
- **Last updated:** 2026-11-04 (work done 2026-10-14 to 2026-10-28)

## Use this if you're...

- **Running inverse dynamics on walking-08.** Use the GRF file this converter makes (`data/processed/FIRE_0_8_grf.mot`) over 0.5–7.4 s. See section 5.
- **Touching the converter or the treadmill data.** Read section 2 for what each step does, and section 6 for which numbers are measured and which are guesses.
- **Working on the 1.2 m/s trial.** It isn't synced yet, so don't use `FIRE_1_2_grf.mot` for ID (section 7).

## Summary

The GRF arrows in OpenSim didn't stay under the feet. There were five separate causes:

1. **COP spikes at heel strike and toe-off.** The forces had been low-passed by the data provider but the moments hadn't, and COP = moment / force blows up when the force is small.
2. **Sideways drift during stance.** The belt runs 30.2° off OpenCap's X axis, and the converter assumed 0°.
3. **A stray point at the ground origin.** When a foot was off the plate, its COP was written as (0, 0, 0).
4. **Wrong calibration values.** The time offset, moment gain, and plate positions were off.
5. **Drift when playback loops.** The GRF file ran far past both ends of the motion. OpenSim's player runs over the whole file, so the forces fell out of step with the looping skeleton.

All five are fixed in `scripts/converter.py`.

| What changed | Before | After |
|---|---|---|
| Distance from COP to the foot (Fz-weighted RMS) | 6.7–9.9 cm | 1.4 cm |
| Worst distance from COP to the foot | 1.44 m | 0.21 m |
| Pelvis tilt residual | 114 N·m | 54 N·m |
| Pelvis list residual | 45 N·m | 20 N·m |

Still open:

- The pelvis force residuals are 100–155 N RMS, and the arrow fixes didn't change them.
- The amplifier gain and the plate reference point are unconfirmed. Ask Finn.
- The 1.2 m/s trial (`FIRE_1_2`) isn't time-synced yet.

## Quick reference

These are the values the converter uses for walking-08 / FIRE_0_8.

```text
trial_pair          walking-08 (OpenCap)  <->  FIRE_0_8 (Bertec, belt 0.8 m/s)
time_sync           opensim_time = treadmill_rel_time - 18.2 s
belt_direction      30.2 deg from OpenSim +X toward +Z (rotation about vertical)
moment_units_raw    volts (forces are already in N)
moment_scale        N*m = volts * {Mx: 800, My: 400, Mz: 400} / gain, gain = 1 (fitted)
moment_filter       one-pass (causal) 4th-order 6 Hz Butterworth, then shifted 20 ms earlier
foot_on_plate       Fz >= 45 N
plate_origin_R      (X, Z) = (-1.084, 0.803) m in OpenSim ground (fitted)
plate_origin_L      (X, Z) = (-0.542, -0.166) m in OpenSim ground (fitted)
output_time_range   0.500-7.400 s (same as the ID time range)
output_file         data/processed/FIRE_0_8_grf.mot (692 rows x 19 columns)
```

## 1. The inputs

### 1.1 Motion (OpenCap)

- **File:** `walking-08.mot`, joint angles from 0 to 7.933 s: 477 rows at 60 Hz.
- **Model:** `LaiUhlrich2022_scaled.osim`, from the OpenCap session download (`OpenCapData_1bdede03-…/OpenSimData/Model/`).
- **OpenSim ground axes:** X forward, Y up, Z right. OpenCap sets these from its calibration board, so they only match the treadmill if the board was square to the belt. It wasn't (section 3.2).

### 1.2 Forces (Bertec instrumented treadmill)

- **File:** `data/raw/treadmill/FIRE_0_8_processed.pkl`, a pandas DataFrame recorded 2026-09-25.
- **Sampling:** about 100 Hz, with irregular spacing (2–30 ms between samples).
- **Belt at speed:** `rel_time` 8.6–28.9 s.

| Columns | Units | State when we got them |
|---|---|---|
| `Fx/Fy/Fz_{L,R}` | N | Already low-passed: 4th-order 6 Hz Butterworth. We found it was a one-pass (causal) filter, which delays the forces by about 60 ms. |
| `Mx/My/Mz_{L,R}` | raw amplifier volts | Not filtered and not scaled (Finn confirmed this 2026-10-03). |
| `rel_time` | s | Time since the recording started. |
| `world_time` | Unix s | Used to sync with the iPhone video. |
| `speed` | m/s | The set belt speed. |

Plate axes, in Bertec's convention: the numbers are the load the foot puts on the plate, with **+x = left, +y = forward, +z = down**.

Moment calibration, from `data/raw/treadmill/bertec_ITC-11-20_calibration.pdf`: Mx = 800, My = 400, Mz = 400 N·m per volt, at unity amplifier gain. The gain actually used during recording is unknown.

## 2. The pipeline (what converter.py does)

```text
FIRE_0_8_processed.pkl   (forces in N, moments in V, irregular ~100 Hz)
  |
  |  1. filter_moments      one-pass 6 Hz Butterworth on the moments (same as the forces),
  |                         then shift the moments 20 ms earlier
  |  2. belt_on             keep rows with the belt at full speed, skip the first 2 s
  |  3. foot_columns        per row, per foot:
  |                           Fz < 45 N  -> foot off the plate
  |                           volts -> N*m, then COP and free torque in plate axes
  |                           plate axes -> OpenSim axes -> rotate 30.2 deg
  |                           -> add plate origin
  |  4. time                opensim_time = rel_time - 18.2
  |  5. hold_cop_off_plate  off-plate COP = last on-plate COP
  |  6. trim                keep 0.5-7.4 s, with rows interpolated at exactly 0.5 and 7.4
  v
data/processed/FIRE_0_8_grf.mot   (692 rows x 19 columns)
```

### Step 1: Filter the moments (`filter_moments`)

The forces arrive filtered, so the moments get the same filter. The samples are unevenly spaced, so the filter runs on a uniform 1 kHz grid:

```text
grid    = rel_time[0] ... rel_time[-1], every 1 ms
smooth  = sosfilt(butter(order 4, 6 Hz), interp(grid, rel_time, M_volts))  # one pass
M(t)    = interp(t + 0.020 s, grid, smooth)                               # 20 ms earlier
```

The 20 ms shift was found by search, not taken from a spec (section 3.1).

### Step 2: Keep the belt-on section (`belt_on`)

Keep rows where `speed` is within 0.01 m/s of its maximum. Drop the first 2 s of those while the belt spins up.

### Step 3: Compute each foot's force, COP, and torque (`foot_columns`, `cop_and_torque`)

```text
if Fz < 45 N:   force = 0, torque = 0, COP = NaN   (the COP is filled in step 5)

M  = volts * MOMENT_CAL / MOMENT_GAIN     # MOMENT_GAIN = 1
cx = (-My - dz*Fx) / Fz                   # COP, plate axes, from the plate origin
cy = ( Mx - dz*Fy) / Fz                   # dz = PLATE_DZ = 0 (origin depth, assumed)
Tz =  Mz - cx*Fy + cy*Fx                  # free torque about the vertical
```

Next, convert to OpenSim axes. The ground reaction on the foot is the opposite of the load on the plate:

```text
                   OpenSim X (fwd)   Y (up)   Z (right)
force on foot          -Fy             Fz        Fx
COP                     cy             0        -cx
free torque             0              Tz        0
```

Then rotate the horizontal parts by the belt angle, a = 30.2° (`rotate_to_belt`):

```text
X' = X*cos(a) - Z*sin(a)
Z' = X*sin(a) + Z*cos(a)
```

Finally, add the fitted plate origin to the COP: R = (−1.084, 0.803) m and L = (−0.542, −0.166) m in ground (X, Z). The COP's Y is 0, the belt surface. The free torque is about the vertical axis, so the rotation doesn't change it.

### Step 4: Shift the time

`time = rel_time − 18.2`, so treadmill time lines up with walking-08's time (section 3.4).

### Step 5: Fill the off-plate COP (`hold_cop_off_plate`)

Off-plate COP rows are forward-filled from the last on-plate COP. Rows before a foot's first contact are back-filled from its first COP. The force is zero on those rows, so the point doesn't affect ID. It only changes where OpenSim draws the arrow.

### Step 6: Trim (`trim`)

Keep 0.5–7.4 s (`TIME_WINDOW`), the same range ID uses. Rows are interpolated at exactly 0.5 and 7.4 s, so ID has force data right at both ends.

### Output format

The output is a standard OpenSim `.mot` with a 6-line header. The first header line is the name the OpenSim navigator shows (`FIRE_0_8_grf.mot`). There are 19 columns:

```text
time
ground_force_vx/vy/vz    ground_force_px/py/pz       right foot: force (N), COP (m)
1_ground_force_vx/vy/vz  1_ground_force_px/py/pz     left foot:  force (N), COP (m)
ground_torque_x/y/z                                  right foot free torque (N*m)
1_ground_torque_x/y/z                                left foot free torque (N*m)
```

The right foot has no prefix and the left foot is `1_`, matching OpenSim's example files.

## 3. What was wrong, and the fix for each

The problems were found from two screen recordings of the OpenSim GUI, `issue10-28.mp4` (arrows off the feet) and `issue210-28.mp4` (arrows drift on loop).

| # | Symptom in OpenSim | Cause | Fix |
|---|---|---|---|
| 1 | Arrow jumps 0.8–1 m off the foot at contact | Moments not filtered like the forces | Same filter on the moments, plus a 20 ms shift |
| 2 | Arrow slides sideways off the foot during stance | Belt is at 30.2°; the converter assumed 0° | Rotate the forces and COP by 30.2° |
| 3 | Point or arrow at the ground origin | Off-plate COP written as (0, 0, 0) | Hold the last on-plate COP |
| 4 | General misplacement and poor fit | Time offset, gain, and origins wrong | Offset 10.85 → 18.2 s, gain 5 → 1, origins refit |
| 5 | Arrows fall out of step when playback loops | GRF file much longer than the motion | Trim the GRF file to 0.5–7.4 s |

The "before" settings come from the converter version that made the GRF file in `issue10-28.mp4`:

| Setting | Before (10-28 file) | After |
|---|---|---|
| Time offset | 10.85 s | 18.2 s |
| Moment filter | none | one-pass 4th-order 6 Hz Butterworth, 20 ms shift |
| Moment gain | 5 | 1 |
| Belt angle | 0° | 30.2° |
| Plate origins (X, Z) | L (−0.75, 0), R (−1.1, 0) | L (−0.542, −0.166), R (−1.084, 0.803) |
| Off-plate COP | (0, 0, 0) | last on-plate COP |
| File time range | −0.26 to 18.05 s | 0.50 to 7.40 s |

### 3.1 COP spikes at heel strike and toe-off

**Symptom.** The arrow jumped 0.8–1 m from the foot on the first frames of contact.

**Cause.** The COP is a moment divided by a force (cx = −My / Fz). The forces had been filtered, and delayed by the one-pass filter, but the moments were raw. Right at contact, Fz is small (46–48 N on the first sample over the 45 N threshold) and changing fast, so the mismatch between a delayed Fz and an undelayed My gives a huge ratio.

**Fix.** Run the same one-pass filter on the moments. Filtering alone made things worse: the COP-to-foot RMS rose to 8.1 cm, against 5.3 cm with no filter (tested at the old gain of 5). The filtered moments still trailed the forces. A search over time shifts found the best fit at 20–25 ms, so the moments are shifted 20 ms earlier (`MOMENT_LEAD_S`).

**Result.** Over the first 4 samples of each stance, the COP used to move 0.9 m. It now moves about 0.35 m.

### 3.2 Sideways drift during stance (belt angle)

**Symptom.** Over each stance, the arrow slid sideways off the foot. The right COP ended up to 0.33 m lateral of the foot by toe-off.

**Cause.** The converter mapped the plate's forward axis onto OpenSim +X. In OpenCap's ground frame, though, the belt runs 30.2° from +X toward +Z. As the belt carried the foot backward during stance, the COP moved backward along the wrong line.

**How the angle was found.** A foot in stance moves with the belt. The direction of the stance foot's velocity in walking-08 gives the belt direction: 30.2°.

**Fix.** Rotate the force and COP vectors 30.2° about the vertical (`rotate_to_belt`).

**Result.** The COP now stays within 2 cm of the foot's long axis during stance. It moves from 0.35 to 1.32 foot lengths over stance, measured from the heel (0) to the MTP joint (1), so it runs heel to toes as expected.

### 3.3 Point at the ground origin

**Symptom.** The unloaded foot's arrow or point showed up at the ground origin.

**Cause.** When Fz is under 45 N, the old converter wrote the COP as (0, 0, 0). ID ignores it because the force is zero, but the GUI still draws it.

**Fix.** `hold_cop_off_plate` keeps the last on-plate COP instead.

### 3.4 Time offset, moment gain, and plate origins

**Time offset: 10.85 → 18.2 s.** Walking is periodic, so any offset that's a whole number of strides off also lines up the contacts. 10.85 s is about 6 strides away from 18.2 s. Four checks pick 18.2:

- the iPhone video's creation time against the treadmill's `world_time`
- the COP-to-foot fit, about 2× better at 18.2 than at 10.85
- pelvis drift against COP drift
- the lowest ID residuals (2026-10-14 analysis)

**Moment gain: 5 → 1.** With the moments filtered, a gain of 1 keeps the COP closest to the foot. The older guess of 2.5–3 (in `data/README.md`) was based on the unfiltered spikes. Other checks allow anything from about 0.65 to 2, so the true gain is still unconfirmed.

**Plate origins.** These were fitted, not measured:

- The foot was modeled as a line from the heel to the toe tip: the `calcn` origin to `calcn + 1.4 × (toes − calcn)`, from walking-08 forward kinematics.
- Each plate origin was shifted until the COP sat as close as possible to that line, weighting each sample by Fz (an iterative closest-point fit).
- The fit depends on the gain, time offset, and belt angle, so refit if any of those change.

### 3.5 Arrows drift out of step on loop

**Symptom.** With loop playback on, the arrows stopped matching the feet. The Time box read 8.46–9.29 s, past the motion's end, while the skeleton kept walking.

**Cause (from the videos).** OpenSim's player clock runs over the whole time range of the GRF data attached to the motion, not just the motion's range. That GRF file spanned −7.61 to 10.73 s, while the motion is 0–7.93 s, so the skeleton looped back while the forces kept going. The first video shows the same thing: its Time box wrapped from 18.05 to −0.264, the two ends of the 10-28 GRF file.

**Fix.** `trim` cuts FIRE_0_8 to 0.500–7.400 s (`TIME_WINDOW`), the ID range. The forces now stay inside the motion's range. If the ID range changes, widen `TIME_WINDOW` to match.

## 4. Results

### 4.1 COP against the foot (walking-08)

Distance is measured from the COP to the heel–toe-tip line (section 3.4), for samples with Fz of 45 N or more.

| Measure | Before (10-28 file) | After |
|---|---|---|
| Fz-weighted RMS distance | 6.7–9.9 cm (the two feet) | 1.4 cm (each foot) |
| Worst distance | 1.44 m | 0.21 m |
| COP movement over the first 4 samples of stance | 0.9 m | about 0.35 m |
| Sideways COP error mid-stance | up to 0.33 m | under 2 cm |

### 4.2 Inverse dynamics pelvis residuals (0.5–7.4 s, coordinates low-passed at 6 Hz)

Residuals are the extra forces and moments the model needs at the pelvis to match the motion. Lower means the GRFs and the motion agree better.

| Pelvis residual RMS | Before (10-28 file) | Oct 14 hand-aligned file | After (current converter) |
|---|---|---|---|
| Tilt moment | 113.6 N·m | 46.7 N·m | 54.2 N·m |
| List moment | 44.5 N·m | 50.5 N·m | 20.2 N·m |
| Rotation moment | 16.9 N·m | 16.2 N·m | 13.2 N·m |
| Force, X (forward) | 163 N | 155 N | 154.7 N |
| Force, Y (up) | 153 N | 124 N | 123.7 N |
| Force, Z (right) | 104 N | 101 N | 101.1 N |

The moment residuals dropped the most; tilt is a little higher than in the Oct 14 hand-aligned file. The force residuals match the Oct 14 file almost exactly, so the arrow fixes don't explain them (section 7).

## 5. How to use it

### Make the GRF file

The converter needs numpy, pandas, and scipy. From the repo root:

```text
python scripts/converter.py
```

It deletes the old `data/processed/*_grf.mot` and writes `FIRE_0_8_grf.mot` and `FIRE_1_2_grf.mot`. Only the FIRE_0_8 file is ready for ID.

### View it in the OpenSim GUI

1. Load the model and `walking-08.mot`.
2. Under the motion, remove any GRF data already attached.
3. Use **Associate Motion Data** to attach the GRF `.mot`. The navigator lists it as `FIRE_0_8_grf.mot`, the name in the file's first header line.

### Run inverse dynamics

You need an external loads XML that points to the GRF `.mot`. It isn't in the repo yet; ask Oaj for `oaj_08_grf_fixed.xml`, which is the original `oaj_08_grf.xml` with its data file pointed at the new `.mot`.

1. Start from the ID setup with the 0.5–7.4 s range and the 6 Hz coordinate filter (`oaj_08_Setup_InverseDynamics_aligned.xml`, also from Oaj).
2. Set **External loads** to the XML above.
3. Give the output a new name, such as `inverse_dynamics_fixed.sto`.
4. Keep the time range at 0.5–7.4 s. If you widen it, widen `TIME_WINDOW` in the converter too and regenerate, because ID needs forces over its whole range.

## 6. Parameters and how sure we are of each

| Constant in converter.py | Value | Status | Where it came from |
|---|---|---|---|
| `TIME_OFFSET["FIRE_0_8"]` | 18.2 s | Measured and fitted | Video timestamp, COP fit, ID residuals |
| `TIME_OFFSET["FIRE_1_2"]` | 10.85 s | Placeholder | Not synced to walking-12 yet |
| `BELT_ANGLE_DEG` | 30.2° | Measured | Stance-foot velocity in walking-08 |
| `MOMENT_CAL` | 800 / 400 / 400 N·m/V | From the calibration sheet | `bertec_ITC-11-20_calibration.pdf` |
| `MOMENT_GAIN` | 1 | Fitted; unconfirmed | Best COP fit. Ask Finn. |
| `PLATE_ORIGIN` | L (−0.542, −0.166), R (−1.084, 0.803) m | Fitted | COP-to-foot fit. Refit if the gain, offset, or angle changes. |
| `PLATE_DZ` | 0 m | Assumed | Depth of the moment reference point below the belt |
| `FILTER_ORDER`, `FILTER_CUTOFF_HZ` | 4, 6 Hz | Matches the force filter | `data/README.md`; one-pass type inferred from data |
| `MOMENT_LEAD_S` | 0.020 s | Fitted | Best fits at 20–25 ms |
| `FZ_MIN` | 45 N | Chosen | Contact threshold |
| `SKIP_START_S` | 2 s | Chosen | Belt spin-up |
| `TIME_WINDOW["FIRE_0_8"]` | 0.5–7.4 s | Chosen | Same as the ID range |

## 7. Open issues

1. **Pelvis force residuals stay at 100–155 N RMS.** They're the same as with the Oct 14 file, so the arrow fixes didn't touch them. A first thing to check is that the model's mass matches body weight (standing total about 735 N).
2. **The amplifier gain is unknown.** A gain of 1 fits best, but 0.65–2 is plausible. Ask Finn.
3. **The plate reference point is unconfirmed.** The fitted origins are about 1.1 m apart, so the point the moments are measured about may not be what we assume. `PLATE_DZ` is also a guess. Ask Finn for the plate geometry.
4. **FIRE_1_2 isn't usable yet.** It needs its own time sync with walking-12, a trim window, and probably refit origins.
5. **The stance edges are still rough.** Below 100 N the COP sits 5–10 cm off the foot, and it still moves about 0.35 m over the first few samples of contact. This matters little for ID because the force is small there.
6. **The fitting and checking scripts aren't in the repo.** Refitting the origins, gain, or shift means rewriting them, or adding them to `scripts/`.
7. **`data/README.md` is out of date.** It still says the gain is about 2.5–3 and that the filter type is unknown. This report replaces those notes.
8. **The OpenSim setup files aren't in the repo.** The loads XML and ID setup live in Oaj's local OpenSim folder.

## 8. Timeline

| Date | Event |
|---|---|
| 2026-09-25 | Treadmill trials recorded |
| 2026-10-03 | Finn confirms the moments are raw volts |
| 2026-10-14 | First registration by hand. Found the 18.2 s offset, the 30.2° belt angle, and the one-pass filter. Pelvis moment residuals fell from about 70,000 to about 50 N·m RMS. |
| 2026-10-28 | First screen recording reviewed; fixes 1–4 added to `converter.py`. |
| 2026-10-28 | Second screen recording reviewed; fix 5 (trim) added. |

## Glossary

- **GRF**: ground reaction force, the force the ground puts on the foot.
- **COP**: center of pressure, the point on the ground where the GRF acts. Computed as moment / force, so it's unreliable when the force is small.
- **Free torque**: the twisting torque about the vertical axis at the COP.
- **ID**: inverse dynamics, which computes joint moments from motion plus external forces.
- **Residuals**: forces and moments ID has to add at the pelvis to make the motion and the GRFs agree. Ideally near zero.
- **One-pass (causal) filter**: a filter run forward only, as with `sosfilt`. It delays the signal. A zero-lag filter (`filtfilt`) runs forward and backward and doesn't delay it.
- **`.mot`**: OpenSim's tab-separated time-series format with a short header.
