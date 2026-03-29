import { NextResponse } from "next/server";
import { exec } from "child_process";
import path from "path";
import util from "util";

const execPromise = util.promisify(exec);

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { type } = body; // 'product', 'article', 'pin'

        let scriptPath = "";
        let successMessage = "";

        if (type === "product") {
            // Re-generates products
            scriptPath = path.join(process.cwd(), "src/scripts/generate-french-luxury.js");
            successMessage = "Nouveaux produits générés avec succès !";
        } else if (type === "article") {
            // Generates 1 article & 1 pin
            scriptPath = path.join(process.cwd(), "src/scripts/autopilot-content.js");
            successMessage = "Nouvel article SEO et épingle générés avec succès !";
        } else if (type === "pin") {
            // Generates pins
            scriptPath = path.join(process.cwd(), "src/scripts/generate-all-pins.js");
            successMessage = "Nouvelles épingles générées avec succès !";
        } else {
            return NextResponse.json({ error: "Type de génération invalide" }, { status: 400 });
        }

        // Run the script
        const { stdout, stderr } = await execPromise(`node "${scriptPath}"`);
        console.log(stdout);

        if (stderr) {
            console.error(stderr);
        }

        return NextResponse.json({ success: true, message: successMessage, output: stdout });
    } catch (error: any) {
        console.error("Erreur de génération:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
