import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Plus, LogIn } from "lucide-react";

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
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              Price Consensus
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/create">
              <Button className="w-full h-12 text-lg" size="lg">
                <Plus className="mr-2 h-5 w-5" />
                Create New Game
              </Button>
            </Link>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-gray-50 px-2 text-muted-foreground">
                  or join existing
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Enter Game ID"
                value={gameId}
                onChange={(e) => setGameId(e.target.value)}
                className="h-12 text-lg"
              />
              <Button
                onClick={handleJoinGame}
                variant="outline"
                className="h-12 px-8"
              >
                <LogIn className="h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
