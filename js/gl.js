/* Pivka — WebGL world: a yolk sun over layered Slovenian fields.
   One fullscreen fragment shader, themed per section from main.js. */
(function () {
  const canvas = document.querySelector('.gl');
  const gl = canvas && canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false });
  if (!gl) { window.PivkaGL = { setTheme() {}, setMouse() {} }; return; }

  const vert = `
    attribute vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }`;

  const frag = `
    precision highp float;
    uniform vec2 uRes; uniform float uTime; uniform vec2 uMouse;
    uniform vec3 uSky1; uniform vec3 uSky2; uniform vec3 uHill1; uniform vec3 uHill2; uniform vec3 uSun;
    uniform vec2 uSunPos; uniform float uSunR; uniform float uLines; uniform float uHills;

    float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
    float noise(vec2 p){
      vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.-2.*f);
      return mix(mix(hash(i), hash(i+vec2(1,0)), u.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
    }
    float fbm(vec2 p){ float v = 0., a = .5; for(int i=0;i<5;i++){ v += a*noise(p); p = p*2.03 + 17.1; a *= .5; } return v; }

    void main(){
      vec2 uv = gl_FragCoord.xy / uRes;
      float asp = uRes.x / uRes.y;
      vec2 p = (gl_FragCoord.xy - .5*uRes) / uRes.y;
      vec2 m = uMouse * vec2(asp, 1.) * .5;
      float t = uTime;

      // sky with drifting haze
      float haze = fbm(p*1.4 + vec2(t*.015, 0.));
      vec3 col = mix(uSky1, uSky2, smoothstep(-.6, .7, p.y + haze*.25));

      // yolk sun
      vec2 sc = vec2(uSunPos.x*asp*.5, uSunPos.y) + m*.05;
      vec2 sd = p - sc;
      float d = length(sd);
      float ang = atan(sd.y, sd.x);
      float wob = (fbm(vec2(ang*1.5 + t*.2, t*.25)) - .5) * .035 * uSunR * 4.;
      float sR = uSunR * clamp(asp * .9, .6, 1.);
      float r = sR + wob;
      float sunMask = smoothstep(r + .003, r - .003, d);
      vec3 core = mix(uSun*1.12, uSun*vec3(.98,.78,.45), smoothstep(0., r*1.1, length(sd - vec2(-r*.3, r*.3))));
      col += uSun * (.28 / (1. + pow(d*4.5/max(sR*4., .4), 2.)));
      float rr = abs(sin((d - t*.025) * 55.));
      col += uSun * smoothstep(.985, 1., rr) * smoothstep(r + .5, r, d) * step(r, d) * .14;
      col = mix(col, core, sunMask);

      // layered fields, back to front
      for (int i = 0; i < 6; i++) {
        float fi = float(i);
        float base = uHills - fi*.09;
        float par = (fi + 1.) * .02;
        float h = base + (fbm(vec2(p.x*(1.1 + fi*.3) + fi*7.31 - m.x*par, fi*1.7 + t*.012)) - .5) * (.28 - fi*.02);
        float mask = smoothstep(h + .002, h - .002, p.y);
        float depth = h - p.y;
        vec3 hc = mix(uHill1, uHill2, fi/5.);
        // furrows converging toward a vanishing point
        float rows = sin(((p.x - sc.x*.4) / (depth + .12)) * (6. + fi*2.) + fi);
        hc *= 1. + .07 * smoothstep(.55, 1., rows) * smoothstep(0., .2, depth);
        // topographic contours
        float topo = abs(fract(fbm(p*2.6 + fi*3.1 + t*.01) * uLines) - .5);
        hc += uSun * .07 * smoothstep(.035, 0., topo);
        // sun-kissed ridge
        hc += uSun * .32 * smoothstep(.018, 0., depth) * (1. - fi/7.);
        col = mix(col, hc, mask);
      }

      col += uSun * .06 * smoothstep(.45, 0., length(p - m));
      col *= 1. - .4 * pow(length(uv - .5) * 1.2, 2.);
      col += (hash(gl_FragCoord.xy + t) - .5) * .03;
      gl_FragColor = vec4(col, 1.);
    }`;

  function compile(type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
    return s;
  }
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, vert));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, frag));
  gl.linkProgram(prog); gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a');
  gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const U = {};
  ['uRes', 'uTime', 'uMouse', 'uSky1', 'uSky2', 'uHill1', 'uHill2', 'uSun', 'uSunPos', 'uSunR', 'uLines', 'uHills']
    .forEach(n => U[n] = gl.getUniformLocation(prog, n));

  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
  const THEMES = {
    field: { sky1: '#0e5532', sky2: '#03200f', hill1: '#1a7a45', hill2: '#021a0c', sun: '#ffcf00', sunPos: [.42, .2], sunR: .2, lines: 9, hills: -.08 },
    sun:   { sky1: '#155f36', sky2: '#04240f', hill1: '#2a8a4f', hill2: '#03200f', sun: '#ffd31a', sunPos: [.55, -.62], sunR: .32, lines: 12, hills: -.4 },
    dusk:  { sky1: '#08361e', sky2: '#010f07', hill1: '#0f5130', hill2: '#010d06', sun: '#f6bf0f', sunPos: [.15, -.34], sunR: .16, lines: 16, hills: -.18 },
    yolk:  { sky1: '#3c6a1c', sky2: '#08260f', hill1: '#2d8a4c', hill2: '#03200f', sun: '#ffcf00', sunPos: [0, .05], sunR: .28, lines: 10, hills: -.2 },
    cream: { sky1: '#0e5532', sky2: '#03200f', hill1: '#1a7a45', hill2: '#021a0c', sun: '#fbd833', sunPos: [.6, .3], sunR: .14, lines: 9, hills: -.1 }
  };
  const toState = th => ({
    sky1: hex(th.sky1), sky2: hex(th.sky2), hill1: hex(th.hill1), hill2: hex(th.hill2), sun: hex(th.sun),
    sunPos: th.sunPos.slice(), sunR: th.sunR, lines: th.lines, hills: th.hills
  });
  const cur = toState(THEMES.field);
  let target = toState(THEMES.field);
  const mouse = [0, 0], mouseT = [0, 0];

  const lerpArr = (a, b, k) => { for (let i = 0; i < a.length; i++) a[i] += (b[i] - a[i]) * k; };

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5) * (innerWidth > 1600 ? .8 : 1);
    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  addEventListener('resize', resize); resize();

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const t0 = performance.now();
  let intro = 0, last = t0;
  function frame(now) {
    const t = reduce ? 10 : (now - t0) / 1000;
    // time-based easing so theme changes settle at the same speed at any frame rate
    const dt = Math.min((now - last) / 1000, .5); last = now;
    const k = 1 - Math.exp(-dt * 2.8);
    ['sky1', 'sky2', 'hill1', 'hill2', 'sun', 'sunPos'].forEach(n => lerpArr(cur[n], target[n], k));
    cur.sunR += (target.sunR - cur.sunR) * k;
    cur.lines += (target.lines - cur.lines) * k;
    cur.hills += (target.hills - cur.hills) * k;
    lerpArr(mouse, mouseT, 1 - Math.exp(-dt * 3.8));
    intro += (1 - intro) * (1 - Math.exp(-dt * 1.2));

    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform1f(U.uTime, t);
    gl.uniform2f(U.uMouse, mouse[0], mouse[1]);
    gl.uniform3fv(U.uSky1, cur.sky1); gl.uniform3fv(U.uSky2, cur.sky2);
    gl.uniform3fv(U.uHill1, cur.hill1); gl.uniform3fv(U.uHill2, cur.hill2);
    gl.uniform3fv(U.uSun, cur.sun);
    gl.uniform2f(U.uSunPos, cur.sunPos[0], cur.sunPos[1] - (1 - intro) * .7);
    gl.uniform1f(U.uSunR, cur.sunR * (.6 + .4 * intro));
    gl.uniform1f(U.uLines, cur.lines);
    gl.uniform1f(U.uHills, cur.hills);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  window.PivkaGL = {
    // setSun: once the sun has set (from the journey section on), later sections keep it low
    setTheme(name, setSun) {
      if (!THEMES[name]) return;
      target = toState(THEMES[name]);
      if (setSun) {
        const low = THEMES.dusk;
        target.sunPos = low.sunPos.slice(); target.sunR = low.sunR; target.hills = low.hills;
      }
    },
    setMouse(x, y) { mouseT[0] = x; mouseT[1] = y; },
    startIntro() { intro = 0; }
  };
})();
