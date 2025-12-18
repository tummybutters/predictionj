import fs from "node:fs";
import path from "node:path";

const dirs = [".next", ".next-dev"].map((d) => path.join(process.cwd(), d));

for (const dir of dirs) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // ignore
  }
}
