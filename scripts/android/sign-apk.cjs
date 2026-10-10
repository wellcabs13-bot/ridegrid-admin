#!/usr/bin/env node
// Re-signs a Gradle-built release APK with an EAS-format credentials.json (downloaded via `eas credentials`).
// Usage: node scripts/android/sign-apk.cjs <in.apk> <credentials.json> <out.apk>
// Passwords are passed to apksigner through environment variables and are never printed or logged.
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const [input, credsPath, output] = process.argv.slice(2);
if (!input || !credsPath || !output) { console.error("usage: sign-apk.cjs <in.apk> <credentials.json> <out.apk>"); process.exit(2); }
const sdk = process.env.ANDROID_HOME || path.join(process.env.LOCALAPPDATA || "", "Android", "Sdk");
const tools = fs.readdirSync(path.join(sdk, "build-tools")).sort().reverse();
const apksigner = tools.map(v => path.join(sdk, "build-tools", v, "apksigner.bat")).find(fs.existsSync);
if (!apksigner) { console.error("apksigner not found in Android SDK build-tools"); process.exit(1); }
const k = JSON.parse(fs.readFileSync(credsPath, "utf8")).android?.keystore;
if (!k?.keystorePath || !k.keystorePassword || !k.keyAlias || !k.keyPassword) { console.error("credentials.json has no android.keystore block"); process.exit(1); }
const ks = path.resolve(path.dirname(credsPath), k.keystorePath);
const run = (args, env = {}) => spawnSync("cmd.exe", ["/c", apksigner, ...args], { env: { ...process.env, ...env }, encoding: "utf8" });
const signed = run(["sign", "--ks", ks, "--ks-key-alias", k.keyAlias, "--ks-pass", "env:RG_KS_PASS", "--key-pass", "env:RG_KEY_PASS", "--out", output, input], { RG_KS_PASS: k.keystorePassword, RG_KEY_PASS: k.keyPassword });
if (signed.status !== 0) { console.error("apksigner sign failed:", (signed.stderr || signed.stdout || "").replaceAll(k.keystorePassword, "***").replaceAll(k.keyPassword, "***")); process.exit(1); }
const verify = run(["verify", "--verbose", "--print-certs", output]);
process.stdout.write(verify.stdout.split(/\r?\n/).filter(l => /Verifies|Number of signers|SHA-256 digest|scheme/.test(l) && !/DN:/.test(l)).join("\n") + "\n");
process.exit(verify.status ?? 1);
