/**
 * Starts Next.js on the first available port.
 * - Prefers PORT / FRONTEND_PORT env, else 3000.
 * - Skips 3001 (default NestJS API) when scanning for a free port.
 */
const net = require("net");
const { spawn } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");
const preferred = Number(process.env.PORT || process.env.FRONTEND_PORT || 3000) || 3000;

/** True if something already accepts connections on this port (IPv4 and/or IPv6). */
function portInUse(port) {
  return new Promise((resolve) => {
    const tryHost = (host, done) => {
      const c = net.createConnection({ port, host }, () => {
        c.destroy();
        done(true);
      });
      c.setTimeout(400);
      c.on("error", () => done(false));
      c.on("timeout", () => {
        c.destroy();
        done(false);
      });
    };
    tryHost("127.0.0.1", (v4) => {
      if (v4) return resolve(true);
      tryHost("::1", (v6) => resolve(v6));
    });
  });
}

function canBind(port) {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.unref();
    s.once("error", () => resolve(false));
    s.once("listening", () => s.close(() => resolve(true)));
    s.listen(port);
  });
}

async function portFree(port) {
  if (await portInUse(port)) return false;
  return canBind(port);
}

async function pickPort(start) {
  const RESERVED = new Set([3001]);
  const tried = new Set();

  async function tryOne(p) {
    if (RESERVED.has(p) || tried.has(p)) return null;
    tried.add(p);
    return (await portFree(p)) ? p : null;
  }

  let p = await tryOne(start);
  if (p != null) return p;

  for (let n = 3000; n < 3060; n++) {
    p = await tryOne(n);
    if (p != null) return p;
  }
  throw new Error("No free TCP port found for Next.js dev server");
}

(async () => {
  try {
    const port = await pickPort(preferred);
    if (port !== preferred) {
      console.warn(
        `\n[dev] Port ${preferred} is already in use — starting on http://localhost:${port} instead.\n`,
      );
    }
    let nextCli;
    try {
      nextCli = require.resolve("next/dist/bin/next", { paths: [root] });
    } catch {
      nextCli = path.join(root, "node_modules", "next", "dist", "bin", "next");
    }
    const child = spawn(process.execPath, [nextCli, "dev", "-p", String(port)], {
      cwd: root,
      stdio: "inherit",
      env: { ...process.env, PORT: String(port) },
    });
    child.on("exit", (code) => process.exit(code ?? 0));
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }
})();
