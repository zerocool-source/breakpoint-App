import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  DollarSign,
  Calendar,
  User,
  MapPin,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Camera,
  X,
  ExternalLink,
  Wrench,
  FileImage,
  StickyNote,
} from "lucide-react";
import type { Invoice } from "@shared/schema";

interface InvoiceDetailModalProps {
  invoice: Invoice | null;
  open: boolean;
  onClose: () => void;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: "Draft", color: "bg-slate-100 text-slate-600 border-slate-300", icon: FileText },
  sent: { label: "Sent", color: "bg-blue-100 text-blue-700 border-blue-300", icon: Clock },
  paid: { label: "Paid", color: "bg-green-100 text-green-700 border-green-300", icon: CheckCircle2 },
  overdue: { label: "Overdue", color: "bg-red-100 text-red-700 border-red-300", icon: AlertCircle },
  voided: { label: "Voided", color: "bg-gray-200 text-gray-600 border-gray-400", icon: XCircle },
  partial: { label: "Partial", color: "bg-orange-100 text-orange-700 border-orange-300", icon: DollarSign },
};

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "—";
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function InvoiceDetailModal({ invoice, open, onClose }: InvoiceDetailModalProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const { data: estimateData } = useQuery({
    queryKey: ["/api/estimates", invoice?.estimateId],
    queryFn: async () => {
      if (!invoice?.estimateId) return null;
      const res = await fetch(`/api/estimates/${invoice.estimateId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!invoice?.estimateId && open,
  });

  if (!invoice) return null;

  const estimate = estimateData?.estimate;
  const statusInfo = statusConfig[invoice.status] || statusConfig.draft;
  const StatusIcon = statusInfo.icon;

  const allPhotos: string[] = [];
  if (invoice.attachments && Array.isArray(invoice.attachments)) {
    allPhotos.push(...invoice.attachments);
  }
  if (estimate?.photos && Array.isArray(estimate.photos)) {
    estimate.photos.forEach((p: string) => {
      if (!allPhotos.includes(p)) allPhotos.push(p);
    });
  }
  if (estimate?.attachments && Array.isArray(estimate.attachments)) {
    estimate.attachments.forEach((a: { url: string }) => {
      if (a.url && !allPhotos.includes(a.url)) allPhotos.push(a.url);
    });
  }

  const lineItems = invoice.lineItems || estimate?.items || [];
  const techName = invoice.repairTechName || invoice.serviceTechName || estimate?.repairTechName || estimate?.serviceTechName || "Not assigned";

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-blue-600" />
              Invoice Details
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="summary" className="mt-4">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="summary" className="gap-2">
                <FileText className="w-4 h-4" />
                Summary
              </TabsTrigger>
              <TabsTrigger value="job" className="gap-2">
                <Wrench className="w-4 h-4" />
                Job Details
              </TabsTrigger>
              <TabsTrigger value="photos" className="gap-2">
                <Camera className="w-4 h-4" />
                Photos ({allPhotos.length})
              </TabsTrigger>
              <TabsTrigger value="notes" className="gap-2">
                <StickyNote className="w-4 h-4" />
                Notes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-500">Invoice Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Invoice #</span>
                      <span className="font-mono font-medium">{invoice.invoiceNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">QB Invoice #</span>
                      <span className="font-mono text-blue-600">{invoice.quickbooksDocNumber || "—"}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Status</span>
                      <Badge variant="outline" className={`${statusInfo.color} gap-1`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusInfo.label}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Date Sent</span>
                      <span className="text-sm">{formatDate(invoice.sentAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Due Date</span>
                      <span className="text-sm">{formatDate(invoice.dueDate)}</span>
                    </div>
                    {invoice.quickbooksInvoiceId && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2 mt-2"
                        onClick={() => window.open(`https://app.qbo.intuit.com/app/invoice?txnId=${invoice.quickbooksInvoiceId}`, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4" />
                        View in QuickBooks
                      </Button>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-500">Customer & Payment</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Customer</span>
                      <span className="text-sm font-medium">{invoice.customerName}</span>
                    </div>
                    {invoice.propertyName && invoice.propertyName !== invoice.customerName && (
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-600">Property</span>
                        <span className="text-sm">{invoice.propertyName}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Total Amount</span>
                      <span className="font-semibold text-lg">{formatCurrency(invoice.totalAmount || 0)}</span>
                    </div>
                    {invoice.status === "paid" && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-600">Date Paid</span>
                          <span className="text-sm text-green-600">{formatDate(invoice.paidAt)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-600">Payment Method</span>
                          <Badge variant="outline" className="text-xs capitalize">
                            {invoice.paymentMethod || "Unknown"}
                          </Badge>
                        </div>
                      </>
                    )}
                    {invoice.emailedTo && (
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-600">Emailed To</span>
                        <span className="text-sm text-blue-600">{invoice.emailedTo}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="job" className="mt-4 space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-500 flex items-center gap-2">
                    <Wrench className="w-4 h-4" />
                    Work Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {estimate?.title && (
                    <div>
                      <span className="text-xs text-slate-500 uppercase">Job Title</span>
                      <p className="font-medium">{estimate.title}</p>
                    </div>
                  )}
                  {(estimate?.description || invoice.notes) && (
                    <div>
                      <span className="text-xs text-slate-500 uppercase">Description</span>
                      <p className="text-sm whitespace-pre-wrap">{estimate?.description || invoice.notes}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400" />
                      <div>
                        <span className="text-xs text-slate-500">Technician</span>
                        <p className="text-sm font-medium">{techName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <div>
                        <span className="text-xs text-slate-500">Property Address</span>
                        <p className="text-sm">{invoice.propertyAddress || estimate?.address || "Not specified"}</p>
                      </div>
                    </div>
                    {estimate?.estimateNumber && (
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <div>
                          <span className="text-xs text-slate-500">Source Estimate</span>
                          <p className="text-sm font-mono">{estimate.estimateNumber}</p>
                        </div>
                      </div>
                    )}
                    {estimate?.acceptedDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <div>
                          <span className="text-xs text-slate-500">Work Completed</span>
                          <p className="text-sm">{formatDate(estimate.acceptedDate)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-500">Line Items</CardTitle>
                </CardHeader>
                <CardContent>
                  {lineItems.length > 0 ? (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 text-xs text-slate-500">Description</th>
                          <th className="text-right py-2 text-xs text-slate-500">Qty</th>
                          <th className="text-right py-2 text-xs text-slate-500">Rate</th>
                          <th className="text-right py-2 text-xs text-slate-500">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineItems.map((item: any, index: number) => (
                          <tr key={index} className="border-b border-slate-100">
                            <td className="py-2">
                              <div>
                                {item.productService && (
                                  <span className="text-xs text-blue-600 block">{item.productService}</span>
                                )}
                                <span>{item.description}</span>
                              </div>
                            </td>
                            <td className="py-2 text-right">{item.quantity}</td>
                            <td className="py-2 text-right">{formatCurrency(item.rate || 0)}</td>
                            <td className="py-2 text-right font-medium">{formatCurrency(item.amount || 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="font-semibold">
                          <td colSpan={3} className="py-2 text-right">Total</td>
                          <td className="py-2 text-right text-lg">{formatCurrency(invoice.totalAmount || 0)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  ) : (
                    <p className="text-sm text-slate-500 italic">No line items available</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="photos" className="mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-500 flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    Attached Photos ({allPhotos.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {allPhotos.length > 0 ? (
                    <div className="grid grid-cols-4 gap-3">
                      {allPhotos.map((photo, index) => (
                        <div
                          key={index}
                          className="aspect-square rounded-lg overflow-hidden border border-slate-200 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setSelectedPhoto(photo)}
                        >
                          <img
                            src={photo}
                            alt={`Attachment ${index + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23f1f5f9' width='100' height='100'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2394a3b8' font-size='12'%3ENo Image%3C/text%3E%3C/svg%3E";
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <FileImage className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No photos attached to this invoice</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notes" className="mt-4 space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-500">Customer Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">
                    {invoice.notes || estimate?.customerNote || <span className="text-slate-400 italic">No customer notes</span>}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-500">Internal Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">
                    {invoice.internalNotes || estimate?.internalNotes || <span className="text-slate-400 italic">No internal notes</span>}
                  </p>
                </CardContent>
              </Card>

              {invoice.sentByUserName && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-500">Sent By</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="text-sm">{invoice.sentByUserName}</span>
                      {invoice.sentAt && (
                        <span className="text-xs text-slate-400">on {formatDate(invoice.sentAt)}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center cursor-pointer"
          onClick={() => setSelectedPhoto(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-slate-300"
            onClick={() => setSelectedPhoto(null)}
          >
            <X className="w-8 h-8" />
          </button>
          <img
            src={selectedPhoto}
            alt="Full size"
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
