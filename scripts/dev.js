import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT || 4173);

// Local development reads the same server-only key that Vercel injects into
// the serverless functions. It is never copied into the static build.
function loadEnv() {
  const envPath = join(projectRoot, ".env");
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equals = trimmed.indexOf("=");
    if (equals === -1) continue;

    const key = trimmed.slice(0, equals).trim();
    let value = trimmed.slice(equals + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnv();

const apiRoutes = new Map([
  ["/api/weather", join(projectRoot, "api", "weather.js")],
  ["/api/search", join(projectRoot, "api", "search.js")],
]);

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

const securityHeaders = {
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: https://cdn.weatherapi.com; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "X-Frame-Options": "DENY",
};

const apiHandlers = new Map();

async function handleApi(request, response, handlerPath) {
  try {
    let handler = apiHandlers.get(handlerPath);
    if (!handler) {
      handler = (await import(pathToFileURL(handlerPath).href)).default;
      apiHandlers.set(handlerPath, handler);
    }
    await handler(request, response);
  } catch (error) {
    if (!response.headersSent) {
      response.writeHead(502, {
        ...securityHeaders,
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      });
      response.end(JSON.stringify({ error: { code: "GENERIC" } }));
    }
  }
}

const server = createServer((request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);

  if (apiRoutes.has(url.pathname)) {
    handleApi(request, response, apiRoutes.get(url.pathname));
    return;
  }

  const requestedPath = decodeURIComponent(url.pathname);
  const relativePath = requestedPath === "/" ? "index.html" : requestedPath.replace(/^\/+/, "");
  const safePath = normalize(relativePath);

  if (safePath.startsWith("..") || safePath.includes(`..${sep}`)) {
    response.writeHead(403, securityHeaders);
    response.end("Forbidden");
    return;
  }

  const filePath = join(root, safePath);

  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404, { ...securityHeaders, "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  const contentType = contentTypes[extname(filePath).toLowerCase()] || "application/octet-stream";
  const headers = {
    ...securityHeaders,
    "Content-Type": contentType,
    "Cache-Control": "no-store",
  };

  response.writeHead(200, headers);
  createReadStream(filePath).pipe(response);
});

server.listen(port, () => {
  console.log(`SKY CRED preview running at http://localhost:${port}`);
});
