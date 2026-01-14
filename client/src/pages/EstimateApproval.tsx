import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  XCircle,
  Building2,
  MapPin,
  FileText,
  DollarSign,
  Clock,
  AlertTriangle,
  Loader2,
  User,
  Briefcase,
} from "lucide-react";

interface EstimateItem {
  lineNumber: number;
  productService: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  taxable: boolean;
}

interface Estimate {
  id: string;
  estimateNumber: string;
  propertyName: string;
  address: string;
  customerName: string;
  title: string;
  description: string;
  items: EstimateItem[];
  subtotal: number;
  discountAmount: number;
  salesTaxAmount: number;
  totalAmount: number;
  status: string;
  createdAt: string;
  customerApproverName: string | null;
  customerApproverTitle: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
}

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
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-[#1E3A8A] mx-auto mb-4" />
            <p className="text-slate-600">Loading estimate details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-800 mb-2">
              Unable to Load Estimate
            </h2>
            <p className="text-slate-600">{(error as Error).message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { estimate, alreadyProcessed, action } = data!;

  if (alreadyProcessed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="py-12 text-center">
            {action === "approved" ? (
              <>
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="text-2xl font-semibold text-slate-800 mb-2">
                  Estimate Approved
                </h2>
                <p className="text-slate-600 mb-4">
                  This estimate has already been approved.
                </p>
                {estimate.customerApproverName && (
                  <p className="text-sm text-slate-500">
                    Approved by {estimate.customerApproverName}
                    {estimate.customerApproverTitle && ` (${estimate.customerApproverTitle})`}
                    {estimate.approvedAt && ` on ${formatDate(estimate.approvedAt)}`}
                  </p>
                )}
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-10 h-10 text-red-600" />
                </div>
                <h2 className="text-2xl font-semibold text-slate-800 mb-2">
                  Estimate Declined
                </h2>
                <p className="text-slate-600 mb-4">
                  This estimate has been declined.
                </p>
                {estimate.rejectionReason && (
                  <div className="mt-4 p-4 bg-slate-50 rounded-lg text-left">
                    <p className="text-sm font-medium text-slate-700 mb-1">Reason:</p>
                    <p className="text-sm text-slate-600">{estimate.rejectionReason}</p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#1E3A8A] mb-2">
            Estimate for Your Review
          </h1>
          <p className="text-slate-600">
            Please review the details below and approve or decline this estimate.
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="bg-[#1E3A8A] text-white rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6" />
                <div>
                  <CardTitle className="text-xl">
                    {estimate.estimateNumber || "Estimate"}
                  </CardTitle>
                  <p className="text-blue-100 text-sm mt-1">{estimate.title}</p>
                </div>
              </div>
              <Badge className="bg-white/20 text-white border-white/30 text-lg px-4 py-1">
                {formatCurrency(estimate.totalAmount)}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Building2 className="w-5 h-5 text-[#F97316] mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-800">{estimate.propertyName}</p>
                  {estimate.address && (
                    <p className="text-sm text-slate-600 flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />
                      {estimate.address}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {estimate.description && (
              <div>
                <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-500" />
                  Work Description
                </h3>
                <p className="text-slate-600 bg-slate-50 rounded-lg p-4">
                  {estimate.description}
                </p>
              </div>
            )}

            <Separator />

            <div>
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-slate-500" />
                Line Items
              </h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full" data-testid="table-estimate-items">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="text-left p-3 text-sm font-medium text-slate-600">
                        Item
                      </th>
                      <th className="text-center p-3 text-sm font-medium text-slate-600 w-20">
                        Qty
                      </th>
                      <th className="text-right p-3 text-sm font-medium text-slate-600 w-24">
                        Rate
                      </th>
                      <th className="text-right p-3 text-sm font-medium text-slate-600 w-24">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(estimate.items || []).map((item, idx) => (
                      <tr key={idx} className="border-t" data-testid={`row-item-${idx}`}>
                        <td className="p-3">
                          <p className="font-medium text-slate-800">
                            {item.productService}
                          </p>
                          {item.description && (
                            <p className="text-sm text-slate-500">{item.description}</p>
                          )}
                        </td>
                        <td className="p-3 text-center text-slate-700">
                          {item.quantity}
                        </td>
                        <td className="p-3 text-right text-slate-700">
                          {formatCurrency(item.rate)}
                        </td>
                        <td className="p-3 text-right font-medium text-slate-800">
                          {formatCurrency(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
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
                  <span>Sales Tax</span>
                  <span>{formatCurrency(estimate.salesTaxAmount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-lg font-bold text-slate-800">
                <span>Total</span>
                <span>{formatCurrency(estimate.totalAmount)}</span>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="font-semibold text-slate-800">Your Information</h3>
              <p className="text-sm text-slate-600">
                Please enter your name and title before approving or declining.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="approverName" className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    Your Name *
                  </Label>
                  <Input
                    id="approverName"
                    value={approverName}
                    onChange={(e) => setApproverName(e.target.value)}
                    placeholder="John Smith"
                    className="mt-1"
                    data-testid="input-approver-name"
                  />
                </div>
                <div>
                  <Label htmlFor="approverTitle" className="flex items-center gap-1">
                    <Briefcase className="w-4 h-4" />
                    Your Title/Role
                  </Label>
                  <Input
                    id="approverTitle"
                    value={approverTitle}
                    onChange={(e) => setApproverTitle(e.target.value)}
                    placeholder="Property Manager"
                    className="mt-1"
                    data-testid="input-approver-title"
                  />
                </div>
              </div>
            </div>

            {showRejectForm && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
                <Label htmlFor="rejectionReason">
                  Reason for declining (optional)
                </Label>
                <Textarea
                  id="rejectionReason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please let us know why you're declining this estimate..."
                  rows={3}
                  data-testid="textarea-rejection-reason"
                />
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-6 text-lg"
                onClick={() => approveMutation.mutate()}
                disabled={!approverName || approveMutation.isPending || rejectMutation.isPending}
                data-testid="button-approve"
              >
                {approveMutation.isPending ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                )}
                Approve Estimate
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-red-300 text-red-600 hover:bg-red-50 py-6 text-lg"
                onClick={() => {
                  if (showRejectForm) {
                    rejectMutation.mutate();
                  } else {
                    setShowRejectForm(true);
                  }
                }}
                disabled={approveMutation.isPending || rejectMutation.isPending}
                data-testid="button-reject"
              >
                {rejectMutation.isPending ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <XCircle className="w-5 h-5 mr-2" />
                )}
                {showRejectForm ? "Confirm Decline" : "Decline Estimate"}
              </Button>
            </div>

            {!approverName && (
              <p className="text-sm text-amber-600 flex items-center gap-1 justify-center">
                <AlertTriangle className="w-4 h-4" />
                Please enter your name to approve or decline
              </p>
            )}

            <p className="text-xs text-center text-slate-500 pt-4">
              <Clock className="w-3 h-3 inline mr-1" />
              Estimate created on {formatDate(estimate.createdAt)}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
