import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Game, Item, Participant, ItemAssignment } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo } from "react";
import ItemCard from "@/components/item-card";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Clock, Link as LinkIcon, Trophy, UserPlus, Users2 } from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface PriceAgreement {
  itemId: number;
  participantId: number;
  agreedPrice: number;
}

export default function GamePage() {
  const { id } = useParams();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [previewPrices, setPreviewPrices] = useState<{ [key: number]: number }>({});
  const [currentParticipant, setCurrentParticipant] = useState<Participant | null>(null);
  const [isAddPlayerOpen, setIsAddPlayerOpen] = useState(false);
  const [priceAgreements, setPriceAgreements] = useState<PriceAgreement[]>([]);

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
      const response = await apiRequest("POST", `/api/games/${id}/participants`, {
        name,
        email,
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/games/${id}/participants`] });
      setCurrentParticipant(data);
      setIsAddPlayerOpen(false);
      setName("");
      setEmail("");
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
      setPreviewPrices({});
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

  const agreeToPrices = useMutation({
    mutationFn: async () => {
      // Record agreement for all current prices for the current participant
      const agreements = items?.map(item => ({
        itemId: item.id,
        participantId: currentParticipant!.id,
        agreedPrice: Number(item.currentPrice)
      }));
      
      // In a real app, you'd want to store these agreements in the backend
      setPriceAgreements(prev => {
        // Remove previous agreements by this participant
        const filtered = prev.filter(a => a.participantId !== currentParticipant!.id);
        return [...filtered, ...(agreements || [])];
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "You have agreed to the current prices" });
    }
  });

  const calculatePriceChanges = (itemId: number, newPrice: number) => {
    if (!items) return;
    
    const updatedItem = items.find(item => item.id === itemId);
    if (!updatedItem) return;

    const priceDiff = newPrice - Number(updatedItem.currentPrice);
    const otherItems = items.filter(item => item.id !== itemId);
    const priceReducePerItem = priceDiff / otherItems.length;

    const newPrices = {
      [itemId]: newPrice,
      ...Object.fromEntries(
        otherItems.map(item => [
          item.id,
          Number(item.currentPrice) - priceReducePerItem
        ])
      )
    };

    setPreviewPrices(newPrices);
  };

  // Calculate if the game is resolved (all players have agreed to current prices)
  const isGameResolved = useMemo(() => {
    if (!items || !participants || !assignments || !priceAgreements) return false;
    
    // Check if all items have assignments
    const allItemsAssigned = items.every(item => 
      assignments.some(a => a.itemId === item.id)
    );

    // Check if total price matches
    const totalBidPrice = items.reduce((sum, item) => sum + Number(item.currentPrice), 0);
    const priceMatches = Math.abs(totalBidPrice - Number(game?.totalPrice)) < 0.01;

    // Check if all participants have agreed to current prices
    const allPricesAgreed = participants.every(participant => {
      const participantAgreements = priceAgreements.filter(a => a.participantId === participant.id);
      return items.every(item => {
        const agreement = participantAgreements.find(a => a.itemId === item.id);
        return agreement && agreement.agreedPrice === Number(item.currentPrice);
      });
    });

    return allItemsAssigned && priceMatches && allPricesAgreed;
  }, [items, participants, assignments, game, priceAgreements]);

  // Get if current participant has agreed to current prices
  const hasAgreedToPrices = useMemo(() => {
    if (!currentParticipant || !items) return false;

    const participantAgreements = priceAgreements.filter(
      a => a.participantId === currentParticipant.id
    );

    return items.every(item => {
      const agreement = participantAgreements.find(a => a.itemId === item.id);
      return agreement && agreement.agreedPrice === Number(item.currentPrice);
    });
  }, [currentParticipant, items, priceAgreements]);

  // Get all bids for an item
  const getItemBids = (itemId: number): { userId: number; userName: string; price: number }[] => {
    if (!participants || !assignments) return [];

    const itemAssignments = assignments.filter(a => a.itemId === itemId);
    return itemAssignments.map(assignment => ({
      userId: assignment.participantId,
      userName: getParticipantName(assignment.participantId),
      price: Number(items?.find(i => i.id === itemId)?.currentPrice || 0)
    }));
  };

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
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex justify-between items-center">
          <Link href="/">
            <Button variant="ghost">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(gameLink);
              toast({ description: "Link copied to clipboard" });
            }}
          >
            <LinkIcon className="h-4 w-4 mr-2" />
            Share Game
          </Button>
        </div>

        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-2">{game.title}</h1>
                <div className="flex items-center gap-4">
                  <p className="text-lg font-medium">
                    Total: ${Number(game.totalPrice).toFixed(2)}
                  </p>
                  {isGameResolved && (
                    <div className="flex items-center gap-2 text-green-600">
                      <Trophy className="h-5 w-5" />
                      <span className="font-medium">Game Resolved!</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="text-sm text-right">
                <div className="flex items-center justify-end mb-1">
                  <Clock className="h-4 w-4 mr-1" />
                  Last active {timeUntilExpiry}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(gameLink);
                    toast({ description: "Link copied to clipboard" });
                  }}
                >
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Share Game
                </Button>
              </div>
            </div>

            {!isGameResolved && (
              <div className="mt-4 space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Progress to resolution</span>
                    <span className="text-muted-foreground">
                      {assignments?.length || 0} of {items?.length || 0} items assigned
                    </span>
                  </div>
                  <Progress 
                    value={((assignments?.length || 0) / (items?.length || 1)) * 100} 
                    className="h-2"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    Players who agreed to current prices:
                    <div className="text-muted-foreground">
                      {participants?.map(p => (
                        <div key={p.id} className="flex items-center gap-2">
                          <span>{p.name}:</span>
                          {priceAgreements.some(a => 
                            a.participantId === p.id && 
                            items?.every(item => 
                              priceAgreements.find(agreement => 
                                agreement.participantId === p.id && 
                                agreement.itemId === item.id && 
                                agreement.agreedPrice === Number(item.currentPrice)
                              )
                            )
                          ) ? (
                            <span className="text-green-600">✓ Agreed</span>
                          ) : (
                            <span className="text-yellow-600">Pending</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  {currentParticipant && !hasAgreedToPrices && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => agreeToPrices.mutate()}
                    >
                      Agree to Current Prices
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users2 className="h-5 w-5" />
                <h2 className="text-lg font-medium">Players</h2>
              </div>
              <Dialog open={isAddPlayerOpen} onOpenChange={setIsAddPlayerOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Player
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Player</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <Input
                      placeholder="Player Name"
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
                      Add Player
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Playing as
                </label>
                <Select
                  value={currentParticipant?.id?.toString() || ""}
                  onValueChange={(value) => {
                    const participant = participants?.find(p => p.id === parseInt(value));
                    setCurrentParticipant(participant || null);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select player" />
                  </SelectTrigger>
                  <SelectContent>
                    {participants?.map((participant) => (
                      <SelectItem 
                        key={participant.id} 
                        value={participant.id.toString()}
                      >
                        {participant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Other Players
                </label>
                <div className="text-sm space-y-1 border rounded-md p-2 min-h-[38px]">
                  {participants
                    ?.filter(p => p.id !== currentParticipant?.id)
                    .map((participant) => (
                      <div key={participant.id} className="flex items-center gap-2 p-1">
                        <span className="truncate">{participant.name}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item.id}>
              <ItemCard
                item={item}
                items={items}
                onPriceChange={(price) => {
                  calculatePriceChanges(item.id, price);
                }}
                isEditing={editingItemId === item.id}
                onStartEdit={() => {
                  if (!currentParticipant) {
                    toast({
                      title: "Error",
                      description: "You must join the game to place bids",
                      variant: "destructive"
                    });
                    return;
                  }
                  setEditingItemId(item.id);
                  setPreviewPrices({});
                }}
                onCancelEdit={() => {
                  setEditingItemId(null);
                  setPreviewPrices({});
                }}
                previewPrices={previewPrices}
                currentUser={currentParticipant ? {
                  id: currentParticipant.id,
                  name: currentParticipant.name
                } : { id: 0, name: "" }}
                bids={getItemBids(item.id)}
              />
            </div>
          ))}
        </div>

        {Object.keys(previewPrices).length > 0 && (
          <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2">
            <Card className="shadow-lg">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <Button
                    onClick={() => {
                      const updates = Object.entries(previewPrices).map(
                        ([itemId, price]) => ({
                          itemId: parseInt(itemId),
                          price,
                        })
                      );
                      updates.forEach((update) => updatePrice.mutate(update));
                      
                      // Create assignment for the current user
                      if (currentParticipant && editingItemId) {
                        assignItem.mutate({
                          itemId: editingItemId,
                          participantId: currentParticipant.id
                        });
                      }
                    }}
                  >
                    Confirm Bid
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingItemId(null);
                      setPreviewPrices({});
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}