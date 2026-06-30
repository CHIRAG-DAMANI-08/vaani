const fs = require("fs");
const p = require("path");
const root = p.join("C:", "Code", "vaani");
const authDir = p.join(root, "src", "app", "(auth)");

// Recursively find all page.tsx files
function findPages(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir)) {
    const full = p.join(dir, entry);
    if (fs.statSync(full).isDirectory()) {
      results.push(...findPages(full));
    } else if (entry === "page.tsx") {
      results.push(full);
    }
  }
  return results;
}

const pages = findPages(authDir);
console.log("Found pages:", pages);

for (const pagePath of pages) {
  let c = fs.readFileSync(pagePath, "utf8");
  const hadLogger = c.includes("from \"@/lib/logger\"");
  const before = (c.match(/console\./g) || []).length;

  if (!hadLogger && before > 0) {
    c = c.replace(/^import .+;?$/m, (match) => match + '\nimport { logger } from "@/lib/logger";');
  }

  // Replace console.error with logger.error
  c = c.replace(/console\.error\(JSON\.stringify\(error, null, 2\)\)/g, 'logger.error({ err: error }, "Auth failed")');
  c = c.replace(/console\.log\(session\?\.currentTask\)/g, "// debug probe removed");
  c = c.replace(/console\.error\("Google OAuth error:", error\)/g, 'logger.error({ err: error }, "Google OAuth error")');
  c = c.replace(/console\.error\("Google OAuth exception:", err\)/g, 'logger.error({ err }, "Google OAuth exception")');

  const after = (c.match(/console\./g) || []).length;
  if (before > 0) {
    fs.writeFileSync(pagePath, c);
    console.log(`✓ ${pagePath.replace(root, "").replace(/\\/g, "/")}: ${before} → ${after} console calls`);
  }
}
