import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");
const client = resolve(dist, "client");
const server = resolve(dist, "server");

await rm(dist, { recursive: true, force: true });
await mkdir(resolve(client, "static"), { recursive: true });
await mkdir(server, { recursive: true });
await mkdir(resolve(dist, ".openai"), { recursive: true });

const sourceHtml = await readFile(resolve(root, "frontend", "index.html"), "utf8");
const hostedHtml = sourceHtml
  .replace('data-runtime="local"', 'data-runtime="hosted"')
  .replace('<script src="/static/js/local-db.js"></script>', '<script src="/static/js/local-db.js"></script>\n<script src="/static/js/hosted-cloud.js"></script>');

await writeFile(resolve(client, "index.html"), hostedHtml, "utf8");
await cp(resolve(root, "frontend", "css"), resolve(client, "static", "css"), { recursive: true });
await cp(resolve(root, "frontend", "js"), resolve(client, "static", "js"), { recursive: true });
await cp(resolve(root, "public"), client, { recursive: true });
await cp(resolve(root, "hosted", "worker_v12.js"), resolve(server, "index.js"));
await cp(resolve(root, "hosted", "prompt.js"), resolve(server, "prompt.js"));
await cp(resolve(root, "hosted", "repository.js"), resolve(server, "repository.js"));
await cp(resolve(root, ".openai", "hosting.json"), resolve(dist, ".openai", "hosting.json"));

console.log("Build hospedado criado em dist/ com dados pessoais excluidos.");
