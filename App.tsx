import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import GamesCatalog from "@/pages/games";
import CustomersCatalog from "@/pages/customers";
import Payments from "@/pages/payments";
import Reports from "@/pages/reports";
import Index from "@/pages/index";
import { ErrorBoundary } from './components/shared/ErrorBoundary';

function Router() {
  return (
    <Switch>
      <Route path="/" component={Index}/>
      <Route path="/dashboard" component={Dashboard}/>
      <Route path="/games" component={GamesCatalog}/>
      <Route path="/customers" component={CustomersCatalog}/>
      <Route path="/payments" component={Payments}/>
      <Route path="/reports" component={Reports}/>
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster /> {/* Added Toaster here */}
    </QueryClientProvider>
    </ErrorBoundary>
  );
}