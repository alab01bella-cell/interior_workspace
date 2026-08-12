/**
 * Consultation navigation contract.
 *
 * Detail, submitted checklist, and archived Drive files are separate products.
 * Keep their destinations distinct and run `npm run test:regression` after
 * changing any consultation navigation.
 */
export const consultationDetailPath = (consultationId: string) =>
  `/consultations/${encodeURIComponent(consultationId)}`;

export const consultationChecklistPath = (consultationId: string) =>
  `${consultationDetailPath(consultationId)}/checklist`;

export const consultationSessionPath = (consultationId: string) =>
  `${consultationDetailPath(consultationId)}/session`;

export const consultationFileOpenPath = (consultationId: string, fileId: string) =>
  `/api/consultations/${encodeURIComponent(consultationId)}/files/${encodeURIComponent(fileId)}/open`;
