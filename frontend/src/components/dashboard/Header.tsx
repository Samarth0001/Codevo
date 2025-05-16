
import { useState } from "react";
import { Bell, Search } from "lucide-react";
import Button from "@/components/ui/button-custom";

const Header = () => {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <header className="bg-dark-card border-b border-dark-border p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-white">Dashboard</h1>
        </div>

        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="relative hidden md:flex items-center">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="py-2 pl-10 pr-4 block w-64 rounded-md border border-dark-border bg-dark-accent focus:outline-none focus:ring-1 focus:ring-codevo-blue text-white placeholder-gray-400"
              placeholder="Search..."
            />
          </div>

          {/* Notifications */}
          <div className="relative">
            <Button variant="ghost" className="p-2 rounded-full">
              <Bell className="h-5 w-5 text-gray-300" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </Button>
          </div>

          {/* New Project Button */}
          <Button className="bg-codevo-blue hover:bg-codevo-blue/90 text-white">
            New Project
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
