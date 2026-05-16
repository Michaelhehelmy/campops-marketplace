import { useState } from "react";
import { Link } from "react-router-dom";
import { usePages, useDeletePage } from "@/hooks/queries/usePages";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe, User, Shield, Users, FileText, ExternalLink, Settings } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { CustomPage } from "@/types/api";

const SYSTEM_PAGES = [
  // Public
  { title: "Home Page", slug: "", category: "public", icon: <Globe className="w-4 h-4" /> },
  {
    title: "Accommodations",
    slug: "rooms",
    category: "public",
    icon: <Globe className="w-4 h-4" />,
  },
  {
    title: "Availability",
    slug: "availability",
    category: "public",
    icon: <Globe className="w-4 h-4" />,
  },
  {
    title: "Dining / Restaurant",
    slug: "menu",
    category: "public",
    icon: <Globe className="w-4 h-4" />,
  },
  { title: "Blog Feed", slug: "blog", category: "public", icon: <Globe className="w-4 h-4" /> },
  { title: "Contact Us", slug: "contact", category: "public", icon: <Globe className="w-4 h-4" /> },
  { title: "Gallery", slug: "gallery", category: "public", icon: <Globe className="w-4 h-4" /> },
  {
    title: "Excursions",
    slug: "excursions",
    category: "public",
    icon: <Globe className="w-4 h-4" />,
  },
  {
    title: "Marketplace",
    slug: "marketplace",
    category: "public",
    icon: <Globe className="w-4 h-4" />,
  },

  // Guest
  {
    title: "Guest Dashboard",
    slug: "guest/stay",
    category: "guest",
    icon: <User className="w-4 h-4" />,
  },
  {
    title: "Guest Profile",
    slug: "guest/profile",
    category: "guest",
    icon: <User className="w-4 h-4" />,
  },
  {
    title: "Live Billing",
    slug: "guest/live-bill",
    category: "guest",
    icon: <User className="w-4 h-4" />,
  },
  {
    title: "Activity Booking",
    slug: "guest/activities",
    category: "guest",
    icon: <User className="w-4 h-4" />,
  },
  {
    title: "Loyalty / Beats",
    slug: "guest/points",
    category: "guest",
    icon: <User className="w-4 h-4" />,
  },
  {
    title: "Mining Portal",
    slug: "guest/mining",
    category: "guest",
    icon: <User className="w-4 h-4" />,
  },
  {
    title: "Referrals",
    slug: "guest/referrals",
    category: "guest",
    icon: <User className="w-4 h-4" />,
  },
  {
    title: "Invoices",
    slug: "guest/invoices",
    category: "guest",
    icon: <User className="w-4 h-4" />,
  },

  // Staff
  { title: "POS Terminal", slug: "pos", category: "staff", icon: <Users className="w-4 h-4" /> },
  {
    title: "Order Tracking",
    slug: "orders",
    category: "staff",
    icon: <Users className="w-4 h-4" />,
  },
  {
    title: "KDS (Kitchen Display)",
    slug: "kds",
    category: "staff",
    icon: <Users className="w-4 h-4" />,
  },
  {
    title: "Housekeeping Admin",
    slug: "housekeeping",
    category: "staff",
    icon: <Users className="w-4 h-4" />,
  },
  {
    title: "Inventory Viewer",
    slug: "inventory",
    category: "staff",
    icon: <Users className="w-4 h-4" />,
  },
  { title: "Staff Roster", slug: "roster", category: "staff", icon: <Users className="w-4 h-4" /> },
];

export default function PageListPage() {
  const { hasPermission } = useAuth();
  const { data: pages, isLoading, error } = usePages();
  const deletePage = useDeletePage();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  console.log("PageListPage: isLoading", isLoading);
  console.log("PageListPage: error", error);
  console.log(
    "PageListPage: pages data",
    pages
      ? Array.isArray(pages.data)
        ? `array length ${pages.data.length}`
        : "not an array"
      : "null/undefined"
  );

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  const handleDelete = async (id: string) => {
    await deletePage.mutateAsync(id);
    setDeleteConfirm(null);
  };

  const renderPageCard = (page: any, isSystem = false) => (
    <Card
      key={page.id || page.slug}
      className="group hover:shadow-md transition-all duration-200 overflow-hidden border-none shadow-sm bg-white/50 backdrop-blur-sm"
    >
      <CardContent className="p-0">
        <div className="flex items-center p-5">
          <div
            className={`p-3 rounded-2xl mr-4 ${isSystem ? "bg-oasis/10 text-oasis" : "bg-acacia/10 text-acacia"}`}
          >
            {isSystem ? page.icon : <FileText className="w-5 h-5" />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-bold text-lg truncate">{page.title}</h3>
              {isSystem ? (
                <Badge
                  variant="outline"
                  className="text-[10px] uppercase font-bold tracking-tight bg-stone-100/50"
                >
                  System
                </Badge>
              ) : (
                <Badge
                  className={`text-[10px] uppercase font-bold tracking-tight ${page.status === "published" ? "bg-green-500 hover:bg-green-600" : "bg-amber-500 hover:bg-amber-600"}`}
                >
                  {page.status}
                </Badge>
              )}
            </div>
            <div className="flex items-center text-xs text-muted-foreground gap-3">
              <code className="bg-stone-100 px-1.5 py-0.5 rounded text-charcoal/70">
                /{page.slug}
              </code>
              {!isSystem && <span>Updated {formatDate(page.updated_at)}</span>}
            </div>
          </div>

          <div className="flex gap-2 ml-4">
            <Link to={`/${page.slug}`} target="_blank">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full h-9 w-9 hover:bg-stone-100"
                title="View Page"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </Link>

            {hasPermission("pages.edit") && (
              <>
                <Link
                  to={
                    isSystem
                      ? `/admin/pages/system/${encodeURIComponent(page.slug || "home")}`
                      : `/admin/pages/${page.id}`
                  }
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full h-9 w-9 hover:bg-stone-100"
                    title="Edit Content"
                    data-testid={`edit-page-${page.slug || "home"}`}
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </Link>
                {!isSystem && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full h-9 w-9 hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setDeleteConfirm(page.id)}
                    title="Delete Page"
                    data-testid={`delete-page-${page.slug}`}
                  >
                    <Shield className="w-4 h-4" />
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {deleteConfirm === page.id && (
          <div className="px-5 pb-5 animate-in slide-in-from-top-2">
            <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-2xl flex items-center justify-between">
              <p className="text-sm font-medium text-destructive">Delete this page permanently?</p>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteConfirm(null)}
                  className="h-8"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(page.id)}
                  className="h-8"
                  disabled={deletePage.isPending}
                  data-testid="confirm-delete-page"
                >
                  {deletePage.isPending ? "..." : "Delete"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1
            className="text-4xl font-black tracking-tight mb-2"
            data-testid="page-builder-heading"
          >
            Page Builder
          </h1>
          <p className="text-muted-foreground font-medium">
            Manage your website content, guest portal, and staff tools.
          </p>
        </div>
        {hasPermission("pages.edit") && (
          <Link to="/admin/pages/new" data-testid="new-page-btn">
            <Button className="rounded-full px-6 shadow-lg shadow-primary/20">
              <FileText className="w-4 h-4 mr-2" />
              Create Custom Page
            </Button>
          </Link>
        )}
      </div>

      <Tabs defaultValue="custom" className="w-full">
        <TabsList className="bg-stone-100 p-1 rounded-full mb-6">
          <TabsTrigger
            value="custom"
            className="rounded-full px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm"
            data-testid="custom-pages-tab"
          >
            Custom
          </TabsTrigger>
          <TabsTrigger
            value="public"
            className="rounded-full px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm"
            data-testid="public-pages-tab"
          >
            Public
          </TabsTrigger>
          <TabsTrigger
            value="guest"
            className="rounded-full px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm"
            data-testid="guest-pages-tab"
          >
            Guest
          </TabsTrigger>
          <TabsTrigger
            value="staff"
            className="rounded-full px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm"
            data-testid="staff-pages-tab"
          >
            Staff
          </TabsTrigger>
        </TabsList>

        <TabsContent value="custom" className="space-y-4 outline-none" data-testid="pages-list">
          {!pages || !Array.isArray(pages.data) || pages.data.length === 0 ? (
            <div className="text-center py-20 bg-stone-50 rounded-3xl border-2 border-dashed border-stone-200">
              <FileText className="w-12 h-12 mx-auto text-stone-300 mb-4" />
              <p className="text-stone-500 font-medium">
                You haven't created any custom pages yet.
              </p>
              <Link to="/admin/pages/new" className="mt-4 inline-block">
                <Button variant="outline" className="rounded-full">
                  Get Started
                </Button>
              </Link>
            </div>
          ) : (
            pages.data.map((page: CustomPage) => renderPageCard(page))
          )}
        </TabsContent>

        <TabsContent value="public" className="space-y-4 outline-none">
          {SYSTEM_PAGES.filter((p) => p.category === "public").map((page) =>
            renderPageCard(page, true)
          )}
        </TabsContent>

        <TabsContent value="guest" className="space-y-4 outline-none">
          {SYSTEM_PAGES.filter((p) => p.category === "guest").map((page) =>
            renderPageCard(page, true)
          )}
        </TabsContent>

        <TabsContent value="staff" className="space-y-4 outline-none">
          {SYSTEM_PAGES.filter((p) => p.category === "staff").map((page) =>
            renderPageCard(page, true)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
