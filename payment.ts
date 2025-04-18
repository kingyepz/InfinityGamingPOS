/**
 * Format a currency amount as KSh with commas
 * @param amount Amount to format
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number | string): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) {
    return 'KSh 0';
  }
  
  return `KSh ${numAmount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Generate a receipt for a specific transaction
 * @param transactionId The ID of the transaction
 * @returns A blob containing the PDF receipt
 */
export async function generateReceipt(transactionId: number): Promise<Blob> {
  const response = await fetch(`/api/receipts/${transactionId}`);
  
  if (!response.ok) {
    throw new Error('Failed to generate receipt');
  }
  
  return await response.blob();
}

/**
 * Create a transaction record
 * @param transactionData Transaction data
 * @returns Transaction ID and success status
 */
export async function createTransaction(transactionData: {
  sessionId?: number;
  customerId?: number;
  amount: number;
  description: string;
}): Promise<{ success: boolean; transactionId?: number; error?: string }> {
  try {
    const response = await fetch('/api/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transactionData),
    });
    
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      success: true,
      transactionId: data.transactionId,
    };
  } catch (error: any) {
    console.error('Error creating transaction:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Process a cash payment
 * @param transactionId Transaction ID
 * @param amount Payment amount
 * @param userId Optional user ID for loyalty points
 * @param splitIndex Optional split payment index
 * @returns Payment result
 */
export async function processCashPayment(
  transactionId: number,
  amount: number,
  userId?: number,
  splitIndex?: number
): Promise<{ success: boolean; reference?: string; error?: string }> {
  try {
    const response = await fetch('/api/payments/cash', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transactionId,
        amount,
        userId,
        splitIndex,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      success: true,
      reference: data.reference,
    };
  } catch (error: any) {
    console.error('Error processing cash payment:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Initialize M-Pesa payment
 * @param phoneNumber Customer phone number
 * @param amount Payment amount
 * @param transactionId Transaction ID
 * @param userId Optional user ID for loyalty points
 * @param splitIndex Optional split payment index
 * @returns M-Pesa initialization result
 */
export async function initiateMpesaPayment(
  phoneNumber: string,
  amount: number,
  transactionId: number,
  userId?: number,
  splitIndex?: number
): Promise<{ 
  success: boolean; 
  checkoutRequestId?: string; 
  merchantRequestId?: string;
  error?: string;
}> {
  try {
    // In a real implementation, this would call the M-Pesa API
    // For now, we'll simulate a successful response
    
    // Fake implementation for demo purposes
    const response = await fetch('/api/payments/mpesa', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumber,
        amount,
        transactionId,
        userId,
        splitIndex,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // In a real implementation, we would return the actual M-Pesa request IDs
    return {
      success: true,
      checkoutRequestId: data.checkoutRequestId || 'mock-checkout-id',
      merchantRequestId: data.merchantRequestId || 'mock-merchant-id',
    };
  } catch (error: any) {
    console.error('Error initiating M-Pesa payment:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Check M-Pesa payment status
 * @param checkoutRequestId M-Pesa checkout request ID
 * @returns Payment status result
 */
export async function checkMpesaPaymentStatus(
  checkoutRequestId: string
): Promise<{ 
  success: boolean; 
  status: 'pending' | 'completed' | 'failed';
  error?: string;
}> {
  try {
    // In a real implementation, this would query the M-Pesa API
    // For now, we'll simulate a successful response
    
    const response = await fetch(`/api/payments/mpesa/status/${checkoutRequestId}`);
    
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      success: true,
      status: data.status || 'completed', // Mock status for demo
    };
  } catch (error: any) {
    console.error('Error checking M-Pesa payment status:', error);
    return {
      success: false,
      status: 'failed',
      error: error.message,
    };
  }
}

/**
 * Generate M-Pesa QR code for payment
 * @param amount Payment amount
 * @param transactionId Transaction ID
 * @param reference Optional reference for tracking
 * @returns QR code data and request ID
 */
export async function generateMpesaQRCode(
  amount: number,
  transactionId: number,
  reference?: string
): Promise<{ 
  success: boolean; 
  qrCode?: string;
  requestId?: string;
  error?: string;
}> {
  try {
    // In a real implementation, this would call the M-Pesa API to generate a QR code
    // For now, we'll simulate a successful response
    
    const response = await fetch('/api/payments/mpesa/qr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,
        transactionId,
        reference,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // In a real implementation, we would return the actual QR code and request ID
    return {
      success: true,
      qrCode: data.qrCode || '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', // Mock data
      requestId: data.requestId || 'mock-qr-request-id',
    };
  } catch (error: any) {
    console.error('Error generating M-Pesa QR code:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Check M-Pesa QR payment status
 * @param requestId QR request ID
 * @returns Payment status result
 */
export async function checkMpesaQRPaymentStatus(
  requestId: string
): Promise<{ 
  success: boolean; 
  status: 'pending' | 'completed' | 'failed';
  error?: string;
}> {
  try {
    // In a real implementation, this would query the M-Pesa API
    // For now, we'll simulate a successful response
    
    const response = await fetch(`/api/payments/mpesa/qr/status/${requestId}`);
    
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      success: true,
      status: data.status || 'completed', // Mock status for demo
    };
  } catch (error: any) {
    console.error('Error checking M-Pesa QR payment status:', error);
    return {
      success: false,
      status: 'failed',
      error: error.message,
    };
  }
}

/**
 * Process a payment
 * @param paymentData Payment information
 * @returns Payment confirmation
 */
export async function processPayment(paymentData: any): Promise<any> {
  const { method, transactionId } = paymentData;
  
  try {
    if (method === 'cash') {
      return processCashPayment(transactionId, paymentData.amount, paymentData.userId);
    } else if (method === 'mpesa') {
      return initiateMpesaPayment(paymentData.phoneNumber, paymentData.amount, transactionId, paymentData.userId);
    } else {
      throw new Error(`Unsupported payment method: ${method}`);
    }
  } catch (error: any) {
    console.error('Error processing payment:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}