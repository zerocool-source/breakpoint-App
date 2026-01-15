import { useState, useEffect } from "react";
import { useParams, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  Phone,
  Mail,
  ChevronDown,
  ChevronUp,
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
  phone: "(951) 653-3333",
  email: "info@breakpointpools.com",
};

export default function EstimateApproval() {
  const { token } = useParams<{ token: string }>();
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const actionFromUrl = urlParams.get("action");
  
  const [approverName, setApproverName] = useState("");
  const [approverTitle, setApproverTitle] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedAction, setSelectedAction] = useState<"approve" | "decline" | null>(null);
  const [showFullDetails, setShowFullDetails] = useState(false);
  
  useEffect(() => {
    if (actionFromUrl === "approve") {
      setSelectedAction("approve");
    } else if (actionFromUrl === "decline") {
      setSelectedAction("decline");
    }
  }, [actionFromUrl]);

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
        throw new Error(err.error || "Failed to decline estimate");
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
      month: "short",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-[#1E3A8A] mx-auto mb-3" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm bg-white rounded-xl shadow-lg p-6">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-xl font-semibold text-slate-800 mb-2">
            Unable to Load
          </h2>
          <p className="text-slate-600 text-sm">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  const { estimate, alreadyProcessed, action } = data!;
  const items = estimate.items || [];
  const itemCount = items.length;

  if (alreadyProcessed) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full text-center">
          {action === "approved" ? (
            <>
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">
                Approved
              </h2>
              <p className="text-slate-600 mb-4">
                Thank you! Our team will contact you to schedule the work.
              </p>
              {estimate.customerApproverName && (
                <div className="bg-slate-50 rounded-lg p-3 text-left text-sm">
                  <span className="text-slate-500">Approved by </span>
                  <span className="font-medium text-slate-800">
                    {estimate.customerApproverName}
                    {estimate.customerApproverTitle && ` (${estimate.customerApproverTitle})`}
                  </span>
                  {estimate.approvedAt && (
                    <span className="text-slate-500"> on {formatDate(estimate.approvedAt)}</span>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">
                Declined
              </h2>
              <p className="text-slate-600 mb-4">
                This estimate has been declined. Contact us if you have questions.
              </p>
              {estimate.rejectionReason && (
                <div className="bg-slate-50 rounded-lg p-3 text-left text-sm">
                  <span className="text-slate-500">Reason: </span>
                  <span className="text-slate-700">{estimate.rejectionReason}</span>
                </div>
              )}
            </>
          )}
          <div className="mt-6 pt-4 border-t text-xs text-slate-400">
            {COMPANY_INFO.name} • {COMPANY_INFO.phone}
          </div>
        </div>
      </div>
    );
  }

  const canSubmitApproval = approverName.trim().length >= 2;
  const canSubmitDecline = approverName.trim().length >= 2;

  return (
    <div className="min-h-screen bg-slate-50 py-4 px-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-[#1E3A8A] text-white p-4 text-center">
            <h1 className="text-lg font-bold">{COMPANY_INFO.name}</h1>
            <p className="text-blue-200 text-sm italic">{COMPANY_INFO.tagline}</p>
          </div>

          <div className="p-4">
            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Estimate</p>
                  <p className="font-bold text-slate-800">{estimate.estimateNumber || "—"}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Date</p>
                  <p className="text-sm text-slate-700">{formatDate(estimate.estimateDate || estimate.createdAt)}</p>
                </div>
              </div>
              
              <div className="border-t pt-3 mt-3">
                <p className="font-semibold text-slate-800">{estimate.propertyName}</p>
                {estimate.address && <p className="text-sm text-slate-600">{estimate.address}</p>}
              </div>

              {estimate.title && (
                <div className="mt-3 pt-3 border-t">
                  <p className="font-medium text-[#1E3A8A]">{estimate.title}</p>
                  {estimate.description && (
                    <p className="text-sm text-slate-600 mt-1">{estimate.description}</p>
                  )}
                </div>
              )}

              <div className="mt-4 flex justify-between items-center">
                <div>
                  <span className="text-sm text-slate-500">{itemCount} item{itemCount !== 1 ? "s" : ""}</span>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-[#1E3A8A]">{formatCurrency(estimate.totalAmount)}</p>
                </div>
              </div>

              <button
                onClick={() => setShowFullDetails(!showFullDetails)}
                className="mt-3 w-full flex items-center justify-center gap-1 text-sm text-[#1E3A8A] hover:underline"
                data-testid="button-toggle-details"
              >
                {showFullDetails ? (
                  <>Hide details <ChevronUp className="w-4 h-4" /></>
                ) : (
                  <>View all items <ChevronDown className="w-4 h-4" /></>
                )}
              </button>

              {showFullDetails && (
                <div className="mt-3 pt-3 border-t space-y-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm" data-testid={`row-item-${idx}`}>
                      <div className="flex-1">
                        <p className="font-medium text-slate-800">{item.productService}</p>
                        {item.description && (
                          <p className="text-xs text-slate-500">{item.description}</p>
                        )}
                      </div>
                      <div className="text-right pl-2">
                        <p className="font-medium text-slate-800">{formatCurrency(item.amount)}</p>
                        <p className="text-xs text-slate-500">x{item.quantity}</p>
                      </div>
                    </div>
                  ))}
                  
                  <div className="pt-2 border-t mt-2 space-y-1 text-sm">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal</span>
                      <span>{formatCurrency(estimate.subtotal)}</span>
                    </div>
                    {estimate.discountAmount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount</span>
                        <span>-{formatCurrency(estimate.discountAmount)}</span>
                      </div>
                    )}
                    {estimate.salesTaxAmount > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Tax{estimate.salesTaxRate ? ` (${estimate.salesTaxRate}%)` : ""}</span>
                        <span>{formatCurrency(estimate.salesTaxAmount)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {selectedAction === "approve" ? (
              <div className="space-y-4" data-testid="form-approve">
                <div className="text-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  </div>
                  <h2 className="text-lg font-bold text-green-800">Approve Estimate</h2>
                  <p className="text-sm text-slate-600">Enter your name to confirm approval</p>
                </div>

                <div>
                  <Label htmlFor="approverName" className="text-sm font-medium text-slate-700">
                    Your Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="approverName"
                    value={approverName}
                    onChange={(e) => setApproverName(e.target.value)}
                    placeholder="Full name"
                    className="mt-1"
                    autoFocus
                    data-testid="input-approver-name"
                  />
                </div>

                <div>
                  <Label htmlFor="approverTitle" className="text-sm font-medium text-slate-700">
                    Your Title <span className="text-slate-400">(optional)</span>
                  </Label>
                  <Input
                    id="approverTitle"
                    value={approverTitle}
                    onChange={(e) => setApproverTitle(e.target.value)}
                    placeholder="e.g., Property Manager"
                    className="mt-1"
                    data-testid="input-approver-title"
                  />
                </div>

                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg font-bold"
                  onClick={() => approveMutation.mutate()}
                  disabled={!canSubmitApproval || approveMutation.isPending}
                  data-testid="button-confirm-approve"
                >
                  {approveMutation.isPending ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                  )}
                  Confirm Approval
                </Button>

                <button
                  onClick={() => setSelectedAction(null)}
                  className="w-full text-center text-sm text-slate-500 hover:text-slate-700 py-2"
                  data-testid="button-back"
                >
                  Back to options
                </button>
              </div>
            ) : selectedAction === "decline" ? (
              <div className="space-y-4" data-testid="form-decline">
                <div className="text-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-2">
                    <XCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <h2 className="text-lg font-bold text-red-800">Decline Estimate</h2>
                  <p className="text-sm text-slate-600">Let us know why you're declining</p>
                </div>

                <div>
                  <Label htmlFor="approverName" className="text-sm font-medium text-slate-700">
                    Your Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="approverName"
                    value={approverName}
                    onChange={(e) => setApproverName(e.target.value)}
                    placeholder="Full name"
                    className="mt-1"
                    autoFocus
                    data-testid="input-approver-name"
                  />
                </div>

                <div>
                  <Label htmlFor="rejectionReason" className="text-sm font-medium text-slate-700">
                    Reason <span className="text-slate-400">(optional)</span>
                  </Label>
                  <Textarea
                    id="rejectionReason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Why are you declining?"
                    rows={2}
                    className="mt-1"
                    data-testid="textarea-rejection-reason"
                  />
                </div>

                <Button
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-6 text-lg font-bold"
                  onClick={() => rejectMutation.mutate()}
                  disabled={!canSubmitDecline || rejectMutation.isPending}
                  data-testid="button-confirm-decline"
                >
                  {rejectMutation.isPending ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <XCircle className="w-5 h-5 mr-2" />
                  )}
                  Confirm Decline
                </Button>

                <button
                  onClick={() => setSelectedAction(null)}
                  className="w-full text-center text-sm text-slate-500 hover:text-slate-700 py-2"
                  data-testid="button-back"
                >
                  Back to options
                </button>
              </div>
            ) : (
              <div className="space-y-3" data-testid="action-buttons">
                <p className="text-center text-sm text-slate-600 mb-4">
                  Please review the estimate above and select your response:
                </p>
                
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg font-bold shadow-md"
                  onClick={() => setSelectedAction("approve")}
                  data-testid="button-approve"
                >
                  <CheckCircle2 className="w-6 h-6 mr-2" />
                  APPROVE ESTIMATE
                </Button>
                
                <Button
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-6 text-lg font-bold shadow-md"
                  onClick={() => setSelectedAction("decline")}
                  data-testid="button-decline"
                >
                  <XCircle className="w-6 h-6 mr-2" />
                  DECLINE ESTIMATE
                </Button>
              </div>
            )}
          </div>

          <div className="bg-slate-50 px-4 py-3 text-center border-t">
            <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
              <a href={`tel:${COMPANY_INFO.phone}`} className="flex items-center gap-1 hover:text-slate-700">
                <Phone className="w-3 h-3" />
                {COMPANY_INFO.phone}
              </a>
              <a href={`mailto:${COMPANY_INFO.email}`} className="flex items-center gap-1 hover:text-slate-700">
                <Mail className="w-3 h-3" />
                {COMPANY_INFO.email}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
