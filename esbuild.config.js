import esbuild from "esbuild";
import fs from "node:fs";
const wgslMinify = {
  name: "wgsl-minify",
  setup(build) {
    build.onLoad({ filter: /\.wgsl$/ }, async (args) => {
      let text = await fs.promises.readFile(args.path, "utf8");
      text = text
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "")
        .replace(/\s+/g, " ")
        .trim();
      return { contents: text, loader: "text" };
    });
  }
};
const common = {
  bundle: true,
  platform: "browser",
  target: ["es2023"],
  external: ["node:*"],
  loader: { ".wasm": "file" },
  plugins: [wgslMinify],
  assetNames: "[name]",
  logLevel: "info"
};
try {
  await esbuild.build({
    ...common,
    entryPoints: ["./src/index.ts"],
    define: {
      __WASMGPU_BASE_URL__: "import.meta.url"
    },
    format: "esm",
    minify: false,
    outfile: "./dist/WasmGPU.js"
  });
  await esbuild.build({
    ...common,
    entryPoints: ["./src/index.ts"],
    define: {
      __WASMGPU_BASE_URL__: "import.meta.url"
    },
    format: "esm",
    minify: true,
    outfile: "./dist/WasmGPU.min.js"
  });
  await esbuild.build({
    ...common,
    entryPoints: ["./src/index.iife.ts"],
    define: {
      __WASMGPU_BASE_URL__: "\"__CURRENT_SCRIPT__\""
    },
    format: "iife",
    globalName: "WasmGPU",
    minify: true,
    outfile: "./dist/WasmGPU.iife.min.js",
    footer: {
      js: `
(() => {
  const g = globalThis;
  if (g.WasmGPU && g.WasmGPU.default) g.WasmGPU = g.WasmGPU.default;
})();`
    }
  });
  fs.copyFileSync("./build/wasm.wasm", "./dist/wasm.wasm");
  fs.copyFileSync("./build/wasm.js", "./dist/wasm.js");
} catch (e) {
  process.exit(1);
}
