import type {
  CommentItem,
  MergeRequestDiscussionNote,
  MergeRequestDiscussionReference,
  MergeRequestItem,
} from "./types";

function formatDiscussionReference(reference: MergeRequestDiscussionReference | null): string {
  if (!reference) {
    return "Général (pas de référence fichier/ligne)";
  }

  const file =
    reference.oldPath && reference.newPath && reference.oldPath !== reference.newPath
      ? `${reference.oldPath} -> ${reference.newPath}`
      : reference.filePath ?? "fichier inconnu";

  if (
    reference.lineRangeStart &&
    reference.lineRangeEnd &&
    reference.lineRangeStart !== reference.lineRangeEnd
  ) {
    return `${file}:${reference.lineRangeStart}-${reference.lineRangeEnd}`;
  }

  if (reference.line) {
    return `${file}:${reference.line}`;
  }

  return file;
}

function normalizeCommentBody(body: string): string {
  const normalized = body.trim();
  return normalized.length > 0 ? normalized : "(sans contenu)";
}

export function buildMrCorrectionPrompt(
  mr: MergeRequestItem,
  notes: MergeRequestDiscussionNote[],
): string {
  const sortedNotes = [...notes].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));

  const sections = sortedNotes.map((note, index) => {
    const status = note.resolvable ? (note.resolved ? "resolved" : "unresolved") : "note";
    return [
      `### Commentaire ${index + 1}`,
      `- Auteur: ${note.authorName}`,
      `- Date: ${note.createdAt}`,
      `- Statut: ${status}`,
      `- Référence: ${formatDiscussionReference(note.reference)}`,
      "- Contenu:",
      normalizeCommentBody(note.body),
    ].join("\n");
  });

  return [
    "Applique les corrections demandées par les commentaires ci-dessous, puis propose un diff propre et minimal.",
    "",
    "## Contexte MR",
    `- Titre: ${mr.title}`,
    `- MR: !${mr.iid}`,
    `- URL: ${mr.webUrl}`,
    "",
    "## Commentaires à traiter",
    ...sections,
    "",
    "## Attendus",
    "- Corriger le code en respectant l'intention de chaque commentaire.",
    "- Conserver le style et les conventions du projet.",
    "- Lister les fichiers modifiés et résumer brièvement les changements",
    "- Modifier et lancer les tests si nécessaire.",
    "- Lancer le linter et corriger les erreurs si configuré.",
  ].join("\n");
}

export function buildCommentsCorrectionPrompt(comments: CommentItem[]): string {
  const sortedComments = [...comments].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));

  const sections = sortedComments.map((comment, index) =>
    [
      `### Commentaire ${index + 1}`,
      `- MR: !${comment.mrIid}`,
      `- Auteur: ${comment.authorName}`,
      `- Date: ${comment.createdAt}`,
      `- URL: ${comment.webUrl}`,
      "- Référence: non disponible dans la vue globale (ouvrir l'URL si besoin)",
      "- Contenu:",
      normalizeCommentBody(comment.body),
    ].join("\n"),
  );

  return [
    "Tu es un agent de correction de code.",
    "Traite les commentaires ci-dessous et propose un plan de corrections puis un diff minimal.",
    "",
    "## Commentaires à traiter",
    ...sections,
    "",
    "## Attendus",
    "- Corriger chaque point remonté.",
    "- Respecter les conventions du projet.",
    "- Lister les fichiers impactés et les changements clés.",
  ].join("\n");
}
