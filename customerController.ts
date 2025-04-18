import { Router } from "express";
import { z } from "zod";
import { IStorage } from "../storage";
import { insertCustomerSchema } from "@shared/schema";

export function handleCustomersRequests(storage: IStorage, broadcast: (data: any) => void) {
  const router = Router();

  // Get all customers
  router.get('/', async (req, res) => {
    try {
      const customers = await storage.getAllCustomers();
      res.json(customers);
    } catch (error) {
      console.error('Error fetching customers:', error);
      res.status(500).json({ message: 'Error fetching customers' });
    }
  });

  // Get a specific customer
  router.get('/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const customer = await storage.getCustomer(id);
      
      if (!customer) {
        return res.status(404).json({ message: 'Customer not found' });
      }
      
      res.json(customer);
    } catch (error) {
      console.error('Error fetching customer:', error);
      res.status(500).json({ message: 'Error fetching customer' });
    }
  });

  // Create a new customer
  router.post('/', async (req, res) => {
    try {
      const validatedData = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(validatedData);
      
      // Broadcast new customer
      broadcast({
        type: 'CUSTOMER_CREATED',
        data: customer
      });
      
      res.status(201).json(customer);
    } catch (error) {
      console.error('Error creating customer:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Invalid customer data', 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ message: 'Error creating customer' });
    }
  });

  // Update a customer
  router.patch('/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      
      // Validate update data
      const updateSchema = z.object({
        fullName: z.string().optional(),
        phoneNumber: z.string().optional(),
        email: z.string().email().optional(),
        loyaltyPoints: z.number().optional(),
      });
      
      const validatedData = updateSchema.parse(req.body);
      const updatedCustomer = await storage.updateCustomer(id, validatedData);
      
      if (!updatedCustomer) {
        return res.status(404).json({ message: 'Customer not found' });
      }
      
      // Broadcast customer update
      broadcast({
        type: 'CUSTOMER_UPDATED',
        data: updatedCustomer
      });
      
      res.json(updatedCustomer);
    } catch (error) {
      console.error('Error updating customer:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Invalid customer data', 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ message: 'Error updating customer' });
    }
  });

  // Get customer payments
  router.get('/:id/payments', async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const payments = await storage.getAllPaymentsByCustomerId(id);
      res.json(payments);
    } catch (error) {
      console.error('Error fetching customer payments:', error);
      res.status(500).json({ message: 'Error fetching customer payments' });
    }
  });
  
  // Delete a customer
  router.delete('/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      
      // Check if customer exists
      const customer = await storage.getCustomer(id);
      if (!customer) {
        return res.status(404).json({ message: 'Customer not found' });
      }
      
      // Check if customer has active sessions
      const activeSessions = await storage.getAllActiveSessions();
      const hasActiveSessions = activeSessions.some(session => session.customerId === id);
      
      if (hasActiveSessions) {
        return res.status(400).json({ 
          message: 'Cannot delete customer with active sessions',
          activeSessions: true
        });
      }
      
      // Delete the customer
      const success = await storage.deleteCustomer(id);
      
      if (success) {
        // Broadcast customer deletion
        broadcast({
          type: 'CUSTOMER_DELETED',
          data: { id }
        });
        
        res.json({ message: 'Customer deleted successfully' });
      } else {
        res.status(500).json({ message: 'Error deleting customer' });
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
      res.status(500).json({ message: 'Error deleting customer' });
    }
  });

  return router;
}
