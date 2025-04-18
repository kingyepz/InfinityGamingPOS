import { FormatDistanceToNow } from "@/lib/utils";
import { Station, Session } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";

interface StationCardProps {
  station: Station;
  onStartSession: () => void;
  onEndSession: (sessionId: number) => void;
  onStationAction: (action: string, station: Station) => void;
}

export function StationCard({ station, onStartSession, onEndSession, onStationAction }: StationCardProps) {
  // Fetch the active session for this station if it has one
  const { data: activeSession } = useQuery<Session>({
    queryKey: ['/api/stations', station.id, 'active-session'],
    enabled: station.status === 'ACTIVE',
  });

  // Fetch customer data if there's an active session
  const { data: customer } = useQuery({
    queryKey: ['/api/customers', activeSession?.customerId],
    enabled: !!activeSession?.customerId,
  });

  // Fetch game data if there's an active session
  const { data: game } = useQuery({
    queryKey: ['/api/games', activeSession?.gameId],
    enabled: !!activeSession?.gameId,
  });

  const getStationIcon = () => {
    switch (station.stationType) {
      case 'PS5':
        return <i className="fas fa-gamepad text-[#6D28D9] mr-2"></i>;
      case 'XBOX':
        return <i className="fab fa-xbox text-green-500 mr-2"></i>;
      case 'PC':
        return <i className="fas fa-desktop text-[#3B82F6] mr-2"></i>;
      case 'VR':
        return <i className="fas fa-vr-cardboard text-[#FACC15] mr-2"></i>;
      default:
        return <i className="fas fa-gamepad text-[#6D28D9] mr-2"></i>;
    }
  };

  const getStatusBadge = () => {
    switch (station.status) {
      case 'ACTIVE':
        return <span className="px-2 py-1 bg-green-500/20 text-green-500 rounded-full text-xs">Active</span>;
      case 'MAINTENANCE':
        return <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs">Maintenance</span>;
      case 'AVAILABLE':
        return <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs">Available</span>;
      default:
        return null;
    }
  };

  const handleEndSession = () => {
    if (activeSession) {
      onEndSession(activeSession.id);
    }
  };

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            {getStationIcon()}
            <h3 className="font-medium text-foreground">{station.name}</h3>
          </div>
          {getStatusBadge()}
        </div>

        {station.status === 'ACTIVE' && activeSession ? (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type:</span>
              <span className="text-foreground">{station.stationType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Game:</span>
              <span className="text-foreground">{game?.title || "Unknown"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Customer:</span>
              <span className="text-foreground">{customer?.fullName || "Unknown"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Started:</span>
              <span className="text-foreground">
                {new Date(activeSession.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Elapsed:</span>
              <span className="text-foreground font-medium">
                {FormatDistanceToNow(new Date(activeSession.startTime))}
              </span>
            </div>
          </div>
        ) : station.status === 'MAINTENANCE' ? (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type:</span>
              <span className="text-foreground">{station.stationType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Issue:</span>
              <span className="text-red-400">{station.maintenanceReason || "Unspecified"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <span className="text-foreground">Maintenance</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Since:</span>
              <span className="text-foreground">{new Date().toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ETA:</span>
              <span className="text-foreground font-medium">{station.maintenanceEta || "Unknown"}</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col justify-center items-center py-6">
            <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center mb-4">
              <i className="fas fa-power-off text-blue-500 text-2xl"></i>
            </div>
            <p className="text-foreground text-center mb-1">Station Ready</p>
            <p className="text-muted-foreground text-sm text-center">
              This {station.stationType} station is available for a new session
            </p>
          </div>
        )}
      </div>

      <div className="bg-muted p-4 flex justify-between items-center">
        <div className="text-sm space-y-1">
          <div>
            <span className="text-muted-foreground">Hourly Rate:</span>
            <span className="text-foreground ml-1">KSh {game?.pricePerHour || station.hourlyRate || 200}/hr</span>
          </div>
          <div>
            <span className="text-muted-foreground">Game Rate:</span>
            <span className="text-foreground ml-1">KSh {game?.pricePerSession || station.baseRate || 40}/game</span>
          </div>
        </div>
        {station.status === 'ACTIVE' ? (
          <div className="flex gap-2">
            <button 
              className="bg-secondary hover:bg-secondary-dark text-white px-3 py-1.5 rounded text-sm transition-colors"
              onClick={() => onStationAction('payment', station)}
            >
              Payment
            </button>
            <button 
              className="bg-secondary hover:bg-secondary-dark text-white px-3 py-1.5 rounded text-sm transition-colors"
              onClick={handleEndSession}
            >
              End Session
            </button>
          </div>
        ) : station.status === 'AVAILABLE' ? (
          <button 
            className="bg-primary hover:bg-primary/90 text-white px-3 py-1.5 rounded text-sm transition-colors"
            onClick={onStartSession}
          >
            Start Session
          </button>
        ) : (
          <button 
            className="bg-muted-foreground text-foreground px-3 py-1.5 rounded text-sm cursor-not-allowed opacity-70"
            disabled
          >
            Unavailable
          </button>
        )}
      </div>
    </div>
  );
}