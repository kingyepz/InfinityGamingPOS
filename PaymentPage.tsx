import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { processCashPayment, initiateMpesaPayment, checkMpesaPaymentStatus } from "@/lib/payment";
import { useToast } from "@/hooks/use-toast";
import { Banknote, Smartphone, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface PaymentPageProps {
  transactionId: number;
  amount: number;
  onSuccess: (paymentMethod: string, reference: string) => void;
  onCancel: () => void;
}

export function PaymentPage({ transactionId, amount, onSuccess, onCancel }: PaymentPageProps) {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa'>('cash');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [mpesaStatus, setMpesaStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle');
  const [reference, setReference] = useState('');
  const [cashAmount, setCashAmount] = useState(amount.toString());
  const [cashChange, setCashChange] = useState(0);
  const { toast } = useToast();

  // Format phone number to ensure it's in the required format
  const formatPhoneNumber = (phone: string) => {
    if (phone.startsWith('0')) {
      return `254${phone.substring(1)}`;
    } else if (phone.startsWith('+254')) {
      return phone.substring(1);
    }
    return phone;
  };

  // Calculate change when cash amount changes
  useEffect(() => {
    const cash = parseFloat(cashAmount) || 0;
    setCashChange(Math.max(0, cash - amount));
  }, [cashAmount, amount]);

  // Handle cash payment
  const handleCashPayment = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    try {
      // Process cash payment with customer ID if available
      const result = await processCashPayment(
        amount, 
        transactionId
      );

      if (result.success) {
        setReference(result.reference || '');
        onSuccess('cash', result.reference || '');
      } else {
        toast({
          title: "Payment Failed",
          description: result.error || "Failed to process cash payment",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error processing cash payment:', error);
      toast({
        title: "Payment Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle M-Pesa payment
  const handleMpesaPayment = async () => {
    if (isProcessing || !phoneNumber) return;

    setIsProcessing(true);
    setMpesaStatus('processing');
    
    try {
      // Format phone number and initiate M-Pesa payment
      const formattedPhone = formatPhoneNumber(phoneNumber);
      
      const result = await initiateMpesaPayment(
        formattedPhone,
        amount,
        transactionId
      );

      if (result.success && result.checkoutRequestId) {
        // M-Pesa request initiated successfully
        toast({
          title: "M-Pesa Request Sent",
          description: "Please check your phone to complete the payment",
        });
        
        // Poll status a few times
        let statusChecks = 0;
        const maxStatusChecks = 5;
        const statusCheckInterval = setInterval(async () => {
          statusChecks++;
          
          if (statusChecks > maxStatusChecks) {
            clearInterval(statusCheckInterval);
            setMpesaStatus('idle');
            setIsProcessing(false);
            return;
          }
          
          try {
            const statusResult = await checkMpesaPaymentStatus(result.checkoutRequestId as string);
            
            if (statusResult.status === 'completed') {
              clearInterval(statusCheckInterval);
              setMpesaStatus('completed');
              setReference(result.merchantRequestId || '');
              onSuccess('mpesa', result.merchantRequestId || '');
              setIsProcessing(false);
            } else if (statusResult.status === 'failed') {
              clearInterval(statusCheckInterval);
              setMpesaStatus('failed');
              setIsProcessing(false);
              
              toast({
                title: "M-Pesa Payment Failed",
                description: "The payment request was not completed",
                variant: "destructive"
              });
            }
          } catch (error) {
            console.error('Error checking M-Pesa status:', error);
          }
        }, 5000); // Check every 5 seconds
      } else {
        // M-Pesa request failed
        setMpesaStatus('failed');
        setIsProcessing(false);
        
        toast({
          title: "M-Pesa Request Failed",
          description: result.error || "Failed to initiate M-Pesa payment",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error processing M-Pesa payment:', error);
      setMpesaStatus('failed');
      setIsProcessing(false);
      
      toast({
        title: "Payment Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Payment</CardTitle>
        <CardDescription>
          Amount due: KES {amount.toFixed(2)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="cash" onValueChange={(value) => setPaymentMethod(value as 'cash' | 'mpesa')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="cash">
              <Banknote className="h-4 w-4 mr-2" />
              Cash
            </TabsTrigger>
            <TabsTrigger value="mpesa">
              <Smartphone className="h-4 w-4 mr-2" />
              M-Pesa
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="cash">
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="cashAmount">Cash Amount</Label>
                <Input
                  id="cashAmount"
                  type="number"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  placeholder="Enter cash amount"
                  disabled={isProcessing}
                />
              </div>
              
              {parseFloat(cashAmount) > 0 && (
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm font-medium">Change: KES {cashChange.toFixed(2)}</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="mpesa">
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">M-Pesa Phone Number</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. 0712345678"
                  disabled={isProcessing}
                />
                <p className="text-xs text-muted-foreground">
                  Enter the phone number registered with M-Pesa
                </p>
              </div>
              
              {mpesaStatus === 'processing' && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800 flex items-center">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    M-Pesa payment is being processed. Please check your phone and enter your PIN.
                  </p>
                </div>
              )}
              
              {mpesaStatus === 'completed' && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-800 flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Payment completed successfully!
                  </p>
                </div>
              )}
              
              {mpesaStatus === 'failed' && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-800 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Payment failed. Please try again.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onCancel} disabled={isProcessing}>
          Cancel
        </Button>
        <Button 
          onClick={paymentMethod === 'cash' ? handleCashPayment : handleMpesaPayment}
          disabled={isProcessing || (paymentMethod === 'mpesa' && !phoneNumber)}
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            'Pay Now'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}