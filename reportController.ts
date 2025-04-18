import { Request, Response, Router } from 'express';
import PDFDocument from 'pdfkit';
import { storage } from '../storage';
import { IStorage } from '../storage';

/**
 * Handle requests related to reports
 * @param storage Storage instance
 * @param broadcast Function to broadcast updates to WebSocket clients
 * @returns Express router
 */
export function handleReportsRequests(
  storage: IStorage,
  broadcast: (data: any) => void
): Router {
  const router = Router();

  // Get summary data for reports dashboard
  router.get('/summary', async (req, res) => {
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;

      // Get statistics data
      const stats = await storage.getTodayStats();
      
      // Get payment methods data
      const paymentMethods = await storage.getPaymentMethods();
      
      // Get customer activity data
      const customerActivity = await storage.getCustomerActivity(startDate, endDate);
      
      res.json({
        stats,
        paymentMethods,
        customerActivity
      });
    } catch (error) {
      console.error('Error fetching report summary:', error);
      res.status(500).json({ error: 'Failed to fetch report summary' });
    }
  });

  // Get game performance data
  router.get('/game-performance', async (req, res) => {
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;

      const gameData = await storage.getGamePerformanceReport(startDate, endDate);
      
      res.json(gameData);
    } catch (error) {
      console.error('Error fetching game performance:', error);
      res.status(500).json({ error: 'Failed to fetch game performance' });
    }
  });

  // Get loyalty program analytics
  router.get('/loyalty-analytics', async (req, res) => {
    try {
      const loyaltyData = await storage.getLoyaltyReport();
      
      res.json(loyaltyData);
    } catch (error) {
      console.error('Error fetching loyalty analytics:', error);
      res.status(500).json({ error: 'Failed to fetch loyalty analytics' });
    }
  });

  // Get revenue report data
  router.get('/revenue', async (req, res) => {
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;

      const revenueData = await storage.getRevenueReport(startDate, endDate);
      
      res.json(revenueData);
    } catch (error) {
      console.error('Error fetching revenue report:', error);
      res.status(500).json({ error: 'Failed to fetch revenue report' });
    }
  });

  // Export report as PDF
  router.post('/export', generateReport);

  return router;
}

/**
 * Generate a pdf report
 * @param req Request containing reportType and dateRange
 * @param res PDF document response
 */
export async function generateReport(req: Request, res: Response): Promise<void> {
  const { reportType, dateRange } = req.body;
  
  try {
    // Create a new PDF document
    const doc = new PDFDocument({ margin: 50 });
    
    // Set appropriate headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=infinity-gaming-report-${new Date().toISOString().slice(0, 10)}.pdf`);
    
    // Pipe the PDF to the response
    doc.pipe(res);
    
    // Add the report title and date
    doc.fontSize(20).text('Infinity Gaming Lounge', { align: 'center' });
    doc.fontSize(16).text(`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`, { align: 'center' });
    doc.fontSize(12).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.fontSize(12).text(`Period: ${dateRange?.startDate || 'All time'} to ${dateRange?.endDate || 'Present'}`, { align: 'center' });
    
    doc.moveDown(2);
    
    // Generate report based on type
    switch (reportType) {
      case 'overview': {
        // Get stats
        const stats = await storage.getTodayStats();
        // Get payment methods
        const paymentMethods = await storage.getPaymentMethods();
        // Get customer activity
        const customerActivity = await storage.getCustomerActivity(dateRange?.startDate, dateRange?.endDate);
        
        // Add stats section
        doc.fontSize(16).text('Performance Overview');
        doc.moveDown(0.5);
        doc.fontSize(12).text(`Total Revenue: KSh ${stats?.totalRevenue?.toLocaleString() || 0}`);
        doc.moveDown(0.2);
        doc.fontSize(12).text(`Active Sessions: ${stats?.activeStations || 0}`);
        doc.moveDown(0.2);
        doc.fontSize(12).text(`Average Session Value: KSh ${stats?.averageRevenue?.toLocaleString() || 0}`);
        
        // Add payment methods section
        doc.moveDown();
        doc.fontSize(16).text('Payment Methods');
        doc.moveDown(0.5);
        
        // Draw table for payment methods
        if (paymentMethods && paymentMethods.length) {
          const rows: string[][] = [];
          let total = 0;
          
          // Calculate total for percentage
          paymentMethods.forEach(pm => total += pm.count);
          
          // Create rows
          paymentMethods.forEach(pm => {
            const percentage = total > 0 ? ((pm.count / total) * 100).toFixed(1) : '0.0';
            rows.push([
              pm.method.toUpperCase(),
              pm.count.toString(),
              `${percentage}%`
            ]);
          });
          
          drawTable(doc, ['Payment Method', 'Count', 'Percentage'], rows);
        } else {
          doc.fontSize(12).text('No payment method data available');
        }
        
        // Add revenue by day section
        doc.moveDown();
        doc.fontSize(16).text('Revenue by Day');
        doc.moveDown(0.5);
        
        if (customerActivity && customerActivity.length) {
          const rows: string[][] = [];
          
          customerActivity.forEach(day => {
            rows.push([
              new Date(day.date).toLocaleDateString(),
              `KSh ${day.revenue?.toLocaleString() || 0}`,
              day.sessions?.toString() || '0'
            ]);
          });
          
          drawTable(doc, ['Date', 'Revenue', 'Sessions'], rows);
        } else {
          doc.fontSize(12).text('No daily revenue data available');
        }
        
        break;
      }
      
      case 'revenue': {
        // Get revenue report data
        const revenueData = await storage.getRevenueReport(dateRange?.startDate, dateRange?.endDate);
        
        doc.fontSize(16).text('Revenue Analysis');
        doc.moveDown(0.5);
        doc.fontSize(12).text(`Total Revenue: KSh ${revenueData?.totalRevenue?.toLocaleString() || 0}`);
        doc.moveDown(0.2);
        doc.fontSize(12).text(`Average Daily Revenue: KSh ${revenueData?.averageDailyRevenue?.toLocaleString() || 0}`);
        doc.moveDown(0.2);
        doc.fontSize(12).text(`Highest Revenue Day: ${revenueData?.highestRevenueDay || 'N/A'} (KSh ${revenueData?.highestRevenue?.toLocaleString() || 0})`);
        
        doc.moveDown();
        doc.fontSize(16).text('Revenue by Payment Method');
        
        // Add payment methods table
        if (revenueData?.paymentMethods && revenueData.paymentMethods.length) {
          doc.moveDown(0.5);
          const methodHeaders = ['Payment Method', 'Transactions', 'Total Amount', '% of Revenue'];
          const methodRows = revenueData.paymentMethods.map((method: any) => [
            method.method,
            method.count.toString(),
            `KSh ${method.amount?.toLocaleString() || 0}`,
            `${method.percentage?.toFixed(1) || 0}%`
          ]);
          
          drawTable(doc, methodHeaders, methodRows);
        } else {
          doc.fontSize(12).text('No payment method data found for the selected period');
        }
        
        // Add daily revenue breakdown
        doc.moveDown();
        doc.fontSize(16).text('Daily Revenue Breakdown');
        
        if (revenueData?.dailyRevenue && revenueData.dailyRevenue.length) {
          doc.moveDown(0.5);
          const dailyHeaders = ['Date', 'Revenue', 'Transactions', 'Avg. Transaction'];
          const dailyRows = revenueData.dailyRevenue.map((day: any) => [
            new Date(day.date).toLocaleDateString(),
            `KSh ${day.revenue?.toLocaleString() || 0}`,
            day.count.toString(),
            `KSh ${day.averageAmount?.toLocaleString() || 0}`
          ]);
          
          drawTable(doc, dailyHeaders, dailyRows);
        } else {
          doc.fontSize(12).text('No daily revenue data found for the selected period');
        }
        
        break;
      }
      
      case 'games': {
        // Get game performance data
        const gameData = await storage.getGamePerformanceReport(dateRange?.startDate, dateRange?.endDate);
        
        doc.fontSize(16).text('Game Performance Analysis');
        doc.moveDown(0.5);
        doc.fontSize(12).text(`Total Games: ${gameData?.gamesCount || 0}`);
        doc.moveDown(0.2);
        doc.fontSize(12).text(`Total Sessions: ${gameData?.totalSessions || 0}`);
        doc.moveDown(0.2);
        doc.fontSize(12).text(`Total Revenue From Games: KSh ${gameData?.totalRevenue?.toLocaleString() || 0}`);
        
        // Add top games section
        doc.moveDown();
        doc.fontSize(16).text('Top Performing Games');
        
        if (gameData?.games && gameData.games.length) {
          doc.moveDown(0.5);
          const gameHeaders = ['Game', 'Sessions', 'Revenue', 'Avg. Session Value', 'Avg. Duration'];
          const gameRows = gameData.games.map((game: any) => [
            game.name,
            game.sessionCount.toString(),
            `KSh ${game.totalRevenue?.toLocaleString() || 0}`,
            `KSh ${game.revenuePerSession?.toLocaleString() || 0}`,
            `${game.averageDuration?.toFixed(0) || 0} min`
          ]);
          
          drawTable(doc, gameHeaders, gameRows);
        } else {
          doc.fontSize(12).text('No game performance data found for the selected period');
        }
        
        // Add platform breakdown
        if (gameData?.platforms && gameData.platforms.length) {
          doc.moveDown();
          doc.fontSize(16).text('Platform Breakdown');
          doc.moveDown(0.5);
          
          const platformHeaders = ['Platform', 'Sessions', 'Revenue', '% of Revenue'];
          const platformRows = gameData.platforms.map((platform: any) => [
            platform.platform,
            platform.sessions.toString(),
            `KSh ${platform.revenue?.toLocaleString() || 0}`,
            `${platform.percentage?.toFixed(1) || 0}%`
          ]);
          
          drawTable(doc, platformHeaders, platformRows);
        }
        
        break;
      }
      
      case 'loyalty': {
        // Get loyalty program data
        const loyaltyData = await storage.getLoyaltyReport();
        
        doc.fontSize(16).text('Loyalty Program Analysis');
        doc.moveDown(0.5);
        doc.fontSize(12).text(`Total Customers: ${loyaltyData?.totalCustomers || 0}`);
        doc.moveDown(0.2);
        doc.fontSize(12).text(`Total Points Issued: ${loyaltyData?.totalPoints?.toLocaleString() || 0}`);
        doc.moveDown(0.2);
        doc.fontSize(12).text(`Average Points per Customer: ${loyaltyData?.averagePoints?.toFixed(0) || 0}`);
        
        // Add loyalty segments section
        doc.moveDown();
        doc.fontSize(16).text('Loyalty Segments');
        
        if (loyaltyData?.segments && loyaltyData.segments.length) {
          doc.moveDown(0.5);
          const segmentHeaders = ['Tier', 'Customers', 'Total Points', 'Avg. Points', '% of Customers'];
          const segmentRows = loyaltyData.segments.map((segment: any) => [
            segment.name,
            segment.customerCount.toString(),
            segment.totalPoints.toLocaleString(),
            segment.averagePoints.toFixed(0),
            `${segment.percentageOfCustomers?.toFixed(1) || 0}%`
          ]);
          
          drawTable(doc, segmentHeaders, segmentRows);
        } else {
          doc.fontSize(12).text('No loyalty segment data available');
        }
        
        // Add top customers section
        if (loyaltyData?.topCustomers && loyaltyData.topCustomers.length) {
          doc.moveDown();
          doc.fontSize(16).text('Top 10 Loyalty Customers');
          doc.moveDown(0.5);
          
          const customerHeaders = ['Customer', 'Points', 'Total Spent', 'Sessions'];
          const customerRows = loyaltyData.topCustomers.map((customer: any) => [
            customer.name,
            customer.points.toLocaleString(),
            `KSh ${customer.totalSpent?.toLocaleString() || 0}`,
            customer.sessions.toString()
          ]);
          
          drawTable(doc, customerHeaders, customerRows);
        }
        
        break;
      }
      
      default:
        doc.fontSize(16).text('Report data not available for the selected type');
    }
    
    // Add footer
    doc.moveDown(2);
    doc.fontSize(10).text('© Infinity Gaming Lounge. All rights reserved.', { align: 'center' });
    
    // Finalize the PDF
    doc.end();
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
}

/**
 * Draw a table in the PDF document
 * @param doc PDF document
 * @param headers Table headers
 * @param rows Table rows
 */
function drawTable(doc: PDFKit.PDFDocument, headers: string[], rows: string[][]): void {
  const columnCount = headers.length;
  const tableWidth = doc.page.width - 100;
  const columnWidth = tableWidth / columnCount;
  const rowHeight = 20;
  let y = doc.y;
  
  // Draw headers
  doc.font('Helvetica-Bold');
  for (let i = 0; i < columnCount; i++) {
    doc.text(headers[i], 50 + (i * columnWidth), y, {
      width: columnWidth,
      align: 'left'
    });
  }
  
  // Move to next line and draw a line
  y += rowHeight;
  doc.moveTo(50, y).lineTo(50 + tableWidth, y).stroke();
  y += 5;
  
  // Draw rows
  doc.font('Helvetica');
  for (const row of rows) {
    for (let i = 0; i < columnCount; i++) {
      doc.text(row[i] || '', 50 + (i * columnWidth), y, {
        width: columnWidth,
        align: 'left'
      });
    }
    y += rowHeight;
    
    // Check if we need a new page
    if (y > doc.page.height - 100) {
      doc.addPage();
      y = 50;
    }
  }
  
  doc.y = y + 10;
}