import { Router, Request, Response } from 'express';
import { IStorage } from '../storage';
import { paymentMethodEnum } from '@shared/schema';

/**
 * Handle requests related to payments
 * @param storage Storage instance
 * @param broadcast Function to broadcast updates to WebSocket clients
 * @returns Express router
 */
export function handlePaymentsRequests(
  storage: IStorage,
  broadcast: (data: any) => void
): Router {
  const router = Router();

  // Get all payments
  router.get('/', async (req: Request, res: Response) => {
    try {
      // Using the standard database access method via storage
      const payments = await storage.getAllPayments();
      
      res.json(payments);
    } catch (error: any) {
      console.error('Error fetching payments:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get all payments for a specific customer
  router.get('/customer/:customerId', async (req: Request, res: Response) => {
    try {
      const customerId = parseInt(req.params.customerId, 10);
      if (isNaN(customerId)) {
        return res.status(400).json({ error: 'Invalid customer ID' });
      }
      
      const payments = await storage.getAllPaymentsByCustomerId(customerId);
      res.json(payments);
    } catch (error: any) {
      console.error('Error fetching customer payments:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create a new payment transaction
  router.post('/', async (req: Request, res: Response) => {
    try {
      const { sessionId, customerId, amount, description } = req.body;
      
      if (!amount) {
        return res.status(400).json({ error: 'Amount is required' });
      }
      
      // Create a payment object with required fields
      const paymentData: any = {
        sessionId,
        amount,
        paymentMethod: paymentMethodEnum.enumValues[2], // PENDING
        payment_status: 'PENDING',
        mpesaReference: `TRX-${Date.now()}`
      };
      
      // Add description if provided
      if (description) {
        paymentData.description = description;
      }
      
      // Add customer ID if provided
      if (customerId) {
        paymentData.customerId = customerId;
      }
      
      const payment = await storage.createPayment(paymentData);
      
      broadcast({
        type: 'PAYMENT_CREATED',
        data: payment,
      });
      
      res.status(201).json({ 
        success: true,
        transactionId: payment.id,
      });
    } catch (error: any) {
      console.error('Error creating payment:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Process cash payment
  router.post('/cash', async (req: Request, res: Response) => {
    try {
      const { transactionId, amount, userId, splitIndex } = req.body;
      
      if (!transactionId || !amount) {
        return res.status(400).json({ error: 'TransactionId and amount are required' });
      }
      
      // Get the transaction
      const transaction = await storage.getTransaction(transactionId);
      
      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }
      
      // Create payment record directly without using updateTransactionStatus
      try {
        const payment = await storage.createPayment({
          sessionId: transactionId,
          amount: parseFloat(amount),
          paymentMethod: 'CASH',
          payment_status: 'COMPLETED'
        });
        
        // Award loyalty points if a user is associated
        if (userId) {
          const pointsToAward = Math.floor(amount / 100); // 1 point per 100 spent
          await storage.awardLoyaltyPoints(userId, pointsToAward);
        }
        
        const updatedTransaction = await storage.getTransaction(transactionId);
        
        broadcast({
          type: 'PAYMENT_COMPLETED',
          data: updatedTransaction,
          splitIndex,
        });
        
        res.json({ 
          success: true,
          payment: payment
        });
      } catch (innerError: any) {
        console.error('Error creating cash payment:', innerError);
        throw innerError;
      }
    } catch (error: any) {
      console.error('Error processing cash payment:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Process M-Pesa payment
  router.post('/mpesa', async (req: Request, res: Response) => {
    try {
      const { transactionId, phoneNumber, amount, userId, splitIndex } = req.body;
      
      if (!transactionId || !phoneNumber || !amount) {
        return res.status(400).json({ 
          error: 'TransactionId, phoneNumber, and amount are required' 
        });
      }
      
      // In a real implementation, this would call the M-Pesa API
      // For now, we'll simulate a successful response
      
      // Get the transaction
      const transaction = await storage.getTransaction(transactionId);
      
      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }
      
      // Create payment record directly
      try {
        const payment = await storage.createPayment({
          sessionId: transactionId,
          amount: parseFloat(amount),
          paymentMethod: 'MPESA',
          status: 'COMPLETED',
          mpesaReference: `M-${Date.now()}`
        });
        
        // Award loyalty points if a user is associated
        if (userId) {
          const pointsToAward = Math.floor(amount / 100); // 1 point per 100 spent
          await storage.awardLoyaltyPoints(userId, pointsToAward);
        }
        
        const updatedTransaction = await storage.getTransaction(transactionId);
        
        broadcast({
          type: 'PAYMENT_COMPLETED',
          data: updatedTransaction,
          splitIndex,
        });
        
        res.json({ 
          success: true,
          payment: payment,
          checkoutRequestId: 'mock-checkout-request-id',
          merchantRequestId: 'mock-merchant-request-id',
        });
      } catch (innerError: any) {
        console.error('Error creating M-Pesa payment:', innerError);
        throw innerError;
      }
    } catch (error: any) {
      console.error('Error processing M-Pesa payment:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Generate M-Pesa QR code
  router.post('/mpesa/qr', async (req: Request, res: Response) => {
    try {
      const { transactionId, amount, reference } = req.body;
      
      if (!transactionId || !amount) {
        return res.status(400).json({ error: 'TransactionId and amount are required' });
      }
      
      // In a real implementation, this would call the M-Pesa API to generate a QR code
      // For now, we'll return a mock QR code
      
      res.json({ 
        success: true,
        qrCode: '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', // Mock base64 QR code
        requestId: `qr-${Date.now()}`,
      });
    } catch (error: any) {
      console.error('Error generating M-Pesa QR code:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Check M-Pesa payment status
  router.get('/mpesa/status/:checkoutRequestId', async (req: Request, res: Response) => {
    try {
      const { checkoutRequestId } = req.params;
      
      // In a real implementation, this would query the M-Pesa API
      // For now, we'll return a mock status
      
      res.json({ 
        success: true,
        status: 'completed',
      });
    } catch (error: any) {
      console.error('Error checking M-Pesa status:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Check M-Pesa QR payment status
  router.get('/mpesa/qr/status/:requestId', async (req: Request, res: Response) => {
    try {
      const { requestId } = req.params;
      
      // In a real implementation, this would query the M-Pesa API
      // For now, we'll return a mock status
      
      res.json({ 
        success: true,
        status: 'completed',
      });
    } catch (error: any) {
      console.error('Error checking M-Pesa QR status:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}