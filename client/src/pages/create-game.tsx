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
import { X, Plus, ArrowLeft, Upload, ImagePlus } from "lucide-react";
import { Link, useLocation } from "wouter";
import { z } from "zod";

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
    resolver: zodResolver(insertGameSchema.extend({
      creatorName: z.string().min(1, "Your name is required"),
      creatorEmail: z.string().email("Invalid email").optional().or(z.literal("")),
    })),
    defaultValues: {
      title: "",
      totalPrice: 0,
      creatorName: "",
      creatorEmail: "",
    },
  });

  const createGame = useMutation({
    mutationFn: async (data: { title: string; totalPrice: number; creatorName: string; creatorEmail: string }) => {
      const game = await apiRequest("POST", "/api/games", {
        title: data.title,
        totalPrice: data.totalPrice,
        creatorName: data.creatorName,
        creatorEmail: data.creatorEmail,
      });
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
      setLocation(`/game/${data.uniqueId}`);
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
    const newItemNumber = items.length + 1;
    setItems([...items, { title: `Item #${newItemNumber}`, imageData: "", previewUrl: undefined }]);
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

  const handleBulkImageUpload = async (files: FileList) => {
    try {
      const promises = Array.from(files).map((file, index) => {
        return new Promise<ItemWithPreview>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            resolve({
              title: `Item #${items.length + index + 1}`,
              imageData: e.target?.result as string,
              previewUrl: URL.createObjectURL(file)
            });
          };
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        });
      });

      const newItems = await Promise.all(promises);
      setItems(prev => [...prev, ...newItems]);
      toast({ 
        title: "Success", 
        description: `Added ${files.length} new item${files.length === 1 ? '' : 's'}` 
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload images",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto space-y-4">
        <Link href="/">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </Link>

        <Card className="w-full">
          <CardHeader>
            <CardTitle>Create New Game</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((data) => createGame.mutate(data))}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Game Title</FormLabel>
                      <FormControl>
                        <Input {...field} className="w-full" />
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
                          className="w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="creatorName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Name</FormLabel>
                      <FormControl>
                        <Input {...field} className="w-full" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="creatorEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Email (optional)</FormLabel>
                      <FormControl>
                        <Input {...field} className="w-full" type="email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Items</h3>
                    <div className="flex gap-2">
                      <div className="relative group">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          onChange={(e) => {
                            const files = e.target.files;
                            if (files && files.length > 0) {
                              handleBulkImageUpload(files);
                              e.target.value = ''; // Reset the input
                            }
                          }}
                        />
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          className="pointer-events-none group-hover:bg-accent group-hover:text-accent-foreground"
                        >
                          <ImagePlus className="h-4 w-4 mr-2" />
                          Add Multiple Items
                        </Button>
                      </div>
                      <Button 
                        type="button" 
                        variant="outline"
                        size="sm"
                        onClick={addItem}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Single Item
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-1">
                    {items.map((item, index) => (
                      <div key={index} className="space-y-3 p-4 border rounded-lg bg-white shadow-sm">
                        <div className="flex items-center justify-between">
                          <Input
                            placeholder="Item Title"
                            value={item.title}
                            className="flex-1 mr-2"
                            onChange={(e) => updateItemTitle(index, e.target.value)}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="shrink-0"
                            onClick={() => removeItem(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        <label className="block cursor-pointer">
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
                                className="w-full h-40 sm:h-48 object-cover rounded"
                              />
                            ) : (
                              <div className="flex flex-col items-center justify-center h-40 sm:h-48 text-gray-500 bg-gray-50 rounded">
                                <Upload className="h-8 w-8 mb-2" />
                                <span className="text-sm text-center">Tap to Upload Image</span>
                              </div>
                            )}
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full mt-8"
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