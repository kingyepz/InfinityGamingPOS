import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { StationCard } from "@/components/dashboard/StationCard";
import { SessionSidebar } from "@/components/dashboard/SessionSidebar";
import { NewSessionModal } from "@/components/dashboard/NewSessionModal";
import { Station, Session, Customer, Game } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { PaymentInterface } from "@/components/shared/PaymentInterface"; // Added import

// Define station filter types
type StationFilter = "All" | "PS5" | "XBOX" | "PC" | "VR";

// Placeholder skeleton components
const StatsSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
    {Array(4).fill(0).map((_, i) => (
      <div key={i} className="h-24 bg-card rounded-lg animate-pulse"></div>
    ))}
  </div>
);

const StationSkeleton = () => (
  <div className="h-80 bg-card rounded-lg animate-pulse"></div>
);


export default function Dashboard() {
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [stationFilter, setStationFilter] = useState<StationFilter>("All");
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false); // Added payment modal state
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [paymentSession, setPaymentSession] = useState<any>(null); // Simplified payment data
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch stations
  const { data: stations, isLoading: stationsLoading } = useQuery<Station[]>({
    queryKey: ['/api/stations'],
  });

  // Fetch active sessions
  const { data: activeSessions, isLoading: sessionsLoading } = useQuery<Session[]>({
    queryKey: ['/api/sessions/active'],
  });

  // Define the stats type
  interface DailyStats {
    activeStations: number;
    activeUsers: number;
    totalHours: number;
    totalRevenue: number;
  }

  // Fetch daily stats
  const { data: stats, isLoading: statsLoading } = useQuery<DailyStats>({
    queryKey: ['/api/stats/today'],
  });

  const handleStartSession = () => {
    setShowNewSessionModal(true);
  };

  const handleCloseModal = () => {
    setShowNewSessionModal(false);
  };

  const handleEndSession = async (sessionId: number) => {
    try {
      await fetch(`/api/sessions/${sessionId}/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/stations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sessions/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/today'] });

      toast({
        title: "Session ended",
        description: "The gaming session has been completed successfully.",
      });
    } catch (error) {
      toast({
        title: "Error ending session",
        description: "There was a problem ending the session. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Filter stations based on the selected type
  const filteredStations = stations?.filter(station => {
    if (stationFilter === "All") return true;
    return station.stationType === stationFilter;
  });

  const handleStationAction = (action: string, station: Station) => {
    if (action === 'payment' && station.activeSession) {
      setPaymentSession({
        transactionId: station.activeSession.id,
        amount: station.activeSession.totalAmount || 0,
        customerName: station.activeSession.customerName || 'Guest'
      });
      setIsPaymentModalOpen(true);
    }
  };

  const handlePaymentComplete = (paymentMethod: string, reference: string) => {
    setIsPaymentModalOpen(false);
    toast({
      title: "Payment Successful",
      description: `${paymentMethod.toUpperCase()} payment processed with reference: ${reference}`,
      variant: "default"
    });
    // Refetch sessions and stations after payment
    queryClient.invalidateQueries({ queryKey: ['/api/sessions/active'] });
    queryClient.invalidateQueries({ queryKey: ['/api/stations'] });
    queryClient.invalidateQueries({ queryKey: ['/api/stats/today'] });
  };

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-background">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Station Management" 
          subtitle="Manage active gaming sessions" 
          onNewSession={handleStartSession} 
        />

        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {statsLoading ? (
              <StatsSkeleton />
            ) : (
              stats && (
                <>
                  <StatsCard 
                    icon="desktop" 
                    title="Active Stations" 
                    value={String(stats.activeStations)}
                    color="text-blue-500"
                    bgColor="bg-blue-500/20"
                  />
                  <StatsCard 
                    icon="users" 
                    title="Active Users" 
                    value={String(stats.activeUsers)}
                    color="text-green-500"
                    bgColor="bg-green-500/20"
                  />
                  <StatsCard 
                    icon="clock" 
                    title="Today's Hours" 
                    value={String(stats.totalHours)}
                    color="text-purple-500"
                    bgColor="bg-purple-500/20"
                  />
                  <StatsCard 
                    icon="hand-holding-dollar" 
                    title="Today's Revenue" 
                    value={`KSh ${stats.totalRevenue}`}
                    color="text-yellow-500"
                    bgColor="bg-yellow-500/20"
                  />
                </>
              )
            )}
          </div>

          {/* Station Categories */}
          <div className="flex space-x-2 border-b border-border pb-3 overflow-x-auto">
            <button 
              className={`px-4 py-2 rounded-lg ${stationFilter === "All" ? "text-white bg-primary" : "text-muted-foreground hover:text-foreground hover:bg-card"}`}
              onClick={() => setStationFilter("All")}
            >
              All Stations
            </button>
            <button 
              className={`px-4 py-2 rounded-lg ${stationFilter === "PS5" ? "text-white bg-primary" : "text-muted-foreground hover:text-foreground hover:bg-card"}`}
              onClick={() => setStationFilter("PS5")}
            >
              PS5
            </button>
            <button 
              className={`px-4 py-2 rounded-lg ${stationFilter === "XBOX" ? "text-white bg-primary" : "text-muted-foreground hover:text-foreground hover:bg-card"}`}
              onClick={() => setStationFilter("XBOX")}
            >
              Xbox Series X
            </button>
            <button 
              className={`px-4 py-2 rounded-lg ${stationFilter === "PC" ? "text-white bg-primary" : "text-muted-foreground hover:text-foreground hover:bg-card"}`}
              onClick={() => setStationFilter("PC")}
            >
              PC
            </button>
            <button 
              className={`px-4 py-2 rounded-lg ${stationFilter === "VR" ? "text-white bg-primary" : "text-muted-foreground hover:text-foreground hover:bg-card"}`}
              onClick={() => setStationFilter("VR")}
            >
              VR
            </button>
          </div>

          {/* Gaming Stations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {stationsLoading ? (
              Array(8).fill(0).map((_, i) => (
                <StationSkeleton key={i} />
              ))
            ) : (
              filteredStations?.map((station) => (
                <StationCard 
                  key={station.id}
                  station={station}
                  onStartSession={handleStartSession}
                  onEndSession={handleEndSession}
                  onStationAction={handleStationAction} 
                />
              ))
            )}
          </div>
        </div>

        {/* New Session Modal */}
        {showNewSessionModal && selectedStation && (
          <NewSessionModal
            station={selectedStation}
            onClose={() => setShowNewSessionModal(false)}
          />
        )}

        {/* Payment Modal */}
        {isPaymentModalOpen && paymentSession && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background p-6 rounded-lg max-w-md w-full relative">
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
              <h2 className="text-xl font-bold mb-4">Process Payment</h2>
              <PaymentInterface
                sessionId={paymentSession.transactionId}
                transactionId={paymentSession.transactionId}
                amount={paymentSession.amount}
                customerName={paymentSession.customerName}
                onPaymentComplete={handlePaymentComplete}
              />
            </div>
          </div>
        )}
      </main>

      {/* Right Sidebar for Active Sessions */}
      <SessionSidebar 
        sessions={activeSessions || []} 
        isLoading={sessionsLoading}
        onEndSession={handleEndSession}
      />
    </div>
  );
}