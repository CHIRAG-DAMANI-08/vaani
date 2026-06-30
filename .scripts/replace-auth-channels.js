const fs = require("fs");
const p = require("path");
const root = p.join("C:", "Code", "vaani");

// Auth sign-in page
const signInPath = p.join(root, "src", "app", "(auth)", "sign-in", "[...sign-in]", "page.tsx");
if (fs.existsSync(signInPath)) {
  let c = fs.readFileSync(signInPath, "utf8");
  // Add logger import
  if (!c.includes("from \"@/lib/logger\"")) {
    c = c.replace(/^import .+;$/m, (match) => match + "\nimport { logger } from \"@/lib/logger\";");
  }
  // Replace console calls
  c = c.replace(/console\.error\(JSON\.stringify\(error, null, 2\)\)/g, "logger.error({ err: error }, \"Sign-in failed\")");
  c = c.replace(/console\.log\(session\?\.currentTask\)/g, "// debug probe removed");
  c = c.replace(/console\.error\("Google OAuth error:", error\)/g, "logger.error({ err: error }, \"Google OAuth error\")");
  c = c.replace(/console\.error\("Google OAuth exception:", err\)/g, "logger.error({ err }, \"Google OAuth exception\")");
  fs.writeFileSync(signInPath, c);
  console.log("✓ sign-in page");
} else {
  console.log("✗ sign-in page not found");
}

// Auth sign-up page
const signUpPath = p.join(root, "src", "app", "(auth)", "sign-up", "[...sign-up]", "page.tsx");
if (fs.existsSync(signUpPath)) {
  let c = fs.readFileSync(signUpPath, "utf8");
  if (!c.includes("from \"@/lib/logger\"")) {
    c = c.replace(/^import .+;$/m, (match) => match + "\nimport { logger } from \"@/lib/logger\";");
  }
  c = c.replace(/console\.error\(JSON\.stringify\(error, null, 2\)\)/g, "logger.error({ err: error }, \"Sign-up failed\")");
  c = c.replace(/console\.log\(session\?\.currentTask\)/g, "// debug probe removed");
  c = c.replace(/console\.error\("Google OAuth error:", error\)/g, "logger.error({ err: error }, \"Google OAuth error\")");
  c = c.replace(/console\.error\("Google OAuth exception:", err\)/g, "logger.error({ err }, \"Google OAuth exception\")");
  fs.writeFileSync(signUpPath, c);
  console.log("✓ sign-up page");
} else {
  console.log("✗ sign-up page not found");
}

// Channels page
const channelsPath = p.join(root, "src", "app", "(dashboard)", "channels", "page.tsx");
if (fs.existsSync(channelsPath)) {
  let c = fs.readFileSync(channelsPath, "utf8");
  if (!c.includes("from \"@/lib/logger\"")) {
    c = c.replace(/^import .+;$/m, (match) => match + "\nimport { logger } from \"@/lib/logger\";");
  }
  c = c.replace(/console\.error\("Failed to fetch channels:", err\)/g, "logger.error({ err }, \"Channels fetch failed\")");
  c = c.replace(/console\.error\("Failed to save channel:", err\)/g, "logger.error({ err }, \"Channel save failed\")");
  c = c.replace(/console\.error\("Failed to toggle channel:", err\)/g, "logger.error({ err }, \"Channel toggle failed\")");
  c = c.replace(/console\.error\("Failed to delete channel:", err\)/g, "logger.error({ err }, \"Channel delete failed\")");
  fs.writeFileSync(channelsPath, c);
  console.log("✓ channels page");
} else {
  console.log("✗ channels page not found");
}

// OnboardingWizard — second console.error(e)
const onboardingPath = p.join(root, "src", "app", "components", "OnboardingWizard.tsx");
if (fs.existsSync(onboardingPath)) {
  let c = fs.readFileSync(onboardingPath, "utf8");
  // The first one was already replaced. Check for remaining
  const remaining = (c.match(/console\./g) || []).length;
  if (remaining > 0) {
    c = c.replace(/console\.error\(e\)/g, "logger.error({ err: e }, \"Onboarding step failed\")");
    fs.writeFileSync(onboardingPath, c);
    console.log("✓ OnboardingWizard (remaining " + remaining + " fixed)");
  } else {
    console.log("- OnboardingWizard: already clean");
  }
} else {
  console.log("✗ OnboardingWizard not found");
}
