"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";

type Status = "ACTIVE" | "INACTIVE" | "SUSPENDED";
type BillingCycle = "PER_TRIP" | "WEEKLY" | "FORTNIGHTLY" | "MONTHLY";
type ApprovalFlow = "NONE" | "MANAGER" | "MANAGER_FINANCE" | "CUSTOM";

type Corporate = {
  id: string;
  companyName: string;
  legalName?: string | null;
  gstNumber?: string | null;
  panNumber?: string | null;
  email: string;
  mobile: string;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
  status: Status;
  billingCycle: string;
  approvalFlow: string;
  creditLimit?: string | number | null;
  paymentTermsDays?: number | null;
  accountManagerName?: string | null;
  accountManagerEmail?: string | null;
  accountManagerMobile?: string | null;
  expectedMonthlyBookings?: number | null;
  customerTier?: string | null;
  serviceTypes?: string[] | null;
  quotationFileUrl?: string | null;
  quotationFileName?: string | null;
  agreementFileUrl?: string | null;
  agreementFileName?: string | null;
  createdAt: string;
  branchCount: number;
  employeeCount: number;
  departmentCount: number;
  costCenterCount: number;
  travelPolicyCount: number;
  approvalRuleCount: number;
  contractCount: number;
  bookingCount: number;
  monthlyBookingCount: number;
  previousMonthBookingCount: number;
  bookingValue: number;
  monthlyBookingValue: number;
  previousMonthBookingValue: number;
  outstandingAmount: number;
  averageRating: number | null;
};

type DashboardResponse = {
  corporates: Corporate[];
  totals: {
    totalCorporates: number;
    activeCorporates: number;
    inactiveSuspendedCorporates: number;
    totalBookings: number;
    totalBookingValue: number;
    outstandingAmount: number;
    averageMonthlyBookings: number;
    averageCorporateRating: number | null;
    monthlyBookings: number;
    previousMonthBookings: number;
    monthlyBookingValue: number;
    previousMonthBookingValue: number;
  };
};

type CorporateForm = {
  companyName: string;
  legalName: string;
  gstNumber: string;
  panNumber: string;
  email: string;
  mobile: string;
  website: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  status: Status;
  billingCycle: BillingCycle;
  approvalFlow: ApprovalFlow;
  creditLimit: string;
  paymentTermsDays: string;
  accountManagerName: string;
  accountManagerEmail: string;
  accountManagerMobile: string;
  expectedMonthlyBookings: string;
  serviceTypes: string[];
  quotationFile: File | null;
  agreementFile: File | null;
};

type CorporateDetails = Corporate & {
  branches?: unknown[];
  employees?: unknown[];
  corporateDepartments?: unknown[];
  costCenters?: unknown[];
  travelPolicies?: unknown[];
  approvalRules?: unknown[];
  contracts?: unknown[];
  invoiceSetting?: unknown;
  discounts?: unknown[];
  reports?: unknown[];
  wallet?: {
    balance?: string | number | null;
    creditLimit?: string | number | null;
  } | null;
};

const emptyForm: CorporateForm = {
  companyName: "",
  legalName: "",
  gstNumber: "",
  panNumber: "",
  email: "",
  mobile: "",
  website: "",
  address: "",
  city: "",
  state: "",
  country: "India",
  pincode: "",
  status: "ACTIVE",
  billingCycle: "MONTHLY",
  approvalFlow: "MANAGER",
  creditLimit: "",
  paymentTermsDays: "30",
  accountManagerName: "",
  accountManagerEmail: "",
  accountManagerMobile: "",
  expectedMonthlyBookings: "",
  serviceTypes: [],
  quotationFile: null,
  agreementFile: null,
};

const inputClass =
  "w-full rounded-[9px] border border-[#d8e0eb] bg-white px-3.5 py-2.5 text-[12px] text-[#334155] outline-none transition placeholder:text-[#8a9ab1] focus:border-[#6366f1] focus:ring-2 focus:ring-[#eef0ff]";

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-IN").format(Number.isFinite(value) ? value : 0);

const formatCycle = (value?: string | null) =>
  value ? value.replaceAll("_", " ") : "â€”";

const formatPercent = (current: number, previous: number) => {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return 100;
  return Math.round(((current - previous) / previous) * 100);
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "CO";

const SERVICE_TYPES = [
  { value: "AIRPORT", label: "Airport Transfers" },
  { value: "LOCAL", label: "Local Travel" },
  { value: "OUTSTATION", label: "Outstation" },
  { value: "HOURLY", label: "Hourly / Rental" },
] as const;

function getCorporateTier(monthlyBookings: number) {
  if (monthlyBookings <= 0) {
    return {
      key: "PROSPECT",
      label: "Prospect",
      range: "0 bookings / month",
      working: "Commercial tier will be classified after expected volume is confirmed.",
    };
  }
  if (monthlyBookings <= 10) {
    return {
      key: "STARTER",
      label: "Starter",
      range: "1â€“10 bookings / month",
      working: "Standard corporate servicing and pricing.",
    };
  }
  if (monthlyBookings <= 30) {
    return {
      key: "GROWTH",
      label: "Growth",
      range: "11â€“30 bookings / month",
      working: "Priority account handling and volume-based commercial review.",
    };
  }
  if (monthlyBookings <= 75) {
    return {
      key: "ENTERPRISE",
      label: "Enterprise",
      range: "31â€“75 bookings / month",
      working: "Dedicated account attention with negotiated enterprise terms.",
    };
  }
  return {
    key: "STRATEGIC",
    label: "Strategic",
    range: "76+ bookings / month",
    working: "Strategic enterprise account with dedicated commercial review.",
  };
}

export default function CorporatePage() {
  const router = useRouter();
  const [corporates, setCorporates] = useState<Corporate[]>([]);
  const [totals, setTotals] = useState<DashboardResponse["totals"]>({
    totalCorporates: 0,
    activeCorporates: 0,
    inactiveSuspendedCorporates: 0,
    totalBookings: 0,
    totalBookingValue: 0,
    outstandingAmount: 0,
    averageMonthlyBookings: 0,
    averageCorporateRating: null,
    monthlyBookings: 0,
    previousMonthBookings: 0,
    monthlyBookingValue: 0,
    previousMonthBookingValue: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [city, setCity] = useState("");
  const [accountManager, setAccountManager] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<Corporate | null>(null);
  const [viewing, setViewing] = useState<CorporateDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [form, setForm] = useState<CorporateForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [documentUploading, setDocumentUploading] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/corporate/dashboard", {
        cache: "no-store",
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to load corporate dashboard.");
      }

      setCorporates(Array.isArray(result.data?.corporates) ? result.data.corporates : []);
      setTotals(result.data?.totals ?? totals);
    } catch (err) {
      console.error("Corporate dashboard loading error:", err);
      setError(err instanceof Error ? err.message : "Failed to load corporate dashboard.");
      setCorporates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    const close = () => setMenuId(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  const cities = useMemo(
    () =>
      Array.from(
        new Set(
          corporates
            .map((item) => item.city?.trim())
            .filter((value): value is string => Boolean(value))
        )
      ).sort((a, b) => a.localeCompare(b)),
    [corporates]
  );

  const managers = useMemo(
    () =>
      Array.from(
        new Set(
          corporates
            .map((item) => item.accountManagerName?.trim())
            .filter((value): value is string => Boolean(value))
        )
      ).sort((a, b) => a.localeCompare(b)),
    [corporates]
  );

  const filtered = useMemo(() => {
    const value = search.toLowerCase().trim();

    return corporates.filter((item) => {
      const searchable = [
        item.companyName,
        item.legalName,
        item.gstNumber,
        item.email,
        item.mobile,
        item.city,
        item.state,
        item.accountManagerName,
        item.accountManagerEmail,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (!value || searchable.includes(value)) &&
        (!status || item.status === status) &&
        (!city || item.city === city) &&
        (!accountManager || item.accountManagerName === accountManager)
      );
    });
  }, [corporates, search, status, city, accountManager]);

  const activePercent =
    totals.totalCorporates > 0
      ? Math.round((totals.activeCorporates / totals.totalCorporates) * 100)
      : 0;

  const inactivePercent =
    totals.totalCorporates > 0
      ? Math.round((totals.inactiveSuspendedCorporates / totals.totalCorporates) * 100)
      : 0;

  const bookingGrowth = formatPercent(
    totals.monthlyBookings,
    totals.previousMonthBookings
  );

  const valueGrowth = formatPercent(
    totals.monthlyBookingValue,
    totals.previousMonthBookingValue
  );

  function resetFilters() {
    setSearch("");
    setStatus("");
    setCity("");
    setAccountManager("");
  }

  function openCreate() {
    setSelected(null);
    setForm({ ...emptyForm });
    setModalOpen(true);
  }

  async function openEdit(item: Corporate) {
    setSelected(item);
    setForm({
      ...emptyForm,
      companyName: item.companyName,
      legalName: item.legalName ?? "",
      gstNumber: item.gstNumber ?? "",
      panNumber: item.panNumber ?? "",
      email: item.email,
      mobile: item.mobile,
      website: item.website ?? "",
      address: item.address ?? "",
      city: item.city ?? "",
      state: item.state ?? "",
      country: item.country ?? "India",
      pincode: item.pincode ?? "",
      status: item.status,
      billingCycle: item.billingCycle as BillingCycle,
      approvalFlow: item.approvalFlow as ApprovalFlow,
      creditLimit: item.creditLimit == null ? "" : String(item.creditLimit),
      paymentTermsDays: item.paymentTermsDays == null ? "30" : String(item.paymentTermsDays),
      accountManagerName: item.accountManagerName ?? "",
      accountManagerEmail: item.accountManagerEmail ?? "",
      accountManagerMobile: item.accountManagerMobile ?? "",
      expectedMonthlyBookings: item.expectedMonthlyBookings == null ? "" : String(item.expectedMonthlyBookings),
      serviceTypes: Array.isArray(item.serviceTypes) ? item.serviceTypes : [],
    });

    try {
      const profileResponse = await fetch(
        `/api/corporate/profile?corporateId=${encodeURIComponent(item.id)}`,
        { cache: "no-store" }
      );
      const profileResult = await profileResponse.json();
      if (profileResponse.ok && profileResult.success && profileResult.data) {
        setForm((previous) => ({
          ...previous,
          expectedMonthlyBookings:
            profileResult.data.expectedMonthlyBookings == null
              ? previous.expectedMonthlyBookings
              : String(profileResult.data.expectedMonthlyBookings),
          serviceTypes: Array.isArray(profileResult.data.serviceTypes)
            ? profileResult.data.serviceTypes
            : previous.serviceTypes,
        }));
        setSelected((previous) =>
          previous
            ? {
                ...previous,
                expectedMonthlyBookings:
                  profileResult.data.expectedMonthlyBookings ?? null,
                customerTier: profileResult.data.customerTier ?? null,
                serviceTypes: Array.isArray(profileResult.data.serviceTypes)
                  ? profileResult.data.serviceTypes
                  : [],
                quotationFileUrl: profileResult.data.quotationFileUrl ?? null,
                quotationFileName: profileResult.data.quotationFileName ?? null,
                agreementFileUrl: profileResult.data.agreementFileUrl ?? null,
                agreementFileName: profileResult.data.agreementFileName ?? null,
              }
            : previous
        );
      }
    } catch (error) {
      console.error("Corporate commercial profile loading error:", error);
    }

    setModalOpen(true);
    setMenuId(null);
  }

  async function openView(item: Corporate) {
    setMenuId(null);
    setDetailsLoading(true);
    try {
      const response = await fetch(`/api/corporate?id=${encodeURIComponent(item.id)}`, {
        cache: "no-store",
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to load corporate details.");
      }

      setViewing(result.data as CorporateDetails);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to load corporate details.");
    } finally {
      setDetailsLoading(false);
    }
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setSelected(null);
    setForm({ ...emptyForm });
  }

  async function uploadCorporateDocument(
    file: File,
    documentLabel: string
  ) {
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      throw new Error(`${documentLabel} must be a PDF, JPG or PNG file.`);
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new Error(`${documentLabel} must be 10 MB or smaller.`);
    }

    const uploadData = new FormData();
    uploadData.append("file", file);

    const uploadResponse = await fetch("/api/files/upload", {
      method: "POST",
      body: uploadData,
    });
    const uploadResult = await uploadResponse.json();

    if (!uploadResponse.ok || !uploadResult.success) {
      throw new Error(
        uploadResult.message || `Failed to upload ${documentLabel}.`
      );
    }

    return uploadResult.data as {
      fileUrl: string;
      storageKey?: string;
      name: string;
      mimeType: string;
      size: number;
    };
  }

  async function saveCommercialProfile(corporateId: string) {
    const expected = form.expectedMonthlyBookings
      ? Number(form.expectedMonthlyBookings)
      : null;

    if (
      expected !== null &&
      (!Number.isInteger(expected) || expected < 0)
    ) {
      throw new Error("Expected monthly bookings must be a whole number of 0 or more.");
    }

    const tier = getCorporateTier(expected ?? 0);

    let quotation:
      | Awaited<ReturnType<typeof uploadCorporateDocument>>
      | null = null;
    let agreement:
      | Awaited<ReturnType<typeof uploadCorporateDocument>>
      | null = null;

    const quotationFile = form.quotationFile;
    const agreementFile = form.agreementFile;

    if (quotationFile) {
      quotation = await uploadCorporateDocument(
        quotationFile,
        "Quotation"
      );
    }

    if (agreementFile) {
      agreement = await uploadCorporateDocument(
        agreementFile,
        "Corporate Agreement"
      );
    }

    const response = await fetch("/api/corporate/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        corporateId,
        expectedMonthlyBookings: expected,
        customerTier: tier.key,
        serviceTypes: form.serviceTypes,
        ...(quotation
          ? {
              quotationFileUrl: quotation.fileUrl,
              quotationFileName: quotationFile!.name,
            }
          : {}),
        ...(agreement
          ? {
              agreementFileUrl: agreement.fileUrl,
              agreementFileName: agreementFile!.name,
            }
          : {}),
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || "Failed to save corporate commercial profile."
      );
    }
  }

  async function saveCorporate(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;

    try {
      setSaving(true);

      const payload = {
        ...form,
        creditLimit: form.creditLimit ? Number(form.creditLimit) : null,
        paymentTermsDays: Number(form.paymentTermsDays || 30),
        accountManagerName: form.accountManagerName || null,
        accountManagerEmail: form.accountManagerEmail || null,
        accountManagerMobile: form.accountManagerMobile || null,
      };

      const response = await fetch("/api/corporate", {
        method: selected ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selected ? { id: selected.id, ...payload } : payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to save corporate account.");
      }

      const savedCorporateId = selected?.id || result.data?.id;
      if (!savedCorporateId) {
        throw new Error("Corporate was saved but no corporate ID was returned.");
      }

      setDocumentUploading(true);
      await saveCommercialProfile(savedCorporateId);

      closeModal();
      await fetchDashboard();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save corporate account.");
    } finally {
      setDocumentUploading(false);
      setSaving(false);
    }
  }

  async function archiveCorporate(id: string) {
    setMenuId(null);

    if (!window.confirm("Archive this corporate account?")) return;

    try {
      const response = await fetch(`/api/corporate?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to archive corporate account.");
      }

      await fetchDashboard();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to archive corporate account.");
    }
  }

  function updateField<K extends keyof CorporateForm>(key: K, value: CorporateForm[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  function startCorporateBooking(item: Corporate) {
    if (item.status !== "ACTIVE") {
      alert("Only active corporate accounts can create bookings.");
      return;
    }

    const params = new URLSearchParams({
      corporateId: item.id,
      corporateName: item.companyName,
    });

    window.location.href = `/marketplace?${params.toString()}`;
  }
  function exportCsv() {
    const headers = [
      "Company",
      "GST",
      "Contact Email",
      "Mobile",
      "City",
      "State",
      "Billing",
      "Approval",
      "Bookings",
      "Booking Value",
      "Outstanding",
      "Status",
      "Account Manager",
    ];

    const rows = filtered.map((item) => [
      item.companyName,
      item.gstNumber ?? "",
      item.email,
      item.mobile,
      item.city ?? "",
      item.state ?? "",
      formatCycle(item.billingCycle),
      formatCycle(item.approvalFlow),
      item.bookingCount,
      item.bookingValue,
      item.outstandingAmount,
      item.status,
      item.accountManagerName ?? "",
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ridegrid-corporates-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <DashboardLayout>
      <div className="min-h-full space-y-4 bg-[#f3f6fa] pb-10">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-[11px] font-bold tracking-wide text-[#4b46e8]">
              CORPORATE MANAGEMENT
            </p>
            <h1 className="mt-1 text-[24px] font-bold leading-tight tracking-tight text-[#111827]">
              Corporate Accounts
            </h1>
            <p className="mt-1 text-[11px] text-[#64748b]">
              Manage enterprise clients, billing and travel controls.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex items-center gap-2 rounded-lg border border-[#dbe3ef] bg-white px-4 py-2 text-[12px] font-semibold text-[#334155] shadow-sm hover:bg-[#f8fafc]"
            >
              <span>â‡©</span>
              Export
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="rounded-lg bg-[#4f46e5] px-5 py-2 text-[12px] font-semibold text-white shadow-sm hover:bg-[#4338ca]"
            >
              + Add Corporate
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-3 xl:grid-cols-4 md:grid-cols-2">
          <KpiCard
            title="Total Corporates"
            value={formatNumber(totals.totalCorporates)}
            icon="â–¥"
            tone="indigo"
            footer={totals.totalCorporates ? "All active records in database" : "No corporate records"}
          />
          <KpiCard
            title="Active Corporates"
            value={formatNumber(totals.activeCorporates)}
            icon="â™§"
            tone="green"
            footer={`${activePercent}% of total`}
          />
          <KpiCard
            title="Inactive / Suspended"
            value={formatNumber(totals.inactiveSuspendedCorporates)}
            icon="â…¡"
            tone="amber"
            footer={`${inactivePercent}% of total`}
          />
          <KpiCard
            title="Total Bookings (Corporate)"
            value={formatNumber(totals.totalBookings)}
            icon="â–¡"
            tone="blue"
            footer={
              bookingGrowth === null
                ? "No monthly booking activity"
                : bookingGrowth >= 0
                  ? `â†‘ ${bookingGrowth}% this month`
                  : `â†“ ${Math.abs(bookingGrowth)}% this month`
            }
            positive={bookingGrowth === null ? undefined : bookingGrowth >= 0}
          />

          <KpiCard
            title="Total Booking Value"
            value={formatMoney(totals.totalBookingValue)}
            icon="â‚¹"
            tone="violet"
            footer={
              valueGrowth === null
                ? "No monthly booking activity"
                : valueGrowth >= 0
                  ? `â†‘ ${valueGrowth}% this month`
                  : `â†“ ${Math.abs(valueGrowth)}% this month`
            }
            positive={valueGrowth === null ? undefined : valueGrowth >= 0}
          />
          <KpiCard
            title="Outstanding Amount"
            value={formatMoney(totals.outstandingAmount)}
            icon="Â¤"
            tone="blue"
            footer="Unpaid corporate-linked invoices"
            positive={false}
          />
          <KpiCard
            title="Avg. Monthly Bookings"
            value={formatNumber(totals.averageMonthlyBookings)}
            icon="Ã—"
            tone="rose"
            footer="Based on available corporate booking history"
          />
          <KpiCard
            title="Avg. Corporate Rating"
            value={totals.averageCorporateRating == null ? "â€”" : totals.averageCorporateRating.toFixed(1)}
            icon="âŒ"
            tone="green"
            footer={
              totals.averageCorporateRating == null
                ? "No corporate-linked published ratings"
                : "From published booking reviews"
            }
          />
        </div>

        <div className="rounded-[9px] border border-[#dfe5ee] bg-white p-3 shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
          <div className="grid gap-3 xl:grid-cols-[1.55fr_0.7fr_0.8fr_0.9fr_0.65fr] md:grid-cols-2">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search company name, contact, email or mobile..."
              className={inputClass}
            />

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className={inputClass}
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
            </select>

            <select
              value={city}
              onChange={(event) => setCity(event.target.value)}
              className={inputClass}
            >
              <option value="">All Cities</option>
              {cities.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>

            <select
              value={accountManager}
              onChange={(event) => setAccountManager(event.target.value)}
              className={inputClass}
            >
              <option value="">All Account Managers</option>
              {managers.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={resetFilters}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-[#f8fafc]"
            >
              Reset Filters
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-[10px] border border-[#dfe5ee] bg-white shadow-[0_1px_4px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between border-b border-[#edf1f6] px-4 py-3">
            <div>
              <h2 className="text-[11px] font-bold text-[#16325c]">Corporate Directory</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {loading ? "Loading..." : `${formatNumber(filtered.length)} records shown`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void fetchDashboard()}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-[#f8fafc]"
            >
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1200px] w-full">
              <thead className="bg-[#f8fafc]">
                <tr>
                  {[
                    "#",
                    "COMPANY",
                    "CONTACT PERSON",
                    "LOCATION",
                    "BILLING",
                    "BOOKINGS",
                    "AMOUNT (THIS MONTH)",
                    "STATUS",
                    "ACTIONS",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="px-4 py-3 text-left text-[9px] font-bold tracking-wide text-[#64748b]"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-14 text-center text-sm text-slate-500">
                      Loading corporate accounts from database...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-14 text-center text-sm text-slate-500">
                      No corporate accounts match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((item, index) => (
                    <tr key={item.id} className="hover:bg-[#f8fafc]/80">
                      <td className="px-4 py-3 text-xs text-slate-500">{index + 1}</td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] bg-[#e9e7ff] text-[11px] font-bold text-[#4f46e5]">
                            {initials(item.companyName)}
                          </div>
                          <div>
                            <div className="text-[11px] font-bold text-[#16325c]">
                              {item.companyName}
                            </div>
                            <div className="mt-0.5 text-[9px] text-[#8090a7]">
                              GST: {item.gstNumber || "Not provided"}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="text-[10px] font-semibold text-[#243b5a]">
                          {item.accountManagerName || "â€”"}
                        </div>
                        <div className="mt-0.5 text-[9px] text-[#64748b]">
                          {item.accountManagerMobile || item.mobile}
                        </div>
                        <div className="text-[9px] text-[#8a9ab1]">
                          {item.accountManagerEmail || item.email}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="text-[10px] font-medium text-[#334155]">
                          {item.city || "â€”"}
                        </div>
                        <div className="text-[9px] text-[#8a9ab1]">
                          {item.state || item.country || "â€”"}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="text-xs font-semibold text-slate-700">
                          {formatCycle(item.billingCycle)}
                        </div>
                        <div className="text-[9px] text-[#8a9ab1]">
                          {item.creditLimit == null
                            ? "No credit limit"
                            : `Credit: ${formatMoney(Number(item.creditLimit))}`}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="text-[10px] font-bold text-[#243b5a]">
                          {formatNumber(item.monthlyBookingCount)}
                        </div>
                        <div
                          className={
                            item.monthlyBookingCount >= item.previousMonthBookingCount
                              ? "text-[10px] font-semibold text-emerald-600"
                              : "text-[10px] font-semibold text-red-500"
                          }
                        >
                          {item.previousMonthBookingCount === 0
                            ? item.monthlyBookingCount > 0
                              ? "â†‘ New this month"
                              : "No activity"
                            : item.monthlyBookingCount >= item.previousMonthBookingCount
                              ? `â†‘ ${Math.round(((item.monthlyBookingCount - item.previousMonthBookingCount) / item.previousMonthBookingCount) * 100)}%`
                              : `â†“ ${Math.abs(Math.round(((item.monthlyBookingCount - item.previousMonthBookingCount) / item.previousMonthBookingCount) * 100))}%`}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="text-[10px] font-bold text-[#243b5a]">
                          {formatMoney(item.monthlyBookingValue)}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <StatusBadge status={item.status} />
                      </td>

                      <td className="px-4 py-3">
                        <div className="relative flex items-center gap-2">
                          <button
                            type="button"
                            title="Book"
                            onClick={() => startCorporateBooking(item)}
                            disabled={item.status !== "ACTIVE"}
                            className="flex h-8 items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 text-[10px] font-bold text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <span>🚗</span>
                            Book
                          </button>
                          <button
                            type="button"
                            title="View"
                            onClick={() => void openView(item)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-[#f8fafc]"
                          >
                            â—‰
                          </button>
                          <button
                            type="button"
                            title="Edit"
                            onClick={() => openEdit(item)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-[#f8fafc]"
                          >
                            âœŽ
                          </button>
                          <button
                            type="button"
                            title="More"
                            onClick={(event) => {
                              event.stopPropagation();
                              setMenuId((current) => (current === item.id ? null : item.id));
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-[#f8fafc]"
                          >
                            â‹¯
                          </button>

                          {menuId === item.id && (
                            <div
                              className="absolute right-0 top-10 z-30 w-40 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => void openView(item)}
                                className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-[#f8fafc]"
                              >
                                View Details
                              </button>
                              <button
                                type="button"
                                onClick={() => openEdit(item)}
                                className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-[#f8fafc]"
                              >
                                Edit Corporate
                              </button>
                              <button
                                type="button"
                                onClick={() => void archiveCorporate(item.id)}
                                className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50"
                              >
                                Archive
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {detailsLoading && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4">
            <div className="rounded-2xl bg-white px-6 py-5 text-sm font-semibold text-slate-700 shadow-2xl">
              Loading corporate details...
            </div>
          </div>
        )}

        {viewing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
            <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-[12px] bg-white shadow-2xl">
              <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[9px] bg-[#e9e7ff] font-bold text-[#4f46e5]">
                    {initials(viewing.companyName)}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{viewing.companyName}</h2>
                    <p className="text-sm text-slate-500">
                      {viewing.legalName || viewing.companyName}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViewing(null)}
                  className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100"
                >
                  âœ•
                </button>
              </div>

              <div className="grid gap-4 p-6 md:grid-cols-4">
                <DetailStat title="Branches" value={viewing.branches?.length ?? viewing.branchCount} />
                <DetailStat title="Employees" value={viewing.employees?.length ?? viewing.employeeCount} />
                <DetailStat title="Departments" value={viewing.corporateDepartments?.length ?? viewing.departmentCount} />
                <DetailStat title="Cost Centers" value={viewing.costCenters?.length ?? viewing.costCenterCount} />
                <DetailStat title="Travel Policies" value={viewing.travelPolicies?.length ?? viewing.travelPolicyCount} />
                <DetailStat title="Approval Rules" value={viewing.approvalRules?.length ?? viewing.approvalRuleCount} />
                <DetailStat title="Contracts" value={viewing.contracts?.length ?? viewing.contractCount} />
                <DetailStat title="Corporate Bookings" value={viewing.bookingCount} />
              </div>

              <div className="grid gap-6 border-t border-slate-100 p-6 lg:grid-cols-2">
                <InfoBlock title="Company & Contact">
                  <InfoRow label="GST" value={viewing.gstNumber || "Not provided"} />
                  <InfoRow label="PAN" value={viewing.panNumber || "Not provided"} />
                  <InfoRow label="Email" value={viewing.email} />
                  <InfoRow label="Mobile" value={viewing.mobile} />
                  <InfoRow label="Website" value={viewing.website || "Not provided"} />
                </InfoBlock>

                <InfoBlock title="Address">
                  <InfoRow label="Address" value={viewing.address || "Not provided"} />
                  <InfoRow label="City" value={viewing.city || "â€”"} />
                  <InfoRow label="State" value={viewing.state || "â€”"} />
                  <InfoRow label="Country" value={viewing.country || "India"} />
                  <InfoRow label="Pincode" value={viewing.pincode || "â€”"} />
                </InfoBlock>

                <InfoBlock title="Commercial Controls">
                  <InfoRow label="Billing" value={formatCycle(viewing.billingCycle)} />
                  <InfoRow label="Approval" value={formatCycle(viewing.approvalFlow)} />
                  <InfoRow label="Credit Limit" value={viewing.creditLimit == null ? "Not set" : formatMoney(Number(viewing.creditLimit))} />
                  <InfoRow label="Payment Terms" value={`${viewing.paymentTermsDays ?? 30} days`} />
                  <InfoRow label="Status" value={viewing.status} />
                </InfoBlock>

                <InfoBlock title="Account Manager">
                  <InfoRow label="Name" value={viewing.accountManagerName || "Not assigned"} />
                  <InfoRow label="Email" value={viewing.accountManagerEmail || "â€”"} />
                  <InfoRow label="Mobile" value={viewing.accountManagerMobile || "â€”"} />
                  <InfoRow label="Outstanding" value={formatMoney(viewing.outstandingAmount)} />
                  <InfoRow label="Rating" value={viewing.averageRating == null ? "No rating" : viewing.averageRating.toFixed(1)} />
                </InfoBlock>
              </div>

              <div className="flex justify-end border-t border-slate-100 px-6 py-4">
                <button
                  type="button"
                  onClick={() => {
                    setViewing(null);
                    openEdit(viewing);
                  }}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Edit Corporate
                </button>
              </div>
            </div>
          </div>
        )}

        {modalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeModal();
            }}
          >
            <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[12px] bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {selected ? "Edit Corporate" : "Add Corporate"}
                  </h2>
                  <p className="text-sm text-slate-500">
                    Enterprise account information
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving || documentUploading}
                  className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100"
                >
                  âœ•
                </button>
              </div>

              <form onSubmit={saveCorporate} className="space-y-6 p-6">
                <Section title="Company Information">
                  <Field label="Company Name" required>
                    <input required value={form.companyName} onChange={(e) => updateField("companyName", e.target.value)} className={inputClass} />
                  </Field>
                  <Field label="Legal Name">
                    <input value={form.legalName} onChange={(e) => updateField("legalName", e.target.value)} className={inputClass} />
                  </Field>
                  <Field label="GST Number">
                    <input value={form.gstNumber} onChange={(e) => updateField("gstNumber", e.target.value)} className={inputClass} />
                  </Field>
                  <Field label="PAN Number">
                    <input value={form.panNumber} onChange={(e) => updateField("panNumber", e.target.value)} className={inputClass} />
                  </Field>
                </Section>

                <Section title="Primary Contact">
                  <Field label="Email" required>
                    <input required type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} className={inputClass} />
                  </Field>
                  <Field label="Mobile" required>
                    <input required value={form.mobile} onChange={(e) => updateField("mobile", e.target.value)} className={inputClass} />
                  </Field>
                  <Field label="Website">
                    <input type="url" value={form.website} onChange={(e) => updateField("website", e.target.value)} className={inputClass} placeholder="https://example.com" />
                  </Field>
                  <Field label="Pincode" required>
                    <input required value={form.pincode} onChange={(e) => updateField("pincode", e.target.value)} className={inputClass} />
                  </Field>
                </Section>

                <Section title="Address">
                  <div className="md:col-span-2">
                    <Field label="Address" required>
                      <textarea required rows={3} value={form.address} onChange={(e) => updateField("address", e.target.value)} className={inputClass} />
                    </Field>
                  </div>
                  <Field label="City" required>
                    <input required value={form.city} onChange={(e) => updateField("city", e.target.value)} className={inputClass} />
                  </Field>
                  <Field label="State" required>
                    <input required value={form.state} onChange={(e) => updateField("state", e.target.value)} className={inputClass} />
                  </Field>
                  <Field label="Country">
                    <input value={form.country} onChange={(e) => updateField("country", e.target.value)} className={inputClass} />
                  </Field>
                </Section>

                <Section title="Commercial Controls">
                  <Field label="Status">
                    <select value={form.status} onChange={(e) => updateField("status", e.target.value as Status)} className={inputClass}>
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                      <option value="SUSPENDED">Suspended</option>
                    </select>
                  </Field>
                  <Field label="Billing Cycle">
                    <select value={form.billingCycle} onChange={(e) => updateField("billingCycle", e.target.value as BillingCycle)} className={inputClass}>
                      <option value="PER_TRIP">Per Trip</option>
                      <option value="WEEKLY">Weekly</option>
                      <option value="FORTNIGHTLY">Fortnightly</option>
                      <option value="MONTHLY">Monthly</option>
                    </select>
                  </Field>
                  <Field label="Approval Flow">
                    <select value={form.approvalFlow} onChange={(e) => updateField("approvalFlow", e.target.value as ApprovalFlow)} className={inputClass}>
                      <option value="NONE">None</option>
                      <option value="MANAGER">Manager</option>
                      <option value="MANAGER_FINANCE">Manager + Finance</option>
                      <option value="CUSTOM">Custom</option>
                    </select>
                  </Field>
                  <Field label="Credit Limit">
                    <input type="number" min="0" value={form.creditLimit} onChange={(e) => updateField("creditLimit", e.target.value)} className={inputClass} />
                  </Field>
                  <Field label="Payment Terms (Days)">
                    <input type="number" min="0" value={form.paymentTermsDays} onChange={(e) => updateField("paymentTermsDays", e.target.value)} className={inputClass} />
                  </Field>
                </Section>

                <Section title="Expected Volume & Account Tier">
                  <div className="md:col-span-2 -mb-1">
                    <p className="text-[10px] leading-4 text-slate-500">
                      Enter the tentative monthly booking volume agreed during onboarding.
                      RideGrid automatically classifies the account into a fixed service tier.
                    </p>
                  </div>
                  <Field label="Expected Monthly Bookings" required>
                    <input
                      required
                      type="number"
                      min="0"
                      step="1"
                      value={form.expectedMonthlyBookings}
                      onChange={(e) =>
                        updateField("expectedMonthlyBookings", e.target.value)
                      }
                      className={inputClass}
                      placeholder="e.g. 25"
                    />
                  </Field>

                  <Field label="RideGrid Account Tier">
                    <div className="rounded-[9px] border border-indigo-100 bg-indigo-50 px-4 py-3">
                      {(() => {
                        const tier = getCorporateTier(
                          Number(form.expectedMonthlyBookings || 0)
                        );
                        return (
                          <>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-sm font-bold text-indigo-700">
                                {tier.label}
                              </span>
                              <span className="text-[10px] font-semibold text-indigo-500">
                                {tier.range}
                              </span>
                            </div>
                            <p className="mt-1 text-[10px] leading-4 text-slate-600">
                              {tier.working}
                            </p>
                          </>
                        );
                      })()}
                    </div>
                  </Field>

                  <div className="md:col-span-2">
                    <Field label="Preferred Service Types">
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        {SERVICE_TYPES.map((service) => {
                          const checked = form.serviceTypes.includes(service.value);
                          return (
                            <label
                              key={service.value}
                              className={`flex cursor-pointer items-center gap-2 rounded-[9px] border px-3 py-2.5 text-[11px] font-semibold transition ${
                                checked
                                  ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  const next = e.target.checked
                                    ? [...form.serviceTypes, service.value]
                                    : form.serviceTypes.filter(
                                        (value) => value !== service.value
                                      );
                                  updateField("serviceTypes", next);
                                }}
                                className="h-4 w-4 accent-indigo-600"
                              />
                              {service.label}
                            </label>
                          );
                        })}
                      </div>
                    </Field>
                  </div>
                </Section>

                <Section title="Corporate Documents">
                  <Field label="Quotation Copy">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                      onChange={(e) =>
                        updateField("quotationFile", e.target.files?.[0] ?? null)
                      }
                      className={inputClass}
                    />
                    <DocumentHint
                      fileName={selected?.quotationFileName}
                      fileUrl={selected?.quotationFileUrl}
                    />
                  </Field>

                  <Field label="Corporate Agreement Copy">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                      onChange={(e) =>
                        updateField("agreementFile", e.target.files?.[0] ?? null)
                      }
                      className={inputClass}
                    />
                    <DocumentHint
                      fileName={selected?.agreementFileName}
                      fileUrl={selected?.agreementFileUrl}
                    />
                  </Field>
                </Section>

                <Section title="RideGrid Account Manager">
                  <Field label="Name">
                    <input value={form.accountManagerName} onChange={(e) => updateField("accountManagerName", e.target.value)} className={inputClass} />
                  </Field>
                  <Field label="Email">
                    <input type="email" value={form.accountManagerEmail} onChange={(e) => updateField("accountManagerEmail", e.target.value)} className={inputClass} />
                  </Field>
                  <Field label="Mobile">
                    <input value={form.accountManagerMobile} onChange={(e) => updateField("accountManagerMobile", e.target.value)} className={inputClass} />
                  </Field>
                </Section>

                <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                  <button type="button" onClick={closeModal} disabled={saving || documentUploading} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50">
                    Cancel
                  </button>
                  <button disabled={saving} type="submit" className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                    {documentUploading ? "Uploading documents..." : saving ? "Saving..." : selected ? "Update Corporate" : "Create Corporate"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function KpiCard({
  title,
  value,
  icon,
  tone,
  footer,
  positive,
}: {
  title: string;
  value: string;
  icon: string;
  tone: "indigo" | "green" | "amber" | "blue" | "violet" | "rose";
  footer: string;
  positive?: boolean;
}) {
  const tones = {
    indigo: "bg-[#e8e6ff] text-[#4f46e5]",
    green: "bg-[#d9f5df] text-[#16a34a]",
    amber: "bg-[#fff0d6] text-[#d97706]",
    blue: "bg-[#e2efff] text-[#2563eb]",
    violet: "bg-[#eee9ff] text-[#7c3aed]",
    rose: "bg-[#ffe3e6] text-[#e11d48]",
  };

  return (
    <div className="rounded-[9px] border border-[#dfe5ee] bg-white p-3 shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[9px] text-[18px] font-bold ${tones[tone]}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-[#64748b]">{title}</p>
          <p className="mt-1 truncate text-[22px] font-bold leading-none tracking-tight text-[#111827]">{value}</p>
          <p className={`mt-1 text-[10px] font-semibold ${positive === false ? "text-red-500" : positive === true ? "text-emerald-600" : "text-slate-400"}`}>
            {footer}
          </p>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const className =
    status === "ACTIVE"
      ? "bg-[#dff6e5] text-[#16803a]"
      : status === "SUSPENDED"
        ? "bg-[#fff0d5] text-[#b96800]"
        : "bg-[#ffe0e3] text-[#c62828]";

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold ${className}`}>
      {status}
    </span>
  );
}

function DetailStat({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-[#f8fafc] p-4">
      <p className="text-xs text-slate-500">{title}</p>
      <p className="mt-1 text-xl font-bold text-slate-900">{formatNumber(value)}</p>
    </div>
  );
}

function InfoBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 text-[11px] font-bold text-[#16325c]">{title}</h3>
      <div className="rounded-xl border border-slate-200 p-4">{children}</div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4 border-b border-slate-100 py-2.5 last:border-0">
      <span className="w-28 shrink-0 text-xs font-medium text-slate-400">{label}</span>
      <span className="min-w-0 break-words text-xs font-semibold text-slate-700">{value}</span>
    </div>
  );
}

function DocumentHint({
  fileName,
  fileUrl,
}: {
  fileName?: string | null;
  fileUrl?: string | null;
}) {
  if (!fileName && !fileUrl) {
    return (
      <p className="mt-1 text-[9px] text-slate-400">
        Optional â€¢ PDF, JPG or PNG â€¢ Max 10 MB
      </p>
    );
  }

  return (
    <p className="mt-1 text-[9px] text-emerald-600">
      Existing:{" "}
      {fileUrl ? (
        <a
          href={fileUrl}
          target="_blank"
          rel="noreferrer"
          className="font-semibold underline"
        >
          {fileName || "View document"}
        </a>
      ) : (
        fileName
      )}
      {" â€¢ Choose a new file to replace it."}
    </p>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">{title}</h3>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-600">
        {label}
        {required ? " *" : ""}
      </span>
      {children}
    </label>
  );
}


