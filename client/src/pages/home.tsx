import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, Sparkles, Users2, Clock, Zap } from "lucide-react";

export default function Home() {
  const [gameId, setGameId] = useState("");
  const { toast } = useToast();

  const handleJoinGame = () => {
    if (!gameId) {
      toast({
        title: "Error",
        description: "Please enter a game ID",
        variant: "destructive",
      });
      return;
    }
    window.location.href = `/game/${gameId}`;
  };

  return (
    <div className="h-screen bg-gradient-to-b from-background to-background/95 text-foreground overflow-hidden">
      {/* iOS-style blurred background shapes */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-0 -left-[25%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[128px]" />
        <div className="absolute bottom-0 -right-[25%] w-[50%] h-[50%] rounded-full bg-blue-500/20 blur-[128px]" />
      </div>

      <div className="h-full flex flex-col items-center justify-between py-8 px-6">
        {/* Hero Section - Made more compact */}
        <div className="text-center space-y-3 pt-4">
          <div className="inline-flex items-center justify-center gap-2 text-primary font-medium bg-primary/10 px-4 py-1.5 rounded-full text-sm">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Dark Mode Support</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight leading-tight">
            Price Consensus Game
          </h1>
          <p className="text-base text-muted-foreground font-medium">
            Collaborate to distribute items fairly
          </p>
        </div>

        {/* Main Actions - More compact */}
        <Card className="border-0 shadow-lg bg-card/60 backdrop-blur-xl w-full max-w-md">
          <CardContent className="p-6 space-y-6">
            {/* Create Game Button */}
            <Link href="/create" className="block">
              <Button 
                className="w-full h-12 text-base font-medium rounded-2xl bg-primary transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl hover:bg-primary/90" 
                size="lg"
              >
                Create New Game
              </Button>
            </Link>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-card/60 backdrop-blur-xl px-4 text-muted-foreground font-medium">
                  or join existing
                </span>
              </div>
            </div>

            {/* Join Game Input */}
            <div className="flex gap-2">
              <Input
                placeholder="Enter Game ID"
                value={gameId}
                onChange={(e) => setGameId(e.target.value)}
                className="h-12 text-base rounded-2xl bg-background/50 backdrop-blur-sm border-border/50 transition-all focus:ring-2 focus:ring-primary/20 focus:border-primary"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleJoinGame();
                  }
                }}
              />
              <Button
                onClick={handleJoinGame}
                size="lg"
                className="h-12 w-12 rounded-2xl bg-primary transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl hover:bg-primary/90"
              >
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Features List - Horizontal layout */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-md px-1">
          <div className="flex flex-col items-center gap-2 bg-card/40 backdrop-blur-sm p-4 rounded-2xl">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Users2 className="h-4 w-4 text-primary" />
            </div>
            <h3 className="text-sm font-semibold">Collaborative</h3>
          </div>
          <div className="flex flex-col items-center gap-2 bg-card/40 backdrop-blur-sm p-4 rounded-2xl">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <h3 className="text-sm font-semibold">Real-time</h3>
          </div>
          <div className="flex flex-col items-center gap-2 bg-card/40 backdrop-blur-sm p-4 rounded-2xl">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <h3 className="text-sm font-semibold">Fair Split</h3>
          </div>
        </div>
      </div>
    </div>
  );
}
