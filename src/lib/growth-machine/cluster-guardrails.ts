type ClusterGuardrails = {
    focusTerms: string[];
    avoidTerms: string[];
    instruction: string;
};

function normalizeText(value: string): string {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

const DEFAULT_GUARDRAILS: ClusterGuardrails = {
    focusTerms: ["produit", "usage", "routine simple", "vrai besoin"],
    avoidTerms: [],
    instruction: "Stay strictly inside the active product cluster and never borrow vocabulary from another category.",
};

export function getClusterGuardrails(clusterRef: string | null | undefined): ClusterGuardrails {
    if (clusterRef === "soin_du_visage") {
        return {
            focusTerms: [
                "visage",
                "peau",
                "hydratation",
                "tolerance",
                "barriere cutanee",
                "routine visage",
                "ordre d'application",
            ],
            avoidTerms: ["cheveux", "cuir chevelu", "capillaire", "routine capillaire", "racines", "repousse", "corps"],
            instruction:
                "This is a face-care draft. Stay strictly in visage / peau / routine visage language. Never mention hair, scalp, body care, or capillary vocabulary. Do not correct yourself with phrases like 'not hair here': simply write the right face-care copy from the start.",
        };
    }

    if (clusterRef === "soin_des_cheveux") {
        return {
            focusTerms: [
                "cheveux",
                "cuir chevelu",
                "routine capillaire",
                "frequence de lavage",
                "longueurs",
                "massage du cuir chevelu",
            ],
            avoidTerms: ["visage", "peau du visage", "barriere cutanee", "corps", "lait corps"],
            instruction:
                "This is a hair-care draft. Stay strictly in cheveux / cuir chevelu / routine capillaire language. Never drift into face-care or body-care vocabulary.",
        };
    }

    if (clusterRef === "soin_du_corps") {
        return {
            focusTerms: ["corps", "peau seche", "confort", "routine corps", "texture", "nutrition"],
            avoidTerms: ["cheveux", "cuir chevelu", "capillaire", "visage", "pores", "imperfections"],
            instruction:
                "This is a body-care draft. Stay strictly in corps / peau / routine corps language. Never drift into hair-care or face-acne vocabulary.",
        };
    }

    return DEFAULT_GUARDRAILS;
}

export function findForeignClusterTerms(value: string, clusterRef: string | null | undefined): string[] {
    const guardrails = getClusterGuardrails(clusterRef);
    const corpus = normalizeText(value);

    return guardrails.avoidTerms.filter((term, index, values) => {
        const normalizedTerm = normalizeText(term);
        return values.indexOf(term) === index && normalizedTerm.length > 0 && corpus.includes(normalizedTerm);
    });
}

export type { ClusterGuardrails };
