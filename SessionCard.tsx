import { useQuery } from "@tanstack/react-query";
import { FormatDistanceToNow } from "@/lib/utils";
import { Session, Customer, Station, Game } from "@shared/schema";

interface SessionCardProps {
  session: Session;
  onEndSession: (sessionId: number) => void;
}

export function SessionCard({ session, onEndSession }: SessionCardProps) {
  // Fetch related data
  const { data: customer } = useQuery({
    queryKey: ['/api/customers', session.customerId],
  });

  const { data: station } = useQuery({
    queryKey: ['/api/stations', session.stationId],
  });

  const { data: game } = useQuery({
    queryKey: ['/api/games', session.gameId],
    enabled: !!session.gameId,
  });

  // Get initials for customer avatar
  const getInitials = (name: string | undefined) => {
    if (!name) return "??";
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  };

  const handleEndSession = () => {
    onEndSession(session.id);
  };

  const addTime = () => {
    // Logic to add time to a session
    console.log("Add time to session:", session.id);
  };

  const elapsedTime = FormatDistanceToNow(new Date(session.startTime));
  const formattedStartTime = new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  // Determine if session has been going on for a while (more than 2 hours)
  const isLongSession = new Date().getTime() - new Date(session.startTime).getTime() > 2 * 60 * 60 * 1000;

  return (
    <div className="bg-card rounded-lg p-3 border border-border">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-foreground">{station?.name || 'Unknown Station'}</span>
        <span className={`text-xs ${isLongSession ? "bg-yellow-500/20 text-yellow-500" : "bg-green-500/20 text-green-500"} px-2 py-0.5 rounded-full`}>
          {elapsedTime}
        </span>
      </div>

      <div className="flex items-center mb-3">
        <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center text-xs font-medium text-accent-foreground mr-2">
          {getInitials(customer?.fullName)}
        </div>
        <div>
          <p className="text-sm text-foreground">{customer?.fullName || 'Unknown Customer'}</p>
          <p className="text-xs text-muted-foreground">{game?.title || 'Unknown Game'}</p>
        </div>
      </div>

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Started: {formattedStartTime}</span>
        <span>KSh {station?.ratePerHour || '0'}/hr</span>
      </div>

      <div className="mt-2 flex space-x-2">
        <button 
          className="bg-muted hover:bg-accent/50 flex-1 py-1 text-xs rounded text-foreground transition-colors"
          onClick={addTime}
        >
          Add Time
        </button>
        <button 
          className="bg-secondary hover:bg-secondary/80 flex-1 py-1 text-xs rounded text-white transition-colors"
          onClick={handleEndSession}
        >
          End Session
        </button>
      </div>
    </div>
  );
}
