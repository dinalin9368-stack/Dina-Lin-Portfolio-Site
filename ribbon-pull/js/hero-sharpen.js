// Shows the demo reel through a canvas that enlarges it with a better filter than the browser's.
//
// The reel is 1204 x 704, the size it is shown at, so a sharp (2x) screen has to stretch it to twice that, and the browser
// does that with a plain bilinear stretch, which looks soft. Here every frame is drawn at the screen's real resolution with
// Catmull-Rom (bicubic) resampling followed by a gentle, halo-limited sharpen. The video element underneath still plays
// the picture and sound, and stays visible whenever the canvas cannot be used (no WebGL, a video that cannot be read as a
// texture, or a screen where the reel is shown at or below its own size).
(function () {
  if (typeof heroPanel === 'undefined' || typeof heroVideo === 'undefined' || !heroPanel || !heroVideo) return;

  const MAX_BACKING_WIDTH = 3000;   // device px
  const SHARPEN = 0.55;             // how much edge contrast is added back
  const MIN_UPSCALE = 1.05;         // only used when the reel is enlarged by at least this much

  const canvas = document.createElement('canvas');
  canvas.className = 'hero-panel-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  heroVideo.insertAdjacentElement('afterend', canvas);

  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: false });
  if (!gl) { canvas.remove(); return; }

  const vertexSource = `
    attribute vec2 position;
    varying vec2 uv;
    void main() {
      uv = vec2(position.x * 0.5 + 0.5, 0.5 - position.y * 0.5);
      gl_Position = vec4(position, 0.0, 1.0);
    }`;

  const fragmentSource = `
    precision highp float;
    uniform sampler2D tex;
    uniform vec2 texSize;
    uniform float sharpen;
    varying vec2 uv;

    // nine-tap Catmull-Rom: the sharper bicubic filter, done with bilinear fetches
    vec3 catmullRom(vec2 coord) {
      vec2 p = coord * texSize;
      vec2 tc = floor(p - 0.5) + 0.5;
      vec2 f = p - tc;
      vec2 f2 = f * f;
      vec2 f3 = f2 * f;
      vec2 w0 = f2 - 0.5 * (f3 + f);
      vec2 w1 = 1.5 * f3 - 2.5 * f2 + 1.0;
      vec2 w3 = 0.5 * (f3 - f2);
      vec2 w2 = 1.0 - w0 - w1 - w3;
      vec2 w12 = w1 + w2;
      vec2 t0 = (tc - 1.0) / texSize;
      vec2 t3 = (tc + 2.0) / texSize;
      vec2 t12 = (tc + w2 / w12) / texSize;
      vec3 c = vec3(0.0);
      c += texture2D(tex, vec2(t0.x, t0.y)).rgb * (w0.x * w0.y);
      c += texture2D(tex, vec2(t12.x, t0.y)).rgb * (w12.x * w0.y);
      c += texture2D(tex, vec2(t3.x, t0.y)).rgb * (w3.x * w0.y);
      c += texture2D(tex, vec2(t0.x, t12.y)).rgb * (w0.x * w12.y);
      c += texture2D(tex, vec2(t12.x, t12.y)).rgb * (w12.x * w12.y);
      c += texture2D(tex, vec2(t3.x, t12.y)).rgb * (w3.x * w12.y);
      c += texture2D(tex, vec2(t0.x, t3.y)).rgb * (w0.x * w3.y);
      c += texture2D(tex, vec2(t12.x, t3.y)).rgb * (w12.x * w3.y);
      c += texture2D(tex, vec2(t3.x, t3.y)).rgb * (w3.x * w3.y);
      return c;
    }

    void main() {
      vec3 c = clamp(catmullRom(uv), 0.0, 1.0);

      // unsharp mask against the neighbours one source pixel away, kept inside their range so it cannot make halos
      vec2 d = 1.0 / texSize;
      vec3 a = texture2D(tex, uv + vec2(d.x, 0.0)).rgb;
      vec3 b = texture2D(tex, uv - vec2(d.x, 0.0)).rgb;
      vec3 e = texture2D(tex, uv + vec2(0.0, d.y)).rgb;
      vec3 g = texture2D(tex, uv - vec2(0.0, d.y)).rgb;
      vec3 blur = (a + b + e + g) * 0.25;
      vec3 lo = min(min(a, b), min(e, g));
      vec3 hi = max(max(a, b), max(e, g));
      vec3 sharp = c + sharpen * (c - blur);
      sharp = clamp(sharp, min(lo, c) - 0.03, max(hi, c) + 0.03);
      gl_FragColor = vec4(clamp(sharp, 0.0, 1.0), 1.0);
    }`;

  const compile = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
  };

  const vertex = compile(gl.VERTEX_SHADER, vertexSource);
  const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!vertex || !fragment) { canvas.remove(); return; }
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { canvas.remove(); return; }
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.uniform1i(gl.getUniformLocation(program, 'tex'), 0);
  const texSizeUniform = gl.getUniformLocation(program, 'texSize');
  gl.uniform1f(gl.getUniformLocation(program, 'sharpen'), SHARPEN);

  let failed = false;
  let drawn = false;

  const show = (on) => {
    canvas.classList.toggle('is-active', on);
  };

  // matches the canvas's pixels to the screen's, and decides whether the sharpened picture is worth using
  const fitCanvas = () => {
    const rect = canvas.getBoundingClientRect();
    const width = Math.min(Math.round(rect.width * (window.devicePixelRatio || 1)), MAX_BACKING_WIDTH);
    const height = Math.round(width * rect.height / Math.max(1, rect.width));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
    return heroVideo.videoWidth > 0 && width >= heroVideo.videoWidth * MIN_UPSCALE;
  };

  function render() {
    if (failed || heroVideo.readyState < 2 || !heroVideo.videoWidth) return;
    if (!fitCanvas()) { show(false); return; }
    try {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, heroVideo);
    } catch (err) {
      // the video cannot be used as a texture here (for instance when the page is opened from a file): keep the plain video
      failed = true;
      show(false);
      return;
    }
    gl.uniform2f(texSizeUniform, heroVideo.videoWidth, heroVideo.videoHeight);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    drawn = true;
    show(true);
  }

  // draw whenever a new picture arrives; fall back to the animation loop where that is not offered
  let visible = true;
  new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; if (visible) render(); }).observe(heroPanel);

  if ('requestVideoFrameCallback' in heroVideo) {
    const onFrame = () => {
      if (visible) render();
      heroVideo.requestVideoFrameCallback(onFrame);
    };
    heroVideo.requestVideoFrameCallback(onFrame);
  } else {
    let lastTime = -1;
    const loop = () => {
      if (visible && (heroVideo.currentTime !== lastTime || !drawn)) {
        lastTime = heroVideo.currentTime;
        render();
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  // a paused or seeking video produces no new pictures, so these redraw it (also after a resize)
  ['loadeddata', 'seeked', 'pause', 'play', 'canplay'].forEach((type) => heroVideo.addEventListener(type, render));
  window.addEventListener('resize', render);
  window.addEventListener('pagescale', () => setTimeout(render, 80));
  if ('ResizeObserver' in window) new ResizeObserver(render).observe(heroPanel);
})();
