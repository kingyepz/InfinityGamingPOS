import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Banknote, SmartphoneIcon, CheckCircle, XCircle, Loader2 } from "lucide-react";
import SplitPaymentModal from './SplitPaymentModal';
import { createTransaction, processCashPayment, initiateMpesaPayment, checkMpesaPaymentStatus, formatCurrency } from "@/lib/payment";
import { apiRequest } from "@/lib/queryClient";

type PaymentMethod = "cash" | "mpesa";
type PaymentStatus = "idle" | "processing" | "completed" | "failed";

interface PaymentModalProps {
  station: {
    id: number;
    name: string;
    currentCustomer?: string | null;
    currentGame?: string | null;
    sessionType?: string | null;
    sessionStartTime?: string | null;
    status: string;
    baseRate?: number;
    hourlyRate?: number;
  };
  onClose: () => void;
  onPaymentComplete?: () => void;
  userId?: number;
}

export default function PaymentModal({
  station,
  onClose,
  onPaymentComplete,
  userId,
}: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [mpesaPhoneNumber, setMpesaPhoneNumber] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [mpesaStatus, setMpesaStatus] = useState<PaymentStatus>("idle");
  const [showSplitPayment, setShowSplitPayment] = useState(false);
  const [mpesaRef, setMpesaRef] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Calculate duration if session is active (in minutes)
  const duration = station.sessionStartTime
    ? Math.ceil(
        (Date.now() - new Date(station.sessionStartTime).getTime()) / (1000 * 60)
      ) // minutes
    : 0;

  // Calculate amount based on session type with safe fallbacks
  const amount = station.sessionType === "per_game"
    ? (station.baseRate || 40) // Default to 40 KES if baseRate is missing
    : Math.ceil(duration / 60) * (station.hourlyRate || 200); // Default to 200 KES/hour if hourlyRate is missing

  // Helper function to reset the station status after payment
  const resetStationStatus = async (paymentSource: string) => {
    try {
      console.log(`Resetting station after ${paymentSource} payment:`, station.id);
      
      // Call API to update station status
      await apiRequest({
        method: "PATCH",
        path: `/api/stations/${station.id}`,
        data: {
          currentCustomer: null,
          currentGame: null,
          sessionType: null,
          sessionStartTime: null,
          status: "available"
        }
      });
      
      console.log(`Station ${station.id} reset successful`);
    } catch (error) {
      console.error(`Error resetting station after ${paymentSource} payment:`, error);
    }
  };

  const handlePayment = async () => {
    try {
      setIsProcessing(true);

      // Create a transaction record
      const transactionData = {
        stationId: station.id,
        customerName: station.currentCustomer || "Walk-in Customer",
        gameName: station.currentGame || "Unknown Game",
        sessionType: station.sessionType || "per_game", // Ensure sessionType is never null
        amount: String(amount),
        duration: station.sessionType === "hourly" ? duration : null
      };

      console.log("Creating transaction with data:", transactionData);
      const txResult = await createTransaction(transactionData);
      console.log("Transaction creation result:", txResult);

      // Enhanced error handling for transaction creation failures
      if (!txResult.success) {
        setIsProcessing(false);
        toast({
          title: "Transaction Error",
          description: txResult.error || "Failed to create transaction record. Please try again.",
          variant: "destructive"
        });
        return;
      }

      if (!txResult.transactionId) {
        setIsProcessing(false);
        toast({
          title: "System Error",
          description: "Transaction was created but no ID was returned. Please try again.",
          variant: "destructive"
        });
        return;
      }

      const transactionId = txResult.transactionId;

      if (paymentMethod === "cash") {
        try {
          // Process cash payment
          console.log("Processing cash payment for transaction:", transactionId, "amount:", amount, "userId:", userId);
          const result = await processCashPayment(transactionId, amount, userId);
          console.log("Cash payment result:", result);

          if (result.success) {
            toast({
              title: "Payment Successful",
              description: "Cash payment processed successfully."
            });
            
            // Reset station status
            await resetStationStatus("cash");
            
            // Call onPaymentComplete callback if provided
            if (onPaymentComplete) {
              onPaymentComplete();
            }
            
            // Close the modal
            onClose();
          } else {
            toast({
              title: "Payment Failed",
              description: result.error || "Failed to process cash payment",
              variant: "destructive"
            });
          }
        } catch (error: any) {
          console.error("Cash payment error:", error);
          toast({
            title: "Payment Error",
            description: error.message || "An error occurred during cash payment processing",
            variant: "destructive"
          });
        }
      } else if (paymentMethod === "mpesa") {
        try {
          // Validate phone number
          if (!mpesaPhoneNumber || mpesaPhoneNumber.length < 10) {
            toast({
              title: "Invalid Phone Number",
              description: "Please enter a valid M-Pesa phone number",
              variant: "destructive"
            });
            setIsProcessing(false);
            return;
          }
          
          setMpesaStatus("processing");

          // Process M-Pesa payment
          const mpesaResponse = await initiateMpesaPayment(mpesaPhoneNumber, amount, transactionId, userId);

          if (mpesaResponse.success && mpesaResponse.checkoutRequestId) {
            // Store reference for later use
            if (mpesaResponse.merchantRequestId) {
              setMpesaRef(mpesaResponse.merchantRequestId);
            }
            
            toast({
              title: "M-Pesa Request Sent",
              description: "Please check your phone to complete the payment."
            });
            
            // Poll for payment status
            let statusChecks = 0;
            const maxStatusChecks = 5;
            const pollInterval = setInterval(async () => {
              statusChecks++;
              
              if (statusChecks > maxStatusChecks) {
                clearInterval(pollInterval);
                setMpesaStatus("idle");
                setIsProcessing(false);
                toast({
                  title: "Payment Status Unknown",
                  description: "Please check your M-Pesa app to confirm payment status.",
                  variant: "default"
                });
                return;
              }
              
              try {
                const statusResult = await checkMpesaPaymentStatus(mpesaResponse.checkoutRequestId as string);
                
                if (statusResult.status === 'completed') {
                  clearInterval(pollInterval);
                  setMpesaStatus("completed");
                  
                  // Reset station status
                  await resetStationStatus("mpesa");
                  
                  toast({
                    title: "Payment Successful",
                    description: "M-Pesa payment confirmed."
                  });
                  
                  // Call onPaymentComplete callback if provided
                  if (onPaymentComplete) {
                    onPaymentComplete();
                  }
                  
                  // Close the modal after a short delay
                  setTimeout(() => {
                    onClose();
                  }, 1500);
                } else if (statusResult.status === 'failed') {
                  clearInterval(pollInterval);
                  setMpesaStatus("failed");
                  setIsProcessing(false);
                  
                  toast({
                    title: "Payment Failed",
                    description: "The M-Pesa payment was not completed.",
                    variant: "destructive"
                  });
                }
              } catch (statusError) {
                console.error("Error checking M-Pesa status:", statusError);
              }
            }, 5000); // Check every 5 seconds
          } else {
            setMpesaStatus("failed");
            setIsProcessing(false);
            toast({
              title: "Payment Failed",
              description: mpesaResponse.error || "Failed to initiate M-Pesa payment.",
              variant: "destructive"
            });
          }
        } catch (error: any) {
          console.error("M-Pesa payment error:", error);
          setMpesaStatus("failed");
          setIsProcessing(false);
          toast({
            title: "Payment Error",
            description: error.message || "An error occurred during M-Pesa payment processing",
            variant: "destructive"
          });
        }
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      setIsProcessing(false);
      setMpesaStatus("idle");
      toast({
        title: "Payment Error",
        description: error.message || "An error occurred during payment processing",
        variant: "destructive"
      });
    }
  };
  
  const handleOpenSplitPayment = () => {
    setShowSplitPayment(true);
  };
  
  const handleSplitPaymentClose = () => {
    setShowSplitPayment(false);
  };

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Station:</span>
              <span>{station.name}</span>
              <span className="text-muted-foreground">Customer:</span>
              <span>{station.currentCustomer || "Walk-in Customer"}</span>
              <span className="text-muted-foreground">Game:</span>
              <span>{station.currentGame || "N/A"}</span>
              <span className="text-muted-foreground">Session Type:</span>
              <span>{station.sessionType === "per_game" ? "Per Game" : "Hourly"}</span>
              {station.sessionType === "hourly" && (
                <>
                  <span className="text-muted-foreground">Duration:</span>
                  <span>{duration} min</span>
                </>
              )}
              <span className="text-muted-foreground">Amount Due:</span>
              <span className="font-bold">{formatCurrency(amount)}</span>
            </div>
            
            <Tabs defaultValue="cash" onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="cash">
                  <Banknote className="w-4 h-4 mr-2" />
                  Cash
                </TabsTrigger>
                <TabsTrigger value="mpesa">
                  <SmartphoneIcon className="w-4 h-4 mr-2" />
                  M-Pesa
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="cash" className="pt-4">
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold mb-1">{formatCurrency(amount)}</div>
                    <p className="text-muted-foreground text-sm">
                      Collect cash payment from customer
                    </p>
                  </div>
                  <Button
                    onClick={handlePayment}
                    disabled={isProcessing}
                    className="w-full"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Banknote className="h-4 w-4 mr-2" />
                    )}
                    Process Cash Payment
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="mpesa" className="pt-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="mpesa-phone">M-Pesa Phone Number</Label>
                    <Input
                      id="mpesa-phone"
                      placeholder="e.g. 0712345678"
                      value={mpesaPhoneNumber}
                      onChange={(e) => setMpesaPhoneNumber(e.target.value)}
                      disabled={isProcessing || mpesaStatus !== "idle"}
                    />
                  </div>
                  
                  {mpesaStatus === "processing" && (
                    <div className="text-center p-2 rounded-md bg-muted">
                      <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-primary" />
                      <p className="text-sm font-medium">
                        Processing M-Pesa payment...
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Please check your phone to authorize the payment
                      </p>
                    </div>
                  )}
                  
                  {mpesaStatus === "completed" && (
                    <div className="text-center p-2 rounded-md bg-green-100 dark:bg-green-900/20">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600 dark:text-green-500" />
                      <p className="text-sm font-medium text-green-800 dark:text-green-400">
                        Payment successful!
                      </p>
                      {mpesaRef && (
                        <p className="text-xs mt-1">Reference: {mpesaRef}</p>
                      )}
                    </div>
                  )}
                  
                  {mpesaStatus === "failed" && (
                    <div className="text-center p-2 rounded-md bg-red-100 dark:bg-red-900/20">
                      <XCircle className="h-8 w-8 mx-auto mb-2 text-red-600 dark:text-red-500" />
                      <p className="text-sm font-medium text-red-800 dark:text-red-400">
                        Payment failed
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Please try again or use a different payment method
                      </p>
                    </div>
                  )}
                  
                  <Button
                    onClick={handlePayment}
                    disabled={isProcessing || !mpesaPhoneNumber || mpesaStatus !== "idle"}
                    className="w-full"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <SmartphoneIcon className="h-4 w-4 mr-2" />
                    )}
                    Pay with M-Pesa
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
            
            <Button
              className="w-full"
              variant="secondary"
              onClick={handleOpenSplitPayment}
              disabled={isProcessing}
            >
              Split Payment
            </Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={onClose} disabled={isProcessing}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <SplitPaymentModal
        isOpen={showSplitPayment}
        onClose={handleSplitPaymentClose}
        transaction={station && {
          id: 0, // This will be set by the transaction creation process
          amount: amount,
          customerName: station.currentCustomer || "Walk-in Customer",
          gameName: station.currentGame || "Unknown Game",
          stationId: station.id
        }}
        onPaymentComplete={onPaymentComplete}
      />
    </>
  );
}