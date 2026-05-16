import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import {
  Users,
  Settings,
  BedDouble,
  ClipboardList,
  LayoutGrid,
  Package,
  Calendar,
  UtensilsCrossed,
  BarChart3,
  History,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface DashboardCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  roles: string[];
}

const DASHBOARD_CARDS: DashboardCard[] = [
  // Staff Cards
  {
    id: "pos",
    title: "POS System",
    description: "Create and manage orders",
    icon: <UtensilsCrossed className="h-6 w-6" />,
    href: "/pos",
    roles: ["admin", "manager", "chef", "pos", "housekeeping"],
  },
  {
    id: "orders",
    title: "Order Management",
    description: "Monitor and update order status",
    icon: <ClipboardList className="h-6 w-6" />,
    href: "/orders",
    roles: ["admin", "manager", "chef", "pos", "housekeeping"],
  },
  {
    id: "housekeeping",
    title: "Housekeeping",
    description: "Manage room cleaning and status",
    icon: <ShieldCheck className="h-6 w-6" />,
    href: "/housekeeping",
    roles: ["admin", "manager", "housekeeping", "chef"],
  },
  {
    id: "inventory",
    title: "Inventory",
    description: "Check stock and supplies",
    icon: <Package className="h-6 w-6" />,
    href: "/inventory",
    roles: ["admin", "manager", "chef"],
  },
  {
    id: "roster",
    title: "Staff Roster",
    description: "View staff schedules",
    icon: <Calendar className="h-6 w-6" />,
    href: "/roster",
    roles: ["admin", "manager", "chef"],
  },
  // Admin-only Cards
  {
    id: "users",
    title: "User Management",
    description: "Manage system users and access",
    icon: <Users className="h-6 w-6" />,
    href: "/admin/users",
    roles: ["admin", "manager"],
  },
  {
    id: "roles",
    title: "Role Management",
    description: "Configure role permissions",
    icon: <ShieldCheck className="h-6 w-6" />,
    href: "/admin/roles",
    roles: ["admin"],
  },
  {
    id: "rooms",
    title: "Room Manager",
    description: "Manage property rooms and types",
    icon: <BedDouble className="h-6 w-6" />,
    href: "/admin/rooms",
    roles: ["admin", "manager"],
  },
  {
    id: "settings",
    title: "Branding & Settings",
    description: "Configure application branding",
    icon: <Settings className="h-6 w-6" />,
    href: "/admin/settings",
    roles: ["admin"],
  },
  {
    id: "reports",
    title: "Financial Reports",
    description: "View performance and analytics",
    icon: <BarChart3 className="h-6 w-6" />,
    href: "/admin/reports",
    roles: ["admin", "manager"],
  },
  // Guest Cards
  {
    id: "stay",
    title: "My Stay",
    description: "View your current reservation",
    icon: <BedDouble className="h-6 w-6" />,
    href: "/guest/stay",
    roles: ["guest"],
  },
  {
    id: "live-bill",
    title: "Live Bill",
    description: "Track your current charges",
    icon: <BarChart3 className="h-6 w-6" />,
    href: "/guest/live-bill",
    roles: ["guest"],
  },
  {
    id: "profile",
    title: "My Profile",
    description: "Update your personal information",
    icon: <UserCheck className="h-6 w-6" />,
    href: "/guest/profile",
    roles: ["guest"],
  },
];

export function DashboardGrid() {
  const { user } = useAuth();

  if (!user) return null;

  const accessibleCards = DASHBOARD_CARDS.filter(
    (card) =>
      card.roles.includes(user.role) || (user.role === "admin" && !card.roles.includes("guest"))
  );

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      data-testid="dashboard-cards"
    >
      {accessibleCards.map((card) => (
        <Link
          key={card.id}
          to={card.href}
          data-testid={`dashboard-card-${card.id}`}
          className="block group"
        >
          <Card className="h-full hover:border-primary/50 transition-all hover:shadow-md active:scale-[0.98]">
            <CardHeader className="flex flex-row items-center gap-4 space-y-0">
              <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                {card.icon}
              </div>
              <div>
                <CardTitle className="text-lg">{card.title}</CardTitle>
                <CardDescription className="line-clamp-1">{card.description}</CardDescription>
              </div>
            </CardHeader>
          </Card>
        </Link>
      ))}
    </div>
  );
}
