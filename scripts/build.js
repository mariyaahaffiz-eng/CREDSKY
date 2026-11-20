import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, copyFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const envPath = join(root, ".env");

function readEnvFile(path) {
  if (!existsSync(path)) return {};

  return readFileSync(path, "utf8")
    .split(/\r?\n/)
    .reduce((values, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return values;

      const equals = trimmed.indexOf("=");
      if (equals === -1) return values;

      const key = trimmed.slice(0, equals).trim();
      let value = trimmed.slice(equals + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      values[key] = value;
      return values;
    }, {});
}

function copyDirectory(source, destination) {
  mkdirSync(destination, { recursive: true });

  for (const entry of readdirSync(source)) {
    if (entry === "config.js") continue;

    const sourcePath = join(source, entry);
    const destinationPath = join(destination, entry);

    if (statSync(sourcePath).isDirectory()) {
      copyDirectory(sourcePath, destinationPath);
    } else {
      copyFileSync(sourcePath, destinationPath);
    }
  }
}

const env = readEnvFile(envPath);
const apiKey = (
  process.env.WEATHER_API_KEY ||
  process.env.VITE_WEATHER_API_KEY ||
  env.WEATHER_API_KEY ||
  env.VITE_WEATHER_API_KEY ||
  ""
).trim();

if (!apiKey || /^your_weatherapi/i.test(apiKey)) {
  console.error(
    "Build failed: WEATHER_API_KEY is missing. Add it to .env locally or to the Vercel project environment variables.",
  );
  process.exit(1);
}

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

copyFileSync(join(root, "index.html"), join(dist, "index.html"));
copyFileSync(join(root, "favicon.svg"), join(dist, "favicon.svg"));
copyDirectory(join(root, "css"), join(dist, "css"));
copyDirectory(join(root, "js"), join(dist, "js"));

const configSource = `/**
 * Generated at build time from WEATHER_API_KEY.
 * Front-end API keys are visible to users; never treat this as a server secret.
 */
export const CONFIG = Object.freeze({
  WEATHER_API_KEY: ${JSON.stringify(apiKey)},
});
`;

writeFileSync(join(dist, "js", "config.js"), configSource, "utf8");

console.log(`SKY CRED build complete → ${relative(root, dist)}`);
console.log("WeatherAPI key injected from the environment (value hidden).");
