import { useState } from "react";
import { useLocation } from "wouter";
import { 
  LayoutDashboardIcon, 
  UsersIcon, 
  CreditCardIcon, 
  BarChart3Icon,
  SettingsIcon, 
  ShieldIcon, 
  LogOutIcon,
  GamepadIcon,
  Gamepad2Icon
} from "lucide-react";

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  isActive: boolean;
}

function NavItem({ icon, label, href, isActive }: NavItemProps) {
  const [, navigate] = useLocation();

  return (
    <div
      onClick={() => navigate(href)}
      role="button"
      tabIndex={0}
      className={`w-full text-left px-4 py-3 flex items-center space-x-3 cursor-pointer ${isActive ? 'text-white bg-primary rounded-r-lg mr-4' : 'text-muted-foreground hover:text-foreground transition-colors'}`}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}

export function Sidebar() {
  const [location] = useLocation();

  // Mock user data - in a real app, this would come from your auth system
  const user = {
    name: "John Smith",
    role: "Staff",
    initials: "JS",
  };

  const handleLogout = () => {
    // Handle logout logic
    console.log("Logging out...");
  };

  return (
    <aside className="bg-card w-full md:w-64 flex-shrink-0 border-r border-border flex flex-col">
      <div className="p-4">
        <h1 className="font-gaming font-bold text-2xl text-foreground flex items-center">
          <span className="text-[#7C3AED]">Infinity</span>
          <span className="ml-2">Gaming</span>
        </h1>
        <p className="text-sm text-muted-foreground">POS System</p>
      </div>

      <nav className="mt-6 flex-1">
        <div className="px-4 mb-2 text-xs text-muted-foreground uppercase tracking-wider">
          Main
        </div>
        <NavItem 
          icon={<LayoutDashboardIcon className="h-4 w-4" />} 
          label="Stations" 
          href="/dashboard" 
          isActive={location === "/dashboard"}
        />
        <NavItem 
          icon={<Gamepad2Icon className="h-4 w-4" />} 
          label="Games" 
          href="/games" 
          isActive={location === "/games"}
        />
        <NavItem 
          icon={<UsersIcon className="h-4 w-4" />} 
          label="Customers" 
          href="/customers" 
          isActive={location === "/customers"}
        />
        <NavItem 
          icon={<CreditCardIcon className="h-4 w-4" />} 
          label="Payments" 
          href="/payments" 
          isActive={location === "/payments"}
        />
        <NavItem 
          icon={<BarChart3Icon className="h-4 w-4" />} 
          label="Reports" 
          href="/reports" 
          isActive={location === "/reports"}
        />

        <div className="px-4 mt-6 mb-2 text-xs text-muted-foreground uppercase tracking-wider">
          Management
        </div>
        <NavItem 
          icon={<SettingsIcon className="h-4 w-4" />} 
          label="Settings" 
          href="/settings" 
          isActive={location === "/settings"}
        />
        <NavItem 
          icon={<ShieldIcon className="h-4 w-4" />} 
          label="Admin" 
          href="/admin" 
          isActive={location === "/admin"}
        />
      </nav>

      <div className="p-4 border-t border-border mt-auto">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
            <span className="text-white font-bold">{user.initials}</span>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-foreground">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.role}</p>
          </div>
          <button 
            className="ml-auto text-muted-foreground hover:text-foreground"
            onClick={handleLogout}
          >
            <LogOutIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}