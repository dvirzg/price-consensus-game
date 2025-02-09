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
  previewPrices?: { [key: number]: number };
  currentUser: { id: number; name: string };
  bids: { userId: number; userName: string; price: number }[];
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
  bids
}: ItemCardProps) {
  const [localPreviewPrice, setLocalPreviewPrice] = useState<number>(Number(item.currentPrice));
  const [manualPrice, setManualPrice] = useState<string>("");
  const [showImageModal, setShowImageModal] = useState(false);
  const [showAllBids, setShowAllBids] = useState(false);
  
  const priceSteps = [1, 5, 10, 50];
  const displayPrice = previewPrices?.[item.id] ?? Number(item.currentPrice);
  const isPriceChanged = displayPrice !== Number(item.currentPrice);
  const priceChange = displayPrice - Number(item.currentPrice);

  // Sort bids by price in descending order
  const sortedBids = [...bids].sort((a, b) => b.price - a.price);
  const highestBid = sortedBids[0];
  const isCurrentUserHighestBidder = highestBid?.userId === currentUser.id;
  const currentUserBid = bids.find(bid => bid.userId === currentUser.id);

  const handlePriceStep = (step: number) => {
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
      setLocalPreviewPrice(numericPrice);
      onPriceChange(numericPrice);
    }
  };

  return (
    <>
      <Card className={`transition-all duration-200 ${isPriceChanged ? 'ring-2 ring-primary' : ''} ${isCurrentUserHighestBidder ? 'bg-green-50' : ''}`}>
        <CardContent className="p-3">
          <div className="flex gap-3">
            <div 
              className="relative w-20 h-20 cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setShowImageModal(true)}
            >
              <img
                src={item.imageData}
                alt={item.title}
                className="w-20 h-20 object-cover rounded-md flex-shrink-0"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 hover:bg-opacity-20 rounded-md transition-all">
                <span className="text-white opacity-0 hover:opacity-100">View</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-medium text-sm truncate">{item.title}</h3>
                {highestBid && (
                  <div 
                    className="flex items-center gap-1 text-xs cursor-pointer"
                    onClick={() => setShowAllBids(!showAllBids)}
                  >
                    <Users className="h-3 w-3" />
                    <span>{bids.length} bid{bids.length !== 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-semibold ${isPriceChanged ? (priceChange > 0 ? 'text-green-600' : 'text-red-600') : ''}`}>
                    {formatPrice(displayPrice)}
                  </span>
                  {isPriceChanged && (
                    <span className={`text-sm ${priceChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ({priceChange > 0 ? '+' : ''}{formatPrice(priceChange)})
                    </span>
                  )}
                </div>
                {highestBid && (
                  <div className={`flex items-center gap-1 text-sm ${isCurrentUserHighestBidder ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {isCurrentUserHighestBidder && <Crown className="h-3 w-3" />}
                    <span className="truncate">{highestBid.userName}</span>
                  </div>
                )}
              </div>

              {showAllBids && (
                <div className="mb-2 space-y-1 text-sm">
                  {sortedBids.map((bid, index) => (
                    <div key={bid.userId} className="flex items-center justify-between">
                      <span className={`truncate ${bid.userId === currentUser.id ? 'font-medium' : ''}`}>
                        {bid.userName}
                      </span>
                      <span className={index === 0 ? 'text-green-600 font-medium' : ''}>
                        {formatPrice(bid.price)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {isEditing && (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1">
                    {priceSteps.map((step) => (
                      <div key={step} className="flex flex-col gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="px-2 py-0 h-6 text-green-600 hover:text-green-700 hover:border-green-600"
                          onClick={() => handlePriceStep(step)}
                        >
                          <ChevronUp className="h-3 w-3" />
                          ${step}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="px-2 py-0 h-6 text-red-600 hover:text-red-700 hover:border-red-600"
                          onClick={() => handlePriceStep(-step)}
                        >
                          <ChevronDown className="h-3 w-3" />
                          ${step}
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number"
                      placeholder="Enter your bid"
                      value={manualPrice}
                      onChange={(e) => handleManualPriceChange(e.target.value)}
                      className="h-7 text-sm"
                      step="0.01"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => {
                        setManualPrice("");
                        onCancelEdit();
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              {!isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onStartEdit}
                  className="w-full"
                >
                  {currentUserBid ? 'Update Bid' : 'Place Bid'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

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
    </>
  );
}