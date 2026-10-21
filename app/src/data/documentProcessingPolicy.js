export const DOCUMENT_PROCESSING_POLICY_VERSION = "V42-DOC-1";

export const documentProcessingPolicy = {
  mode: "mandatory_before_business_use",
  rule: "Aucun document ne peut alimenter une conclusion, une question du board ou une anomalie tant que sa lecture documentaire n'est pas terminée ou explicitement marquée comme illisible/a-verifier.",
  stages: [
    "fingerprint_sha256",
    "duplicate_detection",
    "file_inventory",
    "native_text_extraction",
    "visual_reading",
    "ocr_if_needed",
    "field_extraction",
    "cross_document_reconciliation",
    "proof_qualification",
    "board_reconciliation",
    "human_review_if_uncertain"
  ],
  requiredFields: [
    "document_type",
    "document_date",
    "issuer",
    "holder_or_recipient",
    "reference_number",
    "parcels_or_recintos",
    "declared_surfaces",
    "quantities",
    "amounts",
    "what_it_proves",
    "what_it_does_not_prove",
    "duplicate_links",
    "related_documents",
    "confidence"
  ],
  proofLevels: ["P", "D", "C", "H"],
  gates: {
    mayUpdateBoard: ["read_complete", "reviewed"],
    mayCreateFact: ["reviewed"],
    mayCloseQuestion: ["reviewed"],
    mayDeleteOriginal: []
  },
  uncertaintyRules: {
    lowConfidence: "route_to_human_review",
    contradiction: "keep_both_and_flag_conflict",
    incompleteCampaign: "never_infer_annual_total",
    unreadableField: "mark_unknown_do_not_guess",
    duplicate: "preserve_reference_do_not_double_count"
  },
  boardRules: {
    answeredQuestion: "close_or_reformulate",
    partiallyAnsweredQuestion: "replace_with_exact_missing_point",
    unsupportedQuestion: "remove_or_archive",
    newEvidence: "reconcile_with_all_open_questions_before_creating_new_ones"
  }
};
