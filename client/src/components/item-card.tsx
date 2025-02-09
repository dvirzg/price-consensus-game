import { Card, CardContent } from "@/components/ui/card";
import { Item } from "@shared/schema";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useState } from "react";
import { ChevronUp, ChevronDown, X, Crown, Users } from "lucide-react";

interface ItemCardProps {
  item: Item;
  items: Item[];
  onPriceChange: (price: number) => void;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  previewPrices: { [key: number]: number };
  currentUser: { id: number; name: string };
  bids: { userId: number; userName: string; price: number; needsConfirmation: boolean }[];
  currentUserBid: { itemId: number; participantId: number; price: number; timestamp: number; needsConfirmation: boolean } | null;
  highestBid: { userId: number; userName: string; price: number; needsConfirmation: boolean } | null;
}

export default function ItemCard({
  item,
  items,
  onPriceChange,
  isEditing,
  onStartEdit,
  onCancelEdit,
  previewPrices,
  currentUser,
  bids,
  currentUserBid,
  highestBid
}: ItemCardProps) {
  const [localPreviewPrice, setLocalPreviewPrice] = useState<number>(Number(item.currentPrice));
  const [manualPrice, setManualPrice] = useState<string>("");
  const [showImageModal, setShowImageModal] = useState(false);
  const [showAllBids, setShowAllBids] = useState(false);
  const [direction, setDirection] = useState<"up" | "down" | null>(null);
  
  const priceSteps = [1, 5, 10, 50];
  const displayPrice = previewPrices?.[item.id] ?? Number(item.currentPrice);
  const isPriceChanged = displayPrice !== Number(item.currentPrice);
  const priceChange = displayPrice - Number(item.currentPrice);

  // Sort bids by price in descending order
  const sortedBids = [...bids].sort((a, b) => b.price - a.price);

  const handlePriceStep = (amount: number) => {
    const step = direction === "up" ? amount : -amount;
    const newPrice = Number(item.currentPrice) + step;
    if (newPrice >= 0) {
      setLocalPreviewPrice(newPrice);
      onPriceChange(newPrice);
    }
  };

  const handleManualPriceChange = (value: string) => {
    setManualPrice(value);
    const numericPrice = parseFloat(value);
    if (!isNaN(numericPrice) && numericPrice >= 0) {
      const step = direction === "up" ? numericPrice : -numericPrice;
      const newPrice = Number(item.currentPrice) + step;
      if (newPrice >= 0) {
        setLocalPreviewPrice(newPrice);
        onPriceChange(newPrice);
      }
    }
  };

  const handleCancelEdit = () => {
    setManualPrice("");
    setDirection(null);
    onCancelEdit();
  };

  const handleStartEdit = () => {
    setManualPrice("");
    onStartEdit();
  };

  return (
    <Card className="overflow-hidden bg-card border-border shadow-lg">
      <div className="relative aspect-[4/3]">
        <img
          src={item.imageData}
          alt={item.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-6">
          <div className="text-white">
            <h3 className="font-semibold text-2xl mb-2">{item.title}</h3>
            <div className="flex items-center gap-3">
              <span className="font-medium text-xl">${Number(item.currentPrice).toFixed(2)}</span>
              {previewPrices[item.id] && (
                <span className="text-lg opacity-80">
                  → ${previewPrices[item.id].toFixed(2)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 border-t border-border">
        {isEditing ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="grid grid-cols-2 gap-2 flex-1">
                  <Button
                    size="lg"
                    variant={direction === "up" ? "default" : "outline"}
                    className={direction === "up" 
                      ? "w-full bg-green-600 hover:bg-green-700 h-11" 
                      : "w-full text-green-600 hover:text-green-700 hover:border-green-600 h-11"}
                    onClick={() => setDirection("up")}
                  >
                    <ChevronUp className="h-4 w-4 mr-2" />
                    Increase
                  </Button>
                  <Button
                    size="lg"
                    variant={direction === "down" ? "default" : "outline"}
                    className={direction === "down" 
                      ? "w-full bg-red-600 hover:bg-red-700 h-11" 
                      : "w-full text-red-600 hover:text-red-700 hover:border-red-600 h-11"}
                    onClick={() => setDirection("down")}
                  >
                    <ChevronDown className="h-4 w-4 mr-2" />
                    Decrease
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 shrink-0"
                  onClick={handleCancelEdit}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {direction && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {[5, 10, 50, 100].map((amount) => (
                      <Button
                        key={amount}
                        variant="outline"
                        size="lg"
                        className="w-full h-11"
                        onClick={() => handlePriceStep(amount)}
                      >
                        {direction === "up" ? "+" : "-"}${amount}
                      </Button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type="number"
                        placeholder="Enter amount"
                        value={manualPrice}
                        onChange={(e) => handleManualPriceChange(e.target.value)}
                        className="h-11 pr-6 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        step="0.01"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        $
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {currentUserBid?.needsConfirmation && (
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                <p className="text-base text-yellow-500">
                  Price has increased. Please confirm your interest at the new price.
                </p>
                <div className="mt-3">
                  <Button
                    size="lg"
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-white h-12"
                    onClick={() => onPriceChange(Number(item.currentPrice))}
                  >
                    Confirm
                  </Button>
                </div>
              </div>
            )}
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-base font-medium text-foreground">Current Bids</span>
                {!currentUserBid && (
                  <Button
                    variant="outline"
                    size="lg"
                    className="hover:bg-accent h-11 px-6"
                    onClick={() => onStartEdit()}
                  >
                    Place Bid
                  </Button>
                )}
              </div>
              
              <div className="space-y-2">
                {bids.length > 0 ? (
                  bids.map((bid) => (
                    <div
                      key={bid.userId}
                      className="flex justify-between items-center p-3 rounded-xl bg-accent/50 text-base"
                    >
                      <span className="font-medium text-foreground">{bid.userName}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          ${bid.price.toFixed(2)}
                        </span>
                        {bid.needsConfirmation && (
                          <span className="text-yellow-500 text-sm">
                            (needs confirmation)
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-base text-muted-foreground py-2">No bids yet</p>
                )}
              </div>
            </div>

            {currentUserBid && !currentUserBid.needsConfirmation && (
              <Button
                variant="outline"
                size="lg"
                className="w-full hover:bg-accent h-12 text-base"
                onClick={() => onStartEdit()}
              >
                Update Bid
              </Button>
            )}
          </div>
        )}
      </div>

      <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
        <DialogContent className="max-w-3xl w-full p-0">
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 z-10"
              onClick={() => setShowImageModal(false)}
            >
              <X className="h-4 w-4" />
            </Button>
            <img
              src={item.imageData}
              alt={item.title}
              className="w-full h-auto max-h-[80vh] object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}