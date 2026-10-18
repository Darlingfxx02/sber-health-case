// A small, texture-free WebGL starfield. No scene engine or continuous work offscreen.
const vertex = `attribute vec2 position;
void main(){gl_Position=vec4(position,0.,1.);}`;
const fragment = `precision highp float;
uniform vec2 resolution;
uniform float time;
uniform float pixelRatio;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float stars(vec2 p,float cell,float seed){
  vec2 id=floor(p/cell), local=mod(p,cell)-cell*.5;
  float n=hash(id+seed), m=hash(id+seed+19.);
  vec2 offset=(vec2(n,m)-.5)*cell*.7;
  vec2 d=local-offset;
  float radius=mix(.45,1.05,n*n);
  float core=exp(-dot(d,d)/(radius*radius));
  float halo=exp(-length(d)*1.25)*.12*step(.9,n);
  float twinkle=.78+.22*sin(time*(.35+m*.65)+n*40.);
  return (core+halo)*mix(.24,.95,n)*twinkle*step(.3,m);
}
void main(){
  vec2 p=gl_FragCoord.xy/pixelRatio;
  float s=stars(p+vec2(time*.65,time*.3),39.,1.);
  s+=stars(p+vec2(time*1.1,time*.48),71.,47.);
  s+=stars(p+vec2(time*.3,time*.16),113.,89.);
  vec2 uv=gl_FragCoord.xy/resolution;
  float quiet=1.-.38*exp(-dot((uv-.5)*vec2(2.1,4.),(uv-.5)*vec2(2.1,4.)));
  gl_FragColor=vec4(vec3(.008,.01,.018)+vec3(.87,.92,1.)*s*quiet,1.);
}`;

export function createStarfield(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    depth: false,
    powerPreference: "low-power",
  });
  if (!gl) return { setActive: (_value: boolean) => {}, dispose: () => {} };
  function compile(kind: number, source: string) {
    const shader = gl!.createShader(kind)!;
    gl!.shaderSource(shader, source);
    gl!.compileShader(shader);
    if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
      gl!.deleteShader(shader);
      return null;
    }
    return shader;
  }
  const vs = compile(gl.VERTEX_SHADER, vertex),
    fs = compile(gl.FRAGMENT_SHADER, fragment);
  if (!vs || !fs) {
    if (vs) gl.deleteShader(vs);
    if (fs) gl.deleteShader(fs);
    return { setActive: (_value: boolean) => {}, dispose: () => {} };
  }
  const program = gl.createProgram()!;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return { setActive: (_value: boolean) => {}, dispose: () => {} };
  }
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW,
  );
  const position = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const resolution = gl.getUniformLocation(program, "resolution"),
    time = gl.getUniformLocation(program, "time"),
    pixelRatio = gl.getUniformLocation(program, "pixelRatio");
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  let raf = 0,
    active = true,
    visible = false,
    disposed = false,
    lost = false,
    elapsed = 0,
    previous = 0;
  function draw() {
    if (disposed || lost || !canvas.clientWidth || !canvas.clientHeight) return;
    const ratio = Math.min(devicePixelRatio || 1, 1.5),
      width = Math.round(canvas.clientWidth * ratio),
      height = Math.round(canvas.clientHeight * ratio);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl!.viewport(0, 0, width, height);
    gl!.uniform2f(resolution, width, height);
    gl!.uniform1f(pixelRatio, ratio);
    gl!.uniform1f(time, elapsed / 1000);
    gl!.drawArrays(gl!.TRIANGLES, 0, 6);
    canvas.dataset.ready = "true";
  }
  function tick(now: number) {
    if (!previous) previous = now;
    if (now - previous >= 32) {
      elapsed += Math.min(now - previous, 64);
      previous = now;
      draw();
    }
    raf = requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(raf);
    previous = 0;
    if (disposed || lost || !active || !visible || document.hidden) return;
    draw();
    if (!motion.matches) raf = requestAnimationFrame(tick);
  }
  const intersection = new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    sync();
  });
  intersection.observe(canvas);
  const resize = new ResizeObserver(() => {
    if (active && visible) draw();
  });
  resize.observe(canvas);
  const contextLost = (event: Event) => {
    event.preventDefault();
    lost = true;
    delete canvas.dataset.ready;
    cancelAnimationFrame(raf);
  };
  canvas.addEventListener("webglcontextlost", contextLost);
  document.addEventListener("visibilitychange", sync);
  motion.addEventListener("change", sync);
  return {
    setActive(value: boolean) {
      active = value;
      sync();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      intersection.disconnect();
      resize.disconnect();
      document.removeEventListener("visibilitychange", sync);
      motion.removeEventListener("change", sync);
      canvas.removeEventListener("webglcontextlost", contextLost);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    },
  };
}
