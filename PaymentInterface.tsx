import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PaymentInterfaceProps {
  sessionId: number;
  transactionId: string;
  amount: number;
  customerName: string;
  onPaymentComplete: (paymentMethod: string, reference: string) => void;
}

export function PaymentInterface({ 
  sessionId, 
  transactionId, 
  amount, 
  customerName, 
  onPaymentComplete 
}: PaymentInterfaceProps) {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa'>('cash');
  const [reference, setReference] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would typically process the payment
    onPaymentComplete(paymentMethod, reference || transactionId);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Amount</Label>
        <Input type="text" value={`KSh ${amount}`} disabled />
      </div>
      <div>
        <Label>Customer</Label>
        <Input type="text" value={customerName} disabled />
      </div>
      <div className="space-y-2">
        <Label>Payment Method</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={paymentMethod === 'cash' ? 'default' : 'outline'}
            onClick={() => setPaymentMethod('cash')}
          >
            Cash
          </Button>
          <Button
            type="button"
            variant={paymentMethod === 'mpesa' ? 'default' : 'outline'}
            onClick={() => setPaymentMethod('mpesa')}
          >
            M-Pesa
          </Button>
        </div>
      </div>
      {paymentMethod === 'mpesa' && (
        <div>
          <Label>M-Pesa Reference</Label>
          <Input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Enter M-Pesa reference"
          />
        </div>
      )}
      <Button type="submit" className="w-full">
        Complete Payment
      </Button>
    </form>
  );
}

export default PaymentInterface;