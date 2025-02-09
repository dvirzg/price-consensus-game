import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Item } from "@shared/schema";
import { formatPrice } from "@/lib/utils";

interface BidControlProps {
  item: Item;
  items: Item[];
  onConfirm: (price: number) => void;
}

export default function BidControl({ item, items, onConfirm }: BidControlProps) {
  const [previewPrice, setPreviewPrice] = useState<number>(Number(item.currentPrice));
  const [showPreview, setShowPreview] = useState(false);

  const increments = [
    { value: 1, label: "+$1" },
    { value: 5, label: "+$5" },
    { value: 10, label: "+$10" },
    { value: 50, label: "+$50" },
  ];

  const decrements = increments.map(inc => ({
    value: -inc.value,
    label: inc.label.replace("+", "-")
  }));

  const calculateOtherPrices = (newPrice: number) => {
    const priceDiff = newPrice - Number(item.currentPrice);
    const otherItems = items.filter(i => i.id !== item.id);
    const priceReducePerItem = priceDiff / otherItems.length;

    return otherItems.map(otherItem => ({
      ...otherItem,
      previewPrice: Number(otherItem.currentPrice) - priceReducePerItem
    }));
  };

  const handleIncrement = (amount: number) => {
    const newPrice = previewPrice + amount;
    setPreviewPrice(newPrice);
    setShowPreview(true);
  };

  const handleConfirm = () => {
    onConfirm(previewPrice);
    setShowPreview(false);
  };

  const handleCancel = () => {
    setPreviewPrice(Number(item.currentPrice));
    setShowPreview(false);
  };

  return (
    <Card className="mt-4">
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="text-sm font-medium">Current Price: {formatPrice(Number(item.currentPrice))}</div>
          
          <div className="flex flex-wrap gap-2">
            {decrements.map((dec) => (
              <Button
                key={dec.value}
                variant="outline"
                size="sm"
                onClick={() => handleIncrement(dec.value)}
              >
                {dec.label}
              </Button>
            ))}
            {increments.map((inc) => (
              <Button
                key={inc.value}
                variant="outline"
                size="sm"
                onClick={() => handleIncrement(inc.value)}
              >
                {inc.label}
              </Button>
            ))}
          </div>

          {showPreview && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Preview Changes:</div>
              <div className="text-sm">
                {item.title}: {formatPrice(previewPrice)}
              </div>
              {calculateOtherPrices(previewPrice).map((otherItem) => (
                <div key={otherItem.id} className="text-sm text-muted-foreground">
                  {otherItem.title}: {formatPrice(otherItem.previewPrice)}
                </div>
              ))}
              <div className="flex gap-2 mt-4">
                <Button onClick={handleConfirm} size="sm">
                  Confirm Changes
                </Button>
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
