const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const fa = require("react-icons/fa");
const fs = require("fs");

const C = {
  ink: "1A1F2B",
  ink2: "2A3140",
  orange: "BF5700",
  orangeLt: "F6E3D6",
  gray: "5B6472",
  grayLt: "F1F3F6",
  line: "D5DAE1",
  white: "FFFFFF",
  blue: "3C6E91",
  blueLt: "E3ECF3",
  green: "3B7D4F",
};
const HEAD = "Arial";
const BODY = "Calibri";

async function icon(Comp, color, px = 256) {
  const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(Comp, { color: "#" + color, size: px }));
  const buf = await sharp(Buffer.from(svg)).resize(px, px).png().toBuffer();
  return "image/png;base64," + buf.toString("base64");
}

(async () => {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5
  pres.title = "Mobile Motion Capture Proposal";
  pres.author = "Oaj Saini, Asiya Sunesara, Tarun Muruganandham";
  const W = 13.333;

  const I = {};
  const need = {
    phone: fa.FaMobileAlt, board: fa.FaChessBoard, eye: fa.FaEye, brain: fa.FaBrain, bone: fa.FaBone,
    walk: fa.FaWalking, run: fa.FaRunning, mountain: fa.FaMountain, tree: fa.FaTree, cogs: fa.FaCogs,
    chart: fa.FaChartLine, check: fa.FaCheck, cube: fa.FaCube, flask: fa.FaFlask, bolt: fa.FaBolt,
    shoe: fa.FaShoePrints, robot: fa.FaRobot, crosshairs: fa.FaCrosshairs, clock: fa.FaClock,
    video: fa.FaVideo, balance: fa.FaBalanceScale, wifi: fa.FaWifi, sun: fa.FaSun, calendar: fa.FaCalendarAlt,
    stairs: fa.FaLevelUpAlt, lab: fa.FaMicroscope, road: fa.FaRoad, file: fa.FaFileAlt, sync: fa.FaSyncAlt,
    users: fa.FaUsers, prof: fa.FaChalkboardTeacher, grad: fa.FaUserGraduate, hourglass: fa.FaHourglassHalf, circle: fa.FaRegCircle,
  };
  for (const [k, comp] of Object.entries(need)) {
    I[k] = { w: await icon(comp, C.white), o: await icon(comp, C.orange), d: await icon(comp, C.ink) };
  }

  // ---------- helpers ----------
  const text = (s, str, o) => s.addText(str, { isTextBox: true, fontFace: BODY, color: C.ink, margin: 0, valign: "top", ...o });
  const title = (s, str, o = {}) => text(s, str, { x: 0.6, y: 0.45, w: 12.1, h: 0.75, fontFace: HEAD, fontSize: 32, bold: true, valign: "middle", ...o });
  const kicker = (s, str, color = C.orange) => text(s, str.toUpperCase(), { x: 0.6, y: 0.2, w: 8, h: 0.3, fontSize: 11, bold: true, color, charSpacing: 2 });
  const pageNum = (s, n, dark = false) => text(s, String(n), { x: 12.33, y: 7.0, w: 0.5, h: 0.25, fontSize: 10, color: dark ? "8A93A3" : C.gray, align: "right" });
  const badge = (s, key, x, y, d = 0.62, fill = C.orange) => {
    s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: fill }, line: { color: fill } });
    const p = d * 0.25;
    s.addImage({ data: I[key].w, x: x + p, y: y + p, w: d - 2 * p, h: d - 2 * p });
  };
  const card = (s, x, y, w, h, fill = C.grayLt) =>
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.08, fill: { color: fill }, line: { color: fill } });
  const line = (s, x1, y1, x2, y2, color, width = 1.5, dash) => {
    const o = { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1) || 0.001, h: Math.abs(y2 - y1) || 0.001, line: { color, width, dashType: dash } };
    if ((x2 - x1) * (y2 - y1) < 0) o.flipV = true;
    s.addShape(pres.shapes.LINE, o);
  };
  const dot = (s, cx, cy, r, color) => s.addShape(pres.shapes.OVAL, { x: cx - r, y: cy - r, w: 2 * r, h: 2 * r, fill: { color }, line: { color } });
  const bullets = (items, o = {}) => items.map((t, i) => {
    const base = typeof t === "string" ? { text: t, options: {} } : t;
    return { text: base.text, options: { bullet: { indent: 16 }, breakLine: i < items.length - 1, paraSpaceAfter: 6, ...o, ...base.options } };
  });

  // walking stick figure made of "markers" — the deck's motif
  const figure = (s, ox, oy, k, markerColor, boneColor) => {
    const P = {
      head: [0.55, 0.0], neck: [0.5, 0.55], shR: [0.62, 0.72], elR: [0.9, 1.35], wrR: [1.12, 1.85],
      shL: [0.38, 0.72], elL: [0.2, 1.35], wrL: [0.02, 1.8], hip: [0.45, 2.05], hipR: [0.55, 2.1], hipL: [0.35, 2.1],
      knR: [0.85, 2.85], anR: [0.75, 3.65], toR: [1.05, 3.72], knL: [0.2, 2.85], anL: [-0.2, 3.5], toL: [-0.05, 3.72],
    };
    const p = (n) => [ox + P[n][0] * k, oy + P[n][1] * k];
    const bones = [["neck", "hip"], ["neck", "shR"], ["neck", "shL"], ["shR", "elR"], ["elR", "wrR"], ["shL", "elL"], ["elL", "wrL"],
      ["hip", "hipR"], ["hip", "hipL"], ["hipR", "knR"], ["knR", "anR"], ["anR", "toR"], ["hipL", "knL"], ["knL", "anL"], ["anL", "toL"]];
    for (const [a, b] of bones) line(s, ...p(a), ...p(b), boneColor, 2.25);
    const [hx, hy] = p("head");
    s.addShape(pres.shapes.OVAL, { x: hx - 0.28 * k, y: hy - 0.28 * k, w: 0.56 * k, h: 0.56 * k, fill: { color: boneColor, transparency: 100 }, line: { color: boneColor, width: 2.25 } });
    for (const n of ["shR", "shL", "elR", "wrR", "elL", "wrL", "hipR", "hipL", "knR", "anR", "toR", "knL", "anL", "toL"]) dot(s, ...p(n), 0.055 * k + 0.015, markerColor);
    return p;
  };

  let n = 0;

  // v6: consistent spacing system.
  // Slide 13.333 x 7.5. Outer margin 0.6 all sides. Header band: kicker y 0.35, title y 0.62.
  // Content box x 0.6-12.73, y 1.7-6.9 (authored as 1.55-6.75 and shifted +0.15 by shiftY).
  // Gutter between cards 0.3; padding inside cards 0.3. Body 24 pt, titles 38 pt.
  const B = 24;
  const DY = 0.15;
  const CW = 12.13;                 // content width
  const col3 = (CW - 2 * 0.3) / 3;  // 3.843
  const col2 = (CW - 0.3) / 2;      // 5.915
  const shiftY = (s, dy) => {
    for (const m of ["addText", "addShape", "addTable"]) {
      const f = s[m].bind(s);
      s[m] = (a, o) => f(a, o && typeof o.y === "number" ? { ...o, y: o.y + dy } : o);
    }
    const fi = s.addImage.bind(s);
    s.addImage = (o) => fi(typeof o.y === "number" ? { ...o, y: o.y + dy } : o);
    return s;
  };
  const newSlide = () => shiftY(pres.addSlide(), DY);
  const K = () => {}; // section kickers removed: they sat inside the top margin and were below the 24 pt rule
  const T = (s, str, o = {}) => title(s, str, { fontSize: 38, x: 0.6, y: 0.6 - DY, w: CW, h: 0.8, valign: "top", ...o });
  const PN = (s, n, dark = false) => text(s, String(n), { x: 12.23, y: 7.02 - DY, w: 0.5, h: 0.3, fontSize: 12, color: dark ? "8A93A3" : C.gray, align: "right" });

  // ---------- 1. Title ----------
  {
    const s = pres.addSlide(); n++;
    s.background = { color: C.ink };
    text(s, "FIRE ME 177K  ·  FALL 2026", { x: 0.6, y: 0.75, w: 7, h: 0.4, fontSize: 18, bold: true, color: C.orange, charSpacing: 2 });
    text(s, "Taking the Motion Capture Lab Anywhere", { x: 0.6, y: 1.35, w: 7.7, h: 2.2, fontFace: HEAD, fontSize: 48, bold: true, color: C.white });
    text(s, "Can two phones replace a lab full of cameras?", { x: 0.6, y: 3.65, w: 7.5, h: 0.9, fontSize: 26, color: "C9CFD9" });
    text(s, [
      { text: "Oaj Saini · Asiya Sunesara · Tarun Muruganandham", options: { bold: true, color: C.white, breakLine: true } },
      { text: "Mentor: Finn Eagen · Faculty: Dr. Nicholas Fey", options: { color: "C9CFD9", breakLine: true } },
      { text: "SAHM Lab · UT Austin Mechanical Engineering", options: { color: "8A93A3" } },
    ], { x: 0.6, y: 5.1, w: 7.7, h: 1.8, fontSize: B, paraSpaceAfter: 6, valign: "bottom" });
    const p = figure(s, 9.85, 1.45, 1.05, C.orange, "6B7485");
    for (const [cx, cy] of [[8.7, 6.28], [12.33, 6.28]]) {
      for (const t of ["hipR", "knR", "shR", "anL"]) line(s, cx + 0.2, cy, ...p(t), "3E4758", 0.75, "dash");
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: cx, y: cy, w: 0.4, h: 0.62, rectRadius: 0.06, fill: { color: C.ink2 }, line: { color: C.orange, width: 1.25 } });
      s.addImage({ data: I.phone.o, x: cx + 0.07, y: cy + 0.12, w: 0.26, h: 0.38 });
    }
    s.addNotes("[~15 s] Hi, we're Oaj, Asiya, and Tarun, working with Finn Eagen and Dr. Fey in the SAHM Lab. Our project asks whether two smartphones can stand in for a motion capture lab.");
  }

  // ---------- 2. Background ----------
  {
    const s = newSlide(); n++;
    K(s, "Background");
    T(s, "Better prostheses start with joint loads");
    const gap = 0.45, bw = (CW - 3 * gap) / 4;
    const flow = [
      ["Joint angles", "cameras", C.orangeLt, C.orange],
      ["Ground forces", "treadmill", C.grayLt, C.ink],
      ["OpenSim", "model", C.ink, C.white],
      ["Joint moments", "hip · knee · ankle", C.orange, C.white],
    ];
    flow.forEach(([h, sub, fill, hc], i) => {
      const x = 0.6 + i * (bw + gap);
      card(s, x, 1.55, bw, 1.35, fill);
      text(s, h, { x: x + 0.15, y: 1.55, w: bw - 0.3, h: 1.35, fontFace: HEAD, fontSize: 26, bold: true, color: hc, align: "center", valign: "middle" });
      text(s, sub, { x, y: 3.0, w: bw, h: 0.45, fontSize: B, color: C.gray, align: "center" });
      if (i < 3) text(s, i === 0 ? "+" : "→", { x: x + bw, y: 1.55, w: gap, h: 1.35, fontSize: 32, bold: true, color: i === 0 ? C.gray : C.orange, align: "center", valign: "middle" });
    });
    card(s, 0.6, 3.75, CW, 1.3, C.orangeLt);
    text(s, [
      { text: "Prosthesis design needs these loads. ", options: { bold: true, color: C.orange } },
      { text: "But the angles still need a lab full of cameras.", options: {} },
    ], { x: 0.9, y: 3.75, w: CW - 0.6, h: 1.3, fontSize: B, valign: "middle" });
    const people = [["prof", "Dr. Nicholas Fey, lab director"], ["grad", "Finn Eagen, graduate mentor"]];
    people.forEach(([ic, t], i) => {
      const x = 0.6 + i * (col2 + 0.3);
      card(s, x, 5.4, col2, 1.35, C.grayLt);
      badge(s, ic, x + 0.3, 5.4 + (1.35 - 0.72) / 2, 0.72, C.ink);
      text(s, t, { x: x + 1.3, y: 5.4, w: col2 - 1.6, h: 1.35, fontSize: B, bold: true, valign: "middle" });
    });
    PN(s, n);
    s.addNotes("[~30 s] We're working in Dr. Nicholas Fey's SAHM Lab with our graduate mentor, Finn Eagen. Lower-limb prostheses are designed around how the hip, knee, and ankle are loaded during natural movement. Inverse dynamics gives us those loads: joint angles from cameras plus ground forces from a force plate go into an OpenSim model, which calculates the joint moments. The joint-angle step is the one that needs a lab full of cameras, and that's the step we're testing.");
  }

  // ---------- 3. Objectives ----------
  {
    const s = newSlide(); n++;
    K(s, "Objectives");
    T(s, "Can phones replace the lab's cameras?");
    const aims = [
      ["crosshairs", "Aim 1", "Joint angles", "Phones vs. Theia3D on the treadmill", "Target: < 5° error"],
      ["bolt", "Aim 2", "Joint moments", "OpenSim with treadmill forces", "Target: r > 0.9"],
      ["mountain", "Aim 3", "Leave the lab", "Ramps, stairs, and outdoors", "Goal: setup guide"],
    ];
    aims.forEach(([ic, a, h, d, tgt], i) => {
      const x = 0.6 + i * (col3 + 0.3), y = 1.55;
      card(s, x, y, col3, 4.45, C.grayLt);
      badge(s, ic, x + 0.3, y + 0.3, 0.72);
      text(s, a, { x: x + 1.2, y: y + 0.3, w: col3 - 1.5, h: 0.72, fontSize: B, bold: true, color: C.orange, valign: "middle" });
      text(s, h, { x: x + 0.3, y: y + 1.3, w: col3 - 0.6, h: 0.55, fontFace: HEAD, fontSize: 28, bold: true });
      text(s, d, { x: x + 0.3, y: y + 1.95, w: col3 - 0.6, h: 1.3, fontSize: B, color: C.gray });
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + 0.3, y: y + 3.45, w: col3 - 0.6, h: 0.7, rectRadius: 0.08, fill: { color: C.white }, line: { color: C.orange, width: 1.25 } });
      text(s, tgt, { x: x + 0.3, y: y + 3.45, w: col3 - 0.6, h: 0.7, fontSize: B, bold: true, color: C.orange, align: "center", valign: "middle" });
    });
    text(s, [{ text: "If time: ", options: { bold: true } }, { text: "ExoBoot pilot", options: { color: C.gray } }], { x: 0.6, y: 6.3, w: 8, h: 0.45, fontSize: B, valign: "bottom" });
    PN(s, n);
    s.addNotes("[~25 s] Our question: are phone-based joint angles close enough to Theia3D to trust for inverse dynamics? Aim 1 compares joint angles, targeting under five degrees of error. Aim 2 compares the joint moments OpenSim computes from each. Aim 3 takes the setup to the terrain park and outdoors, ending in a setup guide the lab can reuse. If time permits, we extend to the ExoBoot.");
  }

  // ---------- 4. Methods: labeled setup diagram ----------
  {
    const s = newSlide(); n++;
    K(s, "Methods");
    T(s, "One walk, recorded by every system");
    const dW = 7.53, rX = 0.6 + dW + 0.3, rW = 12.73 - rX;
    card(s, 0.6, 1.55, dW, 5.2, C.grayLt);
    const cx = 0.6 + dW / 2, cy = 4.275; // treadmill center
    const L = 1.5, R = 0.6 + dW - 0.9;     // left/right device centers (0.55 in from card edge to badge)
    for (const x of [L, R]) line(s, x, 2.2, cx, cy, C.orange, 1.25, "dash");
    for (const x of [L, R]) line(s, x, cy, cx, cy, C.blue, 1.25, "dash");
    // treadmill
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: cx - 0.75, y: 3.25, w: 1.5, h: 2.05, rectRadius: 0.1, fill: { color: C.white }, line: { color: C.gray, width: 1.5 } });
    badge(s, "shoe", cx - 0.35, cy - 0.35, 0.7, C.ink);
    text(s, "Bertec treadmill", { x: cx - 2, y: 5.45, w: 4, h: 0.45, fontSize: B, bold: true, align: "center" });
    text(s, "records forces", { x: cx - 2, y: 5.9, w: 4, h: 0.45, fontSize: B, color: C.gray, align: "center" });
    // phones + checkerboard (top row)
    for (const x of [L, R]) {
      badge(s, "phone", x - 0.35, 1.85, 0.7);
      text(s, "iPhone", { x: x - 0.75, y: 2.65, w: 1.5, h: 0.45, fontSize: B, bold: true, color: C.orange, align: "center" });
    }
    badge(s, "board", cx - 0.35, 1.85, 0.7);
    text(s, "Checkerboard", { x: cx - 1.3, y: 2.65, w: 2.6, h: 0.45, fontSize: B, bold: true, color: C.orange, align: "center" });
    // Theia3D cameras (middle row)
    for (const x of [L, R]) {
      badge(s, "video", x - 0.35, cy - 0.35, 0.7, C.blue);
      text(s, "Theia3D", { x: x - 0.75, y: cy + 0.45, w: 1.5, h: 0.45, fontSize: B, bold: true, color: C.blue, align: "center" });
    }
    // right column
    card(s, rX, 1.55, rW, 5.2, C.ink);
    text(s, "WE COMPARE", { x: rX + 0.3, y: 1.85, w: rW - 0.6, h: 0.4, fontSize: 18, bold: true, color: C.orange, charSpacing: 2 });
    text(s, bullets(["Joint angles (Aim 1)", "Joint moments (Aim 2)", "Synced by a stomp", "OpenCap vs. Theia3D, plus PBL if it runs"], { paraSpaceAfter: 14 }),
      { x: rX + 0.3, y: 2.45, w: rW - 0.6, h: 4.0, fontSize: B, color: C.white });
    PN(s, n);
    s.addNotes("[~35 s] Here's the setup. Every trial is recorded several ways at once. Two iPhones film the treadmill from the front corners, and a checkerboard calibrates where each phone is. The Bertec treadmill records ground forces under each foot, and the lab's Theia3D cameras record the same trials as our reference. We process the video with OpenCap, and with the Portable Biomechanics Lab if we get it running, then compare joint angles and joint moments against Theia3D.");
  }

  // ---------- 5. Progress ----------
  {
    const s = newSlide(); n++;
    K(s, "Progress so far");
    T(s, "OpenCap works; OpenSim is next");
    const cols = [
      ["OpenCap", "Tested with 2+ phones", "slot", "Add OpenCap video"],
      ["OpenSim", "Learning inverse dynamics", "slot", "Add OpenSim screenshot"],
      ["CAD", "Board holder designed", "img", ""],
    ];
    cols.forEach(([h, d, kind, ph], i) => {
      const x = 0.6 + i * (col3 + 0.3);
      if (kind === "slot") {
        s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.55, w: col3, h: 2.8, rectRadius: 0.08, fill: { color: C.grayLt }, line: { color: C.gray, width: 1, dashType: "dash" } });
        text(s, ph, { x: x + 0.3, y: 1.55, w: col3 - 0.6, h: 2.8, fontSize: B, color: C.gray, align: "center", valign: "middle" });
      } else {
        card(s, x, 1.55, col3, 2.8, C.ink);
        const ih = 2.2, iw = ih * 4 / 3, ix = x + (col3 - iw) / 2, iy = 2.0;
        s.addImage({ path: "holder.png", x: ix, y: iy, w: iw, h: ih });
        text(s, "board slot", { x: x + 0.3, y: 1.85, w: 1.4, h: 0.35, fontSize: 20, bold: true, color: C.white, valign: "middle" });
        line(s, x + 1.5, 2.12, ix + iw * 0.47, iy + ih * 0.26, C.white, 1.5);
      }
      s.addShape(pres.shapes.OVAL, { x, y: 4.65, w: 0.55, h: 0.55, fill: { color: C.green }, line: { color: C.green } });
      s.addImage({ data: I.check.w, x: x + 0.14, y: 4.79, w: 0.27, h: 0.27 });
      text(s, h, { x: x + 0.75, y: 4.65, w: col3 - 0.75, h: 0.55, fontFace: HEAD, fontSize: 26, bold: true, valign: "middle" });
      text(s, d, { x, y: 5.3, w: col3, h: 0.5, fontSize: B, color: C.gray });
    });
    text(s, [{ text: "Next: ", options: { bold: true, color: C.orange } }, { text: "laser-guide phone holder, Theia3D training" }], { x: 0.6, y: 6.3, w: CW, h: 0.45, fontSize: B, valign: "bottom" });
    PN(s, n);
    s.addNotes("[~25 s] We've run several OpenCap sessions with two or more phones, and it works end to end. We're learning OpenSim's inverse dynamics workflow. On the CAD side, we designed this holder, which keeps the calibration board upright in the same spot every session. Next up is the laser-guide phone holder and training on Theia3D. (Replace the two dashed boxes with your OpenCap video and an OpenSim screenshot before presenting.)");
  }

  // ---------- 6. Timeline ----------
  {
    const s = newSlide(); n++;
    K(s, "Plan of action");
    T(s, "Timeline");
    const months = [["SEP", 0, 4], ["OCT", 4, 4], ["NOV", 8, 5], ["DEC", 13, 1]];
    const gx = 3.9, gw = 12.73 - gx, cw = gw / 14, gy = 2.0, rh = 0.46;
    months.forEach(([m, st, len], i) => {
      s.addShape(pres.shapes.RECTANGLE, { x: gx + st * cw, y: 1.55, w: len * cw, h: 0.45, fill: { color: i % 2 ? C.ink2 : C.ink }, line: { color: C.white, width: 0.5 } });
      text(s, m, { x: gx + st * cw, y: 1.55, w: len * cw, h: 0.45, fontSize: 20, bold: true, color: C.white, align: "center", valign: "middle" });
    });
    const tasks = [
      ["OpenCap + holder", 0, 2, "done"],
      ["Proposal", 2, 2, "doc", 1],
      ["Training", 2, 4, "core"],
      ["Phone holder", 3, 4, "core", 1],
      ["Aim 1: treadmill", 5, 3, "core"],
      ["Aim 2: OpenSim", 6, 4, "core"],
      ["Aim 3: outdoors", 8, 3, "core", 1],
      ["Analysis", 9, 4, "core", 1],
      ["Poster + report", 11, 3, "doc", 1],
    ];
    const col = { done: "9AA3B0", core: C.orange, doc: C.ink };
    tasks.forEach(([t, st, len, kind, dl], i) => {
      const y = gy + i * rh;
      if (i % 2 === 0) s.addShape(pres.shapes.RECTANGLE, { x: 0.6, y, w: CW, h: rh, fill: { color: C.grayLt }, line: { color: C.grayLt } });
      text(s, t, { x: 0.9, y, w: gx - 1.1, h: rh, fontSize: B, valign: "middle", color: kind === "done" ? C.gray : C.ink });
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: gx + st * cw + 0.04, y: y + 0.09, w: len * cw - 0.08, h: rh - 0.18, rectRadius: 0.1, fill: { color: col[kind] }, line: { color: col[kind] } });
      if (kind === "done") {
        const d = rh - 0.12, bx = gx + (st + len) * cw - 0.04 - d - 0.04;
        s.addShape(pres.shapes.OVAL, { x: bx, y: y + 0.06, w: d, h: d, fill: { color: C.green }, line: { color: C.white, width: 1.5 } });
        s.addImage({ data: I.check.w, x: bx + d * 0.27, y: y + 0.06 + d * 0.27, w: d * 0.46, h: d * 0.46 });
      }
      if (dl) {
        const dx = Math.min(gx + (st + len) * cw, gx + gw - 0.22);
        s.addShape(pres.shapes.DIAMOND, { x: dx - 0.2, y: y + 0.03, w: 0.4, h: 0.4, fill: { color: C.white }, line: { color: C.ink, width: 1.75 } });
      }
    });
    const bottom = gy + tasks.length * rh; // 6.14
    const tx = gx + (2 + 2 / 7) * cw;
    line(s, tx, 2.0, tx, bottom, "C0392B", 1.75, "dash");
    text(s, "today", { x: tx - 0.6, y: bottom + 0.05, w: 1.2, h: 0.4, fontSize: 20, bold: true, color: "C0392B", align: "center" });
    s.addShape(pres.shapes.DIAMOND, { x: 0.9, y: 6.33, w: 0.38, h: 0.38, fill: { color: C.white }, line: { color: C.ink, width: 1.75 } });
    text(s, "= deliverable", { x: 1.4, y: 6.3, w: 2.4, h: 0.45, fontSize: B, valign: "middle" });
    PN(s, n);
    s.addNotes("[~45 s] So here's our timeline. The gray bar up top is what's already done: OpenCap is running and the checkerboard holder is designed. Right now we're wrapping up this proposal, working through the OpenSim tutorial, and starting on the laser-guide phone holder. In October, Finn trains us on Theia3D and the treadmill, and then we start recording with everything at the same time. While that's going, we build the OpenSim pipeline and poke at the PBL code to see if it's worth adding. November, we take the setup out to the terrain park and outdoors, and start crunching numbers. If we're ahead of schedule, we'll try the ExoBoot. December is the poster and the final report. And those diamonds are our five deliverables.");
  }

  // ---------- 7. Team + cost ----------
  {
    const s = newSlide(); n++;
    K(s, "Team & cost estimate");
    T(s, "Three workstreams, low cost");
    const lW = 7.4, rX = 0.6 + lW + 0.3, rW = 12.73 - rX;
    const rows = [["video", "MoCap", "OpenCap, Theia3D, PBL"], ["cube", "CAD", "phone and board holders"], ["cogs", "Sim", "OpenSim inverse dynamics"]];
    const rH = 1.075, gapY = 0.3; // 4 rows fill 1.55-6.75
    rows.forEach(([ic, h, d], i) => {
      const y = 1.55 + i * (rH + gapY);
      card(s, 0.6, y, lW, rH, C.grayLt);
      badge(s, ic, 0.9, y + (rH - 0.7) / 2, 0.7);
      text(s, [{ text: h + "  ", options: { bold: true, fontFace: HEAD, fontSize: 26 } }, { text: d, options: { color: C.gray } }], { x: 1.9, y, w: lW - 1.6, h: rH, fontSize: B, valign: "middle" });
    });
    const wy = 1.55 + 3 * (rH + gapY);
    card(s, 0.6, wy, lW, rH, C.orangeLt);
    badge(s, "calendar", 0.9, wy + (rH - 0.7) / 2, 0.7, C.ink);
    text(s, [{ text: "Weekly  ", options: { bold: true, fontFace: HEAD, fontSize: 26, color: C.orange } }, { text: "check-ins with Finn and Dr. Fey" }], { x: 1.9, y: wy, w: lW - 1.6, h: rH, fontSize: B, valign: "middle" });
    card(s, rX, 1.55, rW, 5.2, C.ink);
    text(s, "~$130", { x: rX + 0.3, y: 1.85, w: rW - 0.6, h: 1.2, fontFace: HEAD, fontSize: 66, bold: true, color: C.orange });
    text(s, "in materials", { x: rX + 0.3, y: 3.05, w: rW - 0.6, h: 0.5, fontSize: B, color: C.white });
    line(s, rX + 0.3, 3.85, rX + rW - 0.3, 3.85, "3E4758", 1);
    text(s, "The lab already owns the expensive equipment. The software is free.", { x: rX + 0.3, y: 4.15, w: rW - 0.6, h: 2.3, fontSize: B, color: "C9CFD9" });
    PN(s, n);
    s.addNotes("[~25 s] We split the work into three streams: motion capture, CAD, and simulation, and we collect data together. We check in with Finn weekly and meet Dr. Fey during the consultation hour. The cost is about 130 dollars: tripods and mounts, about 50; laser levels, 40; PLA filament, 25; and a rigid checkerboard, 15. The lab already has Theia3D, the treadmill, and the terrain park, and OpenCap and OpenSim are free.");
  }

  // ---------- 8. Risks + ask ----------
  {
    const s = newSlide(); n++;
    s.background = { color: C.ink };
    K(s, "Risks & what we need");
    T(s, "Risks and what we need", { color: C.white });
    const lW = 7.4, rX = 0.6 + lW + 0.3, rW = 12.73 - rX;
    const risks = [["sync", "Systems aren't synced", "Stomp to sync"], ["eye", "Phones get blocked", "Test angles early"], ["balance", "Theia3D isn't ground truth", "Report agreement"]];
    const rH = (5.2 - 2 * 0.3) / 3;
    risks.forEach(([ic, h, fix], i) => {
      const y = 1.55 + i * (rH + 0.3);
      card(s, 0.6, y, lW, rH, C.ink2);
      badge(s, ic, 0.9, y + (rH - 0.72) / 2, 0.72, C.ink);
      text(s, [{ text: h, options: { bold: true, color: C.white, breakLine: true } }, { text: "→ " + fix, options: { color: "F2B98F" } }], { x: 1.95, y, w: lW - 1.65, h: rH, fontSize: B, valign: "middle" });
    });
    card(s, rX, 1.55, rW, 5.2, C.ink2);
    text(s, "We need", { x: rX + 0.3, y: 1.85, w: rW - 0.6, h: 0.5, fontSize: B, bold: true, color: C.orange });
    const asks = [["calendar", "Theia3D + Bertec time"], ["lab", "Terrain park access"], ["cube", "~$130 in materials"], ["users", "Your feedback"]];
    asks.forEach(([ic, t], i) => {
      const y = 2.45 + i * 0.8;
      badge(s, ic, rX + 0.3, y, 0.6);
      text(s, t, { x: rX + 1.1, y, w: rW - 1.4, h: 0.6, fontSize: B, color: C.white, valign: "middle" });
    });
    text(s, "Questions?", { x: rX + 0.3, y: 5.75, w: rW - 0.6, h: 0.7, fontFace: HEAD, fontSize: 40, bold: true, color: C.orange, valign: "bottom" });
    PN(s, n, true);
    s.addNotes("[~25 s] Three main risks. The systems aren't synced, so we use a stomp as a shared event. Phones can get blocked, so we test camera angles early. And Theia3D isn't ground truth, so we report agreement rather than accuracy. What we need is time on Theia3D and the treadmill, terrain park access, about 130 dollars, and your feedback. Thank you, any questions?");
  }

  // ---------- 9. Backup: references ----------
  {
    const s = newSlide(); n++;
    K(s, "Backup · references", C.gray);
    T(s, "Sources");
    const refs = [
      "[1] Uhlrich SD et al. OpenCap: Human movement dynamics from smartphone videos. PLOS Comput Biol. 2023.",
      "[2] Kanko RM et al. Concurrent assessment of gait kinematics using marker-based and markerless motion capture. J Biomech. 2021.",
      "[3] Delp SL et al. OpenSim: open-source software to create and analyze dynamic simulations of movement. IEEE TBME. 2007.",
      "[4] Seth A et al. OpenSim: simulating musculoskeletal dynamics and neuromuscular control. PLOS Comput Biol. 2018.",
      "[5] Cotton RJ et al. Portable biomechanics laboratory: movement analysis from a handheld smartphone. 2025.",
      "[6] Bland JM, Altman DG. Statistical methods for assessing agreement between two methods of clinical measurement. Lancet. 1986.",
    ];
    text(s, refs.map((r, i) => ({ text: r, options: { breakLine: i < refs.length - 1, paraSpaceAfter: 8 } })), { x: 0.6, y: 1.55, w: CW, h: 5.2, fontSize: 20 });
    PN(s, n);
    s.addNotes("Backup slide, not presented. Verify every citation on Google Scholar before submitting, especially [5]: fill in the full author list and venue.");
  }

  await pres.writeFile({ fileName: "FIRE-Mobile-Mocap-Proposal.pptx" });
  console.log("wrote", n, "slides");
})();
