"""Convert Bertec treadmill force data to OpenSim ground reaction force .mot files.

Low-pass the moments the same way the forces already are. Then, for each row of
the belt-on section: scale the moments from volts to N·m, compute each foot's
force, center of pressure (COP), and free torque, map them to OpenSim's axes
(turned to the belt's direction), and write the row to the .mot.

Several inputs are still unconfirmed (see data/README.md). They're constants
below so they can be updated without touching the rest of the script.

Plate axes: the force signs match Bertec's native convention, where the data
is the load the foot puts on the plate, with +x = left, +y = forward
(walking direction), and +z = down. Evidence: early stance has +Fy (the foot
pushes the plate forward while braking), the right foot has -Fx (it pushes
the plate outward), and the COP from the moments moves toward -y during stance
as the belt carries the foot back. COP and free torque are computed in these
plate axes and converted to OpenSim's axes at the end.
"""

import math
from pathlib import Path

import numpy as np
import pandas as pd  # type: ignore[reportMissingModuleSource]
from scipy.signal import butter, sosfilt  # type: ignore[reportMissingModuleSource]

ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "data" / "raw" / "treadmill"
OUT_DIR = ROOT / "data" / "processed"

TRIALS = ["FIRE_0_8", "FIRE_1_2"]

# Bertec ITC-11-20 calibration, N·m per volt at ±5 V and unity gain. used to be 800, 400, 400
MOMENT_CAL = {"Mx": 800.0, "My": 400.0, "Mz": 400}

# Amplifier gain. Unknown: ask Finn. With the moments filtered like the forces,
# gain 1 keeps the COP closest to the foot in walking-08 (about 1.4 cm RMS).
MOMENT_GAIN = 1

# Depth of the plate origin below the belt surface, in m. Unconfirmed.
PLATE_DZ = 0.0

# Seconds subtracted from rel_time to line the forces up with the OpenCap
# trial. FIRE_0_8 -> walking-08 is 18.2 s, from the iPhone video timestamp and
# the best COP-to-foot fit (10.85 lines up the contacts too, but it's about six
# strides off and fits half as well). FIRE_1_2 isn't synced to walking-12 yet.
TIME_OFFSET = {"FIRE_0_8": 18.2, "FIRE_1_2": 10.85}

# Time range (after the offset) to keep, matching the ID time range. OpenSim's
# player runs over the whole GRF file, so forces that run past the end of the
# motion drift out of step with it when playback loops. Widen this if the ID
# range grows; ID needs forces over its whole range.
TIME_WINDOW = {"FIRE_0_8": (0.5, 7.4)}

# Direction the belt carries the walker forward in the OpenCap ground frame,
# in degrees from +X toward +Z. From stance-foot velocity in walking-08.
BELT_ANGLE_DEG = 30.2

# (X, Z) position of each plate's origin in OpenSim ground, in m. Fitted so the
# COP stays on the foot in walking-08, so they depend on the gain, time offset,
# and belt angle above. Refit if those change.
PLATE_ORIGIN = {"L": (-0.542, -0.166), "R": (-1.084, 0.803)}

# Below this vertical force (N) the foot counts as off the plate.
FZ_MIN = 45.0

# Seconds to skip after the belt is switched on, while it spins up.
SKIP_START_S = 2.0

# The forces in the pickles were already low-passed with a one-pass (causal)
# 4th-order 6 Hz Butterworth, but the moments weren't. The moments get the same
# filter so they stay in step with the forces. Otherwise COP = M / F spikes at
# heel strike and toe-off, where F is small and changing fast.
FILTER_ORDER = 4
FILTER_CUTOFF_HZ = 6.0

# The samples are irregular, so the filter runs on a uniform grid at this rate.
FILTER_GRID_HZ = 1000.0

# Even after the same filter, the moments trail the forces by about this much,
# so they're shifted earlier. Fitted on walking-08 (the best fits were 20–25 ms).
MOMENT_LEAD_S = 0.020

MOMENTS = [f"{m}_{side}" for m in ("Mx", "My", "Mz") for side in "LR"]


def filter_moments(df):
    """Low-pass the moment columns the way the forces already are, then line them up."""
    t = df["rel_time"].to_numpy()
    grid = np.arange(t[0], t[-1], 1 / FILTER_GRID_HZ)
    sos = butter(FILTER_ORDER, FILTER_CUTOFF_HZ, fs=FILTER_GRID_HZ, output="sos")

    df = df.copy()
    for col in MOMENTS:
        smooth = sosfilt(sos, np.interp(grid, t, df[col].to_numpy()))
        df[col] = np.interp(t + MOMENT_LEAD_S, grid, smooth)
    return df


def belt_on(df):
    """Keep only the rows where the belt is set to its walking speed."""
    walking = df[df["speed"] > df["speed"].max() - 0.01]
    start = walking["rel_time"].iloc[0]
    return walking[walking["rel_time"] > start + SKIP_START_S]


def cop_and_torque(fx, fy, fz, mx, my, mz):
    """Return COP (x, y) relative to the plate origin and free torque, all in plate axes.

    Solves M_origin = r_cop x F + Tz for r_cop and Tz, with the moments
    measured about a plate origin PLATE_DZ below the surface.
    """
    cx = (-my - PLATE_DZ * fx) / fz
    cy = (mx - PLATE_DZ * fy) / fz
    tz = mz - cx * fy + cy * fx
    return cx, cy, tz


# OpenSim axes: X = forward, Y = up, Z = right, before turning to the belt.


def rotate_to_belt(x, z):
    """Turn a horizontal (X, Z) vector so +X points along the belt."""
    a = math.radians(BELT_ANGLE_DEG)
    return x * math.cos(a) - z * math.sin(a), x * math.sin(a) + z * math.cos(a)


def force_to_opensim(fx, fy, fz):
    """Load on the plate (plate axes) to ground reaction force on the foot."""
    x, z = rotate_to_belt(-fy, fx)
    return x, fz, z


def point_to_opensim(cx, cy, side):
    """COP relative to the plate origin (plate axes) to a point in ground."""
    x, z = rotate_to_belt(cy, -cx)
    ox, oz = PLATE_ORIGIN[side]
    return x + ox, 0.0, z + oz


def torque_to_opensim(tz):
    """Free torque on the plate about down equals torque on the foot about up."""
    return 0.0, tz, 0.0


def foot_columns(row, side):
    """One foot in OpenSim axes: (force + COP, 6 values), (torque, 3 values).

    Off the plate, the force and torque are zero and the COP is NaN, to be
    filled in by hold_cop_off_plate.
    """
    fx = getattr(row, f"Fx_{side}")
    fy = getattr(row, f"Fy_{side}")
    fz = getattr(row, f"Fz_{side}")

    if fz < FZ_MIN:
        return [0.0] * 3 + [math.nan] * 3, [0.0] * 3

    mx = getattr(row, f"Mx_{side}") * MOMENT_CAL["Mx"] / MOMENT_GAIN
    my = getattr(row, f"My_{side}") * MOMENT_CAL["My"] / MOMENT_GAIN
    mz = getattr(row, f"Mz_{side}") * MOMENT_CAL["Mz"] / MOMENT_GAIN

    cx, cy, tz = cop_and_torque(fx, fy, fz, mx, my, mz)

    force = force_to_opensim(fx, fy, fz)
    point = point_to_opensim(cx, cy, side)
    torque = torque_to_opensim(tz)
    return [*force, *point], list(torque)


# Right foot has no prefix, left foot is "1_". Order: right force + COP,
# left force + COP, right torque, left torque.
PREFIXES = ("", "1_")


def column_names():
    names = ["time"]
    for prefix in PREFIXES:
        names += [f"{prefix}ground_force_v{a}" for a in "xyz"]
        names += [f"{prefix}ground_force_p{a}" for a in "xyz"]
    for prefix in PREFIXES:
        names += [f"{prefix}ground_torque_{a}" for a in "xyz"]
    return names


def hold_cop_off_plate(out):
    """Fill the COP of a foot that's off the plate with its last COP on it.

    The force is zero then, so the point doesn't matter to ID, but OpenSim
    still draws it, at the ground origin if it's left at 0. Before a foot's
    first contact, its first COP is used instead.
    """
    cols = [f"{prefix}ground_force_p{a}" for prefix in PREFIXES for a in "xyz"]
    out[cols] = out[cols].ffill().bfill()
    return out


def trim(out, start, end):
    """Cut the rows to [start, end], adding rows interpolated at exactly both ends."""
    t = out["time"].to_numpy()
    ends = pd.DataFrame({col: np.interp([start, end], t, out[col]) for col in out.columns})
    inside = out[(out["time"] > start) & (out["time"] < end)]
    return pd.concat([ends.iloc[:1], inside, ends.iloc[1:]], ignore_index=True)


def convert(trial):
    df = filter_moments(pd.read_pickle(RAW_DIR / f"{trial}_processed.pkl"))
    walking = belt_on(df)
    names = column_names()
    out_path = OUT_DIR / f"{trial}_grf.mot"

    rows = []
    for row in walking.itertuples(index=False):
        r_force_cop, r_torque = foot_columns(row, "R")
        l_force_cop, l_torque = foot_columns(row, "L")
        time = row.rel_time - TIME_OFFSET[trial]
        rows.append([time, *r_force_cop, *l_force_cop, *r_torque, *l_torque])
    out = hold_cop_off_plate(pd.DataFrame(rows, columns=names))
    if trial in TIME_WINDOW:
        out = trim(out, *TIME_WINDOW[trial])

    with open(out_path, "w", newline="\n") as f:
        f.write(f"{out_path.name}\n")
        f.write("version=1\n")
        f.write(f"nRows={len(out)}\n")
        f.write(f"nColumns={len(names)}\n")
        f.write("inDegrees=yes\n")
        f.write("endheader\n")
        f.write("\t".join(names) + "\n")

        for values in out.itertuples(index=False):
            f.write("\t".join(f"{v:.6f}" for v in values) + "\n")

    t0, t1 = out["time"].iloc[[0, -1]]
    print(
        f"{trial}: {len(out)} rows, {t0:.2f}-{t1:.2f} s -> {out_path.relative_to(ROOT)}"
    )


if __name__ == "__main__":
    for old in OUT_DIR.glob("*_grf.mot"):
        old.unlink()
        print(f"Removed {old.relative_to(ROOT)}")

    for trial in TRIALS:
        convert(trial)
