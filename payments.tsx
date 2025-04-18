import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Search, 
  FileText, 
  RefreshCw, 
  Ban
} from "lucide-react";
import PaymentInterface from "@/components/shared/PaymentInterface";
import { formatCurrency } from "@/lib/payment";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function Payments() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPaymentId, setSelectedPaymentId] = useState<number | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Fetch payment transactions
  const { data: payments, isLoading } = useQuery({
    queryKey: ['/api/payments'],
    queryFn: async () => {
      const response = await fetch('/api/payments');
      if (!response.ok) throw new Error('Failed to fetch payments');
      return response.json();
    }
  });

  // Handle search query changes
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  // Filter payments based on search query
  const filteredPayments = payments?.filter((payment: any) => {
    const term = searchQuery.toLowerCase();
    
    return (
      payment.id.toString().includes(term) ||
      (payment.customerName?.toLowerCase().includes(term) || '') ||
      payment.paymentMethod.toLowerCase().includes(term) ||
      payment.status.toLowerCase().includes(term)
    );
  });

  // Handle payment details view
  const handleViewPayment = (paymentId: number) => {
    setSelectedPaymentId(paymentId);
  };

  // Handle payment generation
  const handleGenerateReceipt = async (paymentId: number) => {
    try {
      // Fetch receipt as blob
      const response = await fetch(`/api/receipts/${paymentId}`);
      
      if (!response.ok) {
        throw new Error('Failed to generate receipt');
      }
      
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `receipt-${paymentId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Receipt Generated",
        description: "The receipt has been downloaded.",
      });
    } catch (error) {
      console.error('Error generating receipt:', error);
      toast({
        title: "Receipt Error",
        description: "Failed to generate receipt.",
        variant: "destructive"
      });
    }
  };

  // Handle payment method display with appropriate formatting
  const displayPaymentMethod = (method: string) => {
    if (!method) return 'Unknown';
    
    switch (method.toLowerCase()) {
      case 'cash':
        return 'Cash';
      case 'mpesa':
        return 'M-Pesa';
      default:
        return method;
    }
  };

  // Handle payment status display with appropriate badge styling
  const renderPaymentStatus = (status: string) => {
    if (!status) return <Badge>Unknown</Badge>;
    
    switch (status.toLowerCase()) {
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-400">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Handle payment completion
  const handlePaymentComplete = () => {
    // Refetch payment data
    queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
    setIsPaymentModalOpen(false);
    
    toast({
      title: "Payment Successful",
      description: "The payment has been processed successfully."
    });
  };

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Payments</h1>
            <p className="text-muted-foreground">Manage and track payment transactions</p>
          </div>
          
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search payments..."
              className="pl-8 w-64"
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>
        </div>
        
        {/* Payment Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Today's Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">
                  {isLoading ? '...' : payments?.filter((p: any) => {
                    const today = new Date().toISOString().split('T')[0];
                    return new Date(p.createdAt).toISOString().split('T')[0] === today;
                  }).length || 0}
                </div>
                <div className="flex items-center text-sm text-green-500">
                  <ArrowUpRight className="h-4 w-4 mr-1" />
                  +12%
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">
                  {isLoading ? '...' : formatCurrency(payments?.reduce((acc: number, p: any) => 
                    acc + (p.status === 'COMPLETED' ? (p.amount || 0) : 0), 0) || 0)
                  }
                </div>
                <div className="flex items-center text-sm text-green-500">
                  <ArrowUpRight className="h-4 w-4 mr-1" />
                  +5.2%
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">
                  {isLoading ? '...' : payments?.filter((p: any) => 
                    p.status === 'PENDING').length || 0
                  }
                </div>
                <div className="flex items-center text-sm text-red-500">
                  <ArrowDownRight className="h-4 w-4 mr-1" />
                  -3.1%
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Average Payment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">
                  {isLoading ? '...' : payments?.length 
                    ? formatCurrency((payments?.reduce((acc: number, p: any) => 
                      acc + (p.amount || 0), 0) / payments.length) || 0)
                    : 'KSh 0'
                  }
                </div>
                <div className="flex items-center text-sm text-green-500">
                  <ArrowUpRight className="h-4 w-4 mr-1" />
                  +8.4%
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Payment History Table */}
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredPayments?.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Ban className="h-12 w-12 mb-2 opacity-20" />
                <p>No payment records found</p>
                {searchQuery && (
                  <p className="text-sm">Try adjusting your search criteria</p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 font-medium">ID</th>
                      <th className="text-left py-3 font-medium">Date</th>
                      <th className="text-left py-3 font-medium">Customer</th>
                      <th className="text-left py-3 font-medium">Amount</th>
                      <th className="text-left py-3 font-medium">Method</th>
                      <th className="text-left py-3 font-medium">Status</th>
                      <th className="text-left py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments?.map((payment: any) => (
                      <tr key={payment.id} className="border-b hover:bg-muted/50">
                        <td className="py-3">{payment.id}</td>
                        <td className="py-3">{new Date(payment.createdAt).toLocaleString()}</td>
                        <td className="py-3">{payment.customerName || 'N/A'}</td>
                        <td className="py-3">{formatCurrency(payment.amount || 0)}</td>
                        <td className="py-3">{displayPaymentMethod(payment.paymentMethod)}</td>
                        <td className="py-3">{renderPaymentStatus(payment.status)}</td>
                        <td className="py-3">
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleGenerateReceipt(payment.id)}
                              disabled={payment.status !== 'COMPLETED'}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      
      {/* Payment Modal */}
      {isPaymentModalOpen && selectedPaymentId && (
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
              sessionId={selectedPaymentId} // Using sessionId for transaction
              amount={100} // Replace with actual payment amount
              onPaymentComplete={handlePaymentComplete}
            />
          </div>
        </div>
      )}
    </div>
  );
}