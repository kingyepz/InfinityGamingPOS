import { useQuery } from "@tanstack/react-query";
import { SessionCard } from "./SessionCard";
import { Session, Customer } from "@shared/schema";

interface SessionSidebarProps {
  sessions: Session[];
  isLoading: boolean;
  onEndSession: (sessionId: number) => void;
}

export function SessionSidebar({ sessions, isLoading, onEndSession }: SessionSidebarProps) {
  const handleSendMpesaRequest = async (phoneNumber: string, amount: string) => {
    try {
      await fetch('/api/payments/mpesa-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber,
          amount: parseInt(amount, 10),
        }),
      });
      // In a real app, you would handle the response and show a success message
    } catch (error) {
      console.error('Error sending M-Pesa request:', error);
    }
  };

  return (
    <aside className="hidden xl:block bg-muted w-80 border-l border-border overflow-auto">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-lg text-foreground">Active Sessions</h3>
        <p className="text-sm text-muted-foreground">Currently running gaming sessions</p>
      </div>

      <div className="p-4 space-y-3">
        {isLoading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="h-32 bg-card rounded-lg animate-pulse"></div>
          ))
        ) : sessions.length > 0 ? (
          sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onEndSession={onEndSession}
            />
          ))
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            No active sessions
          </div>
        )}
      </div>

      <div className="p-4 border-t border-border">
        <h3 className="font-semibold text-foreground mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-2">
          <button className="bg-card hover:bg-muted border border-border rounded p-2 flex flex-col items-center justify-center text-center transition-colors">
            <i className="fas fa-user-plus text-blue-500 mb-1"></i>
            <span className="text-xs text-foreground">New Customer</span>
          </button>
          <button className="bg-card hover:bg-muted border border-border rounded p-2 flex flex-col items-center justify-center text-center transition-colors">
            <i className="fas fa-credit-card text-yellow-500 mb-1"></i>
            <span className="text-xs text-foreground">Process Payment</span>
          </button>
          <button className="bg-card hover:bg-muted border border-border rounded p-2 flex flex-col items-center justify-center text-center transition-colors">
            <i className="fas fa-ban text-red-500 mb-1"></i>
            <span className="text-xs text-foreground">Report Issue</span>
          </button>
          <button className="bg-card hover:bg-muted border border-border rounded p-2 flex flex-col items-center justify-center text-center transition-colors">
            <i className="fas fa-receipt text-green-500 mb-1"></i>
            <span className="text-xs text-foreground">View Reports</span>
          </button>
        </div>
      </div>

      <div className="p-4 border-t border-border">
        <div className="bg-card rounded-lg p-4 border border-border">
          <h3 className="font-semibold text-foreground mb-2">M-Pesa Integration</h3>
          <p className="text-xs text-muted-foreground mb-3">Process mobile payments quickly</p>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Phone Number</label>
              <input
                type="text"
                id="mpesa-phone"
                placeholder="e.g. 254712345678"
                className="bg-background w-full rounded px-3 py-2 text-sm border border-border focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1">Amount (KSh)</label>
              <input
                type="text"
                id="mpesa-amount"
                defaultValue="300"
                className="bg-background w-full rounded px-3 py-2 text-sm border border-border focus:border-primary focus:outline-none"
              />
            </div>

            <button
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded text-sm transition-colors flex items-center justify-center"
              onClick={() => {
                const phoneNumber = (document.getElementById('mpesa-phone') as HTMLInputElement).value;
                const amount = (document.getElementById('mpesa-amount') as HTMLInputElement).value;
                handleSendMpesaRequest(phoneNumber, amount);
              }}
            >
              <i className="fas fa-mobile-alt mr-2"></i>
              <span>Send M-Pesa Request</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
