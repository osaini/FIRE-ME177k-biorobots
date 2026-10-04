"""Convert Bertec treadmill force data to OpenSim ground reaction force .mot files.

For each row of the belt-on section: scale the moments from volts to N·m,
compute each foot's force, center of pressure (COP), and free torque, map them
to OpenSim's axes, and write the row to the .mot.

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

from pathlib import Path

import pandas as pd  # type: ignore[reportMissingModuleSource]

ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "data" / "raw" / "treadmill"
OUT_DIR = ROOT / "data" / "processed"

TRIALS = ["FIRE_0_8", "FIRE_1_2"]

# Bertec ITC-11-20 calibration, N·m per volt at ±5 V and unity gain.
MOMENT_CAL = {"Mx": 800.0, "My": 400.0, "Mz": 400.0}

# Amplifier gain. Unknown: ask Finn. COP travel suggests roughly 2.5–3.
MOMENT_GAIN = 1.0

# Depth of the plate origin below the belt surface, in m. Unconfirmed.
PLATE_DZ = 0.0

# (x, y) position of each plate's origin in the lab frame, in m, using the
# plate axes (x = left, y = forward). Unconfirmed.
PLATE_ORIGIN = {"L": (0.0, 0.0), "R": (0.0, 0.0)}

# Below this vertical force (N) the foot counts as off the plate.
FZ_MIN = 20.0

# Seconds to skip after the belt is switched on, while it spins up.
SKIP_START_S = 2.0


def belt_on(df):
    """Keep only the rows where the belt is set to its walking speed."""
    walking = df[df["speed"] > df["speed"].max() - 0.01]
    start = walking["rel_time"].iloc[0]
    return walking[walking["rel_time"] > start + SKIP_START_S]


def cop_and_torque(fx, fy, fz, mx, my, mz, side):
    """Return COP (x, y) and free torque, all in plate axes.

    Solves M_origin = r_cop x F + Tz for r_cop and Tz, with the moments
    measured about a plate origin PLATE_DZ below the surface.
    """
    cx = (-my - PLATE_DZ * fx) / fz
    cy = (mx - PLATE_DZ * fy) / fz
    tz = mz - cx * fy + cy * fx

    ox, oy = PLATE_ORIGIN[side]
    return cx + ox, cy + oy, tz


# OpenSim axes: X = forward, Y = up, Z = right.

def force_to_opensim(fx, fy, fz):
    """Load on the plate (plate axes) to ground reaction force on the foot."""
    return -fy, fz, fx


def point_to_opensim(cx, cy):
    return cy, 0.0, -cx


def torque_to_opensim(tz):
    """Free torque on the plate about down equals torque on the foot about up."""
    return 0.0, tz, 0.0


def foot_columns(row, side):
    """Force, COP, and torque for one foot, in OpenSim axes (9 values)."""
    fx = getattr(row, f"Fx_{side}")
    fy = getattr(row, f"Fy_{side}")
    fz = getattr(row, f"Fz_{side}")

    if fz < FZ_MIN:
        return [0.0] * 9

    mx = getattr(row, f"Mx_{side}") * MOMENT_CAL["Mx"] / MOMENT_GAIN
    my = getattr(row, f"My_{side}") * MOMENT_CAL["My"] / MOMENT_GAIN
    mz = getattr(row, f"Mz_{side}") * MOMENT_CAL["Mz"] / MOMENT_GAIN

    cx, cy, tz = cop_and_torque(fx, fy, fz, mx, my, mz, side)

    force = force_to_opensim(fx, fy, fz)
    point = point_to_opensim(cx, cy)
    torque = torque_to_opensim(tz)
    return [*force, *point, *torque]


def column_names():
    names = ["time"]
    for side in ("r", "l"):
        names += [f"ground_force_{side}_v{a}" for a in "xyz"]
        names += [f"ground_force_{side}_p{a}" for a in "xyz"]
        names += [f"ground_torque_{side}_{a}" for a in "xyz"]
    return names


def convert(trial):
    df = pd.read_pickle(RAW_DIR / f"{trial}_processed.pkl")
    walking = belt_on(df)
    names = column_names()
    out_path = OUT_DIR / f"{trial}_grf.mot"

    with open(out_path, "w", newline="\n") as f:
        f.write(f"{out_path.name}\n")
        f.write("version=1\n")
        f.write(f"nRows={len(walking)}\n")
        f.write(f"nColumns={len(names)}\n")
        f.write("inDegrees=yes\n")
        f.write("endheader\n")
        f.write("\t".join(names) + "\n")

        for row in walking.itertuples(index=False):
            values = [row.rel_time, *foot_columns(row, "R"), *foot_columns(row, "L")]
            f.write("\t".join(f"{v:.6f}" for v in values) + "\n")

    t0, t1 = walking["rel_time"].iloc[[0, -1]]
    print(f"{trial}: {len(walking)} rows, {t0:.2f}-{t1:.2f} s -> {out_path.relative_to(ROOT)}")


if __name__ == "__main__":
    for trial in TRIALS:
        convert(trial)
