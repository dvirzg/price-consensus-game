import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Game, Item, Participant, ItemAssignment } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import ItemCard from "@/components/item-card";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Clock, Link as LinkIcon } from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";

export default function GamePage() {
  const { id } = useParams();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [editingItemId, setEditingItemId] = useState<number | null>(null);

  const { data: game, error: gameError } = useQuery<Game>({
    queryKey: [`/api/games/${id}`],
    retry: false,
  });

  const { data: items, error: itemsError } = useQuery<Item[]>({
    queryKey: [`/api/games/${id}/items`],
    retry: false,
  });

  const { data: participants } = useQuery<Participant[]>({
    queryKey: [`/api/games/${id}/participants`],
  });

  const { data: assignments } = useQuery<ItemAssignment[]>({
    queryKey: [`/api/games/${id}/assignments`],
  });

  const joinGame = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/games/${id}/participants`, {
        name,
        email,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/games/${id}/participants`] });
      toast({ title: "Success", description: "Joined game successfully" });
    },
  });

  const updatePrice = useMutation({
    mutationFn: async ({ itemId, price }: { itemId: number; price: number }) => {
      await apiRequest("PATCH", `/api/items/${itemId}/price`, { price });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/games/${id}/items`] });
      setEditingItemId(null);
    },
  });

  const assignItem = useMutation({
    mutationFn: async ({ itemId, participantId }: { itemId: number; participantId: number }) => {
      await apiRequest("POST", `/api/games/${id}/assignments`, {
        itemId,
        participantId,
        gameId: Number(id),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/games/${id}/assignments`] });
    },
  });

  // Handle API errors
  if (gameError || itemsError) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-md mx-auto">
          <Card>
            <CardContent className="p-8">
              <div className="text-center text-destructive">
                <p className="font-medium">Error loading game</p>
                <p className="text-sm mt-2">
                  {gameError?.message || itemsError?.message || "Please try again"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show loading state
  if (!game || !items) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-md mx-auto">
          <Card>
            <CardContent className="p-8">
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
              <p className="text-center mt-4">Loading game...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const gameLink = `${window.location.origin}/game/${id}`;
  const lastActive = new Date(game.lastActive);
  const timeUntilExpiry = formatDistanceToNow(lastActive, { addSuffix: true });

  const getItemAssignments = (itemId: number) => {
    return assignments?.filter(a => a.itemId === itemId) || [];
  };

  const getParticipantName = (participantId: number) => {
    return participants?.find(p => p.id === participantId)?.name || "Unknown";
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
      <div className="max-w-3xl mx-auto space-y-4">
        <Link href="/">
          <Button variant="ghost">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </Link>

        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium">Game ID: {id}</div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => {
                  navigator.clipboard.writeText(gameLink);
                  toast({ description: "Link copied to clipboard" });
                }}
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                Copy Link
              </Button>
            </div>
            <div className="text-sm text-muted-foreground flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              Last active {timeUntilExpiry}
              <span className="mx-2">•</span>
              Expires after 48h of inactivity or 12h after resolution
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{game.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-medium mb-4">
              Total: ${Number(game.totalPrice).toFixed(2)}
            </div>
            <div className="space-y-8">
              {items.map((item) => (
                <div key={item.id} className="space-y-2">
                  <ItemCard
                    item={item}
                    items={items}
                    onPriceChange={(price) => {
                      const oldPrice = Number(item.currentPrice);
                      const priceDiff = price - oldPrice;
                      const otherItems = items.filter((i) => i.id !== item.id);
                      const priceReducePerItem = priceDiff / otherItems.length;

                      updatePrice.mutate({ itemId: item.id, price });
                      otherItems.forEach((otherItem) => {
                        updatePrice.mutate({
                          itemId: otherItem.id,
                          price: Number(otherItem.currentPrice) - priceReducePerItem,
                        });
                      });
                    }}
                    isEditing={editingItemId === item.id}
                    onStartEdit={() => setEditingItemId(item.id)}
                    onCancelEdit={() => setEditingItemId(null)}
                  />
                  <div className="ml-4">
                    <h4 className="text-sm font-medium mb-1">Assigned Users:</h4>
                    <div className="space-y-1">
                      {getItemAssignments(item.id).map((assignment) => (
                        <div key={assignment.id} className="text-sm">
                          {getParticipantName(assignment.participantId)}
                        </div>
                      ))}
                      {getItemAssignments(item.id).length === 0 && (
                        <div className="text-sm text-muted-foreground">No assignments yet</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}