import { Request, Response, Router } from 'express';
import PDFDocument from 'pdfkit';
import { storage } from '../storage';
import { IStorage } from '../storage';

/**
 * Handle requests related to receipts
 * @param storage Storage instance
 * @param broadcast Function to broadcast updates to WebSocket clients
 * @returns Express router
 */
export function handleReceiptRequests(
  storage: IStorage,
  broadcast: (data: any) => void
): Router {
  const router = Router();

  // Get receipt for a specific transaction
  router.get('/:id', generateReceipt);

  return router;
}

/**
 * Generate a receipt PDF for a specific transaction
 * @param req Request containing transactionId
 * @param res PDF document response
 */
export async function generateReceipt(req: Request, res: Response): Promise<void> {
  const transactionId = req.params.id;
  
  try {
    // Validate transaction ID
    if (!transactionId || isNaN(Number(transactionId))) {
      res.status(400).json({ error: 'Invalid transaction ID' });
      return;
    }
    
    // Get transaction details
    const transaction = await storage.getTransaction(Number(transactionId));
    if (!transaction) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }
    
    // Get payment details
    const payment = await storage.getPaymentByTransactionId(Number(transactionId));
    if (!payment) {
      res.status(404).json({ error: 'Payment not found for this transaction' });
      return;
    }
    
    // Create a new PDF document
    const doc = new PDFDocument({ margin: 50, size: 'A6' });
    
    // Set appropriate headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=receipt-${transactionId}.pdf`);
    
    // Pipe the PDF to the response
    doc.pipe(res);
    
    // Add company logo or header
    doc.fontSize(16).text('Infinity Gaming Lounge', { align: 'center' });
    doc.fontSize(10).text('Your gaming destination', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).text('PAYMENT RECEIPT', { align: 'center' });
    doc.moveDown(0.5);
    
    // Add receipt borders
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 50;
    
    // Draw a border around the receipt
    doc.moveTo(margin, margin)
       .lineTo(pageWidth - margin, margin)
       .lineTo(pageWidth - margin, pageHeight - margin)
       .lineTo(margin, pageHeight - margin)
       .lineTo(margin, margin)
       .stroke();
    
    // Add transaction details section
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Receipt #: ${transactionId}`, { align: 'left' });
    doc.fontSize(10).text(`Date: ${new Date(payment.createdAt || Date.now()).toLocaleString()}`, { align: 'left' });
    doc.fontSize(10).text(`Customer: ${transaction.customerName || 'Walk-in Customer'}`, { align: 'left' });
    
    doc.moveDown(1);
    
    // Add payment details
    doc.fontSize(12).text('Payment Details', { align: 'center', underline: true });
    doc.moveDown(0.5);
    
    // Service details
    doc.fontSize(10).text(`Service: Gaming Session`, { align: 'left' });
    doc.fontSize(10).text(`Game: ${transaction.gameName || 'Multiple Games'}`, { align: 'left' });
    doc.fontSize(10).text(`Station: ${transaction.stationName || 'Unknown'}`, { align: 'left' });
    
    if (transaction.duration) {
      const hours = Math.floor(transaction.duration / 60);
      const minutes = transaction.duration % 60;
      let durationText = '';
      
      if (hours > 0) {
        durationText += `${hours} hour${hours > 1 ? 's' : ''}`;
      }
      
      if (minutes > 0) {
        durationText += `${hours > 0 ? ' ' : ''}${minutes} minute${minutes > 1 ? 's' : ''}`;
      }
      
      doc.fontSize(10).text(`Duration: ${durationText}`, { align: 'left' });
    }
    
    // Draw line break
    doc.moveDown(0.5);
    doc.moveTo(margin + 20, doc.y)
       .lineTo(pageWidth - margin - 20, doc.y)
       .stroke();
    doc.moveDown(0.5);
    
    // Payment info
    doc.fontSize(10).text(`Payment Method: ${payment.paymentMethod?.toUpperCase() || 'UNKNOWN'}`, { align: 'left' });
    
    if (payment.reference) {
      doc.fontSize(10).text(`Reference: ${payment.reference}`, { align: 'left' });
    }
    
    // Add the payment amount in bold
    doc.moveDown(0.5);
    doc.fontSize(14).text('TOTAL AMOUNT:', { align: 'left' });
    doc.fontSize(14).text(`KSh ${payment.amount?.toLocaleString() || '0'}`, { align: 'right' });
    
    // Draw line break
    doc.moveDown(0.5);
    doc.moveTo(margin + 20, doc.y)
       .lineTo(pageWidth - margin - 20, doc.y)
       .stroke();
    doc.moveDown(0.5);
    
    // Add footer
    doc.fontSize(8).text('Thank you for visiting Infinity Gaming Lounge!', { align: 'center' });
    doc.fontSize(8).text('For any questions, contact us at support@infinitygaming.com', { align: 'center' });
    
    // Add loyalty points info if available
    if (transaction.loyaltyPoints) {
      doc.moveDown(0.5);
      doc.fontSize(10).text(`Loyalty Points Earned: ${transaction.loyaltyPoints}`, { align: 'center' });
    }
    
    // Add timestamp and footer
    doc.moveDown(1);
    doc.fontSize(8).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.fontSize(8).text('© Infinity Gaming Lounge', { align: 'center' });
    
    // Finalize the PDF
    doc.end();
  } catch (error) {
    console.error('Error generating receipt:', error);
    res.status(500).json({ error: 'Failed to generate receipt' });
  }
}