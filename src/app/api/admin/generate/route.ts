import { exec } from "child_process";
import path from "path";
import util from "util";
import { NextResponse } from "next/server";

import { isAuthorizedRequest, unauthorizedJson } from "@/lib/api-auth";

const execPromise = util.promisify(exec);

export async function POST(req: Request) {
    if (!isAuthorizedRequest(req)) {
        return unauthorizedJson();
    }

    try {
        const body = await req.json();
        const { type } = body as { type?: string };

        let scriptPath = "";
        let successMessage = "";

        if (type === "product") {
            scriptPath = path.join(process.cwd(), "src/scripts/generate-french-luxury.js");
            successMessage = "Catalogue produits realigne avec succes !";
        } else if (type === "article") {
            scriptPath = path.join(process.cwd(), "src/scripts/autopilot-content.js");
            successMessage = "Nouvel article SEO et epingles generes avec succes !";
        } else if (type === "pin") {
            scriptPath = path.join(process.cwd(), "src/scripts/generate-all-pins.js");
            successMessage = "Nouvelles epingles generees avec succes !";
        } else {
            return NextResponse.json({ error: "Type de generation invalide" }, { status: 400 });
        }

        const { stdout, stderr } = await execPromise(`node "${scriptPath}"`);
        console.log(stdout);

        if (stderr) {
            console.error(stderr);
        }

        return NextResponse.json({ success: true, message: successMessage, output: stdout });
    } catch (error: unknown) {
        console.error("Erreur de generation:", error);
        const message = error instanceof Error ? error.message : "Erreur inconnue";
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
