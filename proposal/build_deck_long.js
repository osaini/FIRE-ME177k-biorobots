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
    users: fa.FaUsers, hourglass: fa.FaHourglassHalf, circle: fa.FaRegCircle,
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

  // ---------- 1. Title ----------
  {
    const s = pres.addSlide(); n++;
    s.background = { color: C.ink };
    text(s, "FIRE ME 177K  ·  BIOMECHANICS  ·  FALL 2026", { x: 0.7, y: 0.7, w: 7, h: 0.3, fontSize: 12, bold: true, color: C.orange, charSpacing: 2 });
    text(s, "Taking the Motion Capture Lab Anywhere", { x: 0.7, y: 1.35, w: 7.4, h: 2.0, fontFace: HEAD, fontSize: 44, bold: true, color: C.white, valign: "top" });
    text(s, "Validating a two-smartphone OpenCap setup against the lab's Theia3D system, from the treadmill to the outdoors", { x: 0.7, y: 3.45, w: 6.9, h: 0.9, fontSize: 18, color: "C9CFD9" });
    text(s, [
      { text: "Oaj Saini  ·  Asiya Sunesara  ·  Tarun Muruganandham", options: { bold: true, color: C.white, breakLine: true } },
      { text: "Graduate mentor: Finn Eagen   |   Faculty: Dr. Nicholas P. Fey", options: { color: "C9CFD9", breakLine: true } },
      { text: "SAHM Lab, Walker Department of Mechanical Engineering, UT Austin", options: { color: "8A93A3" } },
    ], { x: 0.7, y: 5.3, w: 7.5, h: 1.2, fontSize: 14, paraSpaceAfter: 4 });
    // figure between two "cameras"
    const p = figure(s, 9.75, 1.55, 1.05, C.orange, "6B7485");
    const cams = [[8.55, 5.95], [12.1, 5.95]];
    const targets = ["hipR", "knR", "shR", "anL"];
    for (const [cx, cy] of cams) {
      for (const t of targets) line(s, cx + 0.2, cy, ...p(t), "3E4758", 0.75, "dash");
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: cx, y: cy, w: 0.4, h: 0.62, rectRadius: 0.06, fill: { color: C.ink2 }, line: { color: C.orange, width: 1.25 } });
      s.addImage({ data: I.phone.o, x: cx + 0.07, y: cy + 0.12, w: 0.26, h: 0.38 });
    }
    s.addNotes("Open with the one-line pitch: lab motion capture is accurate but stuck in one room; we want to find out if two phones running OpenCap are good enough to take it anywhere. Introduce the team and mentors.");
  }

  // ---------- 2. Abstract ----------
  {
    const s = pres.addSlide(); n++;
    kicker(s, "Abstract");
    title(s, "The project in one slide");
    card(s, 0.6, 1.55, 7.3, 5.2, C.grayLt);
    text(s, [
      { text: "Lab motion capture measures joint mechanics well, but it is expensive, slow to set up, and fixed to one room. ", options: {} },
      { text: "OpenCap", options: { bold: true } },
      { text: " estimates 3D movement from as few as two smartphone videos, which could let the SAHM Lab study people on ramps, stairs, and outdoors.", options: { breakLine: true } },
      { text: " ", options: { breakLine: true, fontSize: 8 } },
      { text: "We will test a two-phone OpenCap setup against the lab's Theia3D markerless system, add Bertec treadmill forces to compute joint moments in OpenSim, and then take the setup out to the terrain park and outdoors.", options: { breakLine: true } },
      { text: " ", options: { breakLine: true, fontSize: 8 } },
      { text: "The result is a validated protocol, a processed dataset, and a setup guide the lab can reuse.", options: { bold: true, color: C.orange } },
    ], { x: 0.95, y: 1.75, w: 6.6, h: 4.8, valign: "middle", fontSize: 17, paraSpaceAfter: 2, lineSpacingMultiple: 1.1 });
    const aims = [
      ["crosshairs", "Aim 1 · Validate", "Joint angles from OpenCap vs. Theia3D on the treadmill"],
      ["bolt", "Aim 2 · Add kinetics", "OpenCap + Bertec forces → OpenSim inverse dynamics"],
      ["mountain", "Aim 3 · Leave the lab", "Terrain park and outdoor captures"],
    ];
    aims.forEach(([ic, h, d], i) => {
      const y = 1.55 + i * 1.8;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 8.3, y, w: 4.43, h: 1.6, rectRadius: 0.08, fill: { color: C.white }, line: { color: C.line, width: 1 } });
      badge(s, ic, 8.55, y + 0.45);
      text(s, h, { x: 9.4, y: y + 0.3, w: 3.15, h: 0.4, fontFace: HEAD, fontSize: 16, bold: true });
      text(s, d, { x: 9.4, y: y + 0.72, w: 3.15, h: 0.7, fontSize: 14, color: C.gray });
    });
    pageNum(s, n);
    s.addNotes("This is the abstract from the lecture's proposal structure. If a reviewer only reads one slide, it should be this one: the problem, what we will do (three aims), and what the lab gets at the end.");
  }

  // ---------- 3. Problem ----------
  {
    const s = pres.addSlide(); n++;
    kicker(s, "Problem & rationale");
    title(s, "Good biomechanics data is stuck in the lab");
    const cols = [
      { x: 0.6, head: "Lab motion capture today", fill: C.grayLt, hc: C.ink, ic: "lab", rows: [
        ["Hardware", "Many synchronized cameras, force plates, dedicated space"],
        ["Setup", "Fixed install; people come to the lab"],
        ["Tasks", "Limited to what fits in the capture volume"],
        ["Reach", "Hard to use in clinics, homes, or real terrain"],
      ] },
      { x: 6.85, head: "What smartphone capture could offer", fill: C.orangeLt, hc: C.orange, ic: "phone", rows: [
        ["Hardware", "Two iPhones, tripods, a printed checkerboard"],
        ["Setup", "Minutes, anywhere with Wi-Fi"],
        ["Tasks", "Ramps, stairs, sidewalks, open ground"],
        ["Reach", "Free, open-source, cloud-processed"],
      ] },
    ];
    for (const c of cols) {
      card(s, c.x, 1.55, 5.9, 4.3, c.fill);
      badge(s, c.ic, c.x + 0.3, 1.8, 0.6, c.hc);
      text(s, c.head, { x: c.x + 1.1, y: 1.85, w: 4.6, h: 0.5, fontFace: HEAD, fontSize: 18, bold: true, color: c.hc, valign: "middle" });
      c.rows.forEach(([k, v], i) => {
        const y = 2.75 + i * 0.75;
        text(s, k, { x: c.x + 0.35, y, w: 1.2, h: 0.6, fontSize: 14, bold: true, color: C.gray });
        text(s, v, { x: c.x + 1.6, y, w: 4.1, h: 0.6, fontSize: 15 });
      });
    }
    card(s, 0.6, 6.05, 12.15, 0.8, C.ink);
    text(s, [
      { text: "The open question: ", options: { bold: true, color: C.orange } },
      { text: "is a two-phone setup accurate enough to trust for the lab's own studies? We need to check it against the system we already rely on.", options: { color: C.white } },
    ], { x: 0.9, y: 6.12, w: 11.6, h: 0.66, fontSize: 15, valign: "middle" });
    pageNum(s, n);
    s.addNotes("Rationale. The lecture says reviewers decide on the first page, so lead with the problem, not the tools. Keep the comparison qualitative; we are not claiming exact costs.");
  }

  // ---------- 4. Background: OpenCap ----------
  {
    const s = pres.addSlide(); n++;
    kicker(s, "Background");
    title(s, "How OpenCap turns two videos into joint angles");
    const steps = [
      ["board", "Calibrate", "Checkerboard gives each phone's position"],
      ["video", "Record", "2+ iPhones film the same movement"],
      ["eye", "Detect", "Pose model finds body keypoints per frame"],
      ["brain", "Augment", "Neural net predicts a full anatomical marker set"],
      ["bone", "Solve", "OpenSim scales a model and runs inverse kinematics"],
    ];
    const bw = 2.2, gap = 0.29, x0 = 0.6, y0 = 1.65;
    steps.forEach(([ic, h, d], i) => {
      const x = x0 + i * (bw + gap);
      card(s, x, y0, bw, 2.55, i === 0 ? C.orangeLt : C.grayLt);
      badge(s, ic, x + (bw - 0.66) / 2, y0 + 0.3, 0.66);
      text(s, `${i + 1}. ${h}`, { x: x + 0.15, y: y0 + 1.1, w: bw - 0.3, h: 0.4, fontFace: HEAD, fontSize: 16, bold: true, align: "center" });
      text(s, d, { x: x + 0.15, y: y0 + 1.55, w: bw - 0.3, h: 0.9, fontSize: 13, color: C.gray, align: "center" });
      if (i < steps.length - 1) text(s, "›", { x: x + bw, y: y0 + 0.95, w: gap, h: 0.5, fontSize: 28, bold: true, color: C.orange, align: "center", valign: "middle" });
    });
    text(s, "Our checkerboard holder supports step 1", { x: 0.6, y: 4.28, w: 4, h: 0.3, fontSize: 11, italic: true, color: C.orange });
    // stat callouts
    text(s, "Reported by the OpenCap developers against marker-based motion capture [1]", { x: 0.6, y: 4.8, w: 8, h: 0.35, fontSize: 13, bold: true, color: C.gray });
    const stats = [["4.5°", "mean absolute error,\njoint angles"], ["6.2%", "of body weight,\nground reaction force error"], ["1.2%", "of body weight × height,\njoint moment error"]];
    stats.forEach(([big, lab], i) => {
      const x = 0.6 + i * 2.75;
      text(s, big, { x, y: 5.2, w: 2.6, h: 0.85, fontFace: HEAD, fontSize: 44, bold: true, color: C.orange });
      text(s, lab, { x, y: 6.05, w: 2.6, h: 0.7, fontSize: 12, color: C.gray });
    });
    card(s, 9.05, 4.8, 3.7, 1.95, C.blueLt);
    text(s, [
      { text: "Our reference: Theia3D", options: { bold: true, color: C.blue, breakLine: true } },
      { text: "The lab's current markerless system. It uses many synchronized lab cameras and has published validation against markers [2].", options: {} },
    ], { x: 9.3, y: 4.95, w: 3.25, h: 1.65, fontSize: 14, paraSpaceAfter: 4, valign: "middle" });
    pageNum(s, n);
    s.addNotes("Walk the pipeline left to right. Numbers are from Uhlrich et al. 2023 (PLOS Comp Bio); double-check them against the paper before presenting. Point out that the OpenCap validation was against markers in the developers' lab. Our contribution is checking it against Theia3D in our lab, on our tasks.");
  }

  // ---------- 5. Research question & aims ----------
  {
    const s = pres.addSlide(); n++;
    s.background = { color: C.ink };
    kicker(s, "Research question");
    text(s, "Can two phones running OpenCap match the lab's Theia3D system closely enough to take gait studies out of the lab?", { x: 0.6, y: 0.8, w: 12.1, h: 1.45, fontFace: HEAD, fontSize: 28, bold: true, color: C.white, valign: "middle" });
    const aims = [
      ["crosshairs", "Aim 1", "Validate kinematics", "Record treadmill walking and jogging with OpenCap and Theia3D at the same time. Compare hip, knee, and ankle angles.", "Hypothesis: sagittal-plane angles agree within 5° mean absolute error."],
      ["bolt", "Aim 2", "Add kinetics", "Feed OpenCap kinematics and Bertec treadmill forces into OpenSim inverse dynamics. Compare joint moments to the Theia3D pipeline.", "Hypothesis: moment curves match in shape (r > 0.9) with small peak differences."],
      ["mountain", "Aim 3", "Leave the lab", "Repeat captures on ramps and stairs in the terrain park and outdoors. Log setup time, failures, and data quality.", "Goal: a setup guide the lab can follow without us."],
    ];
    aims.forEach(([ic, a, h, d, hyp], i) => {
      const x = 0.6 + i * 4.1;
      card(s, x, 2.75, 3.85, 3.45, C.ink2);
      badge(s, ic, x + 0.3, 3.0, 0.66);
      text(s, a.toUpperCase(), { x: x + 1.15, y: 3.03, w: 2.5, h: 0.28, fontSize: 12, bold: true, color: C.orange, charSpacing: 2 });
      text(s, h, { x: x + 1.15, y: 3.31, w: 2.6, h: 0.4, fontFace: HEAD, fontSize: 19, bold: true, color: C.white });
      text(s, d, { x: x + 0.3, y: 3.95, w: 3.3, h: 1.4, fontSize: 14, color: "C9CFD9" });
      text(s, hyp, { x: x + 0.3, y: 5.2, w: 3.3, h: 0.8, fontSize: 13, italic: true, color: "F2B98F" });
    });
    pageNum(s, n, true);
    s.addNotes("Aims are ordered by priority: Aim 1 must happen, Aim 2 builds on it, Aim 3 is the payoff. The 5° hypothesis comes from the OpenCap paper's 4.5° error vs markers; agree the exact thresholds with Finn.");
  }

  // ---------- 6. Progress ----------
  {
    const s = pres.addSlide(); n++;
    kicker(s, "Progress so far");
    title(s, "We already have OpenCap running");
    const done = [
      [true, "Two-phone OpenCap session", "Calibrated, recorded, and processed a capture with two cameras"],
      [true, "Checkerboard holder", "Designed in SolidWorks, sliced for PLA: 114 layers, about 50 min, 31 g"],
      [true, "Scope set with Finn (9/9)", "Main project: mobile motion capture; side projects listed"],
      [false, "Project proposal", "This document: aims, plan, budget, timeline"],
      [false, "Theia3D + Bertec training", "Next step before any concurrent collection"],
    ];
    done.forEach(([ok, h, d], i) => {
      const y = 1.6 + i * 1.0;
      s.addShape(pres.shapes.OVAL, { x: 0.6, y: y + 0.05, w: 0.5, h: 0.5, fill: { color: ok ? C.green : C.white }, line: { color: ok ? C.green : C.line, width: 1.5 } });
      if (ok) s.addImage({ data: I.check.w, x: 0.72, y: y + 0.17, w: 0.26, h: 0.26 });
      text(s, h, { x: 1.35, y, w: 5.2, h: 0.38, fontFace: HEAD, fontSize: 16, bold: true, color: ok ? C.ink : C.gray });
      text(s, d, { x: 1.35, y: y + 0.4, w: 5.3, h: 0.45, fontSize: 13, color: C.gray });
    });
    card(s, 7.0, 1.55, 5.75, 5.2, C.ink);
    const img = { w: 1600, h: 1200 };
    const iw = 5.2, ih = iw * img.h / img.w;
    s.addImage({ path: "holder.png", x: 7.27, y: 1.8, w: iw, h: ih });
    text(s, "Checkerboard holder, rendered from our print file", { x: 7.3, y: 1.8 + ih + 0.1, w: 5.2, h: 0.35, fontSize: 12, color: "C9CFD9", italic: true });
    text(s, "Holds the calibration board upright and repeatable between sessions", { x: 7.3, y: 1.8 + ih + 0.45, w: 5.2, h: 0.35, fontSize: 12, color: "8A93A3" });
    pageNum(s, n);
    s.addNotes("Show we are not starting from zero. If you have them, swap in or add a photo of the printed holder and a screenshot of the OpenCap skeleton from your two-camera session. Real photos help more than any render.");
  }

  // ---------- 7. Aim 1 methods ----------
  {
    const s = pres.addSlide(); n++;
    kicker(s, "Plan · Aim 1");
    title(s, "Record once, measure with both systems");
    const steps = [
      ["phone", "Set up", ["2 iPhones on tripods, about 45° to either side of the treadmill", "Same capture volume as Theia3D cameras", "Checkerboard calibration each session"]],
      ["run", "Collect", ["Participants: our team (n = 3)", "Walk at slow, preferred, and fast speeds; jog", "3 trials × 30 s per condition", "Stomp at trial start to sync systems"]],
      ["chart", "Compare", ["Align trials on the stomp event", "Split into gait cycles, normalize 0–100%", "Compute agreement metrics (right)"]],
    ];
    steps.forEach(([ic, h, items], i) => {
      const y = 1.55 + i * 1.75;
      card(s, 0.6, y, 6.9, 1.6, C.grayLt);
      badge(s, ic, 0.85, y + 0.2, 0.6);
      text(s, `${i + 1}. ${h}`, { x: 0.85, y: y + 0.9, w: 1.4, h: 0.4, fontFace: HEAD, fontSize: 15, bold: true });
      text(s, bullets(items), { x: 2.3, y: y + 0.18, w: 5.0, h: 1.3, fontSize: 13, paraSpaceAfter: 3 });
    });
    // metrics table
    const hdr = (t) => ({ text: t, options: { bold: true, color: C.white, fill: { color: C.ink }, fontSize: 13 } });
    const rows = [
      [hdr("Metric"), hdr("What it tells us")],
      ["Mean absolute error, RMSE", "Average angle disagreement (°)"],
      ["Waveform correlation (r)", "Do the curves have the same shape?"],
      ["Bland–Altman limits [6]", "Bias and spread of peak angles"],
      ["Stride time, cadence", "Spatiotemporal agreement"],
    ].map((r, i) => i === 0 ? r : r.map((c) => ({ text: c, options: { fontSize: 13, fill: { color: i % 2 ? C.white : C.grayLt } } })));
    text(s, "Joints: hip, knee, ankle (sagittal); hip frontal and transverse", { x: 7.85, y: 1.55, w: 4.9, h: 0.55, fontSize: 13, bold: true, color: C.orange });
    s.addTable(rows, { x: 7.85, y: 2.15, w: 4.9, colW: [2.3, 2.6], fontFace: BODY, color: C.ink, border: { type: "solid", pt: 0.75, color: C.line }, rowH: 0.5, margin: 0.08 });
    card(s, 7.85, 5.05, 4.9, 1.6, C.blueLt);
    text(s, [
      { text: "Framing: ", options: { bold: true, color: C.blue } },
      { text: "Theia3D is also an estimate, not ground truth. We report agreement between two systems and lean on Theia3D's published marker validation [2] for context.", options: {} },
    ], { x: 8.1, y: 5.15, w: 4.45, h: 1.5, fontSize: 14, valign: "middle" });
    pageNum(s, n);
    s.addNotes("Confirm with Finn: whether the lab's existing IRB covers team members as participants, treadmill speeds, and whether Theia3D cameras can see around the treadmill handrails. The stomp gives a sharp vertical ankle event both systems can see.");
  }

  // ---------- 8. Aim 2 pipeline ----------
  {
    const s = pres.addSlide(); n++;
    kicker(s, "Plan · Aim 2");
    title(s, "Same forces, two kinematic sources");
    const box = (x, y, w, h, head, sub, fill, hc = C.ink, sc = C.gray) => {
      card(s, x, y, w, h, fill);
      text(s, head, { x: x + 0.2, y: y + 0.15, w: w - 0.4, h: 0.4, fontFace: HEAD, fontSize: 15, bold: true, color: hc });
      text(s, sub, { x: x + 0.2, y: y + 0.55, w: w - 0.4, h: h - 0.65, fontSize: 12, color: sc });
    };
    // left inputs
    box(0.6, 1.6, 3.2, 1.35, "OpenCap", "Scaled model + joint angles (.osim, .mot)", C.orangeLt, C.orange);
    box(0.6, 3.25, 3.2, 1.35, "Bertec treadmill", "Ground reaction forces + center of pressure, filtered", C.grayLt);
    box(0.6, 4.9, 3.2, 1.35, "Theia3D", "Joint angles from the lab system", C.blueLt, C.blue);
    // ID blocks
    box(5.0, 2.05, 3.1, 1.4, "Inverse dynamics A", "OpenSim ID with OpenCap kinematics", C.ink, C.white, "C9CFD9");
    box(5.0, 4.4, 3.1, 1.4, "Inverse dynamics B", "OpenSim ID with Theia3D kinematics", C.ink, C.white, "C9CFD9");
    const arrow = (x1, y1, x2, y2, color = C.gray) => s.addShape(pres.shapes.LINE, { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1) || 0.001, h: Math.abs(y2 - y1) || 0.001, flipV: (x2 - x1) * (y2 - y1) < 0, line: { color, width: 1.75, endArrowType: "triangle" } });
    arrow(3.8, 2.27, 5.0, 2.6, C.orange);
    arrow(3.8, 3.8, 5.0, 2.9);
    arrow(3.8, 4.0, 5.0, 4.85);
    arrow(3.8, 5.57, 5.0, 5.2, C.blue);
    // output
    box(9.3, 3.0, 3.45, 1.85, "Compare joint moments", "Hip, knee, ankle moments (% body weight × height), scored with the Aim 1 metrics", C.grayLt);
    arrow(8.1, 2.75, 9.3, 3.6);
    arrow(8.1, 5.1, 9.3, 4.3);
    text(s, [
      { text: "Why this design: ", options: { bold: true, color: C.orange } },
      { text: "both pipelines get identical force data, so any difference in joint moments comes from the kinematics alone.", options: {} },
    ], { x: 0.6, y: 6.45, w: 12.1, h: 0.45, fontSize: 14 });
    pageNum(s, n);
    s.addNotes("This is the Bertec + OpenSim piece from Finn's list. The hard part is syncing Bertec forces with phone video; the stomp event from Aim 1 shows up in both. If time allows, compare OpenCap's own video-only force estimate to the measured Bertec forces.");
  }

  // ---------- 9. Aim 3 environments ----------
  {
    const s = pres.addSlide(); n++;
    kicker(s, "Plan · Aim 3");
    title(s, "Three environments, increasing difficulty");
    const envs = [
      ["walk", "Treadmill", "Lab", ["Walking speeds + jogging", "Reference: Theia3D + Bertec"], ["Angles", "Moments"]],
      ["stairs", "Terrain park", "Lab", ["Ramps and stairs", "Reference: Theia3D where cameras reach"], ["Angles"]],
      ["tree", "Outdoors", "Campus", ["Sidewalk and slope walking", "No reference: OpenCap only"], ["Angles", "Setup data"]],
    ];
    envs.forEach(([ic, h, where, items, tags], i) => {
      const x = 0.6 + i * 4.1;
      card(s, x, 1.55, 3.85, 3.1, i === 2 ? C.orangeLt : C.grayLt);
      badge(s, ic, x + 0.3, 1.8, 0.7, i === 2 ? C.orange : C.ink);
      text(s, h, { x: x + 1.2, y: 1.82, w: 2.5, h: 0.4, fontFace: HEAD, fontSize: 20, bold: true });
      text(s, where, { x: x + 1.2, y: 2.22, w: 2.5, h: 0.3, fontSize: 12, color: C.gray });
      text(s, bullets(items), { x: x + 0.3, y: 2.8, w: 3.3, h: 1.2, fontSize: 14 });
      tags.forEach((t, j) => {
        const tx = x + 0.3 + j * 1.3;
        s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: tx, y: 3.95, w: 1.18, h: 0.4, rectRadius: 0.2, fill: { color: C.white }, line: { color: C.orange, width: 1 } });
        text(s, t, { x: tx, y: 3.95, w: 1.18, h: 0.4, fontSize: 12, bold: true, color: C.orange, align: "center", valign: "middle" });
      });
    });
    // difficulty arrow
    s.addShape(pres.shapes.LINE, { x: 0.6, y: 5.0, w: 12.1, h: 0, line: { color: C.line, width: 2, endArrowType: "triangle" } });
    text(s, "less control, more real-world", { x: 9.2, y: 5.07, w: 3.5, h: 0.3, fontSize: 11, italic: true, color: C.gray, align: "right" });
    text(s, "What we log every session", { x: 0.6, y: 5.55, w: 4, h: 0.35, fontSize: 15, bold: true });
    const logs = [["clock", "Setup + calibration time"], ["check", "% of trials that process"], ["sun", "Lighting and failure notes"]];
    logs.forEach(([ic, t], i) => {
      const x = 0.6 + i * 4.1;
      badge(s, ic, x, 6.05, 0.5, C.ink);
      text(s, t, { x: x + 0.65, y: 6.05, w: 3.3, h: 0.5, fontSize: 15, valign: "middle" });
    });
    pageNum(s, n);
    s.addNotes("Outdoors has no reference system, so the result there is practical: does it work, how long does setup take, what breaks? That feeds the lab setup guide deliverable. Confirm Theia3D camera coverage in the terrain park with Finn.");
  }

  // ---------- 10. Stretch goals ----------
  {
    const s = pres.addSlide(); n++;
    kicker(s, "Beyond the core aims");
    title(s, "Stretch goals, if time allows");
    const items = [
      ["shoe", "ExoBoot pilot", "Do Dephy ExoBoot assistance settings change ankle and knee moments? Uses the Aim 2 pipeline.", C.orange, "Needs: ExoBoot sessions with Finn; Aim 2 working"],
      ["chart", "Overground forces", "Use Finn's GRFpredict model to estimate forces outdoors, then run inverse dynamics without force plates.", C.ink, "Needs: GRFpredict access; Aim 3 outdoor data"],
      ["cube", "Laser-level phone holder", "CAD/print a holder with laser levels to aim cameras the same way every session.", C.ink, "Needs: 2 laser levels (~$40); print time"],
      ["robot", "MyoAssist simulation", "Simulate ExoBoot use and compare with real data. Coding-heavy.", C.ink, "Needs: Python and machine-learning experience"],
    ];
    items.forEach(([ic, h, d, col, needs], i) => {
      const x = 0.6 + (i % 2) * 6.15, y = 1.6 + Math.floor(i / 2) * 2.45;
      card(s, x, y, 5.95, 2.2, C.grayLt);
      badge(s, ic, x + 0.3, y + 0.3, 0.7, col);
      text(s, h, { x: x + 1.25, y: y + 0.32, w: 4.5, h: 0.45, fontFace: HEAD, fontSize: 18, bold: true });
      text(s, d, { x: x + 1.25, y: y + 0.85, w: 4.45, h: 0.85, fontSize: 14, color: C.gray });
      text(s, needs, { x: x + 1.25, y: y + 1.7, w: 4.45, h: 0.3, fontSize: 12, bold: true, color: C.orange });
    });
    text(s, "The ExoBoot pilot is first in line: it reuses the Aim 2 pipeline directly.", { x: 0.6, y: 6.6, w: 12, h: 0.35, fontSize: 13, italic: true, color: C.orange });
    pageNum(s, n);
    s.addNotes("Keeping these separate protects the core aims: if we fall behind, we drop stretch goals, not Aims 1–3. The phone holder could move into the core plan if camera placement turns out to matter a lot.");
  }

  // ---------- 11. Budget ----------
  {
    const s = pres.addSlide(); n++;
    kicker(s, "Cost estimate");
    title(s, "Low cost: the expensive hardware already exists");
    card(s, 0.6, 1.55, 3.6, 5.2, C.ink);
    text(s, "~$130", { x: 0.85, y: 2.0, w: 3.2, h: 1.1, fontFace: HEAD, fontSize: 54, bold: true, color: C.orange });
    text(s, "new spending, estimated", { x: 0.85, y: 3.1, w: 3.2, h: 0.4, fontSize: 15, color: C.white });
    text(s, [
      { text: "~140", options: { fontFace: HEAD, fontSize: 36, bold: true, color: C.white, breakLine: true } },
      { text: "student hours (3 people × ~4 h/week × 12 weeks), for course credit", options: { fontSize: 13, color: "C9CFD9" } },
    ], { x: 0.85, y: 4.2, w: 3.2, h: 2.2 });
    const hdr = (t) => ({ text: t, options: { bold: true, color: C.white, fill: { color: C.ink } } });
    const sec = (t) => [{ text: t, options: { bold: true, color: C.orange, fill: { color: C.orangeLt }, colspan: 3 } }];
    const r = (a, b, c) => [a, b, { text: c, options: { align: "right" } }];
    const rows = [
      [hdr("Item"), hdr("Notes"), { text: "Cost", options: { bold: true, color: C.white, fill: { color: C.ink }, align: "right" } }],
      sec("Personnel"),
      r("Student team (3)", "3–5 lab hours/week each", "$0"),
      r("Mentor + faculty", "Weekly check-in with Finn; 1 h/week with Dr. Fey", "$0"),
      sec("Equipment (existing lab)"),
      r("Theia3D, Bertec treadmill, terrain park", "SAHM Lab resources; need scheduled time", "$0"),
      r("iPhones (2), OpenCap", "Team-owned phones; OpenCap is free", "$0"),
      sec("Materials"),
      r("Phone tripods + mounts (2)", "Only if the lab has none spare", "$50"),
      r("PLA filament (1 kg)", "Holder uses ~31 g; rest for iterations", "$25"),
      r("Laser levels (2)", "For the phone-holder side project", "$40"),
      r("Checkerboard print + backing", "Rigid, flat calibration board", "$15"),
      sec("Travel"),
      r("None", "All collection on campus", "$0"),
    ];
    s.addTable(rows, { x: 4.55, y: 1.55, w: 8.2, colW: [3.0, 4.2, 1.0], fontFace: BODY, fontSize: 12, color: C.ink, border: { type: "solid", pt: 0.5, color: C.line }, rowH: 0.36, margin: [0.03, 0.08, 0.03, 0.08] });
    pageNum(s, n);
    s.addNotes("Costs are estimates; check prices and ask Finn what the lab already has. The filament number comes from our actual slicer output (31 g for the holder). The lecture's budget categories are personnel, equipment, and travel, so all three appear even where they are $0.");
  }

  // ---------- 12. Team ----------
  {
    const s = pres.addSlide(); n++;
    kicker(s, "Team & reporting");
    title(s, "Who does what, and who we report to");
    // org chart
    const node = (x, y, w, h, name, role, fill, nc, rc, fs = 15) => {
      card(s, x, y, w, h, fill);
      text(s, name, { x: x + 0.15, y: y + 0.12, w: w - 0.3, h: 0.38, fontFace: HEAD, fontSize: fs, bold: true, color: nc, align: "center" });
      text(s, role, { x: x + 0.15, y: y + 0.5, w: w - 0.3, h: h - 0.6, fontSize: 12, color: rc, align: "center" });
    };
    node(2.475, 1.55, 3.6, 0.95, "Dr. Nicholas P. Fey", "Faculty advisor · weekly consultation hour", C.ink, C.white, "C9CFD9");
    node(2.475, 2.95, 3.6, 0.95, "Finn Eagen", "Graduate mentor · weekly lab check-in", C.ink2, C.white, "C9CFD9");
    line(s, 4.275, 2.5, 4.275, 2.95, C.gray, 1.5);
    line(s, 4.275, 3.9, 4.275, 4.25, C.gray, 1.5);
    line(s, 1.775, 4.25, 6.775, 4.25, C.gray, 1.5);
    const team = [
      ["Oaj Saini", "Hardware & setup: cameras, calibration, holders"],
      ["Asiya Sunesara", "Pipeline: OpenCap, Bertec sync, OpenSim"],
      ["Tarun Muruganandham", "Analysis: metrics, figures, poster"],
    ];
    team.forEach(([nm, role], i) => {
      const x = 0.6 + i * 2.5;
      line(s, x + 1.175, 4.25, x + 1.175, 4.6, C.gray, 1.5);
      node(x, 4.6, 2.35, 1.3, nm, role, C.orangeLt, C.orange, C.ink, 13);
    });
    text(s, "Everyone collects data together; the lead owns that piece and keeps it on schedule.", { x: 0.6, y: 6.1, w: 7.3, h: 0.5, fontSize: 12, italic: true, color: C.gray });
    // reporting
    card(s, 8.35, 1.55, 4.4, 5.2, C.grayLt);
    text(s, "How we report", { x: 8.65, y: 1.8, w: 3.9, h: 0.4, fontFace: HEAD, fontSize: 18, bold: true });
    const rep = [
      ["calendar", "Weekly", "Progress update to Finn during lab hours"],
      ["users", "Weekly", "Consultation hour with Dr. Fey"],
      ["file", "Every session", "Shared log: date, setup, trials, problems"],
      ["sync", "Always", "Raw videos and data backed up to the lab drive"],
    ];
    rep.forEach(([ic, h, d], i) => {
      const y = 2.45 + i * 1.03;
      badge(s, ic, 8.65, y, 0.5, C.orange);
      text(s, h, { x: 9.35, y: y - 0.04, w: 3.2, h: 0.3, fontSize: 13, bold: true });
      text(s, d, { x: 9.35, y: y + 0.26, w: 3.2, h: 0.55, fontSize: 12, color: C.gray });
    });
    pageNum(s, n);
    s.addNotes("The role split is a draft. Reassign leads to match what each of you wants to learn (see the first-meeting questions in the group doc). The lecture asks for a reporting structure, so the org chart shows who we answer to.");
  }

  // ---------- 13. Milestones vs deliverables ----------
  {
    const s = pres.addSlide(); n++;
    kicker(s, "Milestones & deliverables");
    title(s, "Checkpoints in time vs. finished work");
    text(s, "A milestone is a point in the schedule. A deliverable is work that is actually finished and handed over.", { x: 0.6, y: 1.25, w: 12, h: 0.35, fontSize: 14, italic: true, color: C.gray });
    const col = (x, head, ic, color, items) => {
      badge(s, ic, x, 1.85, 0.55, color);
      text(s, head, { x: x + 0.7, y: 1.85, w: 4.5, h: 0.55, fontFace: HEAD, fontSize: 20, bold: true, color, valign: "middle" });
      items.forEach(([id, date, t, done], i) => {
        const y = 2.7 + i * 0.8;
        card(s, x, y, 5.85, 0.64, done ? "E6F0E9" : C.grayLt);
        text(s, id, { x: x + 0.15, y, w: 0.55, h: 0.64, fontSize: 14, bold: true, color, valign: "middle" });
        text(s, t, { x: x + 0.7, y, w: 3.7, h: 0.64, fontSize: 14, valign: "middle" });
        text(s, done ? "Done ✓" : date, { x: x + 4.4, y, w: 1.3, h: 0.64, fontSize: 13, bold: done, color: done ? C.green : C.gray, align: "right", valign: "middle" });
      });
    };
    col(0.6, "Milestones", "flask", C.ink, [
      ["M1", "Sep", "Two-phone OpenCap capture working", true],
      ["M2", "Oct 16", "First synced OpenCap + Theia3D trial"],
      ["M3", "Oct 30", "First joint moments from OpenCap + Bertec"],
      ["M4", "Nov 13", "All environments captured"],
      ["M5", "Nov 25", "Analysis complete"],
    ]);
    col(6.9, "Deliverables", "file", C.orange, [
      ["D1", "Sep", "Checkerboard holder CAD + print files", true],
      ["D2", "Oct", "Project proposal"],
      ["D3", "Nov", "Lab setup guide for mobile capture"],
      ["D4", "Dec", "Dataset + processing scripts"],
      ["D5", "Dec", "Poster, presentation, final report"],
    ]);
    pageNum(s, n);
    s.addNotes("The lecture specifically called out the difference between milestones and deliverables, so we split them. Dates are targets; adjust them once you know the proposal and poster due dates.");
  }

  // ---------- 14. Gantt ----------
  {
    const s = pres.addSlide(); n++;
    kicker(s, "Schedule");
    title(s, "Gantt chart: Sep 7 to Dec 13");
    const weeks = ["7", "14", "21", "28", "5", "12", "19", "26", "2", "9", "16", "23", "30", "7"];
    const months = [["SEP", 0, 4], ["OCT", 4, 4], ["NOV", 8, 5], ["DEC", 13, 1]];
    const gx = 4.2, gw = 8.55, cw = gw / weeks.length, gy = 1.95, rh = 0.4;
    months.forEach(([m, st, len], i) => {
      s.addShape(pres.shapes.RECTANGLE, { x: gx + st * cw, y: 1.35, w: len * cw, h: 0.3, fill: { color: i % 2 ? C.ink2 : C.ink }, line: { color: C.white, width: 0.5 } });
      text(s, m, { x: gx + st * cw, y: 1.35, w: len * cw, h: 0.3, fontSize: 11, bold: true, color: C.white, align: "center", valign: "middle" });
    });
    weeks.forEach((w, i) => text(s, w, { x: gx + i * cw, y: 1.65, w: cw, h: 0.28, fontSize: 10, color: C.gray, align: "center", valign: "middle" }));
    const tasks = [
      ["Onboarding + OpenCap demo", 0, 2, "done"],
      ["Checkerboard holder CAD", 0, 2, "done"],
      ["Proposal", 2, 2, "doc"],
      ["Literature review", 1, 4, "core"],
      ["Theia3D + Bertec training", 4, 2, "core"],
      ["Aim 1: treadmill captures", 5, 3, "core"],
      ["Aim 2: OpenSim ID pipeline", 6, 4, "core"],
      ["Aim 3: terrain park + outdoors", 8, 3, "core"],
      ["Analysis + figures", 9, 4, "core"],
      ["Phone holder (side project)", 4, 5, "side"],
      ["Poster, talk, final report", 11, 3, "doc"],
    ];
    const col = { done: "9AA3B0", core: C.orange, side: "E9B48E", doc: C.ink };
    tasks.forEach(([t, st, len, kind], i) => {
      const y = gy + i * rh;
      if (i % 2 === 0) s.addShape(pres.shapes.RECTANGLE, { x: 0.6, y, w: gx + gw - 0.6, h: rh, fill: { color: C.grayLt }, line: { color: C.grayLt } });
      text(s, t, { x: 0.7, y, w: gx - 0.8, h: rh, fontSize: 12, valign: "middle", color: kind === "done" ? C.gray : C.ink });
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: gx + st * cw + 0.04, y: y + 0.08, w: len * cw - 0.08, h: rh - 0.16, rectRadius: 0.1, fill: { color: col[kind] }, line: { color: col[kind] } });
    });
    // today line (Sep 22 = week index 2 + 1/7)
    const tx = gx + (2 + 1 / 7) * cw;
    const bottom = gy + tasks.length * rh;
    line(s, tx, 1.65, tx, bottom + 0.05, "C0392B", 1.5, "dash");
    text(s, "today", { x: tx - 0.4, y: bottom + 0.07, w: 0.8, h: 0.25, fontSize: 10, bold: true, color: "C0392B", align: "center" });
    const legend = [["Done", col.done], ["Core aims", col.core], ["Side project", col.side], ["Course deliverable", col.doc]];
    legend.forEach(([l, c], i) => {
      const x = 4.2 + i * 2.15;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 6.75, w: 0.35, h: 0.2, rectRadius: 0.06, fill: { color: c }, line: { color: c } });
      text(s, l, { x: x + 0.45, y: 6.7, w: 1.6, h: 0.3, fontSize: 11, color: C.gray, valign: "middle" });
    });
    pageNum(s, n);
    s.addNotes("Week labels are Mondays. Aims overlap on purpose: we can build the OpenSim pipeline while treadmill captures are still going. Shift bars once the course gives exact dates for the poster session and final report.");
  }

  // ---------- 15. Risks ----------
  {
    const s = pres.addSlide(); n++;
    kicker(s, "Risks");
    title(s, "What could go wrong, and our plan");
    const risks = [
      ["sync", "Systems are not time-synced", "OpenCap, Theia3D, and Bertec each keep their own clocks.", "Stomp at trial start; align on the ankle event; check with cross-correlation."],
      ["eye", "Occlusion with only two phones", "Treadmill handrails or the far leg can block a camera.", "Test camera angles early; laser-level holder for repeatable placement; try a third phone."],
      ["balance", "No true ground truth", "Theia3D is also a model-based estimate.", "Report agreement, not accuracy; cite Theia3D's marker validation."],
      ["sun", "Outdoor calibration fails", "Glare, shadows, and wind move the board or phones.", "Rigid holder; check calibration before each trial; pick shaded times."],
      ["wifi", "Cloud processing delays", "OpenCap needs internet and a processing queue.", "Process the same day; back up raw videos to the lab drive."],
      ["hourglass", "Schedule slips", "Lab time and equipment are shared.", "Book Theia3D and Bertec time early; drop stretch goals first."],
    ];
    risks.forEach(([ic, h, why, fix], i) => {
      const x = 0.6 + (i % 2) * 6.15, y = 1.5 + Math.floor(i / 2) * 1.8;
      card(s, x, y, 5.95, 1.62, C.grayLt);
      badge(s, ic, x + 0.25, y + 0.25, 0.55, C.ink);
      text(s, h, { x: x + 1.0, y: y + 0.18, w: 4.8, h: 0.35, fontFace: HEAD, fontSize: 15, bold: true });
      text(s, why, { x: x + 1.0, y: y + 0.55, w: 4.8, h: 0.35, fontSize: 12, color: C.gray });
      text(s, [{ text: "Plan: ", options: { bold: true, color: C.orange } }, { text: fix }], { x: x + 1.0, y: y + 0.9, w: 4.8, h: 0.65, fontSize: 12 });
    });
    pageNum(s, n);
    s.addNotes("Reviewers trust a plan more when it names its own weak points. The 'no ground truth' risk is the one to say out loud: it shows we understand what the comparison can and can't prove.");
  }

  // ---------- 16. References ----------
  {
    const s = pres.addSlide(); n++;
    kicker(s, "References");
    title(s, "Sources");
    const refs = [
      "[1]  Uhlrich SD, Falisse A, Kidziński Ł, et al. OpenCap: Human movement dynamics from smartphone videos. PLOS Computational Biology. 2023;19(10):e1011462.",
      "[2]  Kanko RM, Laende EK, Davis EM, Selbie WS, Deluzio KJ. Concurrent assessment of gait kinematics using marker-based and markerless motion capture. Journal of Biomechanics. 2021;127:110665.",
      "[3]  Delp SL, Anderson FC, Arnold AS, et al. OpenSim: open-source software to create and analyze dynamic simulations of movement. IEEE Transactions on Biomedical Engineering. 2007;54(11):1940–1950.",
      "[4]  Seth A, Hicks JL, Uchida TK, et al. OpenSim: Simulating musculoskeletal dynamics and neuromuscular control to study human and animal movement. PLOS Computational Biology. 2018;14(7):e1006223.",
      "[5]  Cotton RJ, et al. Portable biomechanics laboratory enables clinically accessible movement analysis from a handheld smartphone. 2025.",
      "[6]  Bland JM, Altman DG. Statistical methods for assessing agreement between two methods of clinical measurement. The Lancet. 1986;1(8476):307–310.",
    ];
    text(s, refs.map((r, i) => ({ text: r, options: { breakLine: i < refs.length - 1, paraSpaceAfter: 12 } })), { x: 0.6, y: 1.55, w: 12.1, h: 5.2, fontSize: 15 });
    pageNum(s, n);
    s.addNotes("Verify every citation on Google Scholar before submitting, especially [5]: fill in the full author list and venue for the Cotton lab paper Finn pointed us to.");
  }

  // ---------- 17. Closing ----------
  {
    const s = pres.addSlide(); n++;
    s.background = { color: C.ink };
    text(s, "WHAT WE NEED", { x: 0.7, y: 0.8, w: 6, h: 0.3, fontSize: 12, bold: true, color: C.orange, charSpacing: 2 });
    text(s, "Two phones, one lab, and a clear answer by December", { x: 0.7, y: 1.2, w: 7.3, h: 1.8, fontFace: HEAD, fontSize: 36, bold: true, color: C.white });
    const asks = [
      ["calendar", "Scheduled time on Theia3D and the Bertec treadmill"],
      ["lab", "Access to the terrain park for Aim 3"],
      ["cube", "About $130 in materials"],
      ["users", "Feedback on scope and hypotheses"],
    ];
    asks.forEach(([ic, t], i) => {
      const y = 3.45 + i * 0.78;
      badge(s, ic, 0.7, y, 0.52);
      text(s, t, { x: 1.4, y, w: 6.4, h: 0.52, fontSize: 17, color: C.white, valign: "middle" });
    });
    figure(s, 9.9, 1.6, 1.05, C.orange, "6B7485");
    text(s, "Questions?", { x: 8.6, y: 6.3, w: 4.1, h: 0.6, fontFace: HEAD, fontSize: 24, bold: true, color: C.orange, align: "center" });
    s.addNotes("End with the ask. Reviewers should leave knowing exactly what resources we need and when they'll see results.");
  }

  await pres.writeFile({ fileName: "FIRE-Mobile-Mocap-Proposal.pptx" });
  console.log("wrote", n, "slides");
})();
