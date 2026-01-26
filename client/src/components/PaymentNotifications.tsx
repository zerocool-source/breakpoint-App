import { useEffect, useState } from "react";
import { DollarSign, X, CheckCircle2 } from "lucide-react";

interface PaymentNotification {
  id: string;
  invoiceNumber: string;
  customerName: string;
  amount: number;
  paymentMethod: string;
  timestamp: string;
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

export function PaymentNotifications() {
  const [notifications, setNotifications] = useState<PaymentNotification[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connect = () => {
      eventSource = new EventSource("/api/quickbooks/payment-events");

      eventSource.onopen = () => {
        setIsConnected(true);
        console.log("SSE connection established for payment notifications");
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === "connected") {
            console.log("Payment notification stream connected");
            return;
          }
          
          if (data.type === "payment_received" && data.data) {
            const notification = data.data as PaymentNotification;
            console.log("Payment received:", notification);
            
            setNotifications(prev => {
              const exists = prev.some(n => n.id === notification.id);
              if (exists) return prev;
              return [notification, ...prev].slice(0, 5);
            });
            
            setTimeout(() => {
              setNotifications(prev => prev.filter(n => n.id !== notification.id));
            }, 10000);
          }
        } catch (error) {
          console.error("Error parsing SSE message:", error);
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        eventSource?.close();
        
        reconnectTimeout = setTimeout(() => {
          console.log("Attempting to reconnect SSE...");
          connect();
        }, 5000);
      };
    };

    connect();

    return () => {
      eventSource?.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm" data-testid="payment-notifications">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className="bg-green-50 border border-green-200 rounded-lg shadow-lg p-4 flex items-start gap-3 animate-in slide-in-from-right-5 duration-300"
          data-testid={`payment-notification-${notification.id}`}
        >
          <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="font-semibold text-green-800">Payment Received!</span>
            </div>
            <p className="text-sm text-green-700 mt-1 truncate">
              {notification.customerName}
            </p>
            <div className="flex items-center gap-2 mt-1 text-sm">
              <span className="font-bold text-green-800">
                {formatCurrency(notification.amount)}
              </span>
              <span className="text-green-600">•</span>
              <span className="text-green-600">{notification.invoiceNumber}</span>
            </div>
            {notification.paymentMethod && notification.paymentMethod !== "Unknown" && (
              <p className="text-xs text-green-500 mt-1">
                via {notification.paymentMethod}
              </p>
            )}
          </div>
          <button
            onClick={() => dismissNotification(notification.id)}
            className="flex-shrink-0 text-green-400 hover:text-green-600 transition-colors"
            data-testid={`dismiss-notification-${notification.id}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
