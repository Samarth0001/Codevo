
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Minimize } from "lucide-react";
import { Shell } from "./Shell";
import { Console } from "./Console";

interface TerminalPanelProps {
  terminalTab: 'shell' | 'console';
  setTerminalTab: (tab: 'shell' | 'console') => void;
  toggleTerminal: () => void;
}

export const TerminalPanel = ({ 
  terminalTab, 
  setTerminalTab, 
  toggleTerminal 
}: TerminalPanelProps) => {
  return (
    <div className="h-full w-full flex flex-col bg-gray-900">
      <Tabs 
        value={terminalTab}
        onValueChange={(val) => setTerminalTab(val as 'shell' | 'console')}
        className="h-full w-full flex flex-col"
      >
        <div className="flex justify-between items-center p-1 bg-gray-800 border-b border-gray-700">
          <TabsList className="bg-gray-700 h-8">
            <TabsTrigger value="shell" className="h-6 text-xs data-[state=active]:bg-gray-600">Shell</TabsTrigger>
            <TabsTrigger value="console" className="h-6 text-xs data-[state=active]:bg-gray-600">Console</TabsTrigger>
          </TabsList>
          <Button variant="ghost" size="sm" onClick={toggleTerminal} className="h-6 w-6 p-0">
            <Minimize size={14} />
          </Button>
        </div>
        <TabsContent value="shell" className="p-0 flex-1 overflow-hidden h-full">
          <Shell />
        </TabsContent>
        <TabsContent value="console" className="p-0 flex-1 overflow-hidden h-full">
          <Console />
        </TabsContent>
      </Tabs>
    </div>
  );
};
