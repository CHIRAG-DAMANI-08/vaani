const fs = require("fs");
const p = require("path");
const root = p.join("C:", "Code", "vaani");

// Find the sign-in and sign-up page files
const authDir = p.join(root, "src", "app", "(auth)");
if (!fs.existsSync(authDir)) {
  console.log("ERROR: auth dir not found at", authDir);
  process.exit(1);
}

const authSubdirs = fs.readdirSync(authDir);
console.log("Auth subdirs:", authSubdirs);

for (const subdir of authSubdirs) {
  if (subdir !== "layout.tsx" && fs.statSync(p.join(authDir, subdir)).isDirectory()) {
    // Find the page.tsx inside [...subdir]
    const subdirPath = p.join(authDir, subdir);
    const files = fs.readdirSync(subdirPath);
    for (const file of files) {
      if (file === "page.tsx") {
        const pagePath = p.join(subdirPath, file);
        let c = fs.readFileSync(pagePath, "utf8");
        const hadLogger = c.includes("from \"@/lib/logger\"");

        if (!hadLogger) {
          c = c.replace(/^import .+;?$/m, (match) => match + '\nimport { logger } from "@/lib/logger";');
        }

        const before = (c.match(/console\./g) || []).length;

        c = c.replace(/console\.error\(JSON\.stringify\(error, null, 2\)\)/g, 'logger.error({ err: error }, "Auth failed")');
        c = c.replace(/console\.log\(session\?\.currentTask\)/g, "// debug probe removed");
        c = c.replace(/console\.error\("Google OAuth error:", error\)/g, 'logger.error({ err: error }, "Google OAuth error")');
        c = c.replace(/console\.error\("Google OAuth exception:", err\)/g, 'logger.error({ err }, "Google OAuth exception")');

        const after = (c.match(/console\./g) || []).length;
        fs.writeFileSync(pagePath, c);
        console.log(`✓ ${subdir}/page.tsx: ${before} → ${after} console calls remaining${hadLogger ? " (logger already imported)" : ""}`);
      }
    }
  }
}
