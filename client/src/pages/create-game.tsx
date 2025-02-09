import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertGameSchema, insertItemSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { X, Plus, ArrowLeft } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function CreateGame() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [items, setItems] = useState<{ title: string; imageUrl: string }[]>([]);

  const form = useForm({
    resolver: zodResolver(insertGameSchema),
    defaultValues: {
      title: "",
      totalPrice: 0,
    },
  });

  const createGame = useMutation({
    mutationFn: async (data: { title: string; totalPrice: number }) => {
      const game = await apiRequest("POST", "/api/games", data);
      const gameData = await game.json();
      
      // Create items
      for (const item of items) {
        await apiRequest("POST", `/api/games/${gameData.id}/items`, {
          ...item,
          currentPrice: data.totalPrice / items.length,
        });
      }
      
      return gameData;
    },
    onSuccess: (data) => {
      toast({ title: "Success", description: "Game created successfully" });
      setLocation(`/game/${data.id}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create game",
        variant: "destructive",
      });
    },
  });

  const addItem = () => {
    setItems([...items, { title: "", imageUrl: "" }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto space-y-4">
        <Link href="/">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>Create New Game</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((data) => createGame.mutate(data))}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Game Title</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="totalPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Price</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-medium">Items</h3>
                    <Button type="button" variant="outline" onClick={addItem}>
                      <Plus className="h-4 w-4 mr-2" /> Add Item
                    </Button>
                  </div>

                  {items.map((item, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder="Item Title"
                        value={item.title}
                        onChange={(e) =>
                          updateItem(index, "title", e.target.value)
                        }
                      />
                      <Input
                        placeholder="Image URL"
                        value={item.imageUrl}
                        onChange={(e) =>
                          updateItem(index, "imageUrl", e.target.value)
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={items.length === 0 || createGame.isPending}
                >
                  Create Game
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
