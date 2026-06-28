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
let count = 0;
for (const f of all) {
  const c = fs.readFileSync(f, "utf8");
  const m = c.match(/console\./g);
  if (m) {
    count += m.length;
    console.log(f.replace(p.join("C:", "Code", "vaani", ""), "").replace(/\\/g, "/"), ":", m.length);
  }
}
console.log("\nTotal console.* remaining:", count);
