import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { IdentityPage, JobsPage, OverviewPage, ProvidersPage, RoutingPage, SecurityPage, SettingsPage, Shell, UsagePage } from '@/components/console';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import LandingPage from '@/pages/landing';
import NotFound from '@/pages/not-found';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

function DashboardRouter() {
  return (
    <RoutedErrorBoundary>
      <Shell>
        <Switch>
          <Route path="/dashboard" component={OverviewPage} />
          <Route path="/providers" component={ProvidersPage} />
          <Route path="/routing" component={RoutingPage} />
          <Route path="/usage" component={UsagePage} />
          <Route path="/jobs" component={JobsPage} />
          <Route path="/security" component={SecurityPage} />
          <Route path="/identity" component={IdentityPage} />
          <Route path="/settings" component={SettingsPage} />
          <Route component={NotFound} />
        </Switch>
      </Shell>
    </RoutedErrorBoundary>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route component={DashboardRouter} />
    </Switch>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
