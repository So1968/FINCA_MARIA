export const actions = [
  {
    id: "san-juan-historique",
    priority: "Priorité 1",
    title: "Obtenir le relevé officiel des campagnes San Juan",
    contact: "Coopérative Agrícola San Juan",
    mode: "Sur place de préférence",
    goal: "Compléter et fiabiliser la série de production de la finca à partir du relevé officiel de la coopérative, sans redemander ce que nos pièces montrent déjà.",
    contactHint: "Nous avons déjà des états de factures San Juan pour 2019, 2020, 2021 et 2022. Ils prouvent l'existence d'écritures coopératives, mais pas les kilos d'olives ni le total de production par campagne.",
    toObtain: [
      "Relevé officiel des campagnes disponibles, idéalement de 2007/08 à 2025/26",
      "Pour 2019/20 à 2022/23 : vales, apports et liquidations de production",
      "Dates et kilos de chaque apport",
      "Total officiel des kilos par campagne",
      "Rendement graso et kilos d'huile",
      "Anticipos, repartos et liquidation finale",
      "Confirmation que le relevé couvre tous les apports enregistrés"
    ],
    expectedProof: "Relevé officiel San Juan + vales / liquidations + confirmation de complétude",
    scriptLabel: "Texte à lire ou montrer",
    script: "Buenos días. Estamos reconstruyendo la producción de nuestra finca campaña por campaña. Ya tenemos bastantes documentos antiguos, incluso desde 2007. También tenemos listados de facturas de San Juan de 2019, 2020, 2021 y 2022, pero esos listados no nos permiten saber los kilos de aceituna ni la producción total de cada campaña. Lo que necesitamos ahora es el historial de producción: los vales o entregas, las fechas y kilos de cada aporte, el total de kilos de cada campaña, el rendimiento, los kilos de aceite, los anticipos, repartos y la liquidación final."
  },
  {
    id: "asaja-pac-2026-copie",
    priority: "Priorité 1",
    title: "Récupérer la copie complète de la PAC 2026",
    contact: "ASAJA Málaga",
    mode: "Téléphone ou passage chez ASAJA",
    goal: "Obtenir uniquement le dossier détaillé 2026 manquant afin de fixer les parcelles, recintos, surfaces, cultures et aides réellement déclarés en 2026.",
    contactHint: "La déclaration du 12/03/2026 est déjà connue. Le dossier détaillé retrouvé est celui de 2024, pas celui de 2026.",
    toObtain: [
      "Copie complète de la Solicitud Única / PAC 2026 déposée le 12/03/2026",
      "Pages indiquant parcelles et recintos",
      "Surfaces déclarées par usage / culture",
      "Surface déclarée en olivar",
      "Cultures / variétés mentionnées",
      "Aides et éco-régimes",
      "Justificatif de présentation / référence du dossier 2026"
    ],
    expectedProof: "Copie complète PAC 2026 + justificatif de présentation",
    scriptLabel: "Texte simple à lire",
    script: "Buenos días. Tenemos constancia de que la PAC 2026 de nuestra finca fue presentada el 12 de marzo de 2026. Ya hemos revisado nuestra documentación y tenemos el expediente detallado de 2024, pero nos faltan las páginas detalladas de 2026. ¿Podrían facilitarnos una copia completa de la Solicitud Única PAC 2026 y del justificante de presentación?"
  },
  {
    id: "asaja-visite-technique",
    priority: "Priorité 3",
    title: "Demander une visite technique des oliviers",
    contact: "ASAJA Málaga",
    mode: "Téléphone",
    goal: "Obtenir un diagnostic neutre de l'état actuel de l'oliveraie et un bref écrit daté.",
    contactHint: "Cette demande est agronomique, séparée du dossier administratif PAC.",
    toObtain: ["Visite technique sur la finca", "État des arbres et vigueur", "Avis sur la taille", "Sol / nutrition / symptômes visibles", "Potentiel productif", "Travaux prioritaires sur 12 mois", "Bref rapport écrit, si possible avec photos"],
    expectedProof: "Rendez-vous + compte rendu technique daté"
  },
  {
    id: "pelaez-role-fiscal",
    priority: "Priorité 2",
    title: "Compléter les archives fiscales réellement manquantes chez Peláez",
    contact: "Peláez — comptable / fiscalité",
    mode: "Téléphone ou passage au cabinet",
    goal: "Compléter les années fiscales absentes et récupérer les justificatifs agricoles sources qu'il conserve encore, sans redemander les déclarations déjà présentes.",
    contactHint: "Les Modelos 100 des exercices 2017, 2018, 2019 et 2022 sont déjà présents. La demande doit porter uniquement sur les lacunes réelles.",
    toObtain: [
      "Inventaire des exercices fiscaux encore conservés et absents de notre archive",
      "Copies des déclarations manquantes, notamment 2020, 2021 et les exercices postérieurs à 2022 s'il les conserve",
      "Liquidations ou certificats San Juan utilisés pour les revenus agricoles",
      "Justificatifs PAC / subventions et factures agricoles utilisés",
      "Copies des pièces sources anciennes encore conservées"
    ],
    expectedProof: "Déclarations fiscales manquantes + inventaire daté des pièces agricoles sources encore conservées",
    scriptLabel: "Texte à lire",
    script: "Buenos días. Estamos ordenando el expediente fiscal de la finca y no queremos pedirle documentos que ya tenemos. En nuestro archivo ya constan declaraciones Modelo 100 de los ejercicios 2017, 2018, 2019 y 2022. Lo que necesitamos ahora es completar solamente lo que falta, especialmente 2020, 2021 y los posteriores a 2022, y recuperar los justificantes agrícolas utilizados para esas declaraciones."
  },
  {
    id: "vitines-378-detail",
    priority: "Priorité 2",
    title: "Faire détailler la facture Vitines n°378",
    contact: "Agrícola Vitines / López Gallego José",
    mode: "Entretien sur place ou téléphone",
    goal: "Rendre la facture n°378 exploitable travail par travail et parcelle par parcelle en distinguant ce qui est déjà documenté de ce qui manque réellement.",
    contactHint: "La facture du 04/04/2026 est de 5 445 € TTC. Trois interventions sont déjà notées : 22/04, 29/04 et 01/05/2026. Il faut les confirmer et ventiler le montant.",
    toObtain: [
      "Confirmer ou corriger les dates 22/04/2026, 29/04/2026 et 01/05/2026",
      "Produit exact et matière active des traitements",
      "Dose / quantité utilisée dans chaque cuve",
      "Parcelles ou zones traitées",
      "Ventilation du prix : récolte, foliaire, débroussaillage, traitement au sol, produits et autres postes",
      "Préciser si les produits étaient fournis par Vitines ou achetés séparément",
      "Bon de travail ou détail écrit disponible"
    ],
    expectedProof: "Ventilation poste par poste de la facture n°378 + confirmation des dates et traitements",
    scriptLabel: "Texte à lire",
    script: "Tenemos la factura nº 378 del 4 de abril de 2026 por 5.445 euros. En nuestros apuntes constan ya tres intervenciones posteriores: el 22 de abril, un tratamiento foliar con una cuba de 3.000 litros; el 29 de abril, ocho horas de desbroce; y el 1 de mayo, dos cubas de líquido al suelo. Necesitamos confirmar esas fechas y completar el detalle de productos, dosis, parcelas y reparto exacto del importe."
  }
];
