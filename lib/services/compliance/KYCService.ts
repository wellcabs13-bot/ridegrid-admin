export type KYCStatus = "PENDING" | "VERIFIED" | "REJECTED";

export function validateKYCSubmission(input: {
  documentType: string;
  documentNumber: string;
  holderName: string;
}) {
  if (!input.documentType.trim()) throw new Error("Document type is required.");
  if (!input.documentNumber.trim()) throw new Error("Document number is required.");
  if (!input.holderName.trim()) throw new Error("Holder name is required.");

  return {
    valid: true,
    status: "PENDING" as KYCStatus,
  };
}

export function canOperateWithKYC(status: KYCStatus): boolean {
  return status === "VERIFIED";
}