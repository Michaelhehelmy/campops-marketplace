/**
 * Recipes Management Page
 * CRUD for recipes with ingredient list
 * Uses generic CRUD: GET/POST/PUT/DELETE /api/recipes
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, put, del } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Recipe } from "@/types/api";
import toast from "react-hot-toast";
import { ConfirmDialog } from "@/components/ConfirmDialog";

const QUERY_KEY = ["recipes"] as const;

export default function RecipesPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Recipe | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [globalPortions, setGlobalPortions] = useState(1);

  const { data: recipes, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => get<Recipe[]>("/recipes"),
  });

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<Recipe> & { id?: string }) => {
      if (data.id) {
        return put(`/recipes/${data.id}`, data);
      }
      return post("/recipes", data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success(editing ? "Recipe updated" : "Recipe created");
      resetForm();
    },
    onError: () => toast.error("Failed to save recipe"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => del(`/recipes/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Recipe deleted");
    },
    onError: () => toast.error("Failed to delete recipe"),
  });

  const resetForm = () => {
    setEditing(null);
    setShowForm(false);
  };

  const handleEdit = (recipe: Recipe) => {
    setEditing(recipe);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data: Partial<Recipe> & { id?: string } = {
      name: fd.get("name") as string,
      category: fd.get("category") as string,
      image: (fd.get("image") as string) || "",
      cost_per_serving: Number(fd.get("cost_per_serving")) || 0,
      selling_price: Number(fd.get("selling_price")) || 0,
      prep_time: (fd.get("prep_time") as string) || "",
      ingredients_count: Number(fd.get("ingredients_count")) || 0,
      health_info: (fd.get("health_info") as string) || "",
      ingredients: (() => {
        try {
          return JSON.parse(fd.get("ingredients") as string);
        } catch (e) {
          return [];
        }
      })(),
    };
    if (editing) data.id = editing.id;
    // Compute margin
    if (data.selling_price && data.cost_per_serving) {
      data.margin = Math.round(
        ((data.selling_price - data.cost_per_serving) / data.selling_price) * 100
      );
    }
    saveMutation.mutate(data);
  };

  const items = recipes ?? [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" data-testid="recipes-heading">
            Recipes
          </h1>
          <p className="text-muted-foreground">Create and manage your menu recipes</p>
        </div>
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <Label htmlFor="global_portions" className="whitespace-nowrap">
              Portions:
            </Label>
            <Input
              id="global_portions"
              type="number"
              className="w-20"
              defaultValue="1"
              min="1"
              onChange={(e) => setGlobalPortions(Number(e.target.value) || 1)}
              data-testid="recipe-portions-input"
            />
          </div>
          <Button
            onClick={() => {
              setEditing(null);
              setShowForm(!showForm);
            }}
            data-testid="add-recipe-button"
          >
            {showForm ? "Cancel" : "Add Recipe"}
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editing ? "Edit Recipe" : "New Recipe"}</CardTitle>
            <CardDescription>Fill in the recipe details</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="recipe-form">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={editing?.name || ""}
                    required
                    data-testid="recipe-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Input
                    id="category"
                    name="category"
                    defaultValue={editing?.category || ""}
                    required
                    placeholder="e.g. Main Course, Dessert"
                    data-testid="recipe-category-select"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cost_per_serving">Cost per Serving</Label>
                  <Input
                    id="cost_per_serving"
                    name="cost_per_serving"
                    type="number"
                    step="0.01"
                    defaultValue={editing?.cost_per_serving || ""}
                    data-testid="recipe-cost-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="selling_price">Selling Price</Label>
                  <Input
                    id="selling_price"
                    name="selling_price"
                    type="number"
                    step="0.01"
                    defaultValue={editing?.selling_price || ""}
                    data-testid="recipe-price-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prep_time">Prep Time</Label>
                  <Input
                    id="prep_time"
                    name="prep_time"
                    defaultValue={editing?.prep_time || ""}
                    placeholder="e.g. 30 min"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ingredients_count">Ingredients Count</Label>
                  <Input
                    id="ingredients_count"
                    name="ingredients_count"
                    type="number"
                    defaultValue={editing?.ingredients_count || 0}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="image">Image URL</Label>
                  <Input
                    id="image"
                    name="image"
                    defaultValue={editing?.image || ""}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ingredients">Ingredients (JSON format)</Label>
                <textarea
                  id="ingredients"
                  name="ingredients"
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  defaultValue={editing?.ingredients ? JSON.stringify(editing.ingredients) : "[]"}
                  data-testid="recipe-ingredients-textarea"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="health_info">Health Info / Notes</Label>
                <textarea
                  id="health_info"
                  name="health_info"
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  defaultValue={editing?.health_info || ""}
                />
              </div>

              <div className="flex gap-2">
                <div className="py-2">
                  <Button
                    type="submit"
                    disabled={saveMutation.isPending}
                    data-testid="save-recipe-button"
                  >
                    {saveMutation.isPending ? "Saving..." : editing ? "Update" : "Create"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="ml-2"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            {items.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No recipes yet. Add your first recipe above.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">Name</th>
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">Category</th>
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">Cost</th>
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">Price</th>
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">Margin</th>
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">Prep Time</th>
                      <th className="pb-3 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((recipe) => (
                      <tr key={recipe.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-3 pr-4 font-medium">{recipe.name}</td>
                        <td className="py-3 pr-4">
                          <Badge variant="secondary">{recipe.category}</Badge>
                        </td>
                        <td className="py-3 pr-4" data-testid="recipe-scaled-cost">
                          ${(Number(recipe.cost_per_serving) * globalPortions).toFixed(2)}
                        </td>
                        <td className="py-3 pr-4">${Number(recipe.selling_price).toFixed(2)}</td>
                        <td className="py-3 pr-4">
                          <Badge
                            variant={
                              recipe.margin >= 50
                                ? "success"
                                : recipe.margin >= 30
                                  ? "warning"
                                  : "destructive"
                            }
                          >
                            {recipe.margin}%
                          </Badge>
                        </td>
                        <td className="py-3 pr-4">{recipe.prep_time}</td>
                        <td className="py-3">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(recipe)}>
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => setDeleteConfirmId(recipe.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        onConfirm={() => {
          if (deleteConfirmId) deleteMutation.mutate(deleteConfirmId);
        }}
        title="Delete Recipe"
        description="Are you sure you want to delete this recipe?"
      />
    </div>
  );
}
