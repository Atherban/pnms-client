const fs = require("fs");
const path = require("path");

const CLIENT_ROOT = path.resolve(__dirname, "..");
const BACKEND_ROOT = path.resolve(CLIENT_ROOT, "..", "pnms");
const TARGET_DIR = path.resolve(CLIENT_ROOT, "postman");
const SOURCE_DIR = path.resolve(BACKEND_ROOT, "postman");

const FILE_MAP = [
  {
    source: path.resolve(SOURCE_DIR, "PNMS-Frontend-QA.postman_collection.json"),
    target: path.resolve(TARGET_DIR, "PNMS-Frontend-QA.postman_collection.json")
  },
  {
    source: path.resolve(SOURCE_DIR, "PNMS-Frontend-QA.postman_environment.json"),
    target: path.resolve(TARGET_DIR, "PNMS-Frontend-QA.postman_environment.json")
  }
];

fs.mkdirSync(TARGET_DIR, { recursive: true });

for (const file of FILE_MAP) {
  if (!fs.existsSync(file.source)) {
    console.error(`Missing source file: ${file.source}`);
    process.exit(1);
  }
  fs.copyFileSync(file.source, file.target);
  console.log(`Synced ${path.basename(file.target)}`);
}
