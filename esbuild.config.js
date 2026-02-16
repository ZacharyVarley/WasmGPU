import esbuild from "esbuild";
import fs from "node:fs";
const common = {
  bundle: true,
  platform: "browser",
  target: ["es2023"],
  external: ["node:*"],
  loader: {
    ".wasm": "file",
    ".wgsl": "text"
  },
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
