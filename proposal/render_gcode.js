// Render outer-wall + top-surface extrusions of the checkerboard holder G-code as an isometric PNG.
const fs = require("fs");
const sharp = require("sharp");

const src = "C:/Users/oajsa/Projects/FIRE-ME177k-biorobots/cad/checkerboardholder_PLA_49m57s.gcode";
const lines = fs.readFileSync(src, "utf8").split(/\r?\n/);

let x = 0, y = 0, z = 0, feature = "";
const segs = []; // [x0,y0,z0,x1,y1,z1,feature]
for (const raw of lines) {
  const line = raw.trim();
  const f = line.match(/^; FEATURE: (.+)$/);
  if (f) { feature = f[1]; continue; }
  if (!/^G[01] /.test(line)) continue;
  const code = line.split(";")[0];
  const get = (k) => { const m = code.match(new RegExp(k + "(-?[\\d.]+)")); return m ? parseFloat(m[1]) : null; };
  const nx = get("X") ?? x, ny = get("Y") ?? y, nz = get("Z") ?? z, e = get("E");
  if (e !== null && e > 0 && (feature === "Outer wall" || feature === "Top surface" || feature === "Bottom surface") && (nx !== x || ny !== y)) {
    segs.push([x, y, z, nx, ny, nz, feature]);
  }
  x = nx; y = ny; z = nz;
}

// isometric projection
const a = Math.PI / 6;
const proj = (px, py, pz) => [(px - py) * Math.cos(a), (px + py) * Math.sin(a) - pz * 1.0];
let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity, maxZ = 0;
const pts = segs.map((s) => {
  const p0 = proj(s[0], s[1], s[2]), p1 = proj(s[3], s[4], s[5]);
  for (const [u, v] of [p0, p1]) { minU = Math.min(minU, u); maxU = Math.max(maxU, u); minV = Math.min(minV, v); maxV = Math.max(maxV, v); }
  maxZ = Math.max(maxZ, s[5]);
  return [p0, p1, s[5], s[6]];
});
const W = 1600, H = 1200, pad = 60;
const scale = Math.min((W - 2 * pad) / (maxU - minU), (H - 2 * pad) / (maxV - minV));
const ox = (W - (maxU - minU) * scale) / 2, oy = (H - (maxV - minV) * scale) / 2;
// draw back-to-front: lower z first, then by depth
pts.sort((p, q) => p[2] - q[2]);
const lerp = (c0, c1, t) => c0.map((c, i) => Math.round(c + (c1[i] - c) * t));
const lo = [120, 52, 10], hi = [255, 150, 70];
let body = "";
for (const [p0, p1, zz, feat] of pts) {
  const t = zz / maxZ;
  const [r, g, b] = feat === "Outer wall" ? lerp(lo, hi, t) : [255, 200, 150];
  const X0 = ox + (p0[0] - minU) * scale, Y0 = oy + (p0[1] - minV) * scale;
  const X1 = ox + (p1[0] - minU) * scale, Y1 = oy + (p1[1] - minV) * scale;
  body += `<line x1="${X0.toFixed(1)}" y1="${Y0.toFixed(1)}" x2="${X1.toFixed(1)}" y2="${Y1.toFixed(1)}" stroke="rgb(${r},${g},${b})" stroke-width="1.6" stroke-linecap="round" opacity="0.85"/>`;
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${body}</svg>`;
sharp(Buffer.from(svg)).png().toFile("holder.png").then(() => console.log("segments:", segs.length, "maxZ:", maxZ));
