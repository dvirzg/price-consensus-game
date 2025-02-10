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
        <Router base={base}>
          <AppRouter />
        </Router>
        <Toaster />
      </Layout>
    </QueryClientProvider>
  );
}

export default App;
