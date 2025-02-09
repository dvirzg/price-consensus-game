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
import { X, Plus, ArrowLeft, Upload } from "lucide-react";
import { Link, useLocation } from "wouter";

interface ItemWithPreview {
  title: string;
  imageData: string;
  previewUrl?: string;
}

export default function CreateGame() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [items, setItems] = useState<ItemWithPreview[]>([]);

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
          title: item.title,
          imageData: item.imageData,
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
    setItems([...items, { title: "", imageData: "", previewUrl: undefined }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleImageUpload = async (index: number, file: File) => {
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const newItems = [...items];
        newItems[index] = {
          ...newItems[index],
          imageData: e.target?.result as string,
          previewUrl: URL.createObjectURL(file),
        };
        setItems(newItems);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
    }
  };

  const updateItemTitle = (index: number, title: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], title };
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
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
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
                    <div key={index} className="space-y-2 p-4 border rounded-lg">
                      <Input
                        placeholder="Item Title"
                        value={item.title}
                        onChange={(e) => updateItemTitle(index, e.target.value)}
                      />

                      <div className="flex gap-2 items-center">
                        <label className="flex-1 cursor-pointer">
                          <div className="relative border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImageUpload(index, file);
                              }}
                            />
                            {item.previewUrl ? (
                              <img
                                src={item.previewUrl}
                                alt={item.title}
                                className="w-full h-32 object-cover rounded"
                              />
                            ) : (
                              <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                                <Upload className="h-8 w-8 mb-2" />
                                <span className="text-sm">Upload Image</span>
                              </div>
                            )}
                          </div>
                        </label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
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