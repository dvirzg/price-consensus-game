import { Card, CardContent } from "@/components/ui/card";
import { Item } from "@shared/schema";
import { formatPrice } from "@/lib/utils";
import BidControl from "./bid-control";

interface ItemCardProps {
  item: Item;
  items: Item[];
  onPriceChange: (price: number) => void;
}

export default function ItemCard({ item, items, onPriceChange }: ItemCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <img
            src={item.imageData}
            alt={item.title}
            className="w-16 h-16 object-cover rounded-lg"
          />
          <div className="flex-1">
            <h3 className="font-medium mb-2">{item.title}</h3>
            <div className="text-lg font-medium">
              {formatPrice(Number(item.currentPrice))}
            </div>
          </div>
        </div>
        <BidControl
          item={item}
          items={items}
          onConfirm={onPriceChange}
        />
      </CardContent>
    </Card>
  );
}