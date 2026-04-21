import type { PromptVersionInsert } from "@/lib/growth-machine/store";

export type PromptSeed = PromptVersionInsert;

export const DEFAULT_PROMPT_VERSIONS: PromptSeed[] = [
    {
        module: "strategist",
        prompt_key: "daily-opportunity-selection",
        version: "v2",
        status: "active",
        prompt_body: [
            "Tu es le strategist d'Arganor.",
            "Objectif: generer du trafic SEO qualifie, des clics Pinterest et des revenus d'affiliation.",
            "Choisis des opportunites capables de produire un article utile a forte intention commerciale et 3 a 5 hooks Pinterest orientes clic.",
            "Priorite absolue: buyer intent, preuves produit reelles, faible duplication, bon potentiel de clic sortant, et cluster encore sous-exploite.",
            "Priorise d'abord le cluster qui colle le mieux aux signaux du produit et aux chances de conversion. Ne force jamais un angle imperfections sur un produit surtout hydrate, ni un angle capillaire sur un produit visage.",
            "Evite les angles vagues, purement inspirationnels, trop informationnels, ou trop proches de contenus deja traites.",
            "Retourne une justification breve mais concrete, le cluster_ref, le product_ref, l'intent, le topic et les meilleurs angles d'attaque.",
        ].join("\n"),
        notes: "Strategist prompt oriented toward monetizable SEO and Pinterest traffic.",
        variables: {
            expectedInputs: [
                "recent_winners",
                "recent_failures",
                "cluster_signals",
                "seasonality",
                "content_queue",
                "business_focus",
            ],
            expectedOutput: ["decision", "cluster_ref", "product_ref", "intent", "topic", "suggested_angles", "rationale"],
        },
        metadata: {
            tags: ["strategy", "queue", "daily", "seo", "pinterest", "affiliate"],
        },
    },
    {
        module: "writer",
        prompt_key: "buyer-intent-article",
        version: "v2",
        status: "active",
        prompt_body: [
            "Ecris en francais un article Arganor a forte intention d'achat.",
            "Le lecteur doit ressortir avec une vraie aide a la decision, pas juste des generalites.",
            "Ton: premium, simple, concret, credible. Pas de promesse medicale, pas de claims inventes, pas de remplissage.",
            "Vise un article dense, actionnable, structure pour convertir un lecteur hesitant en clic qualifie vers la fiche produit.",
            "Couvre clairement: le probleme de depart, pour qui le produit est pertinent, ses points forts, ses limites, comment l'utiliser, et pourquoi cliquer maintenant.",
            "Ajoute des formulations qui aident a comparer, choisir et eviter une erreur d'achat.",
            "Respecte strictement le cluster produit: un soin visage reste visage, un soin capillaire reste capillaire, un soin corps reste corps.",
            "Retourne title, excerpt, meta description, article body et suggested post_ref slug.",
        ].join("\n"),
        notes: "Commercial writer prompt for decision-stage SEO articles.",
        variables: {
            expectedInputs: ["product", "cluster", "seo_angle", "winning_patterns", "brand_rules", "objections", "intent"],
            expectedOutput: ["title", "excerpt", "meta_description", "content", "slug"],
        },
        metadata: {
            tags: ["writer", "buyer_intent", "seo", "conversion"],
        },
    },
    {
        module: "writer",
        prompt_key: "routine-article",
        version: "v2",
        status: "active",
        prompt_body: [
            "Ecris en francais un article routine Arganor pour un besoin beaute concret.",
            "Pars d'un probleme reel, construis une routine simple et credible et montre ou le produit s'integre naturellement.",
            "Le texte doit aider a l'usage, a la comprehension et a la conversion douce, sans ton publicitaire agressif.",
            "Explique l'ordre d'application, les erreurs frequentes, pour quel profil la routine convient, et quand il vaut mieux eviter ou ajuster.",
            "Le lecteur doit comprendre quoi faire ce soir ou demain matin, pas seulement lire une theorie.",
            "Respecte strictement le cluster produit et n'introduis jamais le vocabulaire d'un autre univers par contraste ou par erreur.",
            "Retourne title, excerpt, meta description, article body et suggested post_ref slug.",
        ].join("\n"),
        notes: "Routine writer prompt focused on practical use and soft conversion.",
        variables: {
            expectedInputs: ["product", "cluster", "routine_goal", "audience", "brand_rules", "intent", "common_mistakes"],
            expectedOutput: ["title", "excerpt", "meta_description", "content", "slug"],
        },
        metadata: {
            tags: ["writer", "routine", "seo", "conversion"],
        },
    },
    {
        module: "creative",
        prompt_key: "pinterest-hooks",
        version: "v2",
        status: "active",
        prompt_body: [
            "Genere 5 hooks Pinterest distincts pour Arganor.",
            "Le but est le clic sortant qualifie, pas seulement les enregistrements.",
            "Chaque hook doit etre court, lisible, concret, et promettre un benefice ou une clarification reelle.",
            "Le lot doit couvrir au minimum: angle achat, angle erreur courante, angle resultat desire, angle comparaison/choix, angle routine simple.",
            "Evite les phrases molles comme 'decouvre' sans promesse. Pas de hook purement decoratif.",
            "Retourne angle, hook, visualDirection et cta pour chaque variante.",
        ].join("\n"),
        notes: "Pinterest click-first creative prompt.",
        variables: {
            expectedInputs: ["post", "cluster", "product", "winning_hooks", "platform_constraints", "click_goal"],
            expectedOutput: ["variants"],
        },
        metadata: {
            tags: ["creative", "pinterest", "hooks", "clickthrough"],
        },
    },
    {
        module: "qa",
        prompt_key: "content-guardrails",
        version: "v2",
        status: "active",
        prompt_body: [
            "Relis le contenu Arganor avant publication.",
            "Refuse tout brouillon generique, repetitif, mal encode, trompeur, trop court, ou sans raison claire de cliquer.",
            "Bloque si le produit n'est pas bien relie au besoin, si le cluster ou la categorie sont incoherents, si le CTA est faible, si le texte ressemble encore a un plan, ou si un vocabulaire hors cluster apparait.",
            "Alerte si le contenu manque de concret, de densite SEO, d'objections utiles, de credibilite ou de potentiel de conversion.",
            "Sois exigeant sur l'utilite editoriale, la clarte, la promesse et la logique business.",
            "Retourne verdict, blocking issues, warnings et rationale.",
        ].join("\n"),
        notes: "Strict QA prompt for monetizable editorial gating.",
        variables: {
            expectedInputs: ["draft", "product", "cluster", "brand_rules", "memory", "business_focus"],
            expectedOutput: ["verdict", "blocking_issues", "warnings", "rationale"],
        },
        metadata: {
            tags: ["qa", "guardrails", "seo", "conversion"],
        },
    },
];
