export type ChecklistValue = string | string[] | boolean | File[];

export interface ChecklistFormState {
  [key: string]: ChecklistValue;
  address: string;
  addressDetail: string;
  housingType: string;
  housingTypeOther: string;
  areaSize: string;
  currentStatus: string;
  occupancyType: string;
  renovationReason: string;
  renovationReasonOther: string;
  visitDate: string;
  visitTime: string;
  callDays: string[];
  callTime: string;
  constructionScope: string;
  targetSpaces: string[];
  spaceDetails: string[];
  spaceDetailsOther: string;
  inconvenience: string;
  skipOk: string;
  priority: string[];
  nonNegotiable: string;
  budget: string;
  budgetType: string;
  moveInDate: string;
  preferredStart: string;
  livingDuringConstruction: string;
  scheduleNote: string;
  styles: string[];
  otherStyle: string;
  colorTone: string[];
  avoidStyle: string;
  residents: string;
  hasChild: string;
  hasPet: string;
  storageNeed: string;
  cookingFrequency: string;
  workSpace: string;
  lifestyleNote: string;
  sitePhotos: File[];
  referenceImages: File[];
  referenceLinks: string;
  referenceLike: string;
  ageGroup: string;
  consultationExperience: string;
  decisionStyle: string;
  preferredContact: string;
  questions: string;
  etc: string;
  name: string;
  phone: string;
  privacyConsent: boolean;
}

export interface ChecklistStepMeta {
  title: string;
  guide: string;
}

export interface ChecklistOption {
  label: string;
  value: string;
}

export interface SpaceDetailGroup {
  space: string;
  options: ChecklistOption[];
}

export type ChecklistAnswerValue = string | string[] | boolean;

export type ChecklistFormData = ChecklistFormState;

export interface StoredFileInfo {
  name: string;
  type: string;
  size: number;
}

export interface ChecklistSubmission {
  submissionId: string;
  submittedAt: string;
  answers: Record<string, ChecklistAnswerValue>;
  sitePhotoFiles: StoredFileInfo[];
  referenceImageFiles: StoredFileInfo[];
}
