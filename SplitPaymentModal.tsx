import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { createTransaction, formatCurrency, processCashPayment, initiateMpesaPayment, generateMpesaQRCode } from '@/lib/payment';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { TbCash, TbDeviceMobile, TbQrcode } from 'react-icons/tb';

interface SplitPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  sessionId?: number;
  customerId?: number;
  onPaymentComplete: () => void;
}

// Component to handle QR code payment
const MpesaQRPayment = ({ amount, transactionId, reference, onSuccess }: any) => {
  const [isLoading, setIsLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const generateQR = async () => {
    setIsLoading(true);
    try {
      const result = await generateMpesaQRCode(amount, transactionId, reference);
      if (result.success && result.qrCode) {
        setQrCode(result.qrCode);
        setRequestId(result.requestId || null);
      } else {
        toast({
          title: 'Error generating QR code',
          description: result.error || 'Please try again later.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate QR code. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Check payment status via polling
  const checkStatus = async () => {
    if (!requestId) return;
    
    setIsChecking(true);
    try {
      // For now we're just simulating success in the mock implementation
      setTimeout(() => {
        setIsChecking(false);
        onSuccess();
        toast({
          title: 'Payment successful',
          description: 'M-Pesa QR payment was successful.',
        });
      }, 2000);
    } catch (error) {
      setIsChecking(false);
      toast({
        title: 'Error checking payment',
        description: 'Failed to verify payment status. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-center mb-4">
        <p className="font-semibold">Scan this QR code to pay {formatCurrency(amount)}</p>
        <p className="text-sm text-muted-foreground">
          Open your M-Pesa app, scan the QR code and confirm payment
        </p>
      </div>
      
      {qrCode ? (
        <div className="bg-white p-4 rounded-lg">
          <img 
            src={`data:image/png;base64,${qrCode}`} 
            alt="M-Pesa QR code" 
            className="w-48 h-48"
          />
        </div>
      ) : (
        <Button onClick={generateQR} disabled={isLoading}>
          {isLoading ? 'Generating...' : 'Generate QR Code'}
        </Button>
      )}
      
      {qrCode && (
        <Button 
          onClick={checkStatus} 
          disabled={isChecking}
          className="mt-2"
        >
          {isChecking ? 'Checking...' : 'I have paid, check status'}
        </Button>
      )}
    </div>
  );
};

// Component to handle M-Pesa STK push payment
const MpesaSTKPayment = ({ amount, transactionId, userId, splitIndex, onSuccess }: any) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null);

  const initiatePayment = async () => {
    if (!phoneNumber || phoneNumber.length < 9) {
      toast({
        title: 'Invalid phone number',
        description: 'Please enter a valid phone number',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      // Format phone number: remove spaces, ensure it starts with 254
      let formattedNumber = phoneNumber.replace(/\s+/g, '');
      if (formattedNumber.startsWith('0')) {
        formattedNumber = '254' + formattedNumber.substring(1);
      }
      if (!formattedNumber.startsWith('254')) {
        formattedNumber = '254' + formattedNumber;
      }
      
      const result = await initiateMpesaPayment(
        formattedNumber,
        amount,
        transactionId,
        userId,
        splitIndex
      );
      
      if (result.success) {
        setCheckoutRequestId(result.checkoutRequestId || null);
        toast({
          title: 'Payment initiated',
          description: 'Check your phone for the M-Pesa prompt',
        });
      } else {
        toast({
          title: 'Payment failed',
          description: result.error || 'Failed to initiate payment',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred while processing payment',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkStatus = async () => {
    if (!checkoutRequestId) return;
    
    setIsCheckingStatus(true);
    // For our mock implementation, we'll simulate success after a short delay
    setTimeout(() => {
      setIsCheckingStatus(false);
      onSuccess();
      toast({
        title: 'Payment successful',
        description: 'The M-Pesa payment was successful.',
      });
    }, 2000);
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Label htmlFor="phone">M-Pesa Phone Number</Label>
        <Input
          id="phone"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="e.g. 0712345678"
          className="mt-1"
        />
        <p className="text-sm text-muted-foreground mt-1">
          Enter the phone number registered with M-Pesa
        </p>
      </div>
      
      {!checkoutRequestId ? (
        <Button 
          onClick={initiatePayment} 
          disabled={isLoading || !phoneNumber}
          className="mt-2"
        >
          {isLoading ? 'Processing...' : `Pay ${formatCurrency(amount)}`}
        </Button>
      ) : (
        <div className="space-y-4">
          <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <p>M-Pesa payment initiated. Please check your phone and enter your PIN.</p>
          </div>
          
          <Button 
            onClick={checkStatus} 
            disabled={isCheckingStatus}
          >
            {isCheckingStatus ? 'Checking...' : 'I have paid, check status'}
          </Button>
        </div>
      )}
    </div>
  );
};

// Component to handle cash payment
const CashPayment = ({ amount, transactionId, userId, splitIndex, onSuccess }: any) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [cashReceived, setCashReceived] = useState(amount.toString());
  const [change, setChange] = useState(0);

  const handleCashReceivedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCashReceived(value);
    
    // Calculate change
    const received = parseFloat(value) || 0;
    setChange(Math.max(0, received - amount));
  };

  const processCash = async () => {
    setIsProcessing(true);
    try {
      const result = await processCashPayment(
        transactionId,
        amount,
        userId,
        splitIndex
      );
      
      if (result.success) {
        onSuccess();
        toast({
          title: 'Payment successful',
          description: `Cash payment of ${formatCurrency(amount)} recorded successfully.`,
        });
      } else {
        toast({
          title: 'Payment failed',
          description: result.error || 'Failed to process cash payment',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred while processing payment',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Label htmlFor="cash-amount">Cash Received (KSh)</Label>
        <Input
          id="cash-amount"
          type="number"
          value={cashReceived}
          onChange={handleCashReceivedChange}
          className="mt-1"
        />
      </div>
      
      <div className="bg-muted p-4 rounded-lg flex justify-between">
        <span>Change:</span>
        <span className="font-semibold">{formatCurrency(change)}</span>
      </div>
      
      <Button 
        onClick={processCash} 
        disabled={isProcessing || parseFloat(cashReceived) < amount}
        className="mt-2"
      >
        {isProcessing ? 'Processing...' : `Complete Cash Payment`}
      </Button>
    </div>
  );
};

const SplitPaymentModal: React.FC<SplitPaymentModalProps> = ({
  isOpen,
  onClose,
  totalAmount,
  sessionId,
  customerId,
  onPaymentComplete,
}) => {
  const [splits, setSplits] = useState<Array<{ amount: number; paid: boolean; transactionId?: number }>>([
    { amount: totalAmount, paid: false },
  ]);
  
  const [isCreatingTransaction, setIsCreatingTransaction] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const addSplit = () => {
    if (splits.length >= 5) {
      toast({
        title: 'Maximum splits reached',
        description: 'You can only split a payment up to 5 ways',
        variant: 'destructive',
      });
      return;
    }
    
    // Start with equal splits
    const newAmount = totalAmount / (splits.length + 1);
    const newSplits = splits.map(split => ({ 
      ...split, 
      amount: newAmount,
      paid: split.paid, // Keep paid status
    }));
    
    // Add the new split
    newSplits.push({ amount: newAmount, paid: false });
    
    setSplits(newSplits);
  };

  const removeSplit = (index: number) => {
    if (splits.length <= 1) return;
    
    // Don't allow removing a paid split
    if (splits[index].paid) {
      toast({
        title: 'Cannot remove paid split',
        description: 'This split has already been paid',
        variant: 'destructive',
      });
      return;
    }
    
    const newSplits = [...splits];
    newSplits.splice(index, 1);
    
    // Recalculate remaining unpaid amounts
    const unpaidSplits = newSplits.filter(split => !split.paid);
    const remainingAmount = totalAmount - newSplits.reduce(
      (acc, split) => acc + (split.paid ? split.amount : 0), 
      0
    );
    
    if (unpaidSplits.length > 0) {
      const amountPerSplit = remainingAmount / unpaidSplits.length;
      newSplits.forEach(split => {
        if (!split.paid) {
          split.amount = amountPerSplit;
        }
      });
    }
    
    setSplits(newSplits);
    
    // Adjust active index if needed
    if (activeIndex >= newSplits.length) {
      setActiveIndex(Math.max(0, newSplits.length - 1));
    }
  };

  const updateSplitAmount = (index: number, value: string) => {
    const amount = parseFloat(value) || 0;
    
    // Don't allow changing a paid split
    if (splits[index].paid) return;
    
    const newSplits = [...splits];
    newSplits[index].amount = amount;
    
    // Calculate remaining amount for other unpaid splits
    const unpaidSplits = newSplits.filter((split, i) => !split.paid && i !== index);
    const remainingAmount = totalAmount - (
      amount + newSplits.reduce(
        (acc, split, i) => acc + (i === index || !split.paid ? 0 : split.amount), 
        0
      )
    );
    
    // Distribute remaining amount equally
    if (unpaidSplits.length > 0) {
      const amountPerSplit = Math.max(0, remainingAmount / unpaidSplits.length);
      newSplits.forEach((split, i) => {
        if (!split.paid && i !== index) {
          split.amount = amountPerSplit;
        }
      });
    }
    
    setSplits(newSplits);
  };

  const handlePreparePayment = async (index: number) => {
    setIsCreatingTransaction(true);
    try {
      // Create a transaction for this split
      const result = await createTransaction({
        sessionId,
        customerId,
        amount: splits[index].amount,
        description: `Split payment ${index + 1} of ${splits.length} for session ${sessionId}`,
      });
      
      if (result.success && result.transactionId) {
        const newSplits = [...splits];
        newSplits[index].transactionId = result.transactionId;
        setSplits(newSplits);
        setActiveIndex(index);
      } else {
        toast({
          title: 'Failed to create transaction',
          description: result.error || 'Please try again',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred while creating the transaction',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingTransaction(false);
    }
  };

  const handlePaymentSuccess = (index: number) => {
    // Mark the split as paid
    const newSplits = [...splits];
    newSplits[index].paid = true;
    setSplits(newSplits);
    
    // Find the next unpaid split
    const nextUnpaidIndex = newSplits.findIndex((split, i) => i > index && !split.paid);
    if (nextUnpaidIndex !== -1) {
      setActiveIndex(nextUnpaidIndex);
    } else {
      // Check if all splits are paid
      const allPaid = newSplits.every(split => split.paid);
      if (allPaid) {
        onPaymentComplete();
        onClose();
      }
    }
  };

  // Calculate if all splits add up to the total
  const totalSplitAmount = splits.reduce((acc, split) => acc + split.amount, 0);
  const isBalanced = Math.abs(totalSplitAmount - totalAmount) < 0.01;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md md:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Split Payment</DialogTitle>
          <DialogDescription>
            Split the payment of {formatCurrency(totalAmount)} between multiple payers.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col space-y-4">
          {/* Split management */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Payment Splits</h3>
              <div className="space-x-2">
                <Button size="sm" variant="outline" onClick={addSplit}>
                  Add Split
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              {splits.map((split, index) => (
                <div 
                  key={index} 
                  className={`flex items-center space-x-2 p-3 rounded-lg border ${
                    split.paid 
                      ? 'bg-green-50 border-green-200' 
                      : index === activeIndex 
                        ? 'bg-blue-50 border-blue-200' 
                        : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex-grow">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">Split {index + 1}</span>
                      {split.paid && (
                        <span className="text-xs text-white bg-green-500 px-2 py-0.5 rounded-full">
                          Paid
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center mt-1">
                      <span className="w-20">Amount:</span>
                      <Input
                        type="number"
                        value={split.amount}
                        onChange={(e) => updateSplitAmount(index, e.target.value)}
                        disabled={split.paid}
                        className="h-8 w-24"
                      />
                      <span className="ml-1 text-sm text-muted-foreground">KSh</span>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    {!split.paid && !split.transactionId && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handlePreparePayment(index)}
                        disabled={isCreatingTransaction || !isBalanced}
                      >
                        Pay
                      </Button>
                    )}
                    
                    {!split.paid && split.transactionId && index === activeIndex && (
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => handlePaymentSuccess(index)}
                        className="text-green-600"
                      >
                        Mark Paid
                      </Button>
                    )}
                    
                    {!split.paid && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => removeSplit(index)}
                        className="text-red-500 h-8 w-8 p-0"
                        disabled={splits.length <= 1 || split.paid}
                      >
                        ✕
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {!isBalanced && (
              <div className="text-red-500 text-sm">
                The sum of splits ({formatCurrency(totalSplitAmount)}) does not equal the total amount ({formatCurrency(totalAmount)}).
              </div>
            )}
          </div>
          
          <Separator />
          
          {/* Payment section for active split */}
          {splits[activeIndex]?.transactionId && (
            <div className="space-y-4">
              <h3 className="font-semibold">
                Process Payment for Split {activeIndex + 1}: {formatCurrency(splits[activeIndex].amount)}
              </h3>
              
              <Tabs defaultValue="cash" className="w-full">
                <TabsList className="grid grid-cols-3">
                  <TabsTrigger value="cash" className="flex items-center gap-2">
                    <TbCash /> Cash
                  </TabsTrigger>
                  <TabsTrigger value="mpesa" className="flex items-center gap-2">
                    <TbDeviceMobile /> M-Pesa
                  </TabsTrigger>
                  <TabsTrigger value="qr" className="flex items-center gap-2">
                    <TbQrcode /> QR Code
                  </TabsTrigger>
                </TabsList>
                <div className="mt-4">
                  <TabsContent value="cash">
                    <Card className="p-4">
                      <CashPayment 
                        amount={splits[activeIndex].amount}
                        transactionId={splits[activeIndex].transactionId}
                        userId={customerId}
                        splitIndex={activeIndex}
                        onSuccess={() => handlePaymentSuccess(activeIndex)}
                      />
                    </Card>
                  </TabsContent>
                  <TabsContent value="mpesa">
                    <Card className="p-4">
                      <MpesaSTKPayment 
                        amount={splits[activeIndex].amount}
                        transactionId={splits[activeIndex].transactionId}
                        userId={customerId}
                        splitIndex={activeIndex}
                        onSuccess={() => handlePaymentSuccess(activeIndex)}
                      />
                    </Card>
                  </TabsContent>
                  <TabsContent value="qr">
                    <Card className="p-4">
                      <MpesaQRPayment 
                        amount={splits[activeIndex].amount}
                        transactionId={splits[activeIndex].transactionId}
                        reference={`Split-${activeIndex+1}-Session-${sessionId}`}
                        onSuccess={() => handlePaymentSuccess(activeIndex)}
                      />
                    </Card>
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SplitPaymentModal;