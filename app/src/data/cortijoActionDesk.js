export const cortijoActionDesk = [
  {
    id: "san-juan-historique",
    category: "Coopérative",
    priority: "Priorité 1",
    title: "Obtenir le relevé officiel des campagnes San Juan",
    contact: "Coopérative Agrícola San Juan",
    contactHint: "Nous avons déjà des états de factures San Juan pour 2019, 2020, 2021 et 2022. Ils prouvent l'existence d'écritures coopératives, mais ils ne donnent pas à eux seuls les kilos d'olives ni le total de production par campagne. Pour 2025/26, les deux repartos documentent désormais une base commune de 18 210 kg : la demande ne doit plus repartir de zéro mais compléter les vales et la liquidation finale.",
    mode: "Sur place de préférence",
    goal: "Compléter et fiabiliser la série de production de la finca à partir du relevé officiel de la coopérative, sans redemander ce que nos pièces montrent déjà.",
    alreadyKnown: [
      "[P] Des pièces San Juan sont retrouvées dès 2007/08",
      "[C conditionnel] 2014/15 à 2017/18 : scénarios kilos familiaux ÷ 0,15, sous réserve qu'ils représentent 15 % de tous les apports ; total officiel non confirmé",
      "[P] 2018/19 : un repère de 1 590 kg existe mais sa nature exacte reste à préciser",
      "[P] Un état de factures San Juan 2019 existe encore sous le compte de María",
      "[P] Des états de factures San Juan 2020, 2021 et 2022 existent au nom de María Josefa ; ils documentent des écritures mais ne fixent pas la production annuelle",
      "[P] 2023/24 : 3 vales = 217 + 1 562 + 515 = 2 294 kg ; huile 389,06 kg ; rendement 16,96 %",
      "[P] 2024/25 : 6 551 kg ; huile 1 357,37 kg ; rendement 20,72 %",
      "[P] 2025/26 : les reçus San Juan n°1062 et n°1769 portent sur la même base physique de 18 210 kg d'olives, 3 860,64 kg d'huile et 21,20 % de rendement ; les deux repartos ne s'additionnent pas en kilos",
      "[CR] 2025/26 : 7 943 kg rapportés par la famille, à rapprocher des vales ; nature des 6 541 kg à vérifier sur l'original",
      "[P/C] 24/08/2026 : extracto San Juan 6 437,10 € → chèque 6 437,10 € → crédit Unicaja 6 437,10 € ; chaîne de règlement cohérente, distincte du cumul net des deux repartos de 7 203,65 €"
    ],
    toObtain: [
      "Relevé officiel des campagnes disponibles, idéalement de 2007/08 à 2025/26",
      "Pour 2019/20 à 2022/23 : les vales, apports et liquidations de production correspondant à ces campagnes, car nos états de factures 2019-2022 ne suffisent pas à fixer les kilos produits",
      "Pour 2025/26 : liste complète des vales / tickets d'apport et rattachement du premier ramassage de 7 943 kg à la base coopérative de 18 210 kg",
      "Pour 2025/26 : document source permettant de qualifier les 6 541 kg et confirmation de la référence 6139",
      "Confirmation que 18 210 kg correspond bien au total des apports retenus par San Juan pour la campagne",
      "Éventuel 3e reparto et liquidation finale 2025/26",
      "Dates et kilos de chaque apport",
      "Total officiel des kilos par campagne",
      "Rendement graso et kilos d'huile",
      "Anticipos, repartos et liquidation finale",
      "Confirmation que le relevé fourni couvre tous les apports enregistrés de chaque campagne"
    ],
    scriptLabel: "Texte à lire ou montrer",
    script: "Buenos días. Estamos reconstruyendo la producción de nuestra finca campaña por campaña. Ya tenemos bastantes documentos antiguos, incluso desde 2007. También tenemos listados de facturas de San Juan de 2019, 2020, 2021 y 2022, pero esos listados no nos permiten saber los kilos de aceituna ni la producción total de cada campaña. Para 2025/2026 ya tenemos dos recibos de reparto que utilizan la misma base de 18.210 kg de aceituna, 3.860,64 kg de aceite y un rendimiento del 21,20 %. Por eso no necesitamos volver a establecer esa base: necesitamos la lista completa de vales o entregas, las fechas y kilos de cada aporte, aclarar cómo encajan los 7.943 kg del primer ramassage, los 6.541 kg y la referencia 6139, y confirmar si 18.210 kg es el total de aportes de la campaña. También necesitamos saber si hubo un tercer reparto o una liquidación final. Para las campañas 2019/2020, 2020/2021, 2021/2022 y 2022/2023 seguimos necesitando el historial de producción completo. Finalmente, necesitamos que nos confirmen que el listado entregado incluye todos los aportes registrados de cada campaña.",
    linkedTo: "a-completude-campagnes",
    expectedProof: "Relevé officiel San Juan + vales / liquidations + confirmation de complétude"
  },
  {
    id: "pac-2026-contenu",
    category: "PAC",
    priority: "Interne",
    internal: true,
    owner: "assistant",
    title: "Analyser les pièces PAC déjà présentes avant toute demande extérieure",
    contact: "Dossier PAC existant",
    contactHint: "Ce travail n'est pas une mission familiale. Les pièces existantes sont exploitées d'abord ; une demande extérieure ne se justifie que pour une pièce réellement absente.",
    mode: "Analyse documentaire interne",
    goal: "Construire une fiche PAC structurée et isoler uniquement les manques réels.",
    alreadyKnown: [
      "[P] Une déclaration ASAJA / PAC 2026 datée du 12/03/2026 est référencée",
      "[P] Le dossier détaillé identifié dans les pièces est celui de 2024, pas celui de 2026",
      "[P] Les pages détaillées 2026 ne sont pas retrouvées dans les pièces actuellement indexées"
    ],
    toObtain: [
      "Jeu de pages détaillées PAC 2026 si elles existent hors des pièces actuellement disponibles",
      "Parcelles, recintos, surfaces et cultures 2026",
      "Surface réellement déclarée en olivar",
      "Droits / éco-régimes 2026 si présents"
    ],
    linkedTo: "q-pac-contenu-2026",
    expectedProof: "Fiche PAC 2026 documentée ou identification précise de la pièce manquante"
  },
  {
    id: "pac-2020-droits",
    category: "PAC",
    priority: "Priorité 1",
    title: "Vérifier l'exécution du transfert des droits PAC envisagé en 2020",
    contact: "Archives famille / ASAJA / administration PAC",
    contactHint: "Les correspondances de février et mai 2020 documentent un projet de transfert des droits de subvention à l'arrendatario après régularisation des dossiers. Il ne faut pas demander si cette idée a existé : il faut retrouver la pièce qui prouve si elle a réellement été exécutée.",
    mode: "Recherche documentaire puis demande ciblée",
    goal: "Établir si les droits PAC ont réellement changé de titulaire en 2020 et, si oui, à quelle date et avec quels paiements, sans confondre cela avec le droit d'exploiter ou la propriété des récoltes.",
    alreadyKnown: [
      "[D-DOC] En février 2020, un conseil attribué à ASAJA prévoit de régulariser les dossiers puis de transférer uniquement les droits de subvention à l'arrendatario",
      "[D-DOC] La correspondance de mai 2020 reprend ce projet de cession / vente des droits",
      "[D-DOC] Une perte de 20 % des droits lors du transfert est rapportée dans ces échanges",
      "[D-DOC] Le paiement de l'aide est décrit comme bloqué tant que les démarches préalables ne sont pas régularisées",
      "Aucune pièce primaire actuellement réconciliée ne prouve l'enregistrement effectif de la cession ni un paiement ultérieur à l'exploitant"
    ],
    toObtain: [
      "Formulaire, contrat ou acte de cesión / venta de derechos PAC",
      "Accusé d'enregistrement ou résolution confirmant le changement de titulaire",
      "Date d'effet de la cession éventuelle",
      "Historique des droits PAC 2020 à 2024",
      "Justificatifs des paiements d'aides correspondants, sans recopier de coordonnées bancaires sensibles",
      "Identifier le bénéficiaire de chaque paiement uniquement à partir d'une pièce probante"
    ],
    scriptLabel: "Demande ciblée",
    script: "Estamos revisando el expediente PAC de la finca alrededor de 2020. En nuestra correspondencia de febrero y mayo de 2020 consta que, después de regularizar los expedientes, se aconsejó transferir únicamente los derechos de la subvención al arrendatario. No necesitamos confirmar que se planteó esa posibilidad: necesitamos saber si la cesión llegó realmente a formalizarse. ¿Podrían facilitarnos, si existe, el documento de cesión o venta de derechos, el justificante de registro o resolución, la fecha de efecto y el historial posterior de esos derechos y de sus pagos? No necesitamos datos bancarios sensibles.",
    linkedTo: "q-pac-droits-2020",
    expectedProof: "Acte de cession / résolution / historique des droits et paiements PAC"
  },
  {
    id: "eau-correspondances-2002-2006",
    category: "Eau / propriété",
    priority: "Priorité 2",
    internal: true,
    owner: "assistant",
    title: "Réouvrir les correspondances eau / terrain 2002–2006",
    contact: "Baúl — lots CamScanner 21.28 / 21.29 / 21.30",
    contactHint: "Les trois groupes sont déjà localisés. Il ne faut pas demander à la famille de les chercher de nouveau : il faut les lire lettre par lettre et rattacher chaque courrier aux titres registraux et aux ouvrages d'eau.",
    mode: "Analyse documentaire interne",
    goal: "Établir ce que disent réellement les correspondances de 2002 et 2006 sur le dépôt, les sources, les vannes, les conduites, l'alberca, l'accès et l'entretien, sans transformer un courrier en droit actuel.",
    alreadyKnown: [
      "[P-STRUCT] 21.28 = correspondance recommandée, 3 fichiers, année 2002",
      "[P-STRUCT] 21.29 = correspondance recommandée, 3 fichiers, année 2006",
      "[P-STRUCT] 21.30 = correspondance eau / terrain, 3 fichiers, année 2002",
      "[P-ANT] Une parcelle distincte de 400 m² contient deux sources, un dépôt distributeur, onze vannes et onze conduites",
      "[P-ANT] Une parcelle distincte de 1 536 m² est décrite comme d'usage commun et contient une alberca"
    ],
    toObtain: [
      "Date exacte de chaque courrier",
      "Nature de chaque pièce : demande, réponse, mise en demeure, recommandé, accusé de réception",
      "Expéditeur et destinataire sans publier d'identifiants sensibles",
      "Objet exact et ouvrage / parcelle concerné",
      "Demande formulée et réponse éventuelle",
      "Mention d'une quote-part, d'une vanne, d'une conduite, d'un droit d'accès ou d'eau",
      "Mention d'entretien, de travaux, de frais ou d'un montant",
      "Lien éventuel avec un titre registral, un accord ou une pièce ultérieure"
    ],
    linkedTo: "q-eau-correspondances-2002-2006",
    expectedProof: "Tableau lettre par lettre + rattachement aux pièces registrales + liste des droits encore non prouvés"
  },
  {
    id: "maison-infiltrations-2026",
    category: "Maison",
    priority: "Priorité 1",
    title: "Fermer le dossier infiltrations / toiture / assurance 2026",
    contact: "Archives maison + entreprise toiture + assureur",
    contactHint: "Le sinistre n'est pas à découvrir : le C.R. familial approuvé du 08/05/2026 documente déjà les infiltrations, le devis toiture demandé et le contact assurance pour les dégâts intérieurs. Il faut récupérer les pièces externes qui prouvent la suite réelle.",
    mode: "Recherche dans le Baúl puis demandes ciblées",
    goal: "Savoir ce qui a été diagnostiqué, chiffré, réparé et pris en charge, sans extrapoler la police historique 2013-2018 au contrat actif en 2026.",
    alreadyKnown: [
      "[CR] Des infiltrations dans la maison sont consignées au C.R. du 08/05/2026",
      "[CR] Un devis a été demandé pour le toit",
      "[CR] L'assurance a été contactée pour les dégâts intérieurs",
      "[CR] Le C.R. rapporte que l'assurance attend la fin des travaux de toiture pour intervenir",
      "[CR] Le même C.R. rapporte que la toiture elle-même n'est pas prise en charge",
      "[CR] Le 15/05/2026, les infiltrations restent citées parmi les sujets à faire / non réalisés",
      "[P] Une police Santa Lucía 2013 / duplicata 2018 est connue, mais sa continuité en 2026 n'est pas établie"
    ],
    toObtain: [
      "Devis toiture demandé en 2026",
      "Diagnostic ou description technique de la cause des infiltrations",
      "Police / avenant actif au moment du sinistre 2026",
      "Déclaration de sinistre et référence du dossier",
      "Réponse écrite de l'assureur sur la toiture et les dégâts intérieurs",
      "Rapport d'expertise éventuel",
      "Si travaux réalisés : devis accepté, facture et preuve d'achèvement",
      "Devis / factures de remise en état intérieure",
      "Preuve d'une indemnisation ou intervention finale, si elle a eu lieu"
    ],
    scriptLabel: "Texte à utiliser auprès de l'assureur",
    script: "Buenos días. Estamos ordenando el expediente de un siniestro por filtraciones en la vivienda. En nuestras actas de mayo de 2026 consta que se comunicaron daños interiores al seguro y que se indicó que primero debía repararse el tejado, cuya reparación no estaría cubierta. Para cerrar correctamente el expediente necesitamos copia de la declaración del siniestro o su referencia, la póliza o suplemento vigente en esa fecha, la respuesta escrita sobre qué daños están cubiertos o excluidos, cualquier informe pericial y el estado final del expediente. No necesitamos datos bancarios sensibles.",
    linkedTo: "q-maison-infiltrations-2026",
    expectedProof: "Devis toiture + police active + dossier sinistre + réponse assureur + issue des travaux / indemnisation"
  },
  {
    id: "asaja-pac-2026-copie",
    category: "PAC",
    priority: "Priorité 1",
    title: "Récupérer la copie complète de la PAC 2026",
    contact: "ASAJA Málaga",
    contactHint: "La déclaration du 12/03/2026 est déjà connue. Après recherche dans les pièces disponibles, seules les pages détaillées 2026 restent réellement absentes. Ne pas redemander si la PAC a été faite, ni reprendre les données 2024 comme si elles étaient celles de 2026.",
    mode: "Téléphone ou passage chez ASAJA",
    goal: "Obtenir uniquement le dossier détaillé 2026 manquant afin de fixer les parcelles, recintos, surfaces, cultures et aides réellement déclarés en 2026.",
    alreadyKnown: [
      "[P] Déclaration PAC 2026 référencée au 12/03/2026",
      "[P] Les pages détaillées retrouvées dans nos archives correspondent à la PAC 2024",
      "[P] Deux recherches documentaires ciblées n'ont pas retrouvé le jeu détaillé 2026 dans les pièces indexées"
    ],
    toObtain: [
      "Copie complète de la Solicitud Única / PAC 2026 déposée le 12/03/2026",
      "Pages indiquant les parcelles et recintos déclarés",
      "Surfaces déclarées par usage / culture",
      "Surface déclarée en olivar",
      "Cultures / variétés mentionnées",
      "Aides et éco-régimes demandés ou appliqués",
      "Justificatif de présentation / référence du dossier 2026",
      "Ne pas recopier ni diffuser les données bancaires éventuellement présentes"
    ],
    scriptLabel: "Texte simple à lire",
    script: "Buenos días. Tenemos constancia de que la PAC 2026 de nuestra finca fue presentada el 12 de marzo de 2026. Ya hemos revisado nuestra documentación y tenemos el expediente detallado de 2024, pero nos faltan las páginas detalladas de 2026. ¿Podrían facilitarnos una copia completa de la Solicitud Única PAC 2026 y del justificante de presentación, con las parcelas, recintos, superficies, cultivos y ayudas declaradas? No necesitamos volver a comprobar si la PAC fue presentada; únicamente necesitamos la copia completa del expediente 2026 que falta en nuestro archivo.",
    linkedTo: "q-pac-contenu-2026",
    expectedProof: "Copie complète PAC 2026 + justificatif de présentation"
  },
  {
    id: "pelaez-role-fiscal",
    category: "Comptabilité",
    priority: "Priorité 2",
    title: "Compléter les archives fiscales réellement manquantes chez Peláez",
    contact: "Peláez — comptable / fiscalité",
    contactHint: "Nous n'avons plus besoin de lui demander quel était son rôle. Les pièces fiscales déjà retrouvées et les comptes rendus familiaux montrent que la fiscalité de la finca est bien un sujet traité avec Peláez. Le Modelo 100 de l'exercice 2025 est désormais également documenté : il faut seulement récupérer ce qui manque encore dans notre propre archive.",
    mode: "Téléphone ou passage au cabinet",
    goal: "Compléter les années fiscales absentes et récupérer les justificatifs agricoles sources qu'il conserve encore, sans redemander les déclarations déjà présentes dans le dossier.",
    alreadyKnown: [
      "[P] Le dossier contient un Modelo 100 de l'exercice 2017, avec présentation enregistrée le 18/05/2018",
      "[P] Le Modelo 100 de l'exercice 2018 est présent ; il comporte une rubrique d'activité agricole et sa présentation est enregistrée le 18/05/2019",
      "[P] Un Modelo 100 de l'exercice 2019 est présent, avec présentation enregistrée le 25/05/2020",
      "[P] Le Modelo 100 de l'exercice 2022 de María Josefa est présent, avec présentation enregistrée le 22/02/2024",
      "[P] Le Modelo 100 de l'exercice 2025 est présent, avec présentation enregistrée le 07/05/2026 ; il porte 9 816,61 € d'ingresos íntegros agricoles et un remboursement de 105,32 €",
      "[P/C] La Consulta de Datos Fiscales 2025 documente 5 265,47 € de rétributions agricoles et 4 551,14 € d'aide Junta, qui reconstituent exactement les 9 816,61 € du Modelo 100",
      "[A_VERIFIER] Le détail lisible des retenues 2025 donne 96,39 € + 6,93 € = 103,32 €, alors que le total imprimé et le Modelo 100 indiquent 105,32 € : écart documentaire de 2,00 € non résolu",
      "[D/P] Les comptes rendus familiaux de 2026 indiquent que la déclaration d'impôts doit être faite avec Peláez et mentionnent aussi son règlement à suivre"
    ],
    toObtain: [
      "Inventaire des exercices fiscaux que Peláez conserve encore et que nous n'avons pas déjà",
      "Copies des déclarations manquantes dans les pièces indexées : 2020, 2021, 2023 et 2024 s'il les conserve",
      "Pour les années manquantes : liquidations ou certificats San Juan réellement utilisés pour les revenus agricoles",
      "Justificatifs de subventions / PAC réellement utilisés dans les déclarations lorsqu'ils existent",
      "Factures ou justificatifs de dépenses agricoles utilisés pour le calcul fiscal lorsqu'ils sont encore archivés",
      "Copies des pièces sources anciennes que Peláez conserve et qui ne figurent plus dans notre dossier",
      "Si possible, pièce source permettant d'expliquer l'écart de 2,00 € sur les retenues fiscales 2025",
      "Ne pas demander ni recopier de coordonnées bancaires si elles ne sont pas nécessaires à la reconstitution fiscale"
    ],
    scriptLabel: "Texte à lire",
    script: "Buenos días. Estamos ordenando el expediente fiscal de la finca y no queremos pedirle documentos que ya tenemos. En nuestro archivo ya constan declaraciones Modelo 100 de los ejercicios 2017, 2018, 2019, 2022 y 2025. La declaración de 2025 fue presentada el 7 de mayo de 2026. Lo que necesitamos ahora es completar solamente lo que falta: ¿conserva usted las declaraciones de 2020, 2021, 2023 o 2024? Si las conserva, ¿podría darnos copia de esas declaraciones y de los justificantes agrícolas que se utilizaron para prepararlas, como liquidaciones o certificados de San Juan, subvenciones o documentación PAC y facturas o gastos agrícolas? En los datos fiscales de 2025 también vemos una diferencia de 2 euros entre el detalle legible de las retenciones y el total impreso; si conserva la pieza fuente que permite explicarlo, nos sería útil. No necesitamos datos bancarios; buscamos únicamente reconstruir el expediente fiscal y agrícola año por año.",
    linkedTo: "q-pelaez-archives",
    expectedProof: "Déclarations fiscales manquantes + inventaire daté des pièces agricoles sources encore conservées"
  },
  {
    id: "vitines-378-detail",
    category: "Exploitation",
    priority: "Priorité 2",
    title: "Faire détailler la facture Vitines n°378",
    contact: "Agrícola Vitines / López Gallego José",
    contactHint: "La facture n°378 est datée du 04/04/2026. Le C.R. familial décrit des travaux sans dates individuelles confirmées. Les dates avancées dans d'anciennes synthèses ne prouvent aucune anomalie chronologique.",
    mode: "Entretien sur place ou téléphone",
    goal: "Obtenir les dates réelles et la ventilation de la facture n°378, puis vérifier le rattachement de chaque prestation.",
    alreadyKnown: [
      "[P] Facture n°378 du 04/04/2026 : 4 950 € HT + 495 € de TVA = 5 445 € TTC ; libellé récolte d'olives + travail phytosanitaire",
      "[CR] Le C.R. familial approuvé mentionne aussi 1 tratamiento foliar, 1 cuba de 3 000 litros, 8 horas de desbrozar et 2 cubas liquido al suelo",
      "[SOURCE_SECONDAIRE_A_RETROUVER] D'anciennes synthèses placent ces interventions les 22/04/2026, 29/04/2026 et 01/05/2026",
      "[À CONFIRMER] Le C.R. ne date pas chaque prestation ; aucune antériorité de la facture sur les travaux n'est établie",
      "[CR] Paiements rapportés : 2 500 € le 05/05/2026 et 2 945 € le 10/05/2026 ; total 5 445 €, preuve bancaire encore à rapprocher"
    ],
    toObtain: [
      "Ventilation des 4 950 € HT de la facture n°378 : récolte, phytosanitaire, main-d'œuvre, matériel, produits et autres postes éventuels",
      "Dates réelles des travaux inclus dans la facture n°378",
      "Nombre de personnes / heures ou mode de calcul de la récolte",
      "Produit exact, matière active, dose et volume des travaux phytosanitaires inclus dans la facture",
      "Parcelles ou zones concernées par les travaux réellement facturés",
      "Préciser quels produits étaient fournis par Vitines et lesquels étaient achetés séparément",
      "Vérifier les dates avancées dans les anciennes synthèses à partir des bons de travail et corriger les repères non justifiés",
      "Preuve ou détail écrit permettant de relier chaque prestation à sa facture"
    ],
    scriptLabel: "Texte à lire",
    script: "Tenemos la factura nº 378 del 4 de abril de 2026 por 5.445 euros, con el concepto general de recogida de aceitunas y trabajo fitosanitario. El acta familiar menciona un tratamiento foliar, una cuba de 3.000 litros, ocho horas de desbroce y dos cubas de líquido al suelo, sin fechas individuales de ejecución confirmadas. ¿Podría precisar las fechas reales, los productos, las dosis, las parcelas, las horas o personas y el desglose del precio entre los trabajos incluidos? Las fechas indicadas en resúmenes antiguos no están acreditadas: queremos comprobarlas con sus partes de trabajo, sin presuponer una incoherencia con la factura.",
    linkedTo: "q-vitines-produits-ventilation",
    expectedProof: "Ventilation de la facture n°378 + dates réelles et justificatifs des prestations facturées"
  },
  {
    id: "vitines-cereales-trace",
    category: "Exploitation",
    priority: "Priorité 1",
    title: "Retracer l'exploitation et les flux des céréales après 2020",
    contact: "Archives famille / Agrícola Vitines / López Gallego José",
    contactHint: "Les achats d'avoine et de triticale de janvier 2024 sont documentés, mais ils ne prouvent ni une récolte ni une vente. Les C.R. familiaux 2026 demandent encore une facture de ramassage d'avoine ou d'autres céréales : le manque réel porte sur la base contractuelle post-2020 et sur la traçabilité de la récolte.",
    mode: "Recherche dans le Baúl puis demande ciblée",
    goal: "Séparer clairement les achats de semences / fournitures des récoltes et retrouver qui exploite les terres arables, sur quelle base, avec quels coûts et quelles recettes.",
    alreadyKnown: [
      "[P] Le bail écrit 2014–2020 prend fin le 11/03/2020 et n'est pas automatiquement prorogé",
      "[D-DOC] Le projet familial du 24/05/2020 envisage de nouvelles conditions pour les terres cultivées directement, mais aucun contrat signé post-2020 n'est actuellement retenu",
      "[P] Le 03/01/2024, deux factures portent sur 600 kg d'avoine pour 165 € et 500 kg de triticale pour 148,50 €",
      "[P/C] Ces factures prouvent des achats / fournitures ; elles ne prouvent pas la quantité récoltée, la destination ni la recette",
      "[P-CR] Les C.R. familiaux des 15/05/2026 et 19/06/2026 conservent l'action « facture ramassage avoine ou autres céréales » à demander à Vitines",
      "[D] Un C.R. mentionne également 1 200 € réglés à Vitines l'année précédente, mais l'objet de ce montant n'est pas suffisamment établi pour l'affecter aux céréales"
    ],
    toObtain: [
      "Contrat, avenant, accord signé ou décision familiale établissant la base d'exploitation des terres arables après le 11/03/2020",
      "Facture de ramassage de l'avoine ou autres céréales mentionnée dans les C.R. 2026",
      "Culture et surface réellement récoltées",
      "Kilos de grain et, le cas échéant, de paille obtenus",
      "Destination : vente, autoconsommation, stockage, remise à un tiers ou autre",
      "Facture / bon de livraison / justificatif de vente et encaissement éventuel",
      "Clarification de l'objet des 1 200 € mentionnés dans le C.R. si une pièce permet de le faire"
    ],
    scriptLabel: "Texte à lire",
    script: "Estamos separando correctamente el expediente de los cereales del expediente del olivar. Tenemos facturas de enero de 2024 por 600 kg de avena y 500 kg de triticale, pero esas facturas prueban compras y no nos dicen qué se cosechó después. En las actas familiares de 2026 sigue pendiente pedir a Vitines la factura de recogida de avena u otros cereales. Necesitamos saber qué cultivo se recogió, en qué superficie, cuántos kilos se obtuvieron, cuál fue su destino y si hubo venta o ingreso. También necesitamos identificar qué acuerdo o documento regula la explotación de esas tierras después de marzo de 2020. No queremos mezclar compras de semilla, trabajos de recogida y ventas como si fueran la misma operación.",
    linkedTo: "q-cereales-flux",
    expectedProof: "Base contractuelle post-2020 + facture de ramassage + kilos / destination + preuve de recette éventuelle"
  },
  {
    // Identifiant historique conservé pour le suivi déjà enregistré.
    id: "asaja-visite-technique",
    category: "Technique",
    priority: "Priorité 3",
    title: "Identifier un service de visite technique des oliviers",
    contact: "San Juan / ASAJA — service à confirmer",
    contactHint: "Le dossier attribue à San Juan un rôle de conseil technique et à ASAJA le suivi PAC. Cela ne confirme ni un service de visite, ni l'adhésion, ni le tarif, ni l'indépendance du technicien. Demander d'abord à San Juan quel service est disponible, puis à ASAJA ou à un agronome si nécessaire.",
    mode: "Téléphone",
    goal: "Confirmer un professionnel, ses qualifications, ses liens éventuels avec les prestataires, les conditions et le coût avant de convenir d'une visite.",
    toObtain: [
      "Confirmation du service proposé et de l'organisme qui l'assure",
      "Nom et qualifications du technicien ; liens éventuels avec les prestataires",
      "Conditions d'accès, tarif et disponibilités",
      "Périmètre de la visite : arbres, taille, sol, nutrition et symptômes visibles",
      "Possibilité d'évaluer le potentiel productif et les travaux prioritaires",
      "Possibilité d'un compte rendu écrit daté, avec photos si prévu"
    ],
    scriptLabel: "Texte à lire",
    script: "Buenos días. Buscamos un técnico para un olivar tradicional en Villanueva del Rosario. ¿Ofrecen una visita a la finca para examinar los árboles, el suelo y el mantenimiento y recomendar los trabajos prioritarios? ¿Quién realiza la visita, qué cualificación tiene y qué vínculos puede tener con nuestros proveedores? ¿Podrían precisar las condiciones de acceso, el precio, la disponibilidad y la posibilidad de un informe escrito y fechado? Si no ofrecen este servicio, ¿a qué profesional podemos dirigirnos?",
    linkedTo: "terrain-oliviers",
    expectedProof: "Confirmation écrite du service, de son périmètre et de son tarif avant rendez-vous"
  }
];