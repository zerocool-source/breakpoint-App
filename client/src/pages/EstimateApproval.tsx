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
  address: "6236 River Crest Drive Suite C",
  cityStateZip: "Riverside, CA 92507",
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
  const [submissionComplete, setSubmissionComplete] = useState<"approved" | "declined" | null>(null);
  
  useEffect(() => {
    if (actionFromUrl === "approve") {
      setSelectedAction("approve");
    } else if (actionFromUrl === "decline") {
      setSelectedAction("decline");
    }
  }, [actionFromUrl]);

  const { data, isLoading, error } = useQuery<{
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
    enabled: !!token,
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
      setSubmissionComplete("approved");
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
      setSubmissionComplete("declined");
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

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="text-center max-w-sm bg-white rounded-xl shadow-lg p-6">
          <AlertTriangle className="w-12 h-12 text-[#D35400] mx-auto mb-3" />
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Invalid Link</h2>
          <p className="text-slate-600 text-sm">This approval link appears to be invalid. Please check the link in your email.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-[#1e3a5f] mx-auto mb-3" />
          <p className="text-slate-600">Loading estimate...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="text-center max-w-sm bg-white rounded-xl shadow-lg p-6">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Unable to Load</h2>
          <p className="text-slate-600 text-sm">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  if (!data || !data.estimate) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="text-center max-w-sm bg-white rounded-xl shadow-lg p-6">
          <AlertTriangle className="w-12 h-12 text-[#D35400] mx-auto mb-3" />
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Estimate Not Found</h2>
          <p className="text-slate-600 text-sm">This estimate could not be found or the approval link may have expired.</p>
        </div>
      </div>
    );
  }

  const { estimate, alreadyProcessed, action } = data;
  const items = estimate.items || [];
  const billToName = estimate.customerName || estimate.propertyName || "";
  const billToAddress = estimate.billingAddress || estimate.address || "";

  const canSubmitApproval = approverName.trim().length >= 2;
  const canSubmitDecline = approverName.trim().length >= 2 && rejectionReason.trim().length >= 5;

  const renderEstimateContent = () => (
    <>
      {/* Header */}
      <div style={{ backgroundColor: "#1e3a5f", padding: "20px 30px" }}>
        <table width="100%" cellPadding={0} cellSpacing={0}>
          <tbody>
            <tr>
              <td>
                <h1 style={{ color: "#ffffff", margin: 0, fontSize: "24px", fontWeight: "bold" }}>{COMPANY_INFO.name}</h1>
                <p style={{ color: "#ffffff", margin: "5px 0 0 0", fontStyle: "italic", fontSize: "14px" }}>{COMPANY_INFO.tagline}</p>
              </td>
              <td style={{ textAlign: "right", color: "#ffffff", fontSize: "12px" }}>
                <p style={{ margin: 0 }}>{COMPANY_INFO.address}</p>
                <p style={{ margin: 0 }}>{COMPANY_INFO.cityStateZip}</p>
                <p style={{ margin: 0 }}>{COMPANY_INFO.phone}</p>
                <p style={{ margin: 0 }}>{COMPANY_INFO.email}</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Estimate Title Section */}
      <div style={{ padding: "30px" }}>
        <table width="100%" cellPadding={0} cellSpacing={0}>
          <tbody>
            <tr>
              <td>
                <h2 style={{ color: "#1e3a5f", margin: 0, fontSize: "28px", fontWeight: "bold" }}>ESTIMATE</h2>
              </td>
              <td style={{ textAlign: "right" }}>
                <p style={{ margin: 0, color: "#666" }}>Estimate #: <strong>{estimate.estimateNumber || "—"}</strong></p>
                <p style={{ margin: 0, color: "#666" }}>Date: <strong>{formatDate(estimate.estimateDate || estimate.createdAt)}</strong></p>
                {estimate.expirationDate && (
                  <p style={{ margin: 0, color: "#666" }}>Valid Until: <strong>{formatDate(estimate.expirationDate)}</strong></p>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Bill To / Service Location */}
      <div style={{ padding: "0 30px 20px 30px" }}>
        <table width="100%" cellPadding={0} cellSpacing={0}>
          <tbody>
            <tr>
              <td width="48%" style={{ backgroundColor: "#f8f9fa", padding: "15px", verticalAlign: "top" }}>
                <p style={{ margin: "0 0 5px 0", color: "#666", fontSize: "12px", textTransform: "uppercase" }}>Bill To</p>
                <p style={{ margin: 0, fontWeight: "bold" }}>{billToName}</p>
                {estimate.managementCompany && <p style={{ margin: 0, color: "#666" }}>C/O {estimate.managementCompany}</p>}
                <p style={{ margin: 0, color: "#666" }}>{billToAddress}</p>
              </td>
              <td width="4%"></td>
              <td width="48%" style={{ backgroundColor: "#f8f9fa", padding: "15px", verticalAlign: "top" }}>
                <p style={{ margin: "0 0 5px 0", color: "#666", fontSize: "12px", textTransform: "uppercase" }}>Service Location</p>
                <p style={{ margin: 0, fontWeight: "bold" }}>{estimate.propertyName}</p>
                <p style={{ margin: 0, color: "#666" }}>{estimate.address}</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Project Title */}
      {estimate.title && (
        <div style={{ padding: "0 30px 10px 30px" }}>
          <h3 style={{ color: "#e67e22", margin: 0, fontSize: "18px" }}>Project: {estimate.title}</h3>
        </div>
      )}

      {/* Description */}
      {estimate.description && (
        <div style={{ padding: "0 30px 20px 30px" }}>
          <div style={{ borderLeft: "4px solid #3498db", paddingLeft: "15px", color: "#666" }}>
            {estimate.description}
          </div>
        </div>
      )}

      {/* Line Items Table */}
      <div style={{ padding: "0 30px" }}>
        <table width="100%" cellPadding={10} cellSpacing={0} style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "#1e3a5f" }}>
              <td style={{ color: "#ffffff", fontWeight: "bold", width: "50%" }}>Description</td>
              <td style={{ color: "#ffffff", fontWeight: "bold", textAlign: "center" }}>Qty</td>
              <td style={{ color: "#ffffff", fontWeight: "bold", textAlign: "right" }}>Rate</td>
              <td style={{ color: "#ffffff", fontWeight: "bold", textAlign: "right" }}>Amount</td>
            </tr>
          </thead>
          <tbody>
            {items.slice(0, showFullDetails ? items.length : 3).map((item, idx) => (
              <tr key={idx} style={{ borderBottom: "1px solid #e0e0e0" }}>
                <td style={{ padding: "10px" }}>
                  {item.productService || item.description}
                  {item.description && item.productService !== item.description && (
                    <span style={{ color: "#666", fontSize: "12px", display: "block" }}>{item.description}</span>
                  )}
                </td>
                <td style={{ padding: "10px", textAlign: "center" }}>{item.quantity || 1}</td>
                <td style={{ padding: "10px", textAlign: "right" }}>{formatCurrency(item.rate || 0)}</td>
                <td style={{ padding: "10px", textAlign: "right" }}>{formatCurrency(item.amount || 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {items.length > 3 && (
          <button
            onClick={() => setShowFullDetails(!showFullDetails)}
            className="w-full py-2 text-sm text-[#1e3a5f] hover:underline flex items-center justify-center gap-1"
            data-testid="button-toggle-details"
          >
            {showFullDetails ? (
              <>Show less <ChevronUp className="w-4 h-4" /></>
            ) : (
              <>Show all {items.length} items <ChevronDown className="w-4 h-4" /></>
            )}
          </button>
        )}
      </div>

      {/* Totals */}
      <div style={{ padding: "20px 30px" }}>
        <table width="100%" cellPadding={0} cellSpacing={0}>
          <tbody>
            <tr>
              <td width="60%"></td>
              <td width="40%">
                <table width="100%" cellPadding={8} cellSpacing={0}>
                  <tbody>
                    <tr>
                      <td style={{ textAlign: "right", color: "#666" }}>Subtotal</td>
                      <td style={{ textAlign: "right" }}>{formatCurrency(estimate.subtotal || 0)}</td>
                    </tr>
                    {estimate.discountAmount > 0 && (
                      <tr>
                        <td style={{ textAlign: "right", color: "#27ae60" }}>Discount</td>
                        <td style={{ textAlign: "right", color: "#27ae60" }}>-{formatCurrency(estimate.discountAmount)}</td>
                      </tr>
                    )}
                    <tr>
                      <td style={{ textAlign: "right", color: "#666" }}>Tax{estimate.salesTaxRate ? ` (${estimate.salesTaxRate}%)` : ""}</td>
                      <td style={{ textAlign: "right" }}>{formatCurrency(estimate.salesTaxAmount || 0)}</td>
                    </tr>
                    <tr style={{ fontSize: "18px", fontWeight: "bold" }}>
                      <td style={{ textAlign: "right", color: "#1e3a5f" }}>Total</td>
                      <td style={{ textAlign: "right", color: "#e67e22" }}>{formatCurrency(estimate.totalAmount || 0)}</td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );

  const renderSuccessMessage = () => (
    <div style={{ padding: "30px", textAlign: "center" }}>
      <div style={{ 
        border: submissionComplete === "approved" ? "2px solid #27ae60" : "2px solid #e74c3c",
        borderRadius: "8px",
        padding: "30px",
        backgroundColor: submissionComplete === "approved" ? "#f0fdf4" : "#fef2f2"
      }}>
        {submissionComplete === "approved" ? (
          <>
            <div style={{ 
              width: "64px", height: "64px", borderRadius: "50%", 
              backgroundColor: "#dcfce7", display: "flex", alignItems: "center", 
              justifyContent: "center", margin: "0 auto 16px" 
            }}>
              <CheckCircle2 className="w-10 h-10 text-[#22D69A]" />
            </div>
            <h3 style={{ color: "#166534", margin: "0 0 10px 0", fontSize: "24px", fontWeight: "bold" }}>
              Estimate Approved!
            </h3>
            <p style={{ color: "#166534", margin: "0 0 20px 0" }}>
              Thank you, <strong>{approverName}</strong>! Your approval has been recorded.
            </p>
            <p style={{ color: "#666", margin: 0, fontSize: "14px" }}>
              Our team will contact you shortly to schedule the work.
            </p>
          </>
        ) : (
          <>
            <div style={{ 
              width: "64px", height: "64px", borderRadius: "50%", 
              backgroundColor: "#fee2e2", display: "flex", alignItems: "center", 
              justifyContent: "center", margin: "0 auto 16px" 
            }}>
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <h3 style={{ color: "#991b1b", margin: "0 0 10px 0", fontSize: "24px", fontWeight: "bold" }}>
              Estimate Declined
            </h3>
            <p style={{ color: "#991b1b", margin: "0 0 20px 0" }}>
              Your response has been recorded.
            </p>
            {rejectionReason && (
              <p style={{ color: "#666", margin: "0 0 20px 0", fontSize: "14px", fontStyle: "italic" }}>
                "{rejectionReason}"
              </p>
            )}
            <p style={{ color: "#666", margin: 0, fontSize: "14px" }}>
              If you have questions or would like to discuss alternatives, please contact us.
            </p>
          </>
        )}
      </div>
    </div>
  );

  const renderAlreadyProcessed = () => (
    <div style={{ padding: "30px", textAlign: "center" }}>
      <div style={{ 
        border: action === "approved" ? "2px solid #27ae60" : "2px solid #e74c3c",
        borderRadius: "8px",
        padding: "30px",
        backgroundColor: action === "approved" ? "#f0fdf4" : "#fef2f2"
      }}>
        {action === "approved" ? (
          <>
            <div style={{ 
              width: "64px", height: "64px", borderRadius: "50%", 
              backgroundColor: "#dcfce7", display: "flex", alignItems: "center", 
              justifyContent: "center", margin: "0 auto 16px" 
            }}>
              <CheckCircle2 className="w-10 h-10 text-[#22D69A]" />
            </div>
            <h3 style={{ color: "#166534", margin: "0 0 10px 0", fontSize: "24px", fontWeight: "bold" }}>
              Already Approved
            </h3>
            <p style={{ color: "#166534", margin: "0 0 10px 0" }}>
              This estimate was approved{estimate.customerApproverName ? ` by ${estimate.customerApproverName}` : ""}.
            </p>
            {estimate.approvedAt && (
              <p style={{ color: "#666", margin: 0, fontSize: "14px" }}>
                Approved on {formatDate(estimate.approvedAt)}
              </p>
            )}
          </>
        ) : (
          <>
            <div style={{ 
              width: "64px", height: "64px", borderRadius: "50%", 
              backgroundColor: "#fee2e2", display: "flex", alignItems: "center", 
              justifyContent: "center", margin: "0 auto 16px" 
            }}>
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <h3 style={{ color: "#991b1b", margin: "0 0 10px 0", fontSize: "24px", fontWeight: "bold" }}>
              Already Declined
            </h3>
            <p style={{ color: "#991b1b", margin: "0 0 10px 0" }}>
              This estimate was previously declined.
            </p>
            {estimate.rejectionReason && (
              <p style={{ color: "#666", margin: 0, fontSize: "14px", fontStyle: "italic" }}>
                Reason: "{estimate.rejectionReason}"
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );

  const renderActionSection = () => {
    if (submissionComplete) {
      return renderSuccessMessage();
    }

    if (alreadyProcessed) {
      return renderAlreadyProcessed();
    }

    return (
      <div style={{ padding: "0 30px 30px 30px" }}>
        <div style={{ 
          border: "2px solid #1e3a5f", 
          borderRadius: "8px", 
          padding: "25px", 
          backgroundColor: "#f8f9fa" 
        }}>
          <h3 style={{ color: "#1e3a5f", margin: "0 0 10px 0", textAlign: "center", fontSize: "18px" }}>
            Your Response Required
          </h3>
          <p style={{ color: "#666", margin: "0 0 20px 0", textAlign: "center", fontSize: "14px" }}>
            Please review the estimate above and respond below:
          </p>

          {/* Action Buttons - Transform inline when clicked */}
          <div className="space-y-4">
            {selectedAction === null ? (
              <div className="flex gap-3 justify-center">
                <Button
                  className="flex-1 max-w-[200px] bg-[#27ae60] hover:bg-[#219a52] text-white py-4 text-base font-bold"
                  onClick={() => setSelectedAction("approve")}
                  data-testid="button-approve"
                >
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  APPROVE
                </Button>
                <Button
                  className="flex-1 max-w-[200px] bg-[#e74c3c] hover:bg-[#d44332] text-white py-4 text-base font-bold"
                  onClick={() => setSelectedAction("decline")}
                  data-testid="button-decline"
                >
                  <XCircle className="w-5 h-5 mr-2" />
                  DECLINE
                </Button>
              </div>
            ) : selectedAction === "approve" ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300" data-testid="form-approve">
                <div className="flex items-center gap-2 justify-center mb-4">
                  <div className="w-10 h-10 rounded-full bg-[#22D69A]1A flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-[#22D69A]" />
                  </div>
                  <span className="text-[#22D69A] font-semibold text-lg">Approving Estimate</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
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
                      Title <span className="text-slate-400">(optional)</span>
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
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setSelectedAction(null)}
                    data-testid="button-back"
                  >
                    Back
                  </Button>
                  <Button
                    className="flex-1 bg-[#27ae60] hover:bg-[#219a52] text-white py-4 font-bold"
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
                </div>

                {approveMutation.isError && (
                  <p className="text-red-600 text-sm text-center">
                    {(approveMutation.error as Error).message}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300" data-testid="form-decline">
                <div className="flex items-center gap-2 justify-center mb-4">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <XCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <span className="text-red-700 font-semibold text-lg">Declining Estimate</span>
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
                    Reason for Declining <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="rejectionReason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Please tell us why you're declining this estimate..."
                    rows={2}
                    className="mt-1"
                    data-testid="textarea-rejection-reason"
                  />
                  <p className="text-xs text-slate-500 mt-1">Minimum 5 characters required</p>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setSelectedAction(null)}
                    data-testid="button-back"
                  >
                    Back
                  </Button>
                  <Button
                    className="flex-1 bg-[#e74c3c] hover:bg-[#d44332] text-white py-4 font-bold"
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
                </div>

                {rejectMutation.isError && (
                  <p className="text-red-600 text-sm text-center">
                    {(rejectMutation.error as Error).message}
                  </p>
                )}
              </div>
            )}
          </div>

          <p style={{ color: "#999", fontSize: "11px", margin: "20px 0 0 0", textAlign: "center" }}>
            This is a secure link. You will not need to log in.
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 py-4 px-4">
      <div className="max-w-[700px] mx-auto">
        <div className="bg-white shadow-lg overflow-hidden" style={{ fontFamily: "Arial, sans-serif" }}>
          {renderEstimateContent()}
          {renderActionSection()}

          {/* Footer */}
          <div style={{ backgroundColor: "#1e3a5f", padding: "20px 30px", textAlign: "center" }}>
            <p style={{ color: "#ffffff", margin: 0, fontSize: "12px" }}>
              {COMPANY_INFO.name} • {COMPANY_INFO.phone} • {COMPANY_INFO.email}
            </p>
            <div className="flex items-center justify-center gap-4 mt-2">
              <a href={`tel:${COMPANY_INFO.phone}`} className="flex items-center gap-1 text-white/80 hover:text-white text-xs">
                <Phone className="w-3 h-3" />
                Call Us
              </a>
              <a href={`mailto:${COMPANY_INFO.email}`} className="flex items-center gap-1 text-white/80 hover:text-white text-xs">
                <Mail className="w-3 h-3" />
                Email Us
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
