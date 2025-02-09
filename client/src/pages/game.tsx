import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Game, Item, Participant } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import ItemCard from "@/components/item-card";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function GamePage() {
  const { id } = useParams();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const { data: game } = useQuery<Game>({
    queryKey: ["/api/games", id],
  });

  const { data: items } = useQuery<Item[]>({
    queryKey: ["/api/games", id, "items"],
  });

  const { data: participants } = useQuery<Participant[]>({
    queryKey: ["/api/games", id, "participants"],
  });

  const joinGame = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/games/${id}/participants`, {
        name,
        email,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/games", id, "participants"] });
      toast({ title: "Success", description: "Joined game successfully" });
    },
  });

  const updatePrice = useMutation({
    mutationFn: async ({ itemId, price }: { itemId: number; price: number }) => {
      await apiRequest("PATCH", `/api/items/${itemId}/price`, { price });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/games", id, "items"] });
    },
  });

  if (!game || !items) {
    return <div>Loading...</div>;
  }

  const handlePriceChange = (itemId: number, newPrice: number) => {
    const oldPrice = items.find((i) => i.id === itemId)?.currentPrice || 0;
    const priceDiff = newPrice - oldPrice;
    const otherItems = items.filter((i) => i.id !== itemId);
    const priceReducePerItem = priceDiff / otherItems.length;

    // Update all items to maintain total
    updatePrice.mutate({ itemId, price: newPrice });
    otherItems.forEach((item) => {
      updatePrice.mutate({
        itemId: item.id,
        price: item.currentPrice - priceReducePerItem,
      });
    });
  };

  if (!participants?.length) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-md mx-auto space-y-4">
          <Link href="/">
            <Button variant="ghost">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          </Link>

          <Card>
            <CardHeader>
              <CardTitle>Join Game</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Input
                  placeholder="Your Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <Input
                  placeholder="Email (optional)"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Button
                  className="w-full"
                  onClick={() => joinGame.mutate()}
                  disabled={!name}
                >
                  Join Game
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <Link href="/">
          <Button variant="ghost">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>{game.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-medium mb-4">
              Total: ${game.totalPrice}
            </div>
            <div className="space-y-4">
              {items.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onPriceChange={(price) =>
                    handlePriceChange(item.id, price)
                  }
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
