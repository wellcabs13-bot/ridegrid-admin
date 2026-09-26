export type WebsiteSeoStatus =
  | "DRAFT"
  | "GENERATED"
  | "REVIEW"
  | "READY"
  | "PUBLISHED"
  | "INDEXED"
  | "EXCLUDED"
  | "ERROR";

export type WebsiteSeoEntityType =
  | "ROUTE"
  | "CITY"
  | "AIRPORT"
  | "AREA"
  | "SERVICE"
  | "VEHICLE_CATEGORY"
  | "LOCATION"
  | "GUIDE"
  | "LANDING_PAGE";

export interface WebsiteSeoJobStatus {
  id: string;
  label: string;
  status: WebsiteSeoStatus;
  updatedAt?: string;
}
