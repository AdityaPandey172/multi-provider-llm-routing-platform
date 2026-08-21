import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import {
  IdentityPage,
  JobsPage,
  OverviewPage,
  ProvidersPage,
  RoutingPage,
  SecurityPage,
  SettingsPage,
  Shell,
  UsagePage,
} from '@/components/console';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import LandingPage from '@/pages/landing';
import LoginPage from '@/pages/login';
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

/**
 * Guards all dashboard routes behind a valid operator session.
 * Shows a loading state while the session check is in flight to avoid
 * a flash of the login screen on page load when already authenticated.
 */
function AuthGuard({ children }: { children: ReactNode }) {
  const { authState } = useAuth();
  const [, navigate] = useLocation();

  if (authState.status === 'loading') {
    return (
      <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
        <span className="text-white/30 text-sm animate-pulse">Loading…</span>
      </div>
    );
  }

  if (authState.status === 'unauthenticated') {
    // Replace so the user can't go "back" to a dashboard page without a session
    void navigate('/login', { replace: true });
    return null;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={LoginPage} />
      <Route>
        <AuthGuard>
          <DashboardRouter />
        </AuthGuard>
      </Route>
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
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
