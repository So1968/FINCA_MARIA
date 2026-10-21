export const cortijoOliveReference = {
  date: "21/04/2023",
  method: "Comptage de travail par photo-interprétation Google Earth",
  parcel25: {
    visibleTrees: 94,
    excludedOtherTrees: 2,
    olives: 92,
    cadastralOliveArea: "2,0009 ha",
    cadastralArableArea: "3,4924 ha",
    cadastralPastureArea: "0,1384 ha",
    cadastralTotalArea: "5,6317 ha"
  },
  parcel27: {
    olives: 186,
    cadastralOliveArea: "3,6657 ha",
    cadastralArableArea: "2,1977 ha",
    cadastralPastureArea: "0 ha",
    cadastralTotalArea: "5,8634 ha"
  },
  totalOlives: 278,
  cadastralOliveArea: "5,6666 ha",
  cadastralArableArea: "5,6901 ha",
  cadastralPastureArea: "0,1384 ha",
  cadastralTotalArea: "11,4951 ha",
  cadastralOliveShare: "≈ 49,3 %",
  pac2024: {
    date: "05/04/2024",
    status: "Dossier détaillé identifié",
    summary: "Polígono 185, parcelles 25 et 27, plusieurs recintos ; présence d'OLIVO HOJIBLANCA et de TRITICALE."
  },
  pac2026: {
    date: "12/03/2026",
    status: "Déclaration référencée — pages détaillées à récupérer",
    summary: "La déclaration PAC 2026 est repérée, mais les pages détaillées nécessaires pour fixer recintos, surfaces, cultures et aides 2026 ne sont pas retrouvées dans les pièces indexées."
  },
  status: "Référence de travail issue de l'imagerie ; ne remplace pas un inventaire géomètre ou un relevé terrain exhaustif"
};

export const cortijoTerrainHistory = [
  {
    date: "12/03/2026",
    type: "PAC",
    title: "PAC 2026 — déclaration référencée, détail encore manquant",
    summary: "L'existence de la déclaration PAC 2026 est documentée au 12/03/2026. Les pages détaillées 2026 permettant de fixer les recintos, surfaces, cultures et aides ne sont pas retrouvées dans les pièces indexées. Les données détaillées de 2024 ne doivent pas être réutilisées comme si elles décrivaient 2026.",
    location: "Dossier ASAJA / PAC — référence de dépôt du 12/03/2026",
    status: "Existence de la démarche acquise — contenu détaillé 2026 à récupérer"
  },
  {
    date: "05/04/2024",
    type: "PAC",
    title: "PAC 2024 — parcelles, recintos et cultures documentés",
    summary: "Le dossier détaillé 2024 porte sur le polígono 185, les parcelles 25 et 27 et plusieurs recintos. Il documente notamment de l'OLIVO HOJIBLANCA et du TRITICALE, ce qui confirme que la finca n'est pas une exploitation exclusivement oléicole.",
    location: "Dossier PAC détaillé enregistré le 05/04/2024",
    status: "Pièce détaillée 2024 — à comparer à la PAC 2026 lorsqu'elle sera complète"
  },
  {
    date: "21/04/2023",
    type: "Comptage",
    title: "Comptage de travail des oliviers — parcelles 25 et 27",
    summary: "Photo-interprétation Google Earth : parcelle 25, 94 arbres visibles dont 2 identifiés comme frênes, soit 92 oliviers retenus ; parcelle 27, 186 oliviers ; total de travail 278 oliviers. La surface oléicole cadastrale documentée des deux parcelles est de 5,6666 ha.",
    location: "Google Earth — imagerie du 21/04/2023 + dossier cadastral",
    status: "Comptage de travail à conserver distinct d'un inventaire géomètre / terrain"
  },
  {
    date: "2017",
    type: "Surface",
    title: "Référence cadastrale moderne — surfaces agricoles des parcelles 25 et 27",
    summary: "Parcelle 25 : 2,0009 ha d'olivier, 3,4924 ha de labour et 0,1384 ha de pâture, soit 5,6317 ha. Parcelle 27 : 3,6657 ha d'olivier et 2,1977 ha de labour, soit 5,8634 ha. Total : 5,6666 ha d'olivier, 5,6901 ha de terres labourables et 0,1384 ha de pâture sur 11,4951 ha. Les oliviers représentent donc environ 49,3 % de la surface cadastrale totale.",
    location: "Cadastre 2017 — parcelles 25 et 27",
    status: "Référence cadastrale de surface — ne jamais utiliser 11,4951 ha comme surface oléicole"
  },
  {
    date: "historique",
    type: "Eau / propriété",
    title: "Parcelle de 400 m² — deux sources et dépôt distributeur",
    summary: "Une description registrale distincte décrit une parcelle rustique de 400 m², soit 20 m de côté, provenant du Cortijo de Alemanes. Elle indique la présence de deux nacimientos de agua et d'un depósito distribuidor avec onze llaves de corte et onze tuberías. Cette pièce décrit physiquement la parcelle et les ouvrages ; elle ne suffit pas, seule, à établir la répartition actuelle des droits d'eau, de l'usage ou de l'entretien.",
    location: "BAÚL — description registrale de la parcelle de 400 m²",
    status: "[P] Description registrale de l'existence des ouvrages — droits actuels à distinguer"
  },
  {
    date: "historique",
    type: "Eau / propriété",
    title: "Parcelle commune de 1 536 m² — usage commun et alberca",
    summary: "Une autre description registrale porte sur une parcelle de 1 536 m² destinée exclusivement à l'usage commun des propriétaires des maisons et eras provenant du Cortijo de Alemanes. Elle mentionne qu'une alberca se trouve dans cette finca. La pièce documente la destination registrale historique de la parcelle ; elle ne règle pas à elle seule les modalités actuelles de gestion, d'accès ou d'entretien.",
    location: "BAÚL — description registrale de la parcelle commune de 1 536 m²",
    status: "[P] Usage commun historique et présence de l'alberca documentés"
  },
  {
    date: "2002",
    type: "Eau / propriété",
    title: "Correspondances eau / terrain 2002 localisées",
    summary: "Deux groupes primaires sont localisés dans le Baúl : le lot 21.28 de correspondance recommandée et le lot 21.30 de correspondance eau / terrain. Leur existence est acquise, mais leur contenu doit être relu lettre par lettre avant d'en déduire une demande, une réponse, une quote-part, un droit d'accès, un droit d'eau ou une obligation d'entretien.",
    location: "BAÚL — CamScanner 21.28 et 21.30",
    status: "Sources primaires localisées — portée exacte à réextraire"
  },
  {
    date: "2006",
    type: "Eau / propriété",
    title: "Correspondance recommandée 2006 localisée",
    summary: "Le lot primaire 21.29 est localisé et comporte notamment une preuve de remise / réception à confirmer par lecture de l'original. La présence d'un recommandé ne prouve ni l'objet de la demande ni son issue juridique ; le contenu de la lettre et la réponse éventuelle restent à établir.",
    location: "BAÚL — CamScanner 21.29",
    status: "Source primaire localisée — objet, destinataire et issue à confirmer"
  },
  {
    date: "15/08/2026",
    type: "Terrain",
    title: "État visuel des oliviers — repère août 2026",
    summary: "Vidéo panorama : vieux oliviers globalement vivants et feuillés, sans signe visuel évident de dépérissement généralisé. État hétérogène selon les arbres, avec certaines couronnes plus ouvertes, des zones possiblement sèches et de nombreux rejets au pied de certains sujets. Sol très sec. La vidéo ne permet pas encore d'évaluer sérieusement la charge en olives ni de diagnostiquer une carence ou une maladie.",
    location: "Bibliothèque ChatGPT — vidéo 1000027640.mp4",
    status: "Observation visuelle — à comparer au printemps et à confirmer sur place"
  },
  {
    date: "17/08/2026",
    type: "Terrain",
    title: "Limite entre parcelles — cauce / arroyo et passage de tracteurs",
    summary: "Série de photos montrant un lit de cours d'eau à sec ou intermittent au contact de deux propriétés et un passage agricole aménagé pour les tracteurs. La famille signale que cet aménagement pourrait modifier localement le trajet de l'eau et faire contourner deux unités de terrain. Les photos seules ne permettent pas de fixer la limite de propriété ni d'affirmer juridiquement une déviation du cauce.",
    location: "Conversation ChatGPT — série de photos envoyées le 17/08/2026 ; coordonnées et plan cadastral à relier",
    status: "Point terrain à documenter — vérifier cadastre, ancien tracé et autorisation hydraulique"
  },
  {
    date: "17/08/2026",
    type: "Cartographie",
    title: "Repérage cadastral et hydrographique — parcelles 25 et 27",
    summary: "Les pièces cadastrales identifient les parcelles du Cortijo comme polígono 185, parcela 25 (RC 29015A185000250000TT) et parcela 27 (RC 29015A185000270000TM), paraje ALEMANES, Antequera. La cartographie cadastrale mentionne explicitement une couche Hidrografía. Un document officiel de la Junta décrit, dans le même secteur, l'Arroyo los Pilones puis l'Arroyo de las Peñas à proximité du chemin vers le Cortijo los Alemanes. L'identité exacte du cauce visible sur les photos reste à verrouiller par superposition satellite/cadastre et repérage du passage de tracteurs.",
    location: "BAÚL — pièces cadastrales 2017 + sources publiques Catastro/Junta de Andalucía",
    status: "Localisation de secteur solide — passage exact et nom du cauce à confirmer"
  }
];