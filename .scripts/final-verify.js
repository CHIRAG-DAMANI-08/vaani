const fs = require("fs");
const p = require("path");

function scan(dir) {
  let files = [];
  for (const e of fs.readdirSync(dir)) {
    const f = p.join(dir, e);
    if (fs.statSync(f).isDirectory() && f.indexOf("node_modules") === -1 && f.indexOf(".next") === -1) {
      files = files.concat(scan(f));
    } else if (f.endsWith(".ts") || f.endsWith(".tsx")) {
      files.push(f);
    }
  }
  return files;
}

const all = scan(p.join("C:", "Code", "vaani", "src"));
const serverContent = fs.readFileSync(p.join("C:", "Code", "vaani", "server.ts"), "utf8");
const serverMatches = (serverContent.match(/console\./g) || []).length;

let srcCount = 0;
for (const f of all) {
  const c = fs.readFileSync(f, "utf8");
  const m = c.match(/console\./g);
  if (m) {
    srcCount += m.length;
    console.log(f.replace(p.join("C:", "Code", "vaani", ""), "").replace(/\\/g, "/"), ":", m.length);
  }
}

console.log("\nsrc/:", srcCount, "console.* remaining");
console.log("server.ts:", serverMatches, "console.* remaining");
console.log("Total:", srcCount + serverMatches);
