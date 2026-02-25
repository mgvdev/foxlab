#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const PACKAGE_JSON_PATH = path.join(ROOT, "package.json");
const TAURI_CONF_PATH = path.join(ROOT, "src-tauri", "tauri.conf.json");
const CARGO_TOML_PATH = path.join(ROOT, "src-tauri", "Cargo.toml");

const SEMVER_REGEX = /^(\d+)\.(\d+)\.(\d+)$/;

function usage() {
  console.log(
    [
      "Usage:",
      "  bun run version:patch",
      "  bun run version:minor",
      "  bun run version:major",
      "  bun run version:set -- 1.2.3",
      "  bun run version:bump -- patch|minor|major|x.y.z [--dry-run]",
    ].join("\n"),
  );
}

function parseSemver(version) {
  const match = version.match(SEMVER_REGEX);
  if (!match) {
    throw new Error(`Version invalide: "${version}" (attendu: x.y.z)`);
  }

  return {
    major: Number.parseInt(match[1], 10),
    minor: Number.parseInt(match[2], 10),
    patch: Number.parseInt(match[3], 10),
  };
}

function bump(version, type) {
  const parsed = parseSemver(version);

  if (type === "major") {
    return `${parsed.major + 1}.0.0`;
  }

  if (type === "minor") {
    return `${parsed.major}.${parsed.minor + 1}.0`;
  }

  if (type === "patch") {
    return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
  }

  throw new Error(`Type de bump inconnu: "${type}"`);
}

function replaceCargoPackageVersion(cargoToml, nextVersion) {
  const match = cargoToml.match(/(\[package\][\s\S]*?\nversion\s*=\s*")(\d+\.\d+\.\d+)(")/m);
  if (!match) {
    throw new Error("Impossible de localiser [package].version dans src-tauri/Cargo.toml");
  }

  return cargoToml.replace(
    /(\[package\][\s\S]*?\nversion\s*=\s*")(\d+\.\d+\.\d+)(")/m,
    `$1${nextVersion}$3`,
  );
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    usage();
    process.exit(args.length === 0 ? 1 : 0);
  }

  const dryRun = args.includes("--dry-run");
  const mainArg = args.find((arg) => arg !== "--dry-run");
  if (!mainArg) {
    usage();
    process.exit(1);
  }

  const [packageRaw, tauriRaw, cargoRaw] = await Promise.all([
    fs.readFile(PACKAGE_JSON_PATH, "utf8"),
    fs.readFile(TAURI_CONF_PATH, "utf8"),
    fs.readFile(CARGO_TOML_PATH, "utf8"),
  ]);

  const packageJson = JSON.parse(packageRaw);
  const tauriConf = JSON.parse(tauriRaw);

  const cargoVersionMatch = cargoRaw.match(/\[package\][\s\S]*?\nversion\s*=\s*"(\d+\.\d+\.\d+)"/m);
  if (!cargoVersionMatch) {
    throw new Error("Impossible de lire la version de src-tauri/Cargo.toml");
  }

  const currentVersions = {
    packageJson: String(packageJson.version),
    tauriConf: String(tauriConf.version),
    cargoToml: String(cargoVersionMatch[1]),
  };

  const uniqueCurrentVersions = new Set(Object.values(currentVersions));
  if (uniqueCurrentVersions.size !== 1) {
    throw new Error(
      `Versions non synchronisées: package.json=${currentVersions.packageJson}, tauri.conf.json=${currentVersions.tauriConf}, Cargo.toml=${currentVersions.cargoToml}`,
    );
  }

  const currentVersion = currentVersions.packageJson;
  const nextVersion = ["patch", "minor", "major"].includes(mainArg)
    ? bump(currentVersion, mainArg)
    : mainArg;

  parseSemver(nextVersion);

  if (nextVersion === currentVersion) {
    throw new Error(`Nouvelle version identique à l'ancienne: ${currentVersion}`);
  }

  const nextPackageJson = { ...packageJson, version: nextVersion };
  const nextTauriConf = { ...tauriConf, version: nextVersion };
  const nextCargoToml = replaceCargoPackageVersion(cargoRaw, nextVersion);

  if (!dryRun) {
    await Promise.all([
      fs.writeFile(PACKAGE_JSON_PATH, `${JSON.stringify(nextPackageJson, null, 2)}\n`, "utf8"),
      fs.writeFile(TAURI_CONF_PATH, `${JSON.stringify(nextTauriConf, null, 2)}\n`, "utf8"),
      fs.writeFile(CARGO_TOML_PATH, nextCargoToml, "utf8"),
    ]);
  }

  const modeLabel = dryRun ? "dry-run" : "written";
  console.log(`[${modeLabel}] ${currentVersion} -> ${nextVersion}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
