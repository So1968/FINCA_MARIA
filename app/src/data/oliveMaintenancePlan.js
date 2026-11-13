/**
 * FINCA MARIA — trame d'entretien oléicole, à confirmer parcelle par parcelle.
 * Sources familiales : INTRANTS_TRAVAUX_2024_2026, JOURNAL_EXPLOITATION.
 * Sources techniques : IFAPA / RAIF (voir maintenanceSources).
 * Aucun traitement, produit ou dosage n'est prescrit par ce calendrier.
 */
export const maintenanceSources = [
  {
    label: "IFAPA — taille de l'olivier",
    url: "https://www.juntadeandalucia.es/agriculturaypesca/ifapa/servifapa/registro-servifapa/d5778c9f-41bd-4ec1-a1c7-2331a3215933"
  },
  {
    label: "IFAPA — couverts végétaux et sols",
    url: "https://www.juntadeandalucia.es/agriculturaypesca/ifapa/servifapa/registro-servifapa/26479626-ed74-411b-9ac8-0da05770418c"
  },
  {
    label: "IFAPA — analyses et fertilisation",
    url: "https://www.juntadeandalucia.es/agriculturaypesca/ifapa/servifapa/recomendador-olivar/ayuda"
  },
  {
    label: "RAIF — surveillance des ravageurs et maladies",
    url: "https://www.juntadeandalucia.es/agriculturapescaaguaydesarrollorural/raif/category/olivar/"
  }
];

export const oliveMaintenancePlan = [
  {
    id: "diagnostic-technique",
    periode: "Dès que possible · avant travaux importants",
    title: "Visite de l'ingénieur agronome sur les parcelles 25 et 27",
    category: "Diagnostic",
    action: "Demander un diagnostic sur place, photos datées et compte rendu écrit : état des arbres, sol, vigueur, production, taille et travaux prioritaires sur douze mois.",
    vitines: "Quels travaux ont déjà été réalisés, quand, où et avec quels justificatifs ? Quels besoins observe-t-il actuellement ?",
    validation: "Visite indépendante indispensable avant d'arrêter le calendrier, les doses et les travaux lourds.",
    evidence: "Date de visite, nom du technicien, photos par parcelle et rapport.",
    sources: "Action ASAJA déjà inscrite dans FINCA MARIA ; analyse agronomique familiale."
  },
  {
    id: "recolte",
    periode: "Novembre à février · à adapter à la maturité",
    title: "Préparer et suivre la récolte des olives",
    category: "Récolte",
    action: "Déterminer la maturité et le calendrier de ramassage ; tracer séparément les parcelles 25 et 27, les quantités livrées et les tickets San Juan.",
    vitines: "Dates prévues et réelles ? Olives restant au sol ? Tickets, poids, prix de ramassage et liquidation ?",
    validation: "Choisir les dates en fonction de la maturité, de la météo, de l'état sanitaire et des capacités de récolte.",
    evidence: "Tickets de pesée San Juan, dates, photos et factures ; ne pas compter deux fois les repartos.",
    sources: "Journal d'exploitation 2024–2026 ; RAIF."
  },
  {
    id: "sol-hiver",
    periode: "Novembre à mars · après les pluies",
    title: "Sol, couverture végétale et érosion",
    category: "Sol",
    action: "Observer l'état de la couverture, le ruissellement, les ravines et les zones fragiles ; conserver une couverture adaptée lorsque cela protège le sol.",
    vitines: "Quelles zones ont été travaillées ou débroussaillées ? Avec quelle méthode, à quelle date et pour quel résultat ?",
    validation: "Définir la conduite de la couverture selon pente, pluie, sol, eau disponible et engagements PAC éventuels.",
    evidence: "Photos comparables des mêmes zones, interventions datées et parcelles.",
    sources: "IFAPA — guide des couvertures végétales ; guide érosion 2026."
  },
  {
    id: "taille",
    periode: "Après récolte · hiver/fin d'hiver selon météo",
    title: "Décider de la taille des oliviers",
    category: "Arbres",
    action: "Repérer branches mortes, bois cassé, déséquilibres et entretien de la couronne ; ne pas programmer de taille forte sans diagnostic.",
    vitines: "Quels arbres ont été taillés depuis 2024 ? Par qui, à quelle date, avec quel coût et quel devenir des résidus ?",
    validation: "Technicien : type et intensité de taille, arbres prioritaires, période tenant compte du risque de gel.",
    evidence: "Liste des arbres ou secteurs, photos avant/après et fiche d'intervention.",
    sources: "IFAPA — manuel de taille du olivar ; note manuscrite Vitines 2024 à rapprocher."
  },
  {
    id: "nutrition",
    periode: "Février à avril · décision après diagnostic",
    title: "Planifier la fertilisation sans appliquer au hasard",
    category: "Nutrition",
    action: "Faire l'inventaire des apports antérieurs, établir si une analyse du sol est nécessaire, décider avec le technicien du besoin réel.",
    vitines: "L'engrais 20-5-10 acheté en février 2025 a-t-il été apporté ? Sur quelles parcelles, à quelle dose et à quelle date ?",
    validation: "Plan de fertilisation écrit basé sur analyses, production visée et état des arbres ; aucune dose présumée.",
    evidence: "Résultats d'analyse, ordonnance technique, facture, date et quantité réellement apportée.",
    sources: "INTRANTS_TRAVAUX_2024_2026 ; IFAPA — fertilisation."
  },
  {
    id: "couvert-printemps",
    periode: "Mars à mai · suivant pluies et sécheresse",
    title: "Évaluer le débroussaillage et la couverture au printemps",
    category: "Sol",
    action: "Contrôler la concurrence hydrique du couvert sans laisser le terrain inutilement à nu ; prévoir une intervention seulement si nécessaire.",
    vitines: "Le débroussaillage de huit heures signalé en 2026 portait-il sur quelles zones ? Qu'a-t-il réellement réalisé ?",
    validation: "Ingénieur : fauche/broyage adaptés, période et zones sensibles à l'érosion.",
    evidence: "Plan/secteurs, date, durée, photos et facture détaillée.",
    sources: "C.R. familial 2026 + facture Vitines n°378 ; IFAPA — couverts végétaux."
  },
  {
    id: "floraison",
    periode: "Avril à juin · selon stade réel des arbres",
    title: "Observer la floraison et l'état sanitaire",
    category: "Surveillance",
    action: "Observer floraison, vigueur, symptômes foliaires et ravageurs ; ne décider d'un traitement que sur critères techniques.",
    vitines: "Quels traitements foliaires ont été réalisés en 2024–2026 ? Produit exact, matières actives, dose, volume, date et parcelle ?",
    validation: "Seuils de surveillance et décision de traitement conforme aux recommandations RAIF et à la réglementation.",
    evidence: "Compte rendu d'observation ; registre phytosanitaire et fiche produit si intervention.",
    sources: "RAIF — olivar ; journal des produits achetés, applications non toutes prouvées."
  },
  {
    id: "fruits-ete",
    periode: "Juin à septembre · surveillance régulière",
    title: "Suivre les fruits, le stress hydrique et la mouche",
    category: "Surveillance",
    action: "Observer la nouaison, la charge en fruits, les dommages, la sécheresse et les alertes RAIF pour la mouche de l'olive.",
    vitines: "Quelles observations ou pièges utilise-t-il ? Sur quelle parcelle ? Quelles interventions ont été réalisées ?",
    validation: "Ingénieur : protocole de suivi et seuils d'intervention, pas de traitement automatique.",
    evidence: "Comptages/photos datés, bulletin RAIF utilisé, interventions justifiées.",
    sources: "RAIF — stratégies de surveillance de la mouche."
  },
  {
    id: "foliaire-juillet",
    periode: "Mi-juillet · selon avis du technicien",
    title: "Envisager une analyse foliaire",
    category: "Nutrition",
    action: "Demander au technicien si l'analyse foliaire est pertinente pour les deux parcelles ; organiser un prélèvement représentatif, puis interpréter les résultats.",
    vitines: "Des analyses foliaires existent-elles déjà ? Quels apports ont suivi ?",
    validation: "Méthode de prélèvement, laboratoire et interprétation par le technicien.",
    evidence: "Rapport d'analyse foliaire daté et recommandations signées.",
    sources: "IFAPA — fertilisation et calendrier de diagnostic foliaire."
  },
  {
    id: "repilo-automne",
    periode: "Août à octobre · avant les pluies d'automne",
    title: "Contrôler le repilo et les maladies foliaires",
    category: "Surveillance",
    action: "Observer les feuilles et zones humides, consulter les alertes RAIF ; demander une évaluation du risque avant tout traitement.",
    vitines: "Quels traitements au sol ou sur feuilles ont été réellement faits ? Notamment les deux cuves signalées en 2026 : nature, dose et emplacement ?",
    validation: "Diagnostic sanitaire et justification d'une éventuelle intervention ; l'automne n'impose pas de traitement automatique.",
    evidence: "Observations, produits et doses uniquement s'il y a intervention prouvée.",
    sources: "RAIF — suivi du repilo et préconisations de production intégrée."
  },
  {
    id: "preparation-recolte",
    periode: "Septembre à novembre · avant la campagne",
    title: "Préparer la récolte, le budget et les preuves",
    category: "Organisation",
    action: "Fixer devis, accès, prévisions, méthode de pesée par parcelle et liste de documents demandés à San Juan ; examiner les travaux réellement réalisés dans l'année.",
    vitines: "Devis détaillé par opération ? Main-d'œuvre, machines, calendrier, éventuelles olives au sol et justificatifs ?",
    validation: "L'ingénieur confirme les priorités techniques avant d'engager des dépenses.",
    evidence: "Devis, décision familiale, calendrier révisé, relevés de récolte.",
    sources: "JOURNAL_EXPLOITATION ; factures Vitines 2024 et 2026."
  },
  {
    id: "autres-cultures",
    periode: "Selon cultures réellement présentes · à établir",
    title: "Séparer les céréales des travaux oléicoles",
    category: "Autres cultures",
    action: "Vérifier si l'avoine et le triticale sont toujours cultivés, sur quels recintos, sous quel accord et à quelles dates de semis/récolte.",
    vitines: "Qui a semé, moissonné, payé, vendu ou récupéré la récolte ? Où sont les factures et pesées ?",
    validation: "Calendrier spécifique seulement après identification des cultures et du mode d'exploitation.",
    evidence: "PAC/SIGPAC, factures de semences, prestations, poids et contrats.",
    sources: "CEREALES_TERRES_ARABLES_FLUX_2007_2026 ; INTRANTS_TRAVAUX_2024_2026."
  }
];
