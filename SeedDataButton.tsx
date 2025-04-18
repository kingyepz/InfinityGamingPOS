import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2Icon, FlaskConicalIcon, CheckCircleIcon } from "lucide-react";

export function SeedDataButton() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [isSeeded, setIsSeeded] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const seedMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/seed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to seed data');
      }
      
      return response.json();
    },
    onMutate: () => {
      setIsSeeding(true);
      setIsSeeded(false);
    },
    onSuccess: (data) => {
      // Invalidate queries to refresh all data
      queryClient.invalidateQueries({ queryKey: ['/api/stations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sessions/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/today'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/games'] });
      
      toast({
        title: "Seed Successful",
        description: `Added ${data.stats.stations} stations, ${data.stats.games} games, ${data.stats.customers} customers, and ${data.stats.sessions} sessions.`,
        variant: "default",
      });
      
      setIsSeeded(true);
      setIsSeeding(false);
    },
    onError: (error) => {
      toast({
        title: "Seed Failed",
        description: error.message || "Failed to seed data. Please try again.",
        variant: "destructive",
      });
      
      setIsSeeding(false);
      setIsSeeded(false);
    },
  });

  const handleSeedData = () => {
    seedMutation.mutate();
  };

  return (
    <Button
      variant={isSeeded ? "default" : "outline"}
      size="sm"
      onClick={handleSeedData}
      disabled={isSeeding}
      className={`${isSeeded ? 'bg-green-500 hover:bg-green-600 text-white' : ''} transition-all duration-300`}
    >
      {isSeeding ? (
        <>
          <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
          Seeding...
        </>
      ) : isSeeded ? (
        <>
          <CheckCircleIcon className="h-4 w-4 mr-2" />
          Seeded
        </>
      ) : (
        <>
          <FlaskConicalIcon className="h-4 w-4 mr-2" />
          Seed Test Data
        </>
      )}
    </Button>
  );
}