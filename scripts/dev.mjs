import { execFileSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const viteEntry = join(root, "node_modules/vite/bin/vite.js");

function nodeVersion(binary) {
  try {
    return execFileSync(binary, ["-v"], { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

function isSupportedNode(version) {
  const match = /^v(\d+)\.(\d+)\.(\d+)/.exec(version ?? "");
  if (!match) return false;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  return major === 22 && minor >= 13;
}

const candidates = [
  process.env.EMPIRE_NODE_BIN,
  join(process.env.HOME ?? "", ".local/bin/node"),
  join(process.env.HOME ?? "", ".nvm/versions/node/v22.22.3/bin/node"),
  join(process.env.HOME ?? "", ".nvm/versions/node/v22.18.0/bin/node"),
  process.execPath,
].filter(Boolean);

const nodeBinary = candidates.find((candidate) =>
  isSupportedNode(nodeVersion(candidate)),
);

if (!nodeBinary) {
  console.error(
    "未找到 Node.js 22.13+（22.x）。请安装 Node 22.22.3，或设置 EMPIRE_NODE_BIN。",
  );
  process.exit(1);
}

if (!existsSync(viteEntry)) {
  console.error("未找到 Vite 依赖，请先在项目目录执行 pnpm install。", viteEntry);
  process.exit(1);
}

const host = process.env.EMPIRE_HOST ?? "127.0.0.1";
const port = process.env.EMPIRE_PORT ?? "4173";
const child = spawn(
  nodeBinary,
  [viteEntry, "--host", host, "--port", port, "--strictPort"],
  {
    cwd: join(root, "apps/game-web"),
    env: {
      ...process.env,
      PATH: `${dirname(nodeBinary)}:${process.env.PATH ?? ""}`,
    },
    stdio: "inherit",
  },
);

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
