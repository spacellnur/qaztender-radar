export type TenderRecord = {
  externalId: string;
  numberAnno: string;
  title: string;
  buyer: string;
  customerBin: string;
  regionCode: string;
  regionName: string;
  subjectTypeId: number;
  subjectType: string;
  methodId: number;
  methodName: string;
  budget: number;
  startDate: number | null;
  endDate: number | null;
  publishDate: number | null;
  isConstructionWork: boolean;
  statusId: number;
  statusName: string;
  kato: string;
  systemId: number;
  sourceUrl: string;
  upstreamUpdatedAt: string;
  fetchedAt: number;
  updatedAt: number;
};

export type TenderSourceStatus = {
  configured: boolean;
  recordCount: number;
  state: "waiting_token" | "ready_to_sync" | "ready" | "error";
  lastSyncAt: number | null;
  lastSyncStatus: "succeeded" | "failed" | null;
  lastError: string;
};

export type TenderStage = "none" | "reviewing" | "participating" | "submitted" | "won" | "lost" | "skipped";

export type TenderWorkflowEntry = {
  tenderId: string;
  isFavorite: boolean;
  stage: TenderStage;
  updatedAt: number;
};

export type AlertFrequency = "off" | "instant" | "daily";

export type TenderSearchFilters = {
  query: string;
  region: string;
  subject: string;
  budget: string;
  deadline: string;
  constructionOnly: boolean;
  announcementNumber: string;
  customer: string;
  method: string;
  status: string;
  amountFrom: string;
  amountTo: string;
  publishedFrom: string;
  publishedTo: string;
  endingFrom: string;
  endingTo: string;
  financialYear: string;
  sort: string;
};

export type SavedSearch = {
  id: string;
  name: string;
  filters: TenderSearchFilters;
  alertFrequency: AlertFrequency;
  createdAt: number;
  updatedAt: number;
};

export type CompanyProfile = {
  companyName: string;
  bin: string;
  regions: string[];
  directions: string[];
  constructionTypes: string[];
  licenses: string;
  experienceYears: number;
  employeeCount: number;
  minBudget: number;
  maxBudget: number;
  updatedAt: number;
};
