import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/Sidebar";
import { Customer } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { 
  Loader2Icon, 
  PlusIcon, 
  UsersIcon, 
  UserIcon, 
  Pencil, 
  Trash2, 
  Phone, 
  Mail, 
  Award
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

// Form schema
const customerFormSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  phoneNumber: z.string().optional(),
  email: z.string().email("Invalid email address").optional(),
});

type CustomerFormValues = z.infer<typeof customerFormSchema>;

export default function CustomersCatalog() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch customers
  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
  });

  // Form setup
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      fullName: "",
      phoneNumber: "",
      email: "",
    },
  });

  // Create customer mutation
  const createCustomerMutation = useMutation({
    mutationFn: async (values: CustomerFormValues) => {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create customer');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      toast({
        title: "Customer created",
        description: "The customer has been added successfully",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Failed to create customer",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  // Update customer mutation
  const updateCustomerMutation = useMutation({
    mutationFn: async (values: CustomerFormValues & { id: number }) => {
      const { id, ...customerData } = values;
      
      const response = await fetch(`/api/customers/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(customerData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update customer');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      toast({
        title: "Customer updated",
        description: "The customer details have been updated",
      });
      setIsEditDialogOpen(false);
      setSelectedCustomer(null);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Failed to update customer",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  // Delete customer mutation
  const deleteCustomerMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/customers/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete customer');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      toast({
        title: "Customer deleted",
        description: "The customer has been removed",
      });
      setIsDeleteDialogOpen(false);
      setSelectedCustomer(null);
    },
    onError: (error: any) => {
      // Special handling for active sessions error
      if (error.response?.status === 400 && error.response?.data?.activeSessions) {
        toast({
          title: "Cannot delete customer",
          description: "This customer has active sessions and cannot be deleted",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Failed to delete customer",
          description: error.message || "Something went wrong",
          variant: "destructive",
        });
      }
    },
  });

  const handleCreateCustomer = (values: CustomerFormValues) => {
    createCustomerMutation.mutate(values);
  };

  const handleUpdateCustomer = (values: CustomerFormValues) => {
    if (selectedCustomer) {
      updateCustomerMutation.mutate({ ...values, id: selectedCustomer.id });
    }
  };

  const handleDeleteCustomer = () => {
    if (selectedCustomer) {
      deleteCustomerMutation.mutate(selectedCustomer.id);
    }
  };

  const openEditDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
    form.reset({
      fullName: customer.fullName,
      phoneNumber: customer.phoneNumber || "",
      email: customer.email || "",
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDeleteDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-background">
      <Sidebar />

      <main className="flex-1 overflow-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Customer Management</h1>
            <p className="text-muted-foreground">Manage your gaming lounge customers</p>
          </div>
          
          <Button onClick={() => setIsDialogOpen(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-lg">Loading customers...</span>
          </div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <UsersIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No customers found</h3>
            <p className="text-muted-foreground max-w-md mt-1 mb-4">
              You haven't added any customers yet. Add customers to track their gaming sessions and loyalty points.
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Your First Customer
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {customers.map((customer) => (
              <Card key={customer.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardHeader className="bg-card-header">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <UserIcon className="h-5 w-5 mr-2 text-primary" />
                      <span className="truncate">{customer.fullName}</span>
                    </div>
                    {customer.loyaltyPoints > 0 && (
                      <Badge variant="outline" className="ml-2 bg-primary/10 text-primary border-primary/20">
                        {customer.loyaltyPoints} Points
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="flex flex-col space-y-3">
                    {customer.phoneNumber && (
                      <div className="flex items-center text-sm">
                        <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{customer.phoneNumber}</span>
                      </div>
                    )}
                    {customer.email && (
                      <div className="flex items-center text-sm">
                        <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="truncate">{customer.email}</span>
                      </div>
                    )}
                    <div className="flex items-center text-sm">
                      <Award className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>Joined: {formatDate(customer.createdAt)}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t px-4 py-3 bg-card/50 flex justify-between">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openDeleteDialog(customer)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => openEditDialog(customer)}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {/* Add Customer Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreateCustomer)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter customer name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter phone number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address (Optional)</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Enter email address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    disabled={createCustomerMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    disabled={createCustomerMutation.isPending}
                  >
                    {createCustomerMutation.isPending ? (
                      <>
                        <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : "Add Customer"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Edit Customer Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Customer</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleUpdateCustomer)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter customer name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter phone number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address (Optional)</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Enter email address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditDialogOpen(false)}
                    disabled={updateCustomerMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    disabled={updateCustomerMutation.isPending}
                  >
                    {updateCustomerMutation.isPending ? (
                      <>
                        <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : "Update Customer"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the customer "{selectedCustomer?.fullName}" and all their data.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteCustomerMutation.isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteCustomer}
                disabled={deleteCustomerMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteCustomerMutation.isPending ? (
                  <>
                    <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}