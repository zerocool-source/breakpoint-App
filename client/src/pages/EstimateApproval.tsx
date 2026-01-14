import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  User,
  Briefcase,
  AlertTriangle,
  Phone,
  Mail,
  Globe,
  MapPin,
} from "lucide-react";

interface EstimateItem {
  lineNumber: number;
  productService: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  taxable: boolean;
  sku?: string;
  class?: string;
}

interface Estimate {
  id: string;
  estimateNumber: string;
  estimateDate: string;
  expirationDate: string;
  propertyName: string;
  address: string;
  customerName: string;
  customerEmail: string;
  billingAddress?: string;
  managementCompany?: string;
  title: string;
  description: string;
  items: EstimateItem[];
  subtotal: number;
  discountAmount: number;
  salesTaxRate: number;
  salesTaxAmount: number;
  totalAmount: number;
  partsTotal: number;
  laborTotal: number;
  status: string;
  createdAt: string;
  customerApproverName: string | null;
  customerApproverTitle: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
}

const COMPANY_INFO = {
  name: "Breakpoint Commercial Pool Systems",
  tagline: "Keeping People Safe",
  address: "6236 River Crest Drive Suite C",
  cityStateZip: "Riverside, CA 92507",
  phone: "(951) 653-3333",
  email: "info@breakpointpools.com",
  website: "www.BreakpointPools.com",
};

const COMPLIANCE_TEXT = `All work performed under this estimate will comply with applicable regulatory standards including but not limited to: California Title 22 (Health & Safety Code), California Title 24 (Building Standards), NEC Article 680 (Swimming Pools, Fountains, and Similar Installations), NFPA 54 (National Fuel Gas Code), ANSI/NSF 50 (Equipment for Swimming Pools, Spas, Hot Tubs, and Other Recreational Water Facilities), DOE (Department of Energy) efficiency standards, ADA (Americans with Disabilities Act) accessibility requirements, and VGB Act (Virginia Graeme Baker Pool and Spa Safety Act) compliance.`;

const TERMS_TEXT = `This estimate is valid for 60 days from the date shown above. For projects exceeding $500, a deposit of 10% or $1,000 (whichever is greater) is required to schedule work. For repairs exceeding $10,000, a 35% deposit is required. Final payment is due upon completion of work. All materials remain the property of Breakpoint Commercial Pool Systems until paid in full.`;

export default function EstimateApproval() {
  const { token } = useParams<{ token: string }>();
  const [approverName, setApproverName] = useState("");
  const [approverTitle, setApproverTitle] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  const { data, isLoading, error, refetch } = useQuery<{
    estimate: Estimate;
    alreadyProcessed: boolean;
    action?: "approved" | "rejected";
  }>({
    queryKey: ["estimate-approval", token],
    queryFn: async () => {
      const res = await fetch(`/api/public/estimates/approve/${token}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to load estimate");
      }
      return res.json();
    },
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/public/estimates/approve/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approverName, approverTitle }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to approve estimate");
      }
      return res.json();
    },
    onSuccess: () => {
      refetch();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/public/estimates/reject/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approverName, approverTitle, rejectionReason }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to reject estimate");
      }
      return res.json();
    },
    onSuccess: () => {
      refetch();
    },
  });

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatShortDate = (dateString: string) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#1E3A8A] mx-auto mb-4" />
          <p className="text-slate-600">Loading estimate...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-slate-800 mb-2">
            Unable to Load Estimate
          </h2>
          <p className="text-slate-600">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  const { estimate, alreadyProcessed, action } = data!;

  const isLaborItem = (item: EstimateItem) => {
    const classVal = (item.class || "").toLowerCase();
    const productVal = (item.productService || "").toLowerCase();
    const skuVal = (item.sku || "").toLowerCase();
    return classVal.includes("labor") || productVal.includes("labor") || skuVal.includes("labor");
  };

  const laborItems = (estimate.items || []).filter(isLaborItem);
  const partsItems = (estimate.items || []).filter((item) => !isLaborItem(item));

  const canSubmit = approverName.trim().length > 0 && approverTitle.trim().length > 0;

  if (alreadyProcessed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-lg w-full text-center">
          {action === "approved" ? (
            <>
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-12 h-12 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold text-slate-800 mb-3">
                Estimate Approved
              </h2>
              <p className="text-lg text-slate-600 mb-6">
                Thank you for approving this estimate. Our team will be in touch shortly to schedule the work.
              </p>
              {estimate.customerApproverName && (
                <div className="bg-slate-50 rounded-lg p-4 text-left">
                  <p className="text-sm text-slate-500">Approved by</p>
                  <p className="font-semibold text-slate-800">
                    {estimate.customerApproverName}
                    {estimate.customerApproverTitle && ` - ${estimate.customerApproverTitle}`}
                  </p>
                  {estimate.approvedAt && (
                    <p className="text-sm text-slate-500 mt-1">
                      on {formatDate(estimate.approvedAt)}
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-12 h-12 text-red-600" />
              </div>
              <h2 className="text-3xl font-bold text-slate-800 mb-3">
                Estimate Declined
              </h2>
              <p className="text-lg text-slate-600 mb-6">
                This estimate has been declined. If you have questions, please contact us.
              </p>
              {estimate.rejectionReason && (
                <div className="bg-slate-50 rounded-lg p-4 text-left">
                  <p className="text-sm font-medium text-slate-700 mb-1">Reason provided:</p>
                  <p className="text-slate-600">{estimate.rejectionReason}</p>
                </div>
              )}
            </>
          )}
          <div className="mt-8 pt-6 border-t">
            <p className="text-sm text-slate-500">
              {COMPANY_INFO.name} • {COMPANY_INFO.phone}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-8">
        <div className="bg-white border border-slate-200 shadow-lg rounded-lg overflow-hidden" style={{ fontFamily: "Arial, sans-serif" }}>
          <div className="bg-[#1E3A8A] text-white p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  {COMPANY_INFO.name}
                </h1>
                <p className="text-blue-200 text-lg italic mt-1">{COMPANY_INFO.tagline}</p>
              </div>
              <div className="text-right text-sm">
                <div className="flex items-center gap-2 justify-end">
                  <MapPin className="w-4 h-4" />
                  <span>{COMPANY_INFO.address}</span>
                </div>
                <p>{COMPANY_INFO.cityStateZip}</p>
                <div className="flex items-center gap-2 justify-end mt-2">
                  <Phone className="w-4 h-4" />
                  <span>{COMPANY_INFO.phone}</span>
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <Mail className="w-4 h-4" />
                  <span>{COMPANY_INFO.email}</span>
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <Globe className="w-4 h-4" />
                  <span>{COMPANY_INFO.website}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-3xl font-bold text-[#1E3A8A] tracking-wide">ESTIMATE</h2>
              </div>
              <div className="text-right">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <span className="text-slate-600 font-medium">Estimate #:</span>
                  <span className="font-bold text-slate-800">{estimate.estimateNumber || "—"}</span>
                  <span className="text-slate-600 font-medium">Date:</span>
                  <span className="text-slate-800">{formatShortDate(estimate.estimateDate || estimate.createdAt)}</span>
                  {estimate.expirationDate && (
                    <>
                      <span className="text-slate-600 font-medium">Valid Until:</span>
                      <span className="text-slate-800">{formatShortDate(estimate.expirationDate)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Bill To</h3>
                <div className="text-slate-800">
                  <p className="font-semibold text-lg">{estimate.customerName || estimate.propertyName}</p>
                  {estimate.managementCompany && (
                    <p className="text-slate-600">C/O {estimate.managementCompany}</p>
                  )}
                  {estimate.billingAddress ? (
                    <p className="text-slate-600 mt-1">{estimate.billingAddress}</p>
                  ) : estimate.address && (
                    <p className="text-slate-600 mt-1">{estimate.address}</p>
                  )}
                  {estimate.customerEmail && (
                    <p className="text-slate-600 mt-1">{estimate.customerEmail}</p>
                  )}
                </div>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Service Location / Ship To</h3>
                <div className="text-slate-800">
                  <p className="font-semibold text-lg">{estimate.propertyName}</p>
                  {estimate.address && (
                    <p className="text-slate-600 mt-1">{estimate.address}</p>
                  )}
                </div>
              </div>
            </div>

            {estimate.title && (
              <div className="mb-6">
                <h3 className="text-lg font-bold text-[#1E3A8A] mb-2">Project: {estimate.title}</h3>
                {estimate.description && (
                  <p className="text-slate-600 bg-blue-50 rounded-lg p-4 border-l-4 border-[#1E3A8A]">
                    {estimate.description}
                  </p>
                )}
              </div>
            )}

            <div className="mb-6">
              <table className="w-full border-collapse" data-testid="table-estimate-items">
                <thead>
                  <tr className="bg-[#1E3A8A] text-white">
                    <th className="text-left p-3 font-semibold text-sm">Description</th>
                    <th className="text-center p-3 font-semibold text-sm w-20">Qty</th>
                    <th className="text-right p-3 font-semibold text-sm w-28">Rate</th>
                    <th className="text-right p-3 font-semibold text-sm w-28">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {partsItems.length > 0 && (
                    <>
                      <tr className="bg-slate-100">
                        <td colSpan={4} className="p-2 font-bold text-slate-700 text-sm uppercase tracking-wide">
                          Parts & Equipment
                        </td>
                      </tr>
                      {partsItems.map((item, idx) => (
                        <tr key={`parts-${idx}`} className="border-b border-slate-200" data-testid={`row-parts-${idx}`}>
                          <td className="p-3">
                            <p className="font-medium text-slate-800">{item.productService}</p>
                            {item.description && (
                              <p className="text-sm text-slate-500 mt-1">{item.description}</p>
                            )}
                          </td>
                          <td className="p-3 text-center text-slate-700">{item.quantity}</td>
                          <td className="p-3 text-right text-slate-700">{formatCurrency(item.rate)}</td>
                          <td className="p-3 text-right font-medium text-slate-800">{formatCurrency(item.amount)}</td>
                        </tr>
                      ))}
                    </>
                  )}
                  {laborItems.length > 0 && (
                    <>
                      <tr className="bg-slate-100">
                        <td colSpan={4} className="p-2 font-bold text-slate-700 text-sm uppercase tracking-wide">
                          Labor
                        </td>
                      </tr>
                      {laborItems.map((item, idx) => (
                        <tr key={`labor-${idx}`} className="border-b border-slate-200" data-testid={`row-labor-${idx}`}>
                          <td className="p-3">
                            <p className="font-medium text-slate-800">{item.productService}</p>
                            {item.description && (
                              <p className="text-sm text-slate-500 mt-1">{item.description}</p>
                            )}
                          </td>
                          <td className="p-3 text-center text-slate-700">{item.quantity}</td>
                          <td className="p-3 text-right text-slate-700">{formatCurrency(item.rate)}</td>
                          <td className="p-3 text-right font-medium text-slate-800">{formatCurrency(item.amount)}</td>
                        </tr>
                      ))}
                    </>
                  )}
                  {partsItems.length === 0 && laborItems.length === 0 && (estimate.items || []).map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-200" data-testid={`row-item-${idx}`}>
                      <td className="p-3">
                        <p className="font-medium text-slate-800">{item.productService}</p>
                        {item.description && (
                          <p className="text-sm text-slate-500 mt-1">{item.description}</p>
                        )}
                      </td>
                      <td className="p-3 text-center text-slate-700">{item.quantity}</td>
                      <td className="p-3 text-right text-slate-700">{formatCurrency(item.rate)}</td>
                      <td className="p-3 text-right font-medium text-slate-800">{formatCurrency(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end mb-8">
              <div className="w-full sm:w-72 bg-slate-50 rounded-lg p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Subtotal</span>
                    <span className="font-medium text-slate-800">{formatCurrency(estimate.subtotal)}</span>
                  </div>
                  {estimate.discountAmount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>-{formatCurrency(estimate.discountAmount)}</span>
                    </div>
                  )}
                  {estimate.salesTaxAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">
                        Sales Tax {estimate.salesTaxRate ? `(${estimate.salesTaxRate}%)` : ""}
                      </span>
                      <span className="text-slate-800">{formatCurrency(estimate.salesTaxAmount)}</span>
                    </div>
                  )}
                  <Separator className="my-2" />
                  <div className="flex justify-between text-lg font-bold">
                    <span className="text-slate-800">Total</span>
                    <span className="text-[#1E3A8A]">{formatCurrency(estimate.totalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6 mb-8">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-bold text-[#1E3A8A] mb-2 text-sm uppercase tracking-wide">
                  Compliance & Authorization
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {COMPLIANCE_TEXT}
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="font-bold text-amber-800 mb-2 text-sm uppercase tracking-wide">
                  Terms & Conditions
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {TERMS_TEXT}
                </p>
              </div>
            </div>

            <Separator className="my-8" />

            <div className="bg-slate-50 rounded-xl p-6">
              <h3 className="text-xl font-bold text-slate-800 mb-2 text-center">
                Your Approval Required
              </h3>
              <p className="text-slate-600 text-center mb-6">
                Please enter your information and select Approve or Decline below.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <Label htmlFor="approverName" className="flex items-center gap-2 text-slate-700 font-medium">
                    <User className="w-4 h-4 text-slate-500" />
                    Your Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="approverName"
                    value={approverName}
                    onChange={(e) => setApproverName(e.target.value)}
                    placeholder="Enter your full name"
                    className="mt-2 bg-white"
                    data-testid="input-approver-name"
                  />
                </div>
                <div>
                  <Label htmlFor="approverTitle" className="flex items-center gap-2 text-slate-700 font-medium">
                    <Briefcase className="w-4 h-4 text-slate-500" />
                    Your Title / Role <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="approverTitle"
                    value={approverTitle}
                    onChange={(e) => setApproverTitle(e.target.value)}
                    placeholder="e.g., Property Manager, HOA President"
                    className="mt-2 bg-white"
                    data-testid="input-approver-title"
                  />
                </div>
              </div>

              {showRejectForm && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <Label htmlFor="rejectionReason" className="text-red-800 font-medium">
                    Reason for declining (optional)
                  </Label>
                  <Textarea
                    id="rejectionReason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Please let us know why you're declining this estimate so we can better address your needs..."
                    rows={3}
                    className="mt-2 bg-white"
                    data-testid="textarea-rejection-reason"
                  />
                </div>
              )}

              {!canSubmit && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6 flex items-center gap-2 justify-center">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span className="text-sm text-amber-800">Please enter your name and title/role to approve or decline this estimate</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  className="flex-1 bg-[#2CA01C] hover:bg-[#248a17] text-white py-7 text-lg font-bold shadow-lg hover:shadow-xl transition-all"
                  onClick={() => approveMutation.mutate()}
                  disabled={!canSubmit || approveMutation.isPending || rejectMutation.isPending}
                  data-testid="button-approve"
                >
                  {approveMutation.isPending ? (
                    <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-6 h-6 mr-2" />
                  )}
                  Approve Estimate
                </Button>
                <Button
                  className="flex-1 bg-[#DC2626] hover:bg-[#b91c1c] text-white py-7 text-lg font-bold shadow-lg hover:shadow-xl transition-all"
                  onClick={() => {
                    if (showRejectForm) {
                      rejectMutation.mutate();
                    } else {
                      setShowRejectForm(true);
                    }
                  }}
                  disabled={!canSubmit || approveMutation.isPending || rejectMutation.isPending}
                  data-testid="button-reject"
                >
                  {rejectMutation.isPending ? (
                    <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                  ) : (
                    <XCircle className="w-6 h-6 mr-2" />
                  )}
                  {showRejectForm ? "Confirm Decline" : "Decline Estimate"}
                </Button>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200 text-center">
              <p className="text-sm text-slate-500">
                {COMPANY_INFO.name} • {COMPANY_INFO.phone} • {COMPANY_INFO.email}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {COMPANY_INFO.website}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
