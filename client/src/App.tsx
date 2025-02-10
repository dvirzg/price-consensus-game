import { Router, Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Layout } from "@/components/layout";
import Home from "@/pages/home";
import CreateGame from "@/pages/create-game";
import Game from "@/pages/game";
import NotFound from "@/pages/not-found";
import { useState, useEffect, useCallback } from "react";

// Get the base path for GitHub Pages
const base = import.meta.env.DEV ? '' : '/price-consensus-game';

// Custom hook to handle GitHub Pages routing
const useHashLocation = (): [string, (to: string) => void] => {
  const [loc, setLoc] = useState(window.location.hash.replace('#', '') || '/');

  useEffect(() => {
    const handler = () => {
      const hash = window.location.hash.replace('#', '');
      setLoc(hash || '/');
    };

    window.addEventListener('hashchange', handler);
    window.addEventListener('popstate', handler);
    window.addEventListener('load', handler);
    return () => {
      window.removeEventListener('hashchange', handler);
      window.removeEventListener('popstate', handler);
      window.removeEventListener('load', handler);
    };
  }, []);

  const navigate = useCallback((to: string) => {
    window.location.hash = to;
  }, []);

  return [loc, navigate];
};

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/create" component={CreateGame} />
      <Route path="/game/:id" component={Game} />
      <Route path="/g/:uniqueId" component={Game} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Layout>
        <Router hook={useHashLocation}>
          <AppRouter />
        </Router>
        <Toaster />
      </Layout>
    </QueryClientProvider>
  );
}

export default App;
