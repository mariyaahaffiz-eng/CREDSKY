import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, sep } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
const port = Number(process.env.PORT || 4173);

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
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: https://cdn.weatherapi.com; connect-src 'self' https://api.weatherapi.com; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "X-Frame-Options": "DENY",
};

const server = createServer((request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
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
