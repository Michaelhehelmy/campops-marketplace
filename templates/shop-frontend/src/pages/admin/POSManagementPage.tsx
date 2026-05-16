/**
 * POS Management Page
 * Handles both Categories and Items management with high aesthetic standards.
 */

import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Layers,
  ArrowUp,
  Folder,
  ShoppingBag,
  Check,
  X,
} from "lucide-react";
import {
  usePosCategories,
  useCreatePosCategory,
  useUpdatePosCategory,
  useDeletePosCategory,
} from "@/hooks/queries/useAdminPosItems";
import {
  useAdminPosItems,
  useCreatePosItem,
  useUpdatePosItem,
  useDeactivatePosItem as useDeletePosItem,
} from "@/hooks/queries/useAdminPosItems";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";

// Alias Tabs components to work around ReactNode type mismatch with @types/react
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TabsAny = Tabs as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TabsListAny = TabsList as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TabsTriggerAny = TabsTrigger as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TabsContentAny = TabsContent as any;
import toast from "react-hot-toast";
import { useLocation, useNavigate } from "react-router-dom";

export default function POSManagementPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(pathname.includes("items") ? "items" : "categories");

  useEffect(() => {
    setActiveTab(pathname.includes("items") ? "items" : "categories");
  }, [pathname]);

  // Category State
  const [categorySearch, setCategorySearch] = useState("");
  const { data: categoriesData } = usePosCategories(categorySearch || undefined);
  const categoriesRes = categoriesData?.data || [];
  const createCat = useCreatePosCategory();
  const updateCat = useUpdatePosCategory();
  const deleteCat = useDeletePosCategory();
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [newCat, setNewCat] = useState({ name: "", description: "", color: "#3b82f6", order: 0 });

  // Items State
  const [itemSearch, setItemSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [appliedMinPrice, setAppliedMinPrice] = useState("");
  const [appliedMaxPrice, setAppliedMaxPrice] = useState("");
  const [deleteItemConfirm, setDeleteItemConfirm] = useState<string | null>(null);

  const { data: itemsRes } = useAdminPosItems({
    search: itemSearch || undefined,
    category_id: categoryFilter || undefined,
    is_available: (availabilityFilter as any) || undefined,
  });
  const createItem = useCreatePosItem();
  const updateItem = useUpdatePosItem();
  const deletePosItem = useDeletePosItem();

  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [newItem, setNewItem] = useState<any>({
    name: "",
    category_id: "",
    price: "0",
    sku: "",
    description: "",
    is_available: true,
  });

  const itemsData = itemsRes?.data ?? [];
  const filteredCategories = categorySearch
    ? categoriesRes.filter((c: any) => c.name?.toLowerCase().includes(categorySearch.toLowerCase()))
    : categoriesRes;
  const items = itemsData.filter((item: any) => {
    const price = parseFloat(item.price);
    const min = appliedMinPrice ? parseFloat(appliedMinPrice) : 0;
    const max = appliedMaxPrice ? parseFloat(appliedMaxPrice) : Infinity;
    return price >= min && price <= max;
  });

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);
    const price = parseFloat(String(newItem.price));
    if (!newItem.name || isNaN(price) || price < 0) {
      toast.error("Form is invalid");
      return;
    }
    try {
      if (editingItem) {
        await updateItem.mutateAsync({ id: editingItem.id, ...newItem, price } as any);
        toast.success("Item updated");
      } else {
        await createItem.mutateAsync({
          ...newItem,
          price,
          cost: 0,
          stock_quantity: 0,
          low_stock_threshold: 10,
        } as any);
        toast.success("Item created");
      }
      setShowItemForm(false);
      setEditingItem(null);
      setFormSubmitted(false);
      setNewItem({
        name: "",
        category_id: "",
        price: "0",
        sku: "",
        description: "",
        is_available: true,
      });
    } catch {
      toast.error("Failed to save item");
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);
    if (!newCat.name) {
      toast.error("Name is required");
      return;
    }
    try {
      if (editingCategory) {
        await updateCat.mutateAsync({ id: editingCategory.id, ...newCat } as any);
        toast.success("Category updated");
      } else {
        await createCat.mutateAsync(newCat as any);
        toast.success("Category created");
      }
      setShowCategoryForm(false);
      setEditingCategory(null);
      setFormSubmitted(false);
      setNewCat({ name: "", description: "", color: "#000000", order: 0 });
    } catch {
      toast.error("Failed to save category");
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-stone-900">POS Management</h1>
        <p className="text-stone-500">Manage menu items and categories for the POS system.</p>
      </div>

      <TabsAny
        value={activeTab}
        onValueChange={(val: string) => {
          setActiveTab(val);
          navigate(val === "items" ? "/admin/pos-items" : "/admin/pos-categories");
        }}
        className="w-full"
      >
        <div className="flex items-center justify-between mb-6">
          <TabsListAny className="bg-stone-100 p-1 rounded-full border border-stone-200">
            <TabsTriggerAny
              value="categories"
              data-testid="pos-categories-tab"
              className="rounded-full px-6 py-2 active:bg-white active:shadow-sm"
            >
              Categories
            </TabsTriggerAny>
            <TabsTriggerAny
              value="items"
              data-testid="pos-items-tab"
              className="rounded-full px-6 py-2 active:bg-white active:shadow-sm"
            >
              Items
            </TabsTriggerAny>
          </TabsListAny>
          <div className="flex gap-2">
            {activeTab === "categories" ? (
              <Button onClick={() => setShowCategoryForm(true)} data-testid="add-category-button">
                <Plus size={18} className="mr-2" /> Add Category
              </Button>
            ) : (
              <Button
                onClick={() => {
                  setEditingItem(null);
                  setNewItem({
                    name: "",
                    category_id: "",
                    price: "0",
                    sku: "",
                    description: "",
                    is_available: true,
                  });
                  setShowItemForm(true);
                }}
                data-testid="add-item-button"
              >
                <Plus size={18} className="mr-2" /> Add Item
              </Button>
            )}
          </div>
        </div>

        {activeTab === "categories" && (
          <TabsContentAny value="categories" className="mt-0 outline-none">
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-stone-200 flex flex-wrap gap-4 items-center justify-between">
                <div className="relative w-full max-w-sm">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                    size={18}
                  />
                  <Input
                    placeholder="Search categories..."
                    className="pl-10 text-stone-900 border-stone-200 focus:ring-acacia"
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    data-testid="search-input"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full" data-testid="categories-table">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200">
                      <th className="text-left p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">
                        Icon
                      </th>
                      <th className="text-left p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="text-left p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">
                        Color
                      </th>
                      <th className="text-left p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">
                        Order
                      </th>
                      <th className="text-right p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredCategories.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-stone-500">
                          No categories defined
                        </td>
                      </tr>
                    ) : (
                      filteredCategories.map((c: any) => (
                        <tr key={c.id} className="hover:bg-stone-50/50 transition-colors">
                          <td className="p-4">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-stone-100 text-stone-600">
                              {c.icon ? (
                                <span className="text-xl">{c.icon}</span>
                              ) : (
                                <Folder size={20} />
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="font-medium text-stone-900 category-name-span">
                              {c.name}
                            </span>
                            {c.description && (
                              <p className="text-xs text-stone-500 mt-0.5">{c.description}</p>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-4 h-4 rounded-full border border-stone-200"
                                style={{ backgroundColor: c.color || "#e5e7eb" }}
                              ></div>
                              <span className="text-xs text-stone-600 uppercase">
                                {c.color || "none"}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 text-sm text-stone-600">{c.sort_order}</td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Move Up"
                                aria-label="Move Up"
                                data-testid="move-up-button"
                                onClick={() => {
                                  const index = categoriesRes.findIndex(
                                    (cat: any) => cat.id === c.id
                                  );
                                  if (index > 0) {
                                    const prev = categoriesRes[index - 1];
                                    updateCat
                                      .mutateAsync({
                                        id: c.id,
                                        sort_order: prev.sort_order - 1,
                                      } as any)
                                      .then(() => toast.success("Category moved up"));
                                  }
                                }}
                              >
                                <ArrowUp size={18} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                data-testid="edit-button"
                                onClick={() => {
                                  setEditingCategory(c);
                                  setNewCat({
                                    name: c.name,
                                    description: c.description || "",
                                    color: c.color || "#3b82f6",
                                    order: c.sort_order || 0,
                                  });
                                  setShowCategoryForm(true);
                                }}
                              >
                                <Edit2 size={18} />
                              </Button>

                              {deleteConfirm === c.id ? (
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-red-600"
                                    data-testid="confirm-delete-button"
                                    onClick={() => {
                                      deleteCat
                                        .mutateAsync(c.id)
                                        .then(() => toast.success("Category deleted"))
                                        .catch((err) =>
                                          toast.error(
                                            err.response?.data?.error || "Failed to delete"
                                          )
                                        )
                                        .finally(() => setDeleteConfirm(null));
                                    }}
                                  >
                                    <Check size={18} />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setDeleteConfirm(null)}
                                  >
                                    <X size={18} />
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-stone-400 hover:text-red-600"
                                  onClick={() => {
                                    // Trigger a dry run delete to see if it's blocked
                                    api
                                      .delete(`/pos/categories/${c.id}?dry_run=true`)
                                      .then(() => setDeleteConfirm(c.id))
                                      .catch((err) => {
                                        const msg =
                                          err.response?.data?.error ||
                                          err.response?.data?.message ||
                                          "Failed to delete";
                                        toast.error(msg);
                                      });
                                  }}
                                  data-testid="delete-button"
                                >
                                  <Trash2 size={18} />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContentAny>
        )}

        {activeTab === "items" && (
          <TabsContentAny value="items" className="mt-0 outline-none">
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-stone-200 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex flex-wrap gap-4 items-center flex-1">
                  <div className="relative w-full max-w-xs">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                      size={18}
                    />
                    <Input
                      placeholder="Search items..."
                      className="pl-10"
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                      data-testid="search-input"
                    />
                  </div>
                  <select
                    className="flex h-10 rounded-md border border-stone-200 bg-white px-3 py-2 text-sm focus:ring-acacia focus:ring-2 outline-none"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    data-testid="category-filter"
                  >
                    <option value="">All Categories</option>
                    {categoriesRes.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <select
                    className="flex h-10 rounded-md border border-stone-200 bg-white px-3 py-2 text-sm focus:ring-acacia focus:ring-2 outline-none"
                    value={availabilityFilter}
                    onChange={(e) => setAvailabilityFilter(e.target.value)}
                    data-testid="availability-filter"
                  >
                    <option value="">All Availability</option>
                    <option value="available">Available</option>
                    <option value="unavailable">Unavailable</option>
                  </select>
                  <Input
                    placeholder="Min Price"
                    className="w-24"
                    type="number"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    data-testid="min-price-input"
                  />
                  <Input
                    placeholder="Max Price"
                    className="w-24"
                    type="number"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    data-testid="max-price-input"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setAppliedMinPrice(minPrice);
                      setAppliedMaxPrice(maxPrice);
                    }}
                    data-testid="apply-filter-button"
                  >
                    Apply
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full" data-testid="items-table">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200">
                      <th className="text-left p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">
                        Item
                      </th>
                      <th className="text-left p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="text-left p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="text-left p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">
                        SKU
                      </th>
                      <th className="text-left p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-right p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-stone-500">
                          No items found
                        </td>
                      </tr>
                    ) : (
                      items.map((item: any) => (
                        <tr key={item.id} className="hover:bg-stone-50/50 transition-colors">
                          <td className="p-4">
                            <span className="font-medium text-stone-900 border-none">
                              {item.name}
                            </span>
                            {item.description && (
                              <p className="text-xs text-stone-500 mt-0.5">{item.description}</p>
                            )}
                          </td>
                          <td className="p-4 text-sm text-stone-600">
                            {item.category_name || "Uncategorized"}
                          </td>
                          <td className="p-4 text-sm font-medium text-stone-900">
                            ${parseFloat(item.price).toFixed(2)}
                          </td>
                          <td className="p-4 text-sm text-stone-500">{item.sku || "-"}</td>
                          <td className="p-4">
                            <span
                              className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                                item.is_available
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {item.is_available ? "Available" : "Unavailable"}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2 text-stone-400">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditingItem(item);
                                  setNewItem({
                                    name: item.name,
                                    category_id: item.category_id || "",
                                    price: item.price.toString(),
                                    sku: item.sku || "",
                                    description: item.description || "",
                                    is_available: item.is_available,
                                  });
                                  setShowItemForm(true);
                                }}
                                data-testid="edit-button"
                              >
                                <Edit2 size={18} />
                              </Button>

                              {deleteItemConfirm === item.id ? (
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-red-600"
                                    data-testid="confirm-delete-button"
                                    onClick={() => {
                                      deletePosItem
                                        .mutateAsync(item.id)
                                        .then(() => toast.success("Item deleted"))
                                        .catch(() => toast.error("Failed to delete item"))
                                        .finally(() => setDeleteItemConfirm(null));
                                    }}
                                  >
                                    <Check size={18} />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setDeleteItemConfirm(null)}
                                  >
                                    <X size={18} />
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="hover:text-red-600"
                                  onClick={() => setDeleteItemConfirm(item.id)}
                                  data-testid="delete-button"
                                >
                                  <Trash2 size={18} />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContentAny>
        )}
      </TabsAny>

      {showItemForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-stone-200">
            <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-stone-50">
              <h2 className="text-xl font-bold text-stone-900" data-testid="pos-item-modal-title">
                {editingItem ? "Edit Menu Item" : "New Menu Item"}
              </h2>
              <button
                onClick={() => setShowItemForm(false)}
                className="text-stone-400 hover:text-stone-600 transition-colors"
                data-testid="close-modal-button"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateItem} className="p-6 space-y-4" noValidate>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="item-name">Name</Label>
                  <Input
                    id="item-name"
                    data-testid="item-name-input"
                    required
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  />
                  {newItem.name === "" && formSubmitted && (
                    <p className="text-xs text-destructive mt-1 error" data-testid="name-error">
                      <span data-testid="error-message">Name is required</span>
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="item-cat">Category</Label>
                    <select
                      id="item-cat"
                      data-testid="item-category-select"
                      required
                      className="flex h-11 w-full rounded-full border border-stone-200 bg-white px-4 py-2 text-sm focus:ring-acacia focus:ring-2 outline-none"
                      value={newItem.category_id}
                      onChange={(e) => setNewItem({ ...newItem, category_id: e.target.value })}
                    >
                      <option value="">Select Category</option>
                      {categoriesRes.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="item-price">Price</Label>
                    <Input
                      id="item-price"
                      type="number"
                      step="0.01"
                      data-testid="item-price-input"
                      required
                      value={newItem.price}
                      onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                    />
                    {(formSubmitted || parseFloat(newItem.price) < 0) &&
                      (parseFloat(newItem.price) < 0 || String(newItem.price).startsWith("-")) && (
                        <p
                          className="text-xs text-destructive mt-1 error"
                          data-testid="price-error"
                          role="alert"
                        >
                          <span data-testid="error-message">Price must be positive</span>
                        </p>
                      )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="item-sku">SKU (Optional)</Label>
                  <Input
                    id="item-sku"
                    data-testid="item-sku-input"
                    value={newItem.sku}
                    onChange={(e) => setNewItem({ ...newItem, sku: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="item-desc">Description (Optional)</Label>
                  <Input
                    id="item-desc"
                    data-testid="item-description-input"
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  />
                </div>
                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="item-available"
                    data-testid="item-available-toggle"
                    checked={newItem.is_available}
                    className="w-4 h-4 rounded text-acacia focus:ring-acacia border-stone-300"
                    onChange={(e) => setNewItem({ ...newItem, is_available: e.target.checked })}
                  />
                  <Label htmlFor="item-available" className="cursor-pointer">
                    Available for purchase
                  </Label>
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-stone-100">
                <Button type="submit" data-testid="save-item-button" className="flex-1">
                  {createItem.isPending || updateItem.isPending ? "Saving..." : "Save Item"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1"
                  onClick={() => setShowItemForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCategoryForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 text-stone-900">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-stone-200">
            <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-stone-50">
              <h2 className="text-xl font-bold text-stone-900">
                {editingCategory ? "Edit Category" : "New Category"}
              </h2>
              <button
                onClick={() => setShowCategoryForm(false)}
                className="text-stone-400 hover:text-stone-600 transition-colors"
                data-testid="close-modal-button"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateCategory} className="p-6 space-y-4" noValidate>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cat-name">Name</Label>
                  <Input
                    id="cat-name"
                    data-testid="category-name-input"
                    required
                    value={newCat.name}
                    onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
                  />
                  {!newCat.name && formSubmitted && (
                    <p className="text-xs text-destructive mt-1 error" data-testid="name-error">
                      <span data-testid="error-message">Name is required</span>
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cat-desc">Description</Label>
                  <Input
                    id="cat-desc"
                    data-testid="category-description-input"
                    value={newCat.description}
                    onChange={(e) => setNewCat({ ...newCat, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cat-color">Color (Hex)</Label>
                    <Input
                      id="cat-color"
                      data-testid="category-color-input"
                      placeholder="#000000"
                      value={newCat.color}
                      onChange={(e) => setNewCat({ ...newCat, color: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cat-order">Display Order</Label>
                    <Input
                      id="cat-order"
                      type="number"
                      data-testid="category-order-input"
                      value={newCat.order}
                      onChange={(e) => setNewCat({ ...newCat, order: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-stone-100">
                <Button type="submit" data-testid="save-category-button" className="flex-1">
                  <Check size={18} className="mr-2" /> Save Category
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1"
                  onClick={() => setShowCategoryForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
