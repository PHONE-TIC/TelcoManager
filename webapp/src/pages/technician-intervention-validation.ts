export function validateTechnicianReportStep(params: {
  commentaire: string;
  billing: { maintenance: boolean; garantie: boolean; facturable: boolean };
  systemType: string;
  onCommentMissing?: () => void;
}): boolean {
  const { commentaire, billing, systemType, onCommentMissing } = params;

  if (!commentaire.trim()) {
    alert("⚠️ Veuillez saisir un commentaire avant de continuer");
    onCommentMissing?.();
    return false;
  }

  if (!billing.maintenance && !billing.garantie && !billing.facturable) {
    alert("⚠️ Veuillez sélectionner au moins une option de facturation");
    return false;
  }

  if (!systemType.trim()) {
    alert("⚠️ Veuillez sélectionner un type de système");
    return false;
  }

  return true;
}
