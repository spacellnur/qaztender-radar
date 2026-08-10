// Compatibility surface for earlier imports. Live records are now read from D1;
// this module intentionally contains no demonstration procurement data.
export { getTenderSourceStatus, listTenders } from "./db";
export type { TenderRecord, TenderSourceStatus } from "./tender-types";
