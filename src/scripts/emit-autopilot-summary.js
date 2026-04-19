const fs = require("fs");
const path = require("path");

const STATUS_FILE = path.join(__dirname, "../data/autopilot-status.json");

function readStatus() {
    try {
        return JSON.parse(fs.readFileSync(STATUS_FILE, "utf8"));
    } catch {
        return null;
    }
}

function asArray(value) {
    return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}

function bulletList(items) {
    return items.length > 0 ? items.map((item) => `  - ${item}`).join("\n") : "  - none";
}

function buildSummary(status) {
    if (!status) {
        return [
            "# Arganor autopilot summary",
            "",
            "- status: missing autopilot-status.json",
        ].join("\n");
    }

    const warnings = asArray(status.warnings);
    const errors = asArray(status.errors);

    return [
        "# Arganor autopilot summary",
        "",
        `- status: ${status.status || "unknown"}`,
        `- lastRunAt: ${status.lastRunAt || "n/a"}`,
        `- lastSuccessAt: ${status.lastSuccessAt || "n/a"}`,
        `- validationAt: ${status.validationAt || "n/a"}`,
        `- generatedProducts: ${status.generatedProducts ?? 0}`,
        `- generatedPosts: ${status.generatedPosts ?? 0}`,
        `- generatedPins: ${status.generatedPins ?? 0}`,
        `- feedPins: ${status.feedPins ?? 0}`,
        `- triggerSource: ${status.triggerSource || "n/a"}`,
        `- workflowRunUrl: ${status.workflowRunUrl || "n/a"}`,
        "",
        "## Message",
        "",
        status.message || "No status message.",
        "",
        `## Errors (${errors.length})`,
        "",
        bulletList(errors),
        "",
        `## Warnings (${warnings.length})`,
        "",
        bulletList(warnings),
    ].join("\n");
}

const summary = buildSummary(readStatus());
console.log(summary);

const githubStepSummary = process.env.GITHUB_STEP_SUMMARY;
if (githubStepSummary) {
    fs.appendFileSync(githubStepSummary, `${summary}\n`);
}
