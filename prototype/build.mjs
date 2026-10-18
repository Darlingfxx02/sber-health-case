import { build, context } from "esbuild";
import { liquidGlassScalePatch } from "./patches/liquid-glass-scale.mjs";
const options = {
  entryPoints: ["src/main.jsx"],
  plugins: [liquidGlassScalePatch],
  bundle: true,
  loader: { ".svg": "text" },
  format: "esm",
  jsx: "automatic",
  target: "es2022",
  minify: true,
  outfile: "app.bundle.js",
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "info",
};
const presentation = {
  entryPoints: ["presentation/src/main.ts"],
  external: ["assets/*"],
  bundle: true,
  format: "esm",
  target: "es2022",
  minify: true,
  outfile: "case.bundle.js",
  logLevel: "info",
};
if (process.argv.includes("--watch")) {
  for (const config of [options, presentation]) {
    const builder = await context(config);
    await builder.watch();
  }
} else {
  await build(options);
  await build(presentation);
}
