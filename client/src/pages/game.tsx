import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Game as GameBase, Item, Participant, ItemAssignment, Bid } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
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
import ReactConfetti from 'react-confetti';

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
  const { id, uniqueId } = useParams();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [previewPrices, setPreviewPrices] = useState<{ [key: number]: number }>({});
  const [currentParticipant, setCurrentParticipant] = useState<Participant | null>(null);
  const [isAddPlayerOpen, setIsAddPlayerOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });
  const resultsRef = useRef<HTMLDivElement>(null);

  // Get base URL for GitHub Pages or development
  const baseUrl = import.meta.env.DEV ? '' : '/price-consensus-game';
  const gameLink = `${window.location.protocol}//${window.location.host}${baseUrl}/#/g/${uniqueId || id}`;

  // Fetch game data using either uniqueId or numeric id
  const { data: game, error: gameError } = useQuery<Game>({
    queryKey: [uniqueId ? `/api/games/by-id/${uniqueId}` : `/api/games/${id}`],
    retry: false,
  });

  // Update other query keys to use game.id once we have it
  const gameId = game?.id;

  const { data: items, error: itemsError } = useQuery<Item[]>({
    queryKey: [`/api/games/${gameId}/items`],
    enabled: !!gameId,
  });

  const { data: participants } = useQuery<Participant[]>({
    queryKey: [`/api/games/${gameId}/participants`],
    enabled: !!gameId,
  });

  const { data: assignments } = useQuery<ItemAssignment[]>({
    queryKey: [`/api/games/${gameId}/assignments`],
    enabled: !!gameId,
  });

  const { data: bids = [] } = useQuery<Bid[]>({
    queryKey: [`/api/games/${gameId}/bids`],
    enabled: !!gameId,
  });

  // Convert server bid to client bid format
  const convertBidToInterest = (bid: Bid): ItemInterest => {
    let timestamp: number;
    try {
      if (typeof bid.timestamp === 'string') {
        timestamp = new Date(bid.timestamp).getTime();
      } else if (bid.timestamp instanceof Date) {
        timestamp = bid.timestamp.getTime();
      } else {
        // Fallback to current timestamp if invalid
        console.warn('Invalid timestamp format:', bid.timestamp);
        timestamp = Date.now();
      }
    } catch (error) {
      console.error('Error converting timestamp:', error);
      timestamp = Date.now();
    }

    return {
      itemId: bid.itemId,
      participantId: bid.participantId,
      price: Number(bid.price),
      timestamp,
      needsConfirmation: bid.needsConfirmation,
    };
  };

  const joinGame = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/games/${gameId}/participants`, {
        name,
        email,
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/games/${gameId}/participants`] });
      setCurrentParticipant(data);
      setIsAddPlayerOpen(false);
      setName("");
      setEmail("");
      toast({ title: "Success", description: "Joined game successfully" });
    },
  });

  const createBid = useMutation({
    mutationFn: async (newBid: { itemId: number; price: number; needsConfirmation: boolean }) => {
      if (!currentParticipant || !gameId) return;
      
      const response = await apiRequest("POST", `/api/games/${gameId}/bids`, {
        ...newBid,
        participantId: currentParticipant.id,
        price: newBid.price.toString(),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/games/${gameId}/bids`] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const updateBid = useMutation({
    mutationFn: async ({ bidId, price, needsConfirmation }: { bidId: number; price: number; needsConfirmation: boolean }) => {
      await apiRequest("PATCH", `/api/bids/${bidId}`, { 
        price: price.toString(),
        needsConfirmation 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/games/${gameId}/bids`] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Store current participant in localStorage to persist across refreshes
  useEffect(() => {
    if (!participants) return;
    
    try {
      const storedParticipant = localStorage.getItem('currentParticipant');
      if (storedParticipant) {
        const parsed = JSON.parse(storedParticipant);
        const found = participants.find(p => p.id === parsed.id);
        if (found) {
          setCurrentParticipant(found);
        } else {
          // If participant not found, clear storage
          localStorage.removeItem('currentParticipant');
          setCurrentParticipant(null);
        }
      }
    } catch (error) {
      console.error('Error loading participant from storage:', error);
      localStorage.removeItem('currentParticipant');
      setCurrentParticipant(null);
    }
  }, [participants]);

  // Update localStorage when participant changes
  useEffect(() => {
    try {
      if (currentParticipant) {
        localStorage.setItem('currentParticipant', JSON.stringify(currentParticipant));
      } else {
        localStorage.removeItem('currentParticipant');
      }
    } catch (error) {
      console.error('Error saving participant to storage:', error);
    }
  }, [currentParticipant]);

  // Handle participant selection
  const handleParticipantSelect = (participant: Participant) => {
    try {
      setCurrentParticipant(participant);
      localStorage.setItem('currentParticipant', JSON.stringify(participant));
    } catch (error) {
      console.error('Error setting participant:', error);
      toast({
        title: "Error",
        description: "Failed to select participant",
        variant: "destructive"
      });
    }
  };

  const updatePrice = useMutation({
    mutationFn: async ({ itemId, price, isMainBid = false }: { itemId: number; price: number; isMainBid?: boolean }) => {
      try {
        // Convert price to number explicitly
        const numericPrice = Number(price);
        if (isNaN(numericPrice)) {
          throw new Error("Invalid price value");
        }

        // First update the item's price
        await apiRequest("PATCH", `/api/items/${itemId}/price`, { price: numericPrice });
        
        if (currentParticipant && isMainBid) {
          // Get all bids for this item
          const itemBids = bids.filter(bid => bid.itemId === itemId);
          
          // Update or create the current participant's bid
          const existingBid = itemBids.find(bid => bid.participantId === currentParticipant.id);
          if (existingBid) {
            await updateBid.mutateAsync({
              bidId: existingBid.id,
              price: numericPrice,
              needsConfirmation: false
            });
          } else {
            await createBid.mutateAsync({
              itemId,
              price: numericPrice,
              needsConfirmation: false
            });
          }

          // Handle other participants' bids
          const otherBids = itemBids.filter(bid => bid.participantId !== currentParticipant.id);
          for (const bid of otherBids) {
            const bidPrice = Number(bid.price);
            // If the new price is higher than their bid, they need to confirm
            if (numericPrice > bidPrice) {
              await updateBid.mutateAsync({
                bidId: bid.id,
                price: bidPrice, // Keep their original bid price
                needsConfirmation: true
              });
            }
          }
        }
      } catch (error) {
        console.error('Error updating price:', error);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate queries in sequence to ensure proper state updates
      queryClient.invalidateQueries({ queryKey: [`/api/games/${gameId}/items`] });
      queryClient.invalidateQueries({ queryKey: [`/api/games/${gameId}/bids`] });
      setEditingItemId(null);
      setPreviewPrices({});
    },
    onError: (error) => {
      console.error('Error in updatePrice mutation:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update price",
        variant: "destructive"
      });
      setEditingItemId(null);
      setPreviewPrices({});
    }
  });

  const confirmInterest = useMutation({
    mutationFn: async ({ itemId }: { itemId: number }) => {
      if (!currentParticipant || !items) return;
      
      const item = items.find(i => i.id === itemId);
      if (!item) return;

      const existingBid = bids.find(bid => 
        bid.itemId === itemId && 
        bid.participantId === currentParticipant.id
      );

      if (existingBid) {
        await updateBid.mutateAsync({
          bidId: existingBid.id,
          price: Number(item.currentPrice),
          needsConfirmation: false
        });
      } else {
        await createBid.mutateAsync({
        itemId,
          price: Number(item.currentPrice),
          needsConfirmation: false
        });
      }
    },
    onSuccess: () => {
      // Invalidate queries in sequence
      queryClient.invalidateQueries({ queryKey: [`/api/games/${gameId}/bids`] });
      toast({ title: "Success", description: "Interest confirmed at new price" });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
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

    return bids
      .filter(bid => bid.itemId === itemId)
      .map(bid => ({
        userId: bid.participantId,
        userName: getParticipantName(bid.participantId),
        price: Number(bid.price),
        needsConfirmation: bid.needsConfirmation
      }));
  };

  // Calculate if the game is resolved
  const isGameResolved = useMemo(() => {
    if (!items || !participants || !game) return false;
    
    // Game can only be resolved if number of participants equals number of items
    if (participants.length !== items.length) {
      return false;
    }

    // Check if total price matches
    const totalBidPrice = items.reduce((sum, item) => sum + Number(item.currentPrice), 0);
    const priceMatches = Math.abs(totalBidPrice - Number(game.totalPrice)) < 0.01;

    // Get current interests at current prices
    const currentInterests = items.map(item => {
      const itemPrice = Number(item.currentPrice);
      return bids.filter(bid => 
        bid.itemId === item.id && 
        !bid.needsConfirmation &&
        itemPrice <= Number(bid.price)  // Interest is valid if current price is less than or equal to confirmed price
      );
    });

    // Check if each item has exactly one valid interest
    const allItemsHaveOneInterest = currentInterests.every(interests => interests.length === 1);

    // Check if there are no interests needing confirmation
    const noUnconfirmedInterests = !bids.some(bid => bid.needsConfirmation);

    // Each participant must have exactly one valid interest
    const participantItemCounts = participants.map(participant => {
      return bids.filter(bid => 
        bid.participantId === participant.id && 
        !bid.needsConfirmation &&
        Number(items.find(item => item.id === bid.itemId)?.currentPrice || 0) <= Number(bid.price)
      ).length;
    });
    const allParticipantsHaveOneItem = participantItemCounts.every(count => count === 1);

    return priceMatches && allItemsHaveOneInterest && noUnconfirmedInterests && allParticipantsHaveOneItem;
  }, [items, participants, bids, game]);

  // Effect to handle game resolution
  useEffect(() => {
    if (isGameResolved) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 10000); // Stop confetti after 10 seconds
      
      // Update game status to resolved
      const updateStatus = async () => {
        try {
          await apiRequest("PATCH", `/api/games/${gameId}/status`, { status: "resolved" });
          // Invalidate game data to refresh the UI
          queryClient.invalidateQueries({ queryKey: [uniqueId ? `/api/games/by-id/${uniqueId}` : `/api/games/${id}`] });
        } catch (error) {
          console.error('Failed to update game status:', error);
          toast({
            title: "Error",
            description: "Failed to update game status",
            variant: "destructive"
          });
        }
      };
      
      updateStatus();
      
      // Scroll to results with a slight delay to ensure DOM is updated
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
      }, 100);
    }
  }, [isGameResolved, gameId, id, uniqueId, queryClient]);

  // Clear bids when game is reset
  const clearStoredBids = useCallback(async () => {
    // Delete all bids for this game
    const gameBids = await queryClient.fetchQuery<Bid[]>({ queryKey: [`/api/games/${gameId}/bids`] });
    for (const bid of gameBids) {
      await apiRequest("DELETE", `/api/bids/${bid.id}`);
    }
    queryClient.invalidateQueries({ queryKey: [`/api/games/${gameId}/bids`] });
  }, [gameId]);

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
      
      // Clear all bids from both state and storage
      await clearStoredBids();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/games/${gameId}/items`] });
      toast({ 
        title: "Success", 
        description: "Game has been reset. All prices have been equalized and bids cleared." 
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
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto">
          <Card>
            <CardContent className="p-8">
              <div className="text-center text-destructive">
                <p className="font-medium">Error loading game</p>
                <p className="text-sm mt-2">
                  {gameError?.message || itemsError?.message || "Please try again"}
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    queryClient.invalidateQueries({ queryKey: [uniqueId ? `/api/games/by-id/${uniqueId}` : `/api/games/${id}`] });
                    queryClient.invalidateQueries({ queryKey: [`/api/games/${gameId}/items`] });
                  }}
                >
                  Retry
                </Button>
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
      <div className="min-h-screen bg-background p-4">
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
    <div className="min-h-screen bg-background p-4">
      {showConfetti && (
        <ReactConfetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={200}
          gravity={0.3}
        />
      )}
      <div className="max-w-7xl mx-auto space-y-4">
        <div ref={resultsRef}>
          <div className="flex justify-between items-center">
        <Link href="/">
              <Button variant="ghost" className="text-foreground hover:bg-accent">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </Link>
          </div>

          <Card className="mb-4 bg-card border-border">
          <CardContent className="p-4">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-foreground mb-2">{game.title}</h1>
                    <div className="flex items-center gap-4">
                      <p className="text-lg font-medium text-foreground">
                        Total: ${Number(game.totalPrice).toFixed(2)}
                      </p>
                      {isGameResolved && (
                        <div className="flex items-center gap-2 text-primary">
                          <Trophy className="h-5 w-5" />
                          <span className="font-medium">Game Resolved!</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
              <Button
                      variant="outline"
                size="sm"
                      className="text-foreground hover:bg-accent"
                onClick={() => {
                  navigator.clipboard.writeText(gameLink);
                  toast({ description: "Link copied to clipboard" });
                }}
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                      Share Game
              </Button>
            <div className="text-sm text-muted-foreground flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              Last active {timeUntilExpiry}
                    </div>
                  </div>
                </div>

                {isGameResolved ? (
                  <div className="mt-4">
                    <div className="text-center mb-6">
                      <h2 className="text-xl font-semibold mb-2 text-foreground">Final Results</h2>
                      <p className="text-muted-foreground">
                        All items have been successfully assigned!
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {items.map(item => {
                        const assignedTo = bids.find(bid => 
                          bid.itemId === item.id && 
                          !bid.needsConfirmation &&
                          Math.abs(Number(item.currentPrice) - Number(bid.price)) < 0.01
                        );

                        if (!assignedTo) return null;

                        const participantName = getParticipantName(assignedTo.participantId);

                        return (
                          <Card key={item.id} className="overflow-hidden">
                            <div className="relative aspect-square">
                              <img
                                src={item.imageData}
                                alt={item.title}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-4">
                                <div className="text-white">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-base">{participantName}</span>
                                    <span className="text-white/80">•</span>
                                    <span className="font-medium">${Number(item.currentPrice).toFixed(2)}</span>
                                  </div>
                                  <h4 className="text-sm text-white/90 truncate">{item.title}</h4>
                                </div>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>

                    <div className="mt-6 space-y-3">
                      {participants?.map(participant => {
                        const totalSpent = items
                          .filter(item => 
                            bids.some(bid => 
                              bid.itemId === item.id && 
                              bid.participantId === participant.id &&
                              !bid.needsConfirmation &&
                              Math.abs(Number(item.currentPrice) - Number(bid.price)) < 0.01
                            )
                          )
                          .reduce((sum, item) => sum + Number(item.currentPrice), 0);

                        if (totalSpent === 0) return null;

                        return (
                          <div key={participant.id} className="flex justify-between items-center px-4 py-2 bg-card rounded-lg border border-border">
                            <span className="font-medium text-foreground">{participant.name}</span>
                            <span className="text-muted-foreground">Total: ${totalSpent.toFixed(2)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-foreground">Progress to resolution</span>
                        <span className="text-muted-foreground">
                          {items?.filter(item => 
                            bids.some(bid => 
                              bid.itemId === item.id && 
                              !bid.needsConfirmation
                            )
                          ).length || 0} of {items?.length || 0} items have confirmed buyers
                        </span>
                      </div>
                      <Progress 
                        value={((items?.filter(item => 
                          bids.some(bid => 
                            bid.itemId === item.id && 
                            !bid.needsConfirmation
                          )
                        ).length || 0) / (items?.length || 1)) * 100} 
                        className="h-2 bg-secondary"
                      />
                    </div>

                    <Card className="bg-card border-border">
                      <CardContent className="p-4">
                        <h3 className="font-medium mb-3 text-foreground">Actions Needed</h3>
                        <div className="space-y-2">
                          {participants?.map(participant => {
                            // Check if participant has any bids
                            const hasBids = bids.some(bid => 
                              bid.participantId === participant.id
                            );

                            // Check if participant has any interests needing confirmation
                            const hasUnconfirmedInterests = bids.some(bid => 
                              bid.participantId === participant.id && 
                              bid.needsConfirmation
                            );

                            // Check if participant has been outbid on any items
                            const outbidItems = items?.filter(item => {
                              const participantBid = bids.find(bid => 
                                bid.itemId === item.id && 
                                bid.participantId === participant.id &&
                                !bid.needsConfirmation
                              );
                              const highestBid = bids
                                .filter(bid => bid.itemId === item.id && !bid.needsConfirmation)
                                .sort((a, b) => Number(b.price) - Number(a.price))[0];
                              
                              return participantBid && highestBid && Number(highestBid.price) > Number(participantBid.price);
                            });

                            // Get items that need confirmation
                            const itemsNeedingConfirmation = items?.filter(item => 
                              bids.some(bid => 
                                bid.participantId === participant.id && 
                                bid.itemId === item.id &&
                                bid.needsConfirmation
                              )
                            );

                            if (!hasBids || hasUnconfirmedInterests || outbidItems?.length > 0) {
                              return (
                                <div key={participant.id} className="flex items-start gap-2 text-sm">
                                  <span className="font-medium text-foreground">{participant.name}</span>
                                  <span className="text-muted-foreground">needs to</span>
                                  <div className="flex-1">
                                    {!hasBids && (
                                      <span className="text-orange-500 dark:text-orange-400">make their first bid</span>
                                    )}
                                    {hasUnconfirmedInterests && (
                                      <div className="text-yellow-500 dark:text-yellow-400">
                                        confirm new prices for:
                                        <ul className="ml-2 list-disc list-inside">
                                          {itemsNeedingConfirmation?.map(item => (
                                            <li key={item.id}>{item.title}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    {outbidItems && outbidItems.length > 0 && (
                                      <div className="text-blue-500 dark:text-blue-400">
                                        increase bid or bid on another item (outbid on: 
                                        <ul className="ml-2 list-disc list-inside">
                                          {outbidItems.map(item => (
                                            <li key={item.id}>{item.title}</li>
                                          ))}
                                        </ul>
                                        )
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          })}
                          {participants?.every(participant => 
                            bids.some(bid => 
                              bid.participantId === participant.id
                            ) &&
                            !bids.some(bid =>
                              bid.participantId === participant.id &&
                              bid.needsConfirmation
                            )
                          ) && !bids.some(bid => bid.needsConfirmation) && 
                          items?.every(item => 
                            bids.some(bid => 
                              bid.itemId === item.id && 
                              !bid.needsConfirmation &&
                              Math.abs(Number(bid.price) - Number(item.currentPrice)) < 0.01
                            )
                          ) && (
                            <div className="text-sm text-muted-foreground">
                              All players have made their bids. Keep adjusting prices until everyone is satisfied!
                            </div>
                          )}
            </div>
          </CardContent>
        </Card>

                    <div className="text-sm space-y-2">
                      <div className="font-medium text-foreground">Current Item Interests:</div>
                      <div className="text-muted-foreground space-y-1">
                        {items?.map(item => (
                          <div key={item.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50">
                            <span className="truncate">{item.title}:</span>
                            <div className="flex items-center gap-2">
                              {bids
                                .filter(bid => 
                                  bid.itemId === item.id && 
                                  !bid.needsConfirmation
                                )
                                .map(bid => (
                                  <div key={bid.participantId} className="flex items-center gap-1">
                                    <span>{getParticipantName(bid.participantId)}</span>
                                    {bid.needsConfirmation && (
                                      <span className="text-yellow-500 dark:text-yellow-400">(needs confirmation)</span>
                                    )}
                                  </div>
                                ))}
                              {!bids.some(bid => 
                                bid.itemId === item.id && 
                                !bid.needsConfirmation
                              ) && "No interest"}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {!isGameResolved && (
          <>
            <Card className="mb-4 bg-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Users2 className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-medium text-foreground">Players</h2>
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

                {!currentParticipant && (
                  <div className="mb-4 p-4 border-2 border-primary/50 rounded-lg bg-primary/5 text-center">
                    <Users2 className="h-12 w-12 text-primary mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-primary mb-2">Select a Player to View and Place Bids</h3>
                    <p className="text-sm text-muted-foreground">
                      You need to select a player from the list below before you can view and place bids on items
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    {currentParticipant ? (
                      <div className="flex items-center gap-2">
                        <span>Currently playing as:</span>
                        <span className="font-semibold text-primary">{currentParticipant.name}</span>
                      </div>
                    ) : (
                      "Select a player to start bidding"
                    )}
                  </div>
                  <div className="space-y-1">
                    {participants?.map((participant) => (
                      <Button
                        key={participant.id}
                        variant={currentParticipant?.id === participant.id ? "default" : "ghost"}
                        className={`w-full justify-start h-9 px-3 ${currentParticipant?.id === participant.id ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
                        onClick={() => handleParticipantSelect(participant)}
                      >
                        <span className="truncate">
                          {participant.name}
                          {currentParticipant?.id === participant.id && (
                            <span className="ml-2 text-xs opacity-90">(Currently Playing)</span>
                          )}
                        </span>
                      </Button>
                    ))}
                  </div>
            </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
              {items.map((item) => {
                const itemBids = getItemBids(item.id);
                const currentUserBid = currentParticipant ? 
                  bids.find(bid => 
                    bid.itemId === item.id && 
                    bid.participantId === currentParticipant.id
                  ) ? convertBidToInterest(bids.find(bid => 
                    bid.itemId === item.id && 
                    bid.participantId === currentParticipant.id
                  )!) : null : null;
                const highestBid = itemBids.reduce((highest, current) => 
                  !highest || Number(current.price) > Number(highest.price) ? current : highest
                , null as { userId: number; userName: string; price: number; needsConfirmation: boolean } | null);

                return (
                  <div key={item.id} className="w-full max-w-2xl mx-auto">
                  <ItemCard
                    item={item}
                    items={items}
                    onPriceChange={(price) => {
                        if (editingItemId === item.id) {
                          calculatePriceChanges(item.id, price);
                        } else {
                          // This is a confirmation of new price
                          confirmInterest.mutate({ itemId: item.id });
                        }
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
                      bids={itemBids}
                      currentUserBid={currentUserBid}
                      highestBid={highestBid}
                    />
                  </div>
                );
              })}
                        </div>

            {Object.keys(previewPrices).length > 0 && (
              <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2">
                <Card className="shadow-lg">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <Button
                        onClick={async () => {
                          if (!editingItemId) return;
                          try {
                            // Update the main bid item first
                            const mainBidPrice = previewPrices[editingItemId];
                            await updatePrice.mutateAsync({ 
                              itemId: editingItemId, 
                              price: mainBidPrice,
                              isMainBid: true
                            });

                            // Then update other items' prices without creating interests
                            const otherUpdates = Object.entries(previewPrices)
                              .filter(([itemId]) => parseInt(itemId) !== editingItemId)
                              .map(([itemId, price]) => ({
                                itemId: parseInt(itemId),
                                price,
                                isMainBid: false
                              }));

                            for (const update of otherUpdates) {
                              await updatePrice.mutateAsync(update);
                            }
                          } catch (error) {
                            console.error('Error submitting bid:', error);
                            toast({
                              title: "Error",
                              description: "Failed to submit bid. Please try again.",
                              variant: "destructive"
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
          </>
        )}

        {/* Add Reset Game section at the bottom */}
        {currentParticipant?.id === game.creatorId && (
          <Card className="mt-8 border-destructive bg-card">
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
                  className="w-full hover:bg-destructive/90"
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