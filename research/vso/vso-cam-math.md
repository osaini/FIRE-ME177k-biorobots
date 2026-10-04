# VSO cam-design math

Transcribed from Van Crey et al., "The variable stiffness orthosis: customizable mechanics
for assistance and rehabilitation," *J NeuroEng Rehabil* 23:249 (2026),
doi:10.1186/s12984-025-01805-7. Equation numbers match the paper. Rendered page images are
in [`pages/`](pages/) for checking against the original (p13 = Eqs 1–4, p20–p23 = Appendix A,
p23–p25 = Appendix B).

Sign convention: positive angle = dorsiflexion, negative = plantarflexion.

## Symbols

| Symbol | Meaning |
|---|---|
| $\theta$ | **Device angle**: total rotation about the ankle sagittal axis (what the user feels) |
| $\theta_\text{cam}$ | Rotation at the orthotic hinge (cam rotation) |
| $\delta$ | Assembly deflection: structural flex + axis misalignment |
| $M_\text{A}$ | Applied torque about the ankle axis — the target torque-angle curve $M_\text{A}(\theta)$ |
| $E_\text{A}$ | Energy under the torque-angle curve |
| $\theta_\text{eq}$ | Equilibrium (zero-torque) angle |
| $\gamma$, $\gamma_0$ | Leaf-spring angular deflection about its virtual pivot; preload at $\theta_\text{eq}$ |
| $M_\text{S}$, $E_\text{S}$ | Leaf-spring moment and stored energy |
| $k_\text{lin}$ | Linear leaf-spring stiffness at the follower (measured vs. support position, Fig 1D) |
| $k$ | Rotary leaf-spring stiffness about the virtual pivot |
| $k_\delta$ | Assembly stiffness: 5.9 Nm/deg resisting dorsiflexion, 5.6 Nm/deg resisting plantarflexion |
| $L$ | Effective spring length, virtual pivot → follower center |
| $x_\text{c}$, $y_\text{c}$ | Components of $L$ along / perpendicular to the support-travel axis |
| $r_0$ | Joint center → follower center at the unloaded reference (35 mm in the VSO) |
| $d$ | Virtual pivot → joint center |
| $\mu$ | Angle between $r_0$ and a line collinear with $y_\text{c}$ (was forced to 0° in older devices) |
| $\omega$ | Angle between $d$ and $r_0$ |
| $\sigma$ | Angle between $d$ and $L$ |
| $(r, \psi)$ | Cam profile in polar coordinates about the joint center |
| $\alpha$ | Angular deviation of the follower about the joint |
| $r_\text{f}$ | Cam-follower radius (8.5 mm or 6 mm in the VSO) |

Units: the energy balances assume angles in radians, so convert $k_\delta$ from Nm/deg to
Nm/rad ($\times 180/\pi$) before using it with $\gamma$ and $\delta$ in radians.

---

## Stiffness reporting (Section 4.1)

$$\theta_\text{assembly} = \theta_\text{structure} + \theta_\text{alignment} \tag{1}$$

$$k_\text{assembly} = \left(k_\text{structure}^{-1} + k_\text{alignment}^{-1}\right)^{-1} \tag{2}$$

$$\theta_\text{device} = \theta_\text{rigid} + \theta_\text{assembly} \tag{3}$$

$$k_\text{device} = \left(k_\text{rigid}^{-1} + k_\text{assembly}^{-1}\right)^{-1} \tag{4}$$

Series springs: device stiffness is always softer than hinge-only ("rigid") stiffness, which is
why encoder-based stiffness numbers overstate things.

---

## A.1 Forward model (target curve → cam shape)

Energy balance (virtual work). The energy under the torque-angle curve equals the energy stored
in the leaf spring plus the assembly:

$$\int_{\min(\theta)}^{\max(\theta)} M_\text{A}\,d\theta + c = \int_{\gamma_0}^{\gamma} M_\text{S}\,d\gamma + \int_0^{\delta} M_\text{A}\,d\delta \tag{A1}$$

$$c = -\int_{\min(\theta)}^{\theta_\text{eq}} M_\text{A}\,d\theta \tag{A2}$$

> The upper limit is printed as $\max(\theta)$, but the left side has to be a running integral
> evaluated at each $\theta$ (i.e. $E_\text{A}(\theta)$) for (A8) to give $\gamma(\theta)$.
> $c$ shifts it so that the energy is zero at $\theta_\text{eq}$.

Assembly stiffness depends on torque direction:

$$k_\delta = \begin{cases} k_{\delta 1} & M_\text{A} \ge 0 \\ k_{\delta 2} & M_\text{A} < 0 \end{cases} \tag{A3}$$

$$\delta(\theta) = \frac{M_\text{A}}{k_\delta} \tag{A4}$$

Linear → rotary spring stiffness about the virtual pivot (small-angle arc length $x_\text{c}\gamma$):

$$k = \frac{F_\text{S}\,x_\text{c}}{\gamma} = k_\text{lin}\,x_\text{c}^2 \tag{A5}$$

Substituting linear springs:

$$\int_{\min(\theta)}^{\max(\theta)} M_\text{A}\,d\theta + c = \int_{\gamma_0}^{\gamma} k\gamma\,d\gamma + \int_0^{\delta} k_\delta\,\delta\,d\delta \tag{A6}$$

$$E_\text{A} + c = \tfrac{1}{2}k\gamma^2 - \tfrac{1}{2}k\gamma_0^2 + \tfrac{1}{2}k_\delta\delta^2 \tag{A7}$$

Solve for the spring deflection needed at each device angle:

$$\gamma(\theta) = \sqrt{\gamma_0^2 + \frac{2}{k}\left(E_\text{A} + c - \tfrac{1}{2}k_\delta\delta^2\right)} \tag{A8}$$

### Geometric constants (unloaded reference configuration)

$$L = \sqrt{x_\text{c}^2 + y_\text{c}^2} \tag{A9}$$

$$d = \sqrt{\left(r_0\cos\mu + y_\text{c}\right)^2 + \left(r_0\sin\mu + x_\text{c}\right)^2} \tag{A10}$$

$$\omega = \cos^{-1}\!\left(\frac{-r_0^2 - d^2 + L^2}{-2dr_0}\right) \tag{A11}$$

$$\sigma = \cos^{-1}\!\left(\frac{r_0^2 - d^2 - L^2}{-2dL}\right) \tag{A12}$$

### Spring deflection → polar cam profile

$$r(\theta) = \sqrt{d^2 + L^2 - 2dL\cos(\sigma + \gamma)} \tag{A13}$$

$$\alpha(\theta) = \sin^{-1}\!\left(\frac{L}{r}\sin(\sigma + \gamma)\right) - \omega \tag{A14}$$

$$\theta_\text{cam}(\theta) = \theta - \delta \tag{A15}$$

$$\psi(\theta) = \theta_\text{cam} - \alpha \tag{A16}$$

### Polar → Cartesian, then offset by the follower radius (for CAD export)

$$x = r\cos\psi \tag{A17}$$

$$y = r\sin\psi \tag{A18}$$

$$x' = \frac{dx}{d\psi} \tag{A19}$$

$$y' = \frac{dy}{d\psi} \tag{A20}$$

$$x_\text{cam} = x - \frac{y'\,r_\text{f}}{\sqrt{(x')^2 + (y')^2}} \tag{A21}$$

$$y_\text{cam} = y + \frac{x'\,r_\text{f}}{\sqrt{(x')^2 + (y')^2}} \tag{A22}$$

$(x, y)$ is the *progenitor curve* (path of the follower center); $(x_\text{cam}, y_\text{cam})$ is
the machined cam surface.

---

## A.2 Inverse model (fixed cam → curve at another support position) — Algorithm 1

For each spring-support position $i$, using the measured $x_\text{c}(i)$ and $k_\text{lin}(i)$:

$$k = k_\text{lin}(i)\,x_\text{c}(i)^2 \tag{A23}$$

$$L = \sqrt{x_\text{c}(i)^2 + y_\text{c}^2} \tag{A24}$$

$$d = \sqrt{\left(r_0\cos\mu + y_\text{c}\right)^2 + \left(r_0\sin\mu + x_\text{c}(i)\right)^2} \tag{A25}$$

$$\omega = \cos^{-1}\!\left(\frac{-r_0^2 - d^2 + L^2}{-2dr_0}\right) \tag{A26}$$

$$\sigma = \cos^{-1}\!\left(\frac{r_0^2 - d^2 - L^2}{-2dL}\right) \tag{A27}$$

$$\gamma(r) = \cos^{-1}\!\left(\frac{r^2 - d^2 - L^2}{-2dL}\right) - \sigma \tag{A28}$$

$$M_\text{S}(r) = k\gamma \tag{A29}$$

$$E_\text{S}(r) = \int M_\text{S}\,d\gamma \tag{A30}$$

$$\alpha(r) = \sin^{-1}\!\left(\frac{L}{r}\sin(\sigma + \gamma)\right) - \omega \tag{A31}$$

$$\theta_\text{cam}(r, \psi) = \psi + \alpha \tag{A32}$$

$$M_\text{A}(r, \psi) = \frac{dE_\text{S}}{d\theta_\text{cam}} \tag{A33}$$

$$\delta(r, \psi) = \frac{M_\text{A}}{k_\delta} \tag{A34}$$

$$\theta(r, \psi) = \theta_\text{cam} + \delta \tag{A35}$$

$$c_\text{inv} = -\int_{\gamma(\min(\theta))}^{\gamma(\theta_\text{eq})} M_\text{S}\,d\gamma \tag{A36}$$

$$E_\text{S}(r) = E_\text{S} + c_\text{inv} \tag{A37}$$

---

## A.3 DESR (two-cam) additions

Each dynamic cam gets its own preload: $\gamma_{10}$ (cam 1, blue) and $\gamma_{20}$ (cam 2, red).
The energy harvested into cam 2, $E_\text{P}$ (area of either shaded region in Fig 2A), sets the
second preload:

$$E_\text{P} = \tfrac{1}{2}k\gamma_{20}^2 - \tfrac{1}{2}k\gamma_{10}^2 \tag{A38}$$

$$\gamma_{20} = \sqrt{\frac{2E_\text{P}}{k} + \gamma_{10}^2} \tag{A39}$$

Energy constraint: harvested energy must equal recycled energy (region 1 area = region 2 area).

---

## A.4 Feasibility constraints

1. Stiffness (slope of $M_\text{A}(\theta)$) generally cannot exceed $k_\delta$.
2. In concave regions, the progenitor curve's radius of curvature must be at least $r_\text{f}$:

$$r' = \frac{dr}{d\theta} \tag{A40}$$

$$r'' = \frac{d^2 r}{d\theta^2} \tag{A41}$$

$$R = \frac{\left(r^2 + (r')^2\right)^{3/2}}{r^2 + 2(r')^2 - r\,r''} \tag{A42}$$

In practice, the paper checks this by requiring the offset curve to be monotonic in $y$, which
avoids differentiating noisy data:

$$y_\text{cam} = \left[y_\text{cam}^1, y_\text{cam}^2, \ldots, y_\text{cam}^n\right] \tag{A43}$$

$$\Delta y_\text{cam}^i = y_\text{cam}^{i+1} - y_\text{cam}^i, \quad i = 1, \ldots, n-1 \tag{A44}$$

$$\Delta y_\text{cam}^i > 0 \quad \forall i \tag{A45}$$

Ways to relax it: a stiffer spring (more circular cam), a smaller $r_\text{f}$, or a larger $r_0$.

---

## Appendix B: simplified models (intuition only)

### B.1 Negative stiffness (rigid assembly, $\gamma$ ≈ arc length)

$$\lim_{k_\delta \to \infty} \theta = \theta_\text{cam} \tag{B46}$$

$$\gamma(\theta) = \frac{r - r_0}{x_\text{c}} \tag{B47}$$

$$E_\text{S}(\theta) = \tfrac{1}{2}k\gamma^2 = \tfrac{1}{2}k\left(\frac{r - r_0}{x_\text{c}}\right)^2 \tag{B48}$$

$$M_\text{A}(\theta) = \frac{dE_\text{S}}{d\theta} = \frac{k\,r'(r - r_0)}{x_\text{c}^2} \tag{B49}$$

$$k_\text{TA}(\theta) = \frac{dM_\text{A}}{d\theta} = \frac{k\left[r''(r - r_0) + r'^2\right]}{x_\text{c}^2} \tag{B50}$$

Only $r$ and its derivatives vary, so a **concave region where $r$ is decreasing** gives
$r''(r - r_0) < 0$ and can make the stiffness negative.

### B.2 Extreme stiffness

No new equations. If the cam mechanism has negative stiffness, $\delta$ and $\theta_\text{cam}$ move
in opposite directions, so $\theta = \theta_\text{cam} + \delta$ can barely change (or reverse) while
torque changes a lot. The result is extreme negative, infinite, or extreme positive stiffness (Fig 10).

### B.3 Leaf spring vs. orthosis stiffness

$$k_\text{rot} = k = k_\text{lin}^{\uparrow}\,x_\text{c}^{2\,\downarrow} \tag{B51}$$

$$I = \frac{bh^3}{12} \tag{B52}$$

$$k_\text{lin}(x_\text{c}, h) = \frac{3EI}{x_\text{c}^3} = \frac{3Eb}{12}\left(\frac{h^3}{x_\text{c}^3}\right) \tag{B53}$$

$$k_\text{rot}(x_\text{c}, h) = \frac{3EI}{x_\text{c}} = \frac{3Eb}{12}\left(\frac{h^3}{x_\text{c}}\right) \tag{B54}$$

$$k_\text{TA}(\theta) = \frac{k_\text{rot}\left(r''(r - r_0) + r'^2\right)}{x_\text{c}^2} = k_\text{lin}\left(r''(r - r_0) + r'^2\right) \tag{B55}$$

Key point: orthosis stiffness scales with $k_\text{lin}$, not $k_\text{rot}$. Moving the support
toward the joint always stiffens the orthosis, even though $k_\text{rot}$ can drop (the VSO spring
has tapered height $h$).

---

## Appendix D: DESR optimizer bounds (Table 2)

| Parameter | Gait phase (Fig 2) | Energy module | Angle module |
|---|---|---|---|
| $\theta_1^\text{eq}$ | d→b | −2° to 0° | 0° to $\theta_2^\text{s}$ |
| $\theta_1^\text{s}$ | b | −7° | −5.5° |
| $\theta_2^\text{eq}$ | b→d | $\theta_1^\text{s}$ to 0° | 0° |
| $\theta_2^\text{s}$ | d | +12° | +12° |
| $k^{s1}$ | plantarflexion | 0 to $k^{s2}$ | 0 to $k^{s2}$ |
| $k^{s2}$ | dorsiflexion | 1.0 Nm/deg | 1.0 Nm/deg |

Optimization details (genetic algorithm): Bywater et al. [81] in the paper's references.

---

## Forward-model recipe (our summary, not from the paper)

1. Pick a target $M_\text{A}(\theta)$ on a fine grid (the paper uses piecewise cubic splines for single cams).
2. $E_\text{A}(\theta) = \int_{\min\theta}^{\theta} M_\text{A}\,d\theta$; $c$ from (A2).
3. $\delta = M_\text{A}/k_\delta$ (A3–A4), with $k_\delta$ chosen by torque sign.
4. $k = k_\text{lin}\,x_\text{c}^2$ at the primary support position (A5).
5. $\gamma(\theta)$ from (A8).
6. Geometry constants (A9–A12) → $r$, $\alpha$, $\theta_\text{cam}$, $\psi$ (A13–A16).
7. $(x, y)$ → offset by $r_\text{f}$ → $(x_\text{cam}, y_\text{cam})$ (A17–A22).
8. Check the stiffness limit ($< k_\delta$) and monotonic $y_\text{cam}$ (A43–A45); export to CAD.
9. Run the inverse model (Algorithm 1) at other support positions to predict the family of curves.
