export const cortijoRoles = [
  {
    id: "admin-projet",
    label: "Administrateur projet",
    access: "Accès complet au logiciel",
    purpose: "Administre FINCA MARIA dans son ensemble : tous les modules, toutes les données de gestion, le BAÚL autorisé aux administrateurs, les comptes, les droits et l’historique.",
    capabilities: [
      "Accéder à tous les modules FINCA MARIA sans restriction fonctionnelle",
      "Consulter et administrer les données Maison, terres, oliviers, campagnes, PAC, San Juan, Vitines, fiscalité, eau, propriété, réunions et tâches",
      "Accéder au BAÚL privé selon les règles de traçabilité",
      "Valider ou corriger les classements",
      "Décider ce qui devient visible à la famille",
      "Créer, modifier, désactiver les comptes et attribuer les rôles",
      "Préparer les exports",
      "Consulter l’historique et le journal d’audit complet"
    ]
  },
  {
    id: "admin-secretariat",
    label: "Administration complète",
    access: "Accès complet au logiciel",
    purpose: "Tient le secrétariat courant de la ferme avec un compte administrateur nominatif. Comme tout administrateur, ce rôle peut accéder à l’ensemble du logiciel ; sa différence porte sur sa fonction, pas sur une restriction technique des modules.",
    capabilities: [
      "Accéder à tous les modules FINCA MARIA sans restriction fonctionnelle",
      "Ajouter et contrôler les informations administratives",
      "Valider des documents et rattachements",
      "Mettre à jour campagnes, factures, PAC et suivi",
      "Accéder au BAÚL privé selon les règles de traçabilité",
      "Gérer les comptes et les droits",
      "Préparer les éléments destinés à la famille",
      "Consulter l’historique et le journal d’audit complet"
    ]
  },
  {
    id: "secretaire",
    label: "Secrétaire",
    access: "Saisie et suivi autorisés",
    purpose: "Permet à plusieurs secrétaires de travailler en parallèle avec leur propre compte et des droits adaptés à leurs tâches.",
    capabilities: [
      "Déposer des documents dans un sas",
      "Saisir et mettre à jour les données autorisées",
      "Préparer des rapprochements, questions et pièces",
      "Consulter les modules nécessaires au secrétariat",
      "Proposer une correction sans effacer l’historique"
    ]
  },
  {
    id: "heritier",
    label: "Héritier",
    access: "Lecture familiale",
    purpose: "Consulte les informations et pièces explicitement validées pour le partage familial.",
    capabilities: [
      "Consulter les données visibles famille",
      "Consulter les pièces publiées",
      "Lire les décisions et l’historique",
      "Ne pas modifier les originaux"
    ]
  },
  {
    id: "contributeur-familial",
    label: "Contributeur familial",
    access: "Contribution contrôlée — phase ultérieure",
    purpose: "Peut proposer une information, un commentaire ou un document sans modifier directement la donnée de référence.",
    capabilities: [
      "Déposer une proposition dans un sas",
      "Ajouter un commentaire ou une pièce proposée",
      "Attendre une validation administrateur avant publication"
    ]
  },
  {
    id: "conseil",
    label: "Conseil / expert",
    access: "Accès limité",
    purpose: "Accède uniquement à un dossier ou un export préparé pour lui.",
    capabilities: [
      "Consulter le périmètre explicitement partagé",
      "Ne pas accéder automatiquement au patrimoine documentaire complet"
    ]
  }
];

export const cortijoGovernanceCurrent = {
  status: "Réunion familiale à préparer",
  period: "Octobre 2026 — date à confirmer",
  place: "Au Cortijo",
  participants: "Membres de la première génération et propriétaires actuels, y compris les nouveaux propriétaires ayant acquis auprès de membres qui ont vendu",
  purpose: "Se rencontrer pour discuter de la manière de structurer le fonctionnement commun du Cortijo et poser une base de travail partagée entre propriétaires.",
  evidence: "[D] Cette réunion a été préparée au sein de la famille ; la date précise, la liste finale des présents et les décisions restent à confirmer.",
  caution: "La réunion ne vaut pas, à elle seule, création d’une structure juridique ni décision unanime. Les décisions devront être consignées puis validées selon leur nature."
};

export const cortijoAdministrators = [
  {
    id: "admin-principal",
    roleId: "admin-projet",
    displayName: "Administrateur projet",
    responsibility: "Accès complet, règles du produit, validation, comptes et publication",
    accountStatus: "Compte nominatif serveur — accès complet"
  },
  {
    id: "admin-secretariat-ferme",
    roleId: "admin-secretariat",
    displayName: "Administration complète",
    responsibility: "Accès complet + secrétariat courant, pièces administratives et suivi de la ferme",
    accountStatus: "Compte nominatif serveur — accès complet"
  }
];

export const cortijoAuditFields = [
  "actorId",
  "actorRole",
  "action",
  "objectType",
  "objectId",
  "before",
  "after",
  "timestamp"
];

export const cortijoAccessPrinciples = [
  "Tout compte Administrateur dispose d’un accès complet à FINCA MARIA ; les distinctions entre administrateurs décrivent leur fonction, pas des zones cachées du logiciel.",
  "Jamais de compte administrateur ou secrétaire partagé entre deux personnes.",
  "Plusieurs administrateurs et secrétaires peuvent travailler en parallèle avec des comptes individuels.",
  "Les autorisations sont vérifiées côté serveur ; masquer un bouton dans l’interface ne constitue jamais une protection suffisante.",
  "Chaque modification importante doit garder qui a fait quoi et quand.",
  "Une correction ne doit jamais effacer silencieusement la version précédente.",
  "Le BAÚL privé reste séparé du portail familial ; son accès administrateur est journalisé.",
  "Un élément n’est visible par les héritiers qu’après validation explicite.",
  "Les originaux ne sont jamais modifiés par un compte héritier.",
  "Les droits d’un compte peuvent être retirés sans supprimer l’historique de ses actions passées."
];
