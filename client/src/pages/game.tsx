import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Game as GameBase, Item, Participant, ItemAssignment } from "@shared/schema";
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

// Extend the Game type to include creatorId
interface Game extends GameBase {
  creatorId: number;
}

interface ItemInterest {
  itemId: number;
  participantId: number;
  price: number;
  timestamp: number;
  needsConfirmation: boolean;
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
  const [itemInterests, setItemInterests] = useState<ItemInterest[]>([]);

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
      
      if (currentParticipant) {
        setItemInterests(prev => {
          const newInterests = [...prev];
          
          // 1. Remove any previous interest by this participant for this specific item
          const filteredInterests = newInterests.filter(interest => 
            !(interest.itemId === itemId && interest.participantId === currentParticipant.id)
          );
          
          // 2. Add new confirmed interest ONLY for the item being bid on
          filteredInterests.push({
            itemId,
            participantId: currentParticipant.id,
            price,
            timestamp: Date.now(),
            needsConfirmation: false
          });

          // 3. For other items with changed prices, ONLY update confirmation status of OTHER players' existing interests
          Object.entries(previewPrices).forEach(([affectedItemId, newPrice]) => {
            const numericItemId = parseInt(affectedItemId);
            if (numericItemId !== itemId) {  // Skip the item being bid on
              filteredInterests.forEach((interest, index) => {
                if (interest.itemId === numericItemId && interest.participantId !== currentParticipant.id) {
                  // Only update other players' interests
                  const needsNewConfirmation = newPrice > interest.price;
                  filteredInterests[index] = {
                    ...interest,
                    needsConfirmation: needsNewConfirmation
                  };
                }
              });
            }
          });

          return filteredInterests;
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/games/${id}/items`] });
      setEditingItemId(null);
      setPreviewPrices({});
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Confirm interest in an item at its current price
  const confirmInterest = useMutation({
    mutationFn: async ({ itemId }: { itemId: number }) => {
      if (!currentParticipant || !items) return;
      
      const item = items.find(i => i.id === itemId);
      if (!item) return;

      setItemInterests(prev => {
        const newInterests = [...prev];
        const existingInterestIndex = newInterests.findIndex(
          interest => interest.itemId === itemId && interest.participantId === currentParticipant.id
        );
        
        if (existingInterestIndex >= 0) {
          newInterests[existingInterestIndex] = {
            ...newInterests[existingInterestIndex],
            price: Number(item.currentPrice),  // Update the confirmed price
            timestamp: Date.now(),
            needsConfirmation: false
          };
        } else {
          // If no existing interest, create a new one
          newInterests.push({
            itemId,
            participantId: currentParticipant.id,
            price: Number(item.currentPrice),
            timestamp: Date.now(),
            needsConfirmation: false
          });
        }

        return newInterests;
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Interest confirmed at new price" });
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

  // Get all interests for an item
  const getItemBids = (itemId: number): { userId: number; userName: string; price: number; needsConfirmation: boolean }[] => {
    if (!participants) return [];

    return itemInterests
      .filter(interest => interest.itemId === itemId)
      .map(interest => ({
        userId: interest.participantId,
        userName: getParticipantName(interest.participantId),
        price: interest.price,
        needsConfirmation: interest.needsConfirmation
      }));
  };

  // Calculate if the game is resolved
  const isGameResolved = useMemo(() => {
    if (!items || !participants) return false;
    
    // Check if we have more participants than items
    if (participants.length > items.length) {
      return false;
    }

    // Check if total price matches
    const totalBidPrice = items.reduce((sum, item) => sum + Number(item.currentPrice), 0);
    const priceMatches = Math.abs(totalBidPrice - Number(game?.totalPrice)) < 0.01;

    // Get current interests at current prices
    const currentInterests = items.map(item => {
      const itemPrice = Number(item.currentPrice);
      return itemInterests.filter(interest => 
        interest.itemId === item.id && 
        !interest.needsConfirmation &&
        itemPrice <= interest.price  // Interest is valid if current price is less than or equal to confirmed price
      );
    });

    // Check if each item has at most one valid interest
    const noConflictingInterests = currentInterests.every(interests => interests.length <= 1);

    // Check if all items have exactly one valid interest
    const allItemsHaveInterest = currentInterests.every(interests => interests.length === 1);

    // Check if there are no interests needing confirmation
    const noUnconfirmedInterests = !itemInterests.some(interest => interest.needsConfirmation);

    // Each participant must have at least one valid interest
    const allParticipantsHaveItems = participants.every(participant => 
      itemInterests.some(interest => 
        interest.participantId === participant.id && 
        !interest.needsConfirmation &&
        Number(items.find(item => item.id === interest.itemId)?.currentPrice || 0) <= interest.price
      )
    );

    return priceMatches && noConflictingInterests && allItemsHaveInterest && 
           noUnconfirmedInterests && allParticipantsHaveItems;
  }, [items, participants, itemInterests, game]);

  // Add reset game mutation
  const resetGame = useMutation({
    mutationFn: async () => {
      if (!items || !game) return;
      
      // Reset all item prices to equal distribution of total price
      const equalPrice = Number(game.totalPrice) / items.length;
      
      // Update all items with equal price
      for (const item of items) {
        await apiRequest("PATCH", `/api/items/${item.id}/price`, { 
          price: equalPrice 
        });
      }
      
      // Clear all interests
      setItemInterests([]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/games/${id}/items`] });
      toast({ 
        title: "Success", 
        description: "Game has been reset. All prices have been equalized and interests cleared." 
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to reset game: " + error.message,
        variant: "destructive"
      });
    }
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
                      {items?.filter(item => 
                        itemInterests.some(interest => 
                          interest.itemId === item.id && 
                          Math.abs(interest.price - Number(item.currentPrice)) < 0.01 &&
                          !interest.needsConfirmation
                        )
                      ).length || 0} of {items?.length || 0} items have confirmed buyers
                    </span>
                  </div>
                  <Progress 
                    value={((items?.filter(item => 
                      itemInterests.some(interest => 
                        interest.itemId === item.id && 
                        Math.abs(interest.price - Number(item.currentPrice)) < 0.01 &&
                        !interest.needsConfirmation
                      )
                    ).length || 0) / (items?.length || 1)) * 100} 
                    className="h-2"
                  />
                </div>

                <div className="text-sm space-y-2">
                  <div className="font-medium">Current Item Interests:</div>
                  <div className="text-muted-foreground">
                    {items?.map(item => (
                      <div key={item.id} className="flex items-center justify-between">
                        <span>{item.title}:</span>
                        <div className="flex items-center gap-2">
                          {itemInterests
                            .filter(interest => 
                              interest.itemId === item.id && 
                              Math.abs(interest.price - Number(item.currentPrice)) < 0.01
                            )
                            .map(interest => (
                              <div key={interest.participantId} className="flex items-center gap-1">
                                <span>{getParticipantName(interest.participantId)}</span>
                                {interest.needsConfirmation && (
                                  <span className="text-yellow-500">(needs confirmation)</span>
                                )}
                                {interest.participantId === currentParticipant?.id && interest.needsConfirmation && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => confirmInterest.mutate({ itemId: item.id })}
                                  >
                                    Confirm
                                  </Button>
                                )}
                              </div>
                            ))}
                          {!itemInterests.some(interest => 
                            interest.itemId === item.id && 
                            Math.abs(interest.price - Number(item.currentPrice)) < 0.01
                          ) && "No interest"}
                        </div>
                      </div>
                    ))}
                  </div>
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
                    if (participant) {
                      setCurrentParticipant(participant);
                    }
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
                        {participant.name || "Unknown Player"}
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
                        <span className="truncate">{participant.name || "Unknown Player"}</span>
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

        {/* Add debug information */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">
              <p>Debug Info:</p>
              <p>Current Participant ID: {currentParticipant?.id}</p>
              <p>Game Creator ID: {game.creatorId}</p>
              <p>Is Creator: {currentParticipant?.id === game.creatorId ? 'Yes' : 'No'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Add Reset Game section at the bottom */}
        {currentParticipant?.id === game.creatorId && (
          <Card className="mt-8 border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Game Controls</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  As the game creator, you have access to additional controls. Please use these carefully.
                </p>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => {
                    if (window.confirm("Are you sure you want to reset the game? This will clear all bids and reset prices to equal distribution.")) {
                      resetGame.mutate();
                    }
                  }}
                >
                  Reset Game
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}