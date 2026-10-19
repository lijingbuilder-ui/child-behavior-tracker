const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");

test("all configured mini program pages have script, template and styles", () => {
  const appConfig = JSON.parse(fs.readFileSync(path.join(root, "miniprogram/app.json"), "utf8"));
  for (const page of appConfig.pages) {
    for (const extension of [".js", ".wxml", ".wxss"]) {
      assert.equal(
        fs.existsSync(path.join(root, "miniprogram", `${page}${extension}`)),
        true,
        `${page}${extension} should exist`
      );
    }
  }
});

test("recording privacy defaults to deletion", () => {
  const source = fs.readFileSync(
    path.join(root, "cloudfunctions/behaviorApi/index.js"),
    "utf8"
  );
  assert.match(source, /KEEP_RECORDINGS !== "true"/);
  assert.match(source, /cloud\.deleteFile/);
});

test("database is inaccessible directly from mini program clients", () => {
  const rules = JSON.parse(fs.readFileSync(path.join(root, "database.rules.json"), "utf8"));
  assert.equal(rules.rules.behavior_records[".read"], false);
  assert.equal(rules.rules.behavior_records[".write"], false);
});
