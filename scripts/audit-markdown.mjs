import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const checkExternal = args.has("--external");
const writeReport = args.has("--write-report");
if (writeReport) {
  const placeholder = path.join(root, "docs", "LINK_AUDIT.md");
  fs.mkdirSync(path.dirname(placeholder), { recursive: true });
  if (!fs.existsSync(placeholder))
    fs.writeFileSync(placeholder, "# Documentation Link Audit\n", "utf8");
}

const ignoredDirectories = new Set([
  ".git",
  ".next",
  ".vercel",
  "node_modules",
  "coverage",
  "dist",
]);

function walk(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".") && ignoredDirectories.has(entry.name))
      continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) files.push(...walk(absolute));
      continue;
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".md"))
      files.push(absolute);
  }
  return files;
}

function normalizeTarget(raw) {
  let target = raw.trim();
  if (target.startsWith("<") && target.endsWith(">"))
    target = target.slice(1, -1);
  target = target.replace(/[.,;:]+$/u, "");
  return target;
}

function collectTargets(content) {
  const targets = new Set();
  const markdown = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/gu;
  const rawUrl = /https?:\/\/[^\s<>"'`\])]+/gu;
  for (const match of content.matchAll(markdown))
    targets.add(normalizeTarget(match[1]));
  for (const match of content.matchAll(rawUrl))
    targets.add(normalizeTarget(match[0]));
  return [...targets].filter(Boolean);
}

function githubSlug(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/<[^>]+>/gu, "")
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s+/gu, "-")
    .replace(/-+/gu, "-");
}

function headingAnchors(content) {
  const anchors = new Set();
  const counts = new Map();
  for (const line of content.split(/\r?\n/u)) {
    const heading = /^(#{1,6})\s+(.+?)\s*#*$/u.exec(line);
    if (!heading) continue;
    const base = githubSlug(heading[2]);
    if (!base) continue;
    const seen = counts.get(base) ?? 0;
    counts.set(base, seen + 1);
    anchors.add(seen === 0 ? base : `${base}-${seen}`);
  }
  for (const match of content.matchAll(
    /<a\s+(?:name|id)=["']([^"']+)["'][^>]*>/giu,
  )) {
    anchors.add(match[1]);
  }
  return anchors;
}

function splitTarget(target) {
  const hashIndex = target.indexOf("#");
  if (hashIndex < 0) return { filePart: target, anchor: "" };
  return {
    filePart: target.slice(0, hashIndex),
    anchor: decodeURIComponent(target.slice(hashIndex + 1)),
  };
}

function isExternal(target) {
  return /^https?:\/\//iu.test(target);
}

const markdownFiles = walk(root).filter(
  (file) =>
    path.relative(root, file).replaceAll("\\", "/") !== "docs/LINK_AUDIT.md",
);
const cache = new Map(
  markdownFiles.map((file) => [file, fs.readFileSync(file, "utf8")]),
);
const localFailures = [];
const externalReferences = new Map();
let localReferenceCount = 0;

for (const [sourceFile, content] of cache) {
  const sourceRelative = path.relative(root, sourceFile).replaceAll("\\", "/");
  for (const target of collectTargets(content)) {
    if (/^(mailto:|tel:|javascript:)/iu.test(target)) continue;
    if (isExternal(target)) {
      const parsed = new URL(target);
      if (["localhost", "127.0.0.1", "::1"].includes(parsed.hostname)) continue;
      const normalized = `${parsed.origin}${parsed.pathname}${parsed.search}`;
      if (!externalReferences.has(normalized))
        externalReferences.set(normalized, new Set());
      externalReferences.get(normalized).add(sourceRelative);
      continue;
    }

    const { filePart, anchor } = splitTarget(target);
    let destination = sourceFile;
    if (filePart) {
      const decoded = decodeURIComponent(filePart.split("?")[0]);
      destination = path.resolve(path.dirname(sourceFile), decoded);
      localReferenceCount += 1;
      if (!fs.existsSync(destination)) {
        localFailures.push(`${sourceRelative}: missing local target ${target}`);
        continue;
      }
      if (fs.statSync(destination).isDirectory()) {
        const readme = path.join(destination, "README.md");
        if (fs.existsSync(readme)) destination = readme;
      }
    }

    if (anchor) {
      localReferenceCount += 1;
      if (
        !fs.existsSync(destination) ||
        fs.statSync(destination).isDirectory()
      ) {
        localFailures.push(
          `${sourceRelative}: cannot validate anchor ${target}`,
        );
        continue;
      }
      const destinationContent =
        cache.get(destination) ?? fs.readFileSync(destination, "utf8");
      const anchors = headingAnchors(destinationContent);
      if (!anchors.has(anchor.toLowerCase())) {
        localFailures.push(`${sourceRelative}: missing anchor ${target}`);
      }
    }
  }
}

async function request(url, method) {
  const response = await fetch(url, {
    method,
    redirect: "follow",
    headers: {
      "user-agent": "BOUNDARY-Documentation-Audit/1.0",
      ...(method === "GET" ? { range: "bytes=0-1024" } : {}),
    },
    signal: AbortSignal.timeout(15_000),
  });
  return response;
}

async function inspectExternal(url) {
  let response;
  let error;
  try {
    response = await request(url, "HEAD");
    if ([400, 405, 501].includes(response.status))
      response = await request(url, "GET");
  } catch (firstError) {
    error = firstError;
    try {
      response = await request(url, "GET");
      error = undefined;
    } catch (secondError) {
      error = secondError;
    }
  }

  if (!response) {
    return {
      url,
      status: "network-warning",
      result: "warning",
      detail: error instanceof Error ? error.message : "Network request failed",
    };
  }

  const status = response.status;
  if (status >= 200 && status < 400) {
    return { url, status: String(status), result: "pass", detail: "Reachable" };
  }
  if ([401, 403, 429].includes(status)) {
    return {
      url,
      status: String(status),
      result: "warning",
      detail: "Reachable but access-controlled or rate-limited",
    };
  }
  if ([404, 410].includes(status)) {
    return {
      url,
      status: String(status),
      result: "fail",
      detail: "Definite broken link",
    };
  }
  return {
    url,
    status: String(status),
    result: "warning",
    detail: "Transient or unexpected response",
  };
}

const externalResults = [];
if (checkExternal) {
  const urls = [...externalReferences.keys()].sort();
  const concurrency = 4;
  let index = 0;
  async function worker() {
    while (index < urls.length) {
      const current = urls[index++];
      externalResults.push(await inspectExternal(current));
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, urls.length || 1) }, worker),
  );
  externalResults.sort((a, b) => a.url.localeCompare(b.url));
}

const definiteExternalFailures = externalResults.filter(
  (item) => item.result === "fail",
);
const warnings = externalResults.filter((item) => item.result === "warning");

if (writeReport) {
  const reportPath = path.join(root, "docs", "LINK_AUDIT.md");
  const checkedDate = new Date().toISOString().slice(0, 10);
  const rows = externalResults.length
    ? externalResults
        .map(
          (item) =>
            `| ${item.result === "pass" ? "PASS" : item.result === "fail" ? "FAIL" : "WARN"} | ${item.status} | ${item.url.replaceAll("|", "%7C")} | ${item.detail} |`,
        )
        .join("\n")
    : "| PASS | — | No external check requested | Local documentation validation only |";
  const report = `# Documentation Link Audit\n\n<!-- boundary-doc-nav:start -->\n> **BOUNDARY documentation** · [Overview](../README.md) · [Docs index](./README.md) · [Architecture](./ARCHITECTURE.md) · [Demo](./DEMO_SCRIPT.md) · [Judge testing](./JUDGE_TESTING.md) · [Deployment](./DEPLOYMENT.md) · [Threat model](./THREAT_MODEL.md)\n<!-- boundary-doc-nav:end -->\n\n---\n\n## Summary\n\n- Checked: ${checkedDate} (UTC)\n- Markdown files: ${markdownFiles.length}\n- Local references and anchors: ${localReferenceCount}\n- Local failures: ${localFailures.length}\n- External URLs: ${externalResults.length}\n- Definite external failures: ${definiteExternalFailures.length}\n- External warnings: ${warnings.length}\n\nWarnings generally indicate bot protection, authentication, rate limiting, or transient network behavior. They are not treated as broken unless the server definitively returns HTTP 404 or 410.\n\n## External results\n\n| Result | HTTP | URL | Detail |\n| --- | ---: | --- | --- |\n${rows}\n\n## Local failures\n\n${localFailures.length ? localFailures.map((failure) => `- ${failure}`).join("\n") : "All local files and heading anchors resolved successfully."}\n\n<!-- boundary-doc-footer:start -->\n---\n[Documentation index](./README.md) · [Live demo](https://boundary-ai-agent-control.vercel.app) · [Repository](https://github.com/kaulastudies/boundary-ai-agent-control)\n<!-- boundary-doc-footer:end -->\n`;
  fs.writeFileSync(reportPath, report, "utf8");
}

console.log(`Markdown files checked: ${markdownFiles.length}`);
console.log(`Local references checked: ${localReferenceCount}`);
console.log(`External URLs checked: ${externalResults.length}`);
console.log(`Warnings: ${warnings.length}`);

if (localFailures.length || definiteExternalFailures.length) {
  for (const failure of localFailures) console.error(`LOCAL FAIL: ${failure}`);
  for (const failure of definiteExternalFailures)
    console.error(`EXTERNAL FAIL: ${failure.url} (${failure.status})`);
  process.exit(1);
}

console.log("Documentation link audit passed.");
