import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Plus, LogIn, DollarSign, Users2, Target, ArrowRight } from "lucide-react";

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
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto space-y-6 py-8 px-4">
        <div className="text-center space-y-4 mb-8">
          <h1 className="text-4xl font-bold">Price Consensus Game</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A collaborative game where players work together to fairly distribute items within a fixed budget
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                How It Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm font-medium text-primary">1</span>
                  </div>
                  <p className="text-card-foreground">Create a game by uploading items and setting a total budget</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm font-medium text-primary">2</span>
                  </div>
                  <p className="text-card-foreground">Invite friends to join and bid on items they're interested in</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm font-medium text-primary">3</span>
                  </div>
                  <p className="text-card-foreground">Adjust prices collaboratively until everyone is satisfied</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm font-medium text-primary">4</span>
                  </div>
                  <p className="text-card-foreground">Game resolves when each item is assigned and prices match the budget</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Key Features
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="flex items-center gap-3">
                  <Users2 className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="font-medium text-card-foreground">Collaborative</h3>
                    <p className="text-sm text-muted-foreground">Work together to find fair prices</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="font-medium text-card-foreground">Fair Distribution</h3>
                    <p className="text-sm text-muted-foreground">Ensures everyone gets what they value most</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="font-medium text-card-foreground">Real-time Updates</h3>
                    <p className="text-sm text-muted-foreground">See price changes and bids instantly</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              Ready to Start?
            </CardTitle>
            <CardDescription className="text-center">
              Create a new game or join an existing one
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Link href="/create">
              <Button className="w-full h-12 text-lg bg-primary hover:bg-primary/90" size="lg">
                <Plus className="mr-2 h-5 w-5" />
                Create New Game
              </Button>
            </Link>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  or join existing
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Enter Game ID"
                value={gameId}
                onChange={(e) => setGameId(e.target.value)}
                className="h-12 text-lg bg-background"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleJoinGame();
                  }
                }}
              />
              <Button
                onClick={handleJoinGame}
                variant="outline"
                className="h-12 px-8 hover:bg-accent"
              >
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
