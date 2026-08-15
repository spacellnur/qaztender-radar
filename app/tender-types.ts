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
  locality?: string;
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
  keywords: string[];
  negativeKeywords: string[];
  updatedAt: number;
};

export type TenderLot = {
  externalId: string;
  tenderId: string;
  lotNumber: string;
  title: string;
  description: string;
  statusName: string;
  amount: number;
  quantity: number;
  enstruIds: number[];
  deliveryKato: string[];
  upstreamUpdatedAt: string;
};

export type TenderDocument = {
  externalId: string;
  tenderId: string;
  lotId: string;
  name: string;
  originalName: string;
  url: string;
  upstreamUpdatedAt: string;
};

export type TenderChange = {
  id: string;
  tenderId: string;
  action: "sync" | "update" | "delete";
  title: string;
  changedAt: number;
};

export type TenderDetails = {
  lots: TenderLot[];
  documents: TenderDocument[];
  changes: TenderChange[];
};

export type TenderTask = {
  id: string;
  tenderId: string;
  title: string;
  status: "todo" | "done";
  assignedUserId: string;
  assignedUsername: string;
  dueAt: number | null;
  sortOrder: number;
  updatedAt: number;
};

export type TaskTeamMember = {
  id: string;
  username: string;
};

export type TenderTaskWorkspace = {
  tasks: TenderTask[];
  members: TaskTeamMember[];
};

export type ChecklistTemplateType = "open_tender" | "auction" | "price_quote" | "single_source" | "standard";

export type TenderNote = {
  id: string;
  tenderId: string;
  ownerKey: string;
  authorName: string;
  content: string;
  createdAt: number;
  updatedAt: number;
};

export type TelegramSubscriberStatus = "pending" | "approved" | "rejected" | "paused";
export type PaymentStatus = "trial" | "active_paid" | "expired";

export type TelegramSubscriber = {
  id: string;
  userId: string;
  chatId: string;
  username: string;
  firstName: string;
  companyInfo?: string;
  city?: string;
  industry?: string;
  status: TelegramSubscriberStatus;
  paymentStatus: PaymentStatus;
  trialExpiresAt: number;
  subscriptionExpiresAt: number | null;
  referredByChatId?: string;
  referralsCount?: number;
  lastActiveAt?: number;
  requestedAt: number;
  approvedAt: number | null;
  approvedBy: string | null;
  digestEnabled: boolean;
  instantEnabled: boolean;
  deadlinesEnabled: boolean;
  createdAt: number;
  updatedAt: number;
};




