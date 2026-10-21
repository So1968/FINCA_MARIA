export const cortijoLinks=[
  {
    id:'link-pac-2026',
    questionId:'q-pac-contenu-2026',
    anomalyId:null,
    proofId:'proof-pac-2026-declaration',
    reason:'La déclaration PAC 2026 existe ; le travail porte désormais sur le contenu détaillé, l’accusé, la résolution et le paiement'
  },
  {
    id:'link-vitines-378',
    questionId:'q-vitines-produits-ventilation',
    anomalyId:'a-vitines-detail',
    proofId:'proof-cr-vitines-2026',
    reason:'Le C.R. familial approuvé décrit les postes de la facture n°378 ; il faut encore relier la ventilation et les preuves d’exécution'
  }
];
export function findLinkedProofs(questionId,links){return links.filter(l=>l.questionId===questionId).map(l=>l.proofId)};