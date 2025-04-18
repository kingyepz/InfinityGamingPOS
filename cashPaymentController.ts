import { Request, Response, Router } from 'express';
import { IStorage } from '../storage';
import { paymentMethodEnum, paymentStatusEnum } from '@shared/schema';

/**
 * Process a cash payment
 * @param req Request containing payment information
 * @param res Response to send
 */
export const processCashPayment = async (req: Request, res: Response) => {
  try {
    const { storage } = req.app.locals;
    const { transactionId, amount, userId, splitIndex } = req.body;
    
    if (!transactionId || !amount) {
      return res.status(400).json({ error: 'Transaction ID and amount are required' });
    }

    // Get the session first to check if it exists
    const session = await storage.getSession(transactionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Create a payment record with minimal fields
    const payment = await storage.createPayment({
      sessionId: transactionId,
      amount: parseFloat(amount),
      paymentMethod: paymentMethodEnum.enumValues[0], // CASH
      status: paymentStatusEnum.enumValues[1], // COMPLETED
    });

    // If a user ID is provided, award loyalty points
    if (userId) {
      const pointsToAward = Math.floor(amount / 100); // 1 point per 100 spent
      await storage.awardLoyaltyPoints(userId, pointsToAward);
    }

    res.status(200).json({
      success: true,
      message: 'Cash payment processed successfully',
      payment: payment
    });
  } catch (error: any) {
    console.error('Error processing cash payment:', error);
    res.status(500).json({ error: error.message || 'Error processing cash payment' });
  }
};

/**
 * Setup the cash payment routes
 * @param storage Storage interface
 * @param broadcast WebSocket broadcast function
 */
export function handleCashPaymentsRequests(storage: IStorage, broadcast: (data: any) => void) {
  const router = Router();
  
  router.post('/', async (req: Request, res: Response) => {
    req.app.locals.storage = storage;
    req.app.locals.broadcast = broadcast;
    return processCashPayment(req, res);
  });
  
  return router;
}