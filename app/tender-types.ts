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
