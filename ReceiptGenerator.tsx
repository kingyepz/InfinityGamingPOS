import React from "react";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/payment";

interface ReceiptGeneratorProps {
  transactionId: number;
  customerName: string;
  amount: number;
  paymentMethod: string;
  timestamp: string;
}

export default function ReceiptGenerator({
  transactionId,
  customerName,
  amount,
  paymentMethod,
  timestamp,
}: ReceiptGeneratorProps) {
  const { toast } = useToast();

  const handleGenerateReceipt = async () => {
    try {
      const response = await fetch(`/api/receipts/${transactionId}`, {
        method: "GET",
        headers: {
          Accept: "application/pdf",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to generate receipt");
      }

      // Get the receipt PDF as a blob
      const pdfBlob = await response.blob();

      // Create a URL for the blob
      const pdfUrl = URL.createObjectURL(pdfBlob);

      // Create a link element and trigger the download
      const link = document.createElement("a");
      link.href = pdfUrl;
      link.download = `receipt-${transactionId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the URL object
      URL.revokeObjectURL(pdfUrl);

      toast({
        title: "Receipt Generated",
        description: "The receipt has been downloaded to your device.",
      });
    } catch (error: any) {
      console.error("Error generating receipt:", error);
      toast({
        title: "Receipt Generation Failed",
        description: error.message || "Failed to generate receipt",
        variant: "destructive",
      });

      // Fallback: Generate a simple receipt in a new window
      generateFallbackReceipt(transactionId, customerName, amount, paymentMethod, timestamp);
    }
  };

  // Fallback receipt generation function
  const generateFallbackReceipt = (
    transactionId: number,
    customerName: string,
    amount: number,
    paymentMethod: string,
    timestamp: string
  ) => {
    const receiptWindow = window.open("", "_blank", "width=400,height=600");
    if (!receiptWindow) {
      toast({
        title: "Popup Blocked",
        description: "Please allow popups to view the receipt",
        variant: "destructive",
      });
      return;
    }

    const formattedTimestamp = new Date(timestamp).toLocaleString();
    const capitalizedPaymentMethod = 
      paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1);

    const receiptContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Receipt #${transactionId}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f9f9f9;
          }
          .receipt {
            background-color: white;
            max-width: 400px;
            margin: 0 auto;
            padding: 20px;
            border: 1px solid #ddd;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 1px dashed #ccc;
            padding-bottom: 10px;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
          }
          .header p {
            margin: 5px 0;
            color: #666;
          }
          .receipt-details {
            margin-bottom: 20px;
          }
          .receipt-details p {
            margin: 5px 0;
            display: flex;
            justify-content: space-between;
          }
          .receipt-details .label {
            font-weight: bold;
          }
          .total {
            font-size: 18px;
            font-weight: bold;
            text-align: right;
            border-top: 1px dashed #ccc;
            padding-top: 10px;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <h1>Infinity Gaming Lounge</h1>
            <p>Payment Receipt</p>
            <p>Transaction ID: #${transactionId}</p>
          </div>
          <div class="receipt-details">
            <p><span class="label">Date:</span> <span>${formattedTimestamp}</span></p>
            <p><span class="label">Customer:</span> <span>${customerName}</span></p>
            <p><span class="label">Payment Method:</span> <span>${capitalizedPaymentMethod}</span></p>
          </div>
          <div class="total">Total: ${formatCurrency(amount)}</div>
          <div class="footer">
            <p>Thank you for your business!</p>
            <p>© ${new Date().getFullYear()} Infinity Gaming Lounge</p>
          </div>
        </div>
        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `;

    receiptWindow.document.write(receiptContent);
    receiptWindow.document.close();
  };

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleGenerateReceipt}
      className="flex items-center"
    >
      <FileDown className="h-4 w-4 mr-1" />
      Receipt
    </Button>
  );
}