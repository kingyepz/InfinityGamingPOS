import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/Sidebar";
import { Game } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2Icon, PlusIcon, GamepadIcon, Gamepad2Icon, Pencil, Trash2, InfoIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

// Form schema
const gameFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  platforms: z.array(z.string()).min(1, "At least one platform is required"),
  pricePerGame: z.coerce.number().min(0, "Price must be a non-negative number"),
  pricePerHour: z.coerce.number().min(0, "Price must be a non-negative number"),
  isVrGame: z.boolean().default(false),
});

type GameFormValues = z.infer<typeof gameFormSchema>;

export default function GamesCatalog() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch games
  const { data: games = [], isLoading } = useQuery<Game[]>({
    queryKey: ['/api/games'],
  });

  // Form setup
  const form = useForm<GameFormValues>({
    resolver: zodResolver(gameFormSchema),
    defaultValues: {
      title: "",
      platforms: [],
      pricePerGame: 40,
      pricePerHour: 200,
      isVrGame: false
    },
  });

  // Create game mutation
  const createGameMutation = useMutation({
    mutationFn: async (values: GameFormValues) => {
      // If it's a VR game, use the VR pricing
      if (values.isVrGame) {
        values.pricePerGame = 100;
      }
      
      const response = await fetch('/api/games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create game');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/games'] });
      toast({
        title: "Game created",
        description: "The game has been added to the catalog",
      });
      setIsDialogOpen(false);
      form.reset();
      setSelectedPlatforms([]);
    },
    onError: (error) => {
      toast({
        title: "Failed to create game",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  // Update game mutation
  const updateGameMutation = useMutation({
    mutationFn: async (values: GameFormValues & { id: number }) => {
      const { id, ...gameData } = values;
      
      // If it's a VR game, use the VR pricing
      if (gameData.isVrGame) {
        gameData.pricePerGame = 100;
      }
      
      const response = await fetch(`/api/games/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(gameData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update game');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/games'] });
      toast({
        title: "Game updated",
        description: "The game details have been updated",
      });
      setIsEditDialogOpen(false);
      setSelectedGame(null);
      form.reset();
      setSelectedPlatforms([]);
    },
    onError: (error) => {
      toast({
        title: "Failed to update game",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  // Delete game mutation
  const deleteGameMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/games/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete game');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/games'] });
      toast({
        title: "Game deleted",
        description: "The game has been removed from the catalog",
      });
      setIsDeleteDialogOpen(false);
      setSelectedGame(null);
    },
    onError: (error) => {
      toast({
        title: "Failed to delete game",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const handleCreateGame = (values: GameFormValues) => {
    createGameMutation.mutate(values);
  };

  const handleUpdateGame = (values: GameFormValues) => {
    if (selectedGame) {
      updateGameMutation.mutate({ ...values, id: selectedGame.id });
    }
  };

  const handleDeleteGame = () => {
    if (selectedGame) {
      deleteGameMutation.mutate(selectedGame.id);
    }
  };

  const openEditDialog = (game: Game) => {
    setSelectedGame(game);
    setSelectedPlatforms(game.platforms);
    form.reset({
      title: game.title,
      platforms: game.platforms,
      pricePerGame: game.pricePerGame,
      pricePerHour: game.pricePerHour,
      isVrGame: game.isVrGame,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (game: Game) => {
    setSelectedGame(game);
    setIsDeleteDialogOpen(true);
  };

  const togglePlatform = (platform: string) => {
    if (selectedPlatforms.includes(platform)) {
      const newPlatforms = selectedPlatforms.filter(p => p !== platform);
      setSelectedPlatforms(newPlatforms);
      form.setValue('platforms', newPlatforms);
    } else {
      const newPlatforms = [...selectedPlatforms, platform];
      setSelectedPlatforms(newPlatforms);
      form.setValue('platforms', newPlatforms);
    }
  };

  // Handle VR game toggle which affects pricing
  const handleVrGameToggle = (isVr: boolean) => {
    form.setValue('isVrGame', isVr);
    if (isVr) {
      form.setValue('pricePerGame', 100);
    } else {
      form.setValue('pricePerGame', 40);
    }
  };

  const availablePlatforms = ['PS5', 'XBOX', 'PC', 'VR'];

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-background">
      <Sidebar />

      <main className="flex-1 overflow-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Game Catalog</h1>
            <p className="text-muted-foreground">Manage available games for your gaming lounge</p>
          </div>
          
          <Button onClick={() => setIsDialogOpen(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Game
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-lg">Loading games...</span>
          </div>
        ) : games.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <GamepadIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No games found</h3>
            <p className="text-muted-foreground max-w-md mt-1 mb-4">
              Your game catalog is empty. Add games to allow customers to select them during gaming sessions.
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Your First Game
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {games.map((game) => (
              <Card key={game.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardHeader className="bg-card-header">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Gamepad2Icon className="h-5 w-5 mr-2 text-primary" />
                      <span className="truncate">{game.title}</span>
                    </div>
                    {game.isVrGame && (
                      <Badge variant="outline" className="ml-2 bg-primary/10 text-primary border-primary/20">
                        VR
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="flex flex-col space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {game.platforms.map((platform, index) => (
                        <span 
                          key={index} 
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
                        >
                          {platform}
                        </span>
                      ))}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground text-xs">Per Game</span>
                        <span className="font-medium">{game.pricePerGame} KES</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground text-xs">Per Hour</span>
                        <span className="font-medium">{game.pricePerHour} KES</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t px-4 py-3 bg-card/50 flex justify-between">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openDeleteDialog(game)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => openEditDialog(game)}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {/* Add Game Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Game</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreateGame)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Game Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter game title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="platforms"
                  render={() => (
                    <FormItem>
                      <FormLabel>Available Platforms</FormLabel>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {availablePlatforms.map(platform => (
                          <Button
                            key={platform}
                            type="button"
                            variant={selectedPlatforms.includes(platform) ? "default" : "outline"}
                            size="sm"
                            onClick={() => togglePlatform(platform)}
                          >
                            {platform}
                          </Button>
                        ))}
                      </div>
                      <FormDescription>
                        Select all platforms this game is available on
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isVrGame"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>VR Game</FormLabel>
                        <FormDescription>
                          VR games are priced at 100 KES per game, 200 KES per hour
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={(checked) => handleVrGameToggle(checked)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="pricePerGame"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price Per Game (KES)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            disabled={form.watch('isVrGame')}
                            placeholder="40"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Standard: 40 KES, VR: 100 KES
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pricePerHour"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price Per Hour (KES)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            placeholder="200"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Standard: 200 KES per hour
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    disabled={createGameMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    disabled={createGameMutation.isPending}
                  >
                    {createGameMutation.isPending ? (
                      <>
                        <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : "Add Game"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Edit Game Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Game</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleUpdateGame)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Game Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter game title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="platforms"
                  render={() => (
                    <FormItem>
                      <FormLabel>Available Platforms</FormLabel>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {availablePlatforms.map(platform => (
                          <Button
                            key={platform}
                            type="button"
                            variant={selectedPlatforms.includes(platform) ? "default" : "outline"}
                            size="sm"
                            onClick={() => togglePlatform(platform)}
                          >
                            {platform}
                          </Button>
                        ))}
                      </div>
                      <FormDescription>
                        Select all platforms this game is available on
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isVrGame"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>VR Game</FormLabel>
                        <FormDescription>
                          VR games are priced at 100 KES per game, 200 KES per hour
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={(checked) => handleVrGameToggle(checked)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="pricePerGame"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price Per Game (KES)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            disabled={form.watch('isVrGame')}
                            placeholder="40"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Standard: 40 KES, VR: 100 KES
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pricePerHour"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price Per Hour (KES)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            placeholder="200"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Standard: 200 KES per hour
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditDialogOpen(false)}
                    disabled={updateGameMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    disabled={updateGameMutation.isPending}
                  >
                    {updateGameMutation.isPending ? (
                      <>
                        <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : "Update Game"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the game "{selectedGame?.title}" from your catalog.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteGameMutation.isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteGame}
                disabled={deleteGameMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteGameMutation.isPending ? (
                  <>
                    <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}