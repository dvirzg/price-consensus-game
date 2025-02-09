import { Router, Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Layout } from "@/components/layout";
import Home from "@/pages/home";
import CreateGame from "@/pages/create-game";
import Game from "@/pages/game";
import NotFound from "@/pages/not-found";

// Get the base path for GitHub Pages
const base = import.meta.env.DEV ? '' : '/price-consensus-game';

// Use hash router for GitHub Pages compatibility
const hashRouter = (path: string) => {
  if (typeof window === 'undefined') return '/';
  return window.location.hash.replace('#', '') || '/';
};

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/create" component={CreateGame} />
      <Route path="/game/:id" component={Game} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Layout>
        <Router base={base} hook={() => [hashRouter('/'), () => {}]}>
          <AppRouter />
        </Router>
        <Toaster />
      </Layout>
    </QueryClientProvider>
  );
}

export default App;
