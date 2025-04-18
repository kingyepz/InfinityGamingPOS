import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SeedDataButton } from "@/components/dashboard/SeedDataButton";
import { PlusCircleIcon, SearchIcon, BellIcon } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle: string;
  onNewSession: () => void;
}

export function Header({ title, subtitle, onNewSession }: HeaderProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, you would search stations or customers
    queryClient.invalidateQueries({ 
      queryKey: ['/api/stations'],
      // You would pass the search term as a query parameter
    });
  };

  return (
    <header className="bg-card border-b border-border flex items-center justify-between p-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      
      <div className="flex items-center space-x-4">
        <form onSubmit={handleSearch} className="relative">
          <Input 
            type="text" 
            placeholder="Search stations or customers..." 
            className="pr-10 w-72"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <SearchIcon className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        </form>
        
        <SeedDataButton />

        <Button
          className="bg-primary hover:bg-primary/90 text-white"
          onClick={onNewSession}
        >
          <PlusCircleIcon className="h-4 w-4 mr-2" />
          <span>New Session</span>
        </Button>
        
        <div className="relative">
          <button className="text-muted-foreground hover:text-foreground p-1">
            <BellIcon className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 bg-[#FACC15] text-background rounded-full w-4 h-4 flex items-center justify-center text-xs">3</span>
          </button>
        </div>
      </div>
    </header>
  );
}
