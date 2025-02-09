import { Card, CardContent } from "@/components/ui/card";
import { Item } from "@shared/schema";
import { formatPrice } from "@/lib/utils";
import BidControl from "./bid-control";

interface ItemCardProps {
  item: Item;
  items: Item[];
  onPriceChange: (price: number) => void;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
}

export default function ItemCard({
  item,
  items,
  onPriceChange,
  isEditing,
  onStartEdit,
  onCancelEdit
}: ItemCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          <img
            src={item.imageData}
            alt={item.title}
            className="w-full h-64 object-cover rounded-lg"
          />
          <div>
            <h3 className="text-xl font-medium mb-2">{item.title}</h3>
            <div className="text-2xl font-medium">
              {formatPrice(Number(item.currentPrice))}
            </div>
          </div>
          {isEditing ? (
            <BidControl
              item={item}
              items={items}
              onConfirm={onPriceChange}
              onCancel={onCancelEdit}
            />
          ) : (
            <button
              onClick={onStartEdit}
              className="w-full px-4 py-2 text-sm font-medium text-primary border border-primary rounded-md hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              Adjust Price
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}