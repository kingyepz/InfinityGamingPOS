import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Station, Customer, Game, InsertSession } from "@shared/schema";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// Define the form schema
const formSchema = z.object({
  stationId: z.string(),
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  gameId: z.string().optional(),
  sessionType: z.enum(["HOURLY", "FIXED"]),
  duration: z.string(),
  paymentMethod: z.enum(["CASH", "MPESA", "PENDING"]),
});

type FormValues = z.infer<typeof formSchema>;

interface NewSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableStations: Station[];
}

export function NewSessionModal({ isOpen, onClose, availableStations }: NewSessionModalProps) {
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch customers for dropdown
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
    enabled: isOpen,
  });

  // Fetch games for dropdown
  const { data: games = [] } = useQuery<Game[]>({
    queryKey: ['/api/games'],
    enabled: isOpen,
  });

  // Create form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      stationId: "",
      customerId: "",
      customerName: "",
      customerPhone: "",
      gameId: "",
      sessionType: "HOURLY",
      duration: "1 hour",
      paymentMethod: "CASH",
    },
  });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      form.reset({
        stationId: availableStations.length > 0 ? String(availableStations[0].id) : "",
        customerId: "",
        customerName: "",
        customerPhone: "",
        gameId: "",
        sessionType: "HOURLY",
        duration: "1 hour",
        paymentMethod: "CASH",
      });
      setIsNewCustomer(false);
    }
  }, [isOpen, availableStations, form]);

  // Handle form submission
  const createSessionMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      let customerId = values.customerId;
      const selectedStation = availableStations.find(station => station.id === parseInt(values.stationId, 10));

      // Create new customer if needed
      if (isNewCustomer && values.customerName) {
        const customerResponse = await apiRequest('POST', '/api/customers', {
          fullName: values.customerName,
          phoneNumber: values.customerPhone,
        });
        const newCustomer = await customerResponse.json();
        customerId = String(newCustomer.id);
      }

      // Create new session
      const sessionData: Partial<InsertSession> = {
        stationId: parseInt(values.stationId, 10),
        customerId: parseInt(customerId!, 10),
        gameId: values.gameId ? parseInt(values.gameId, 10) : undefined,
        sessionType: values.sessionType,
      };

      // Calculate base rate based on session type and station rates.  Defaulting to 40 and 200 if station rates are missing.
      const baseRate = values.sessionType === 'FIXED' ? (selectedStation?.ratePerGame || 40) : (selectedStation?.ratePerHour || 200);
      sessionData.baseRate = baseRate;

      // If duration is not open-ended, track it
      if (values.duration !== "Open-ended") {
        const hourStr = values.duration.split(' ')[0];
        const hours = parseInt(hourStr, 10);
        sessionData.duration = hours * 60; // Convert hours to minutes
      }

      const response = await apiRequest('POST', '/api/sessions', sessionData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sessions/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/today'] });

      toast({
        title: "Session started",
        description: "The gaming session has been started successfully",
      });

      onClose();
    },
    onError: (error) => {
      toast({
        title: "Failed to start session",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: FormValues) => {
    createSessionMutation.mutate(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card text-card-foreground sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Start New Session</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Configure a new gaming session
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="stationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Station</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a station" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableStations.map((station) => (
                        <SelectItem key={station.id} value={String(station.id)}>
                          {station.name} ({station.stationType})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isNewCustomer ? (
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Search customer..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={String(customer.id)}>
                            {customer.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="mt-2 flex items-center text-xs">
                      <span className="text-muted-foreground">Customer not found?</span>
                      <Button 
                        type="button" 
                        variant="link" 
                        className="text-primary px-2 py-0 h-auto"
                        onClick={() => setIsNewCustomer(true)}
                      >
                        Create New
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <>
                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter customer name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customerPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 254712345678" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsNewCustomer(false)}
                >
                  Select Existing Customer
                </Button>
              </>
            )}

            <FormField
              control={form.control}
              name="gameId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Game</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a game" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {games.map((game) => (
                        <SelectItem key={game.id} value={String(game.id)}>
                          {game.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sessionType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Session Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="grid grid-cols-2 gap-2"
                    >
                      <div className="bg-background rounded border border-border p-3 flex items-center space-x-2">
                        <RadioGroupItem value="HOURLY" id="hourly" />
                        <label htmlFor="hourly" className="cursor-pointer">
                          <div className="font-medium">Hourly Rate</div>
                          <div className="text-xs text-muted-foreground">KSh 200/hour</div>
                        </label>
                      </div>
                      <div className="bg-background rounded border border-border p-3 flex items-center space-x-2">
                        <RadioGroupItem value="FIXED" id="fixed" />
                        <label htmlFor="fixed" className="cursor-pointer">
                          <div className="font-medium">Fixed Game</div>
                          <div className="text-xs text-muted-foreground">KSh 40/game</div>
                        </label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration (for hourly)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1 hour">1 hour</SelectItem>
                      <SelectItem value="2 hours">2 hours</SelectItem>
                      <SelectItem value="3 hours">3 hours</SelectItem>
                      <SelectItem value="4 hours">4 hours</SelectItem>
                      <SelectItem value="Open-ended">Open-ended</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Payment Method</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="grid grid-cols-3 gap-2"
                    >
                      <div className="bg-background rounded border border-border p-2 flex flex-col items-center">
                        <RadioGroupItem value="CASH" id="cash" className="mb-1" />
                        <label htmlFor="cash" className="text-xs cursor-pointer text-center">Cash</label>
                      </div>
                      <div className="bg-background rounded border border-border p-2 flex flex-col items-center">
                        <RadioGroupItem value="MPESA" id="mpesa" className="mb-1" />
                        <label htmlFor="mpesa" className="text-xs cursor-pointer text-center">M-Pesa</label>
                      </div>
                      <div className="bg-background rounded border border-border p-2 flex flex-col items-center">
                        <RadioGroupItem value="PENDING" id="later" className="mb-1" />
                        <label htmlFor="later" className="text-xs cursor-pointer text-center">Pay Later</label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="mt-6 space-x-3">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-primary hover:bg-primary/90"
                disabled={createSessionMutation.isPending}
              >
                {createSessionMutation.isPending ? "Starting..." : "Start Session"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}