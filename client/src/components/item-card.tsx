import { Card, CardContent } from "@/components/ui/card";
import { Item } from "@shared/schema";
import PriceSlider from "./price-slider";

interface ItemCardProps {
  item: Item;
  onPriceChange: (price: number) => void;
}

export default function ItemCard({ item, onPriceChange }: ItemCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <img
            src={item.imageUrl}
            alt={item.title}
            className="w-16 h-16 object-cover rounded-lg"
          />
          <div className="flex-1">
            <h3 className="font-medium mb-2">{item.title}</h3>
            <div className="flex items-center gap-4">
              <PriceSlider
                value={item.currentPrice}
                onChange={onPriceChange}
              />
              <div className="w-20 text-right">
                ${item.currentPrice.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
