const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.join(__dirname, "../..");
const DATA_FILES = [
    path.join(ROOT, "src/data/products.json"),
    path.join(ROOT, "src/data/posts.json"),
    path.join(ROOT, "src/data/autopilot-status.json"),
];
const PINS_DIR = path.join(ROOT, "public/pins");
const KEEP_CHANGES = process.argv.includes("--keep");
const SKIP_BUILD = process.argv.includes("--skip-build");
const LOCAL_STEP_ENV = {
    ...process.env,
    ARGANOR_LOCAL_MODE: "1",
    ARGANOR_DISABLE_SUPABASE_SYNC: "1",
};

function snapshotFiles() {
    return new Map(
        DATA_FILES.map((filePath) => [
            filePath,
            fs.existsSync(filePath) ? fs.readFileSync(filePath) : null,
        ]),
    );
}

function snapshotPins() {
    if (!fs.existsSync(PINS_DIR)) {
        return new Set();
    }

    return new Set(fs.readdirSync(PINS_DIR));
}

function restoreFiles(fileBackups, pinBackups) {
    for (const [filePath, content] of fileBackups.entries()) {
        if (content === null) {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            continue;
        }

        fs.writeFileSync(filePath, content);
    }

    if (!fs.existsSync(PINS_DIR)) {
        return;
    }

    for (const fileName of fs.readdirSync(PINS_DIR)) {
        if (!pinBackups.has(fileName)) {
            fs.unlinkSync(path.join(PINS_DIR, fileName));
        }
    }
}

function runStep(label, command, args) {
    console.log(`\n[autopilot:local] ${label}`);
    const result = spawnSync(command, args, {
        cwd: ROOT,
        env: LOCAL_STEP_ENV,
        stdio: "inherit",
    });

    if (result.error) {
        throw result.error;
    }

    if (result.status !== 0) {
        throw new Error(`${label} failed with exit code ${result.status}`);
    }
}

function runNpmScript(label, scriptName) {
    if (process.platform === "win32") {
        runStep(label, "cmd.exe", ["/d", "/s", "/c", `npm run ${scriptName}`]);
        return;
    }

    runStep(label, "npm", ["run", scriptName]);
}

function runSummary() {
    const result = spawnSync("node", ["src/scripts/emit-autopilot-summary.js"], {
        cwd: ROOT,
        env: LOCAL_STEP_ENV,
        stdio: "inherit",
    });

    if (result.error) {
        console.warn("[autopilot:local] Summary step failed:", result.error);
        return;
    }

    if (result.status !== 0) {
        console.warn(`[autopilot:local] Summary step exited with code ${result.status}.`);
    }
}

function main() {
    const fileBackups = snapshotFiles();
    const pinBackups = snapshotPins();
    let exitCode = 0;

    console.log(`[autopilot:local] Mode: ${KEEP_CHANGES ? "keep generated changes" : "dry-run with rollback"}`);
    console.log(`[autopilot:local] Build step: ${SKIP_BUILD ? "skipped" : "enabled"}`);
    console.log("[autopilot:local] Supabase sync: disabled (local safety mode)");

    try {
        runStep("Generate content", "node", ["src/scripts/autopilot-content.js"]);
        runNpmScript("Validate content and RSS", "validate:autopilot");
        if (!SKIP_BUILD) {
            runNpmScript("Build safety check", "build");
        }
    } catch (error) {
        exitCode = 1;
        console.error("[autopilot:local] Run failed:", error instanceof Error ? error.message : error);
    } finally {
        runSummary();

        if (!KEEP_CHANGES) {
            restoreFiles(fileBackups, pinBackups);
            console.log("[autopilot:local] Original data and generated pin files restored.");
        } else {
            console.log("[autopilot:local] Generated changes kept in workspace.");
        }
    }

    process.exit(exitCode);
}

main().catch((error) => {
    console.error("[autopilot:local] Unexpected failure:", error);
    process.exit(1);
});
