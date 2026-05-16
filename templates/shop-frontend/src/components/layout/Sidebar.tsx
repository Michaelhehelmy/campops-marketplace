import { NavLink, useNavigate } from "react-router-dom";
import { useAuth, getDashboardPath } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import {
  LayoutDashboard,
  Users,
  Shield,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Puzzle,
  Server,
  User,
  Bug,
} from "lucide-react";
import { useState } from "react";
import { BrandLogo } from "@/components/branding/BrandLogo";
import { usePluginMenuItems } from "@/lib/pluginRegistry";
import { PluginSlot, Slots } from "@/components/PluginSlot";

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const pluginMenuItems = usePluginMenuItems();

  const role = user?.role || "guest";
  const dashboardPath = user ? getDashboardPath(user.role) : "/";

  // Core Admin Navigation Only
  const adminNav: NavItem[] = [
    { to: dashboardPath, label: "Dashboard", icon: <LayoutDashboard size={20} /> },
    { to: "/admin/users", label: "Users", icon: <Users size={20} /> },
    { to: "/admin/roles", label: "Roles & Permissions", icon: <Shield size={20} /> },
    { to: "/admin/plugins", label: "Plugins", icon: <Puzzle size={20} /> },
    { to: "/admin/settings", label: "Settings", icon: <Settings size={20} /> },
    { to: "/admin/system", label: "System Admin", icon: <Server size={20} /> },
    { to: "/admin/bug-reports", label: "Bug Reports", icon: <Bug size={20} /> },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (role !== "admin" && role !== "manager") {
    return null; // For this clean core, we only show admin sidebar
  }

  return (
    <aside
      className={`fixed md:static inset-y-0 left-0 z-50 flex flex-col bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))] transition-all duration-300 transform 
        ${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0
        ${collapsed ? "md:w-20" : "md:w-72"} w-72`}
    >
      <div className="flex flex-col items-center py-8 px-4 border-b border-[hsl(var(--sidebar-border))]">
        {!collapsed ? (
          <BrandLogo color="white" className="scale-[1.4] transition-all duration-500" />
        ) : (
          <BrandLogo
            variant="icon"
            color="white"
            className="scale-110 transition-all duration-500"
          />
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="absolute right-[-12px] top-12 bg-[hsl(var(--sidebar-background))] border border-[hsl(var(--sidebar-border))] rounded-full h-6 w-6 hidden md:flex text-white hover:bg-[hsl(var(--sidebar-accent))]"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
        {adminNav.map((item) => (
          <NavLink
            key={`${item.to}-${item.label}`}
            to={item.to}
            end={item.to === "/"}
            onClick={() => onClose?.()}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-[hsl(var(--sidebar-accent))] text-white"
                  : "text-white/60 hover:bg-[hsl(var(--sidebar-accent))] hover:text-white"
              } ${collapsed ? "justify-center px-0" : ""}`
            }
            title={collapsed ? item.label : undefined}
          >
            <span className={collapsed ? "" : "min-w-[20px]"}>{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}

        {/* Plugin-injected nav items from registry */}
        {pluginMenuItems.map((item) => (
          <NavLink
            key={`plugin-${item.id}`}
            to={item.path}
            onClick={() => onClose?.()}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-[hsl(var(--sidebar-accent))] text-white"
                  : "text-white/60 hover:bg-[hsl(var(--sidebar-accent))] hover:text-white"
              } ${collapsed ? "justify-center px-0" : ""}`
            }
            title={collapsed ? item.label : undefined}
          >
            <span className={`${collapsed ? "" : "min-w-[20px]"} opacity-60`}>•</span>
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}

        {/* Plugin slot for custom nav components */}
        <PluginSlot name={Slots.NAV_MAIN} props={{ collapsed, onClose }} />
      </nav>

      <div className="border-t border-[hsl(var(--sidebar-border))] p-6 bg-[hsl(var(--sidebar-accent))]/30">
        {!collapsed && user && (
          <div className="mb-4 flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white border border-white/20">
              <User size={20} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-white truncate">{user.full_name}</span>
              <span className="text-xs text-white/50 uppercase tracking-wider font-semibold">
                {user.role}
              </span>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          className={`w-full rounded-lg transition-colors ${collapsed ? "justify-center" : "justify-start"} text-white/60 hover:text-white hover:bg-white/5`}
          onClick={handleLogout}
        >
          <LogOut size={18} />
          {!collapsed && <span className="ml-3 font-medium">Logout</span>}
        </Button>
      </div>
    </aside>
  );
}
