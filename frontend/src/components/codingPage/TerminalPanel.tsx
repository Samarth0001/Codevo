import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Minimize } from "lucide-react";
import { Shell } from "./Shell";
import { Console } from "./Console";
import { Socket } from "socket.io-client";

interface TerminalPanelProps {
  terminalTab: 'shell' | 'console';
  setTerminalTab: (tab: 'shell' | 'console') => void;
  toggleTerminal: () => void;
  socket?: Socket | null;
}

export const TerminalPanel = ({ 
  terminalTab, 
  setTerminalTab, 
  toggleTerminal,
  socket
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
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={toggleTerminal} className="h-6 w-6 p-0">
              <Minimize size={14} />
            </Button>
          </div>
        </div>
        <TabsContent value="shell" className="p-0 flex-1 overflow-hidden h-full">
          <Shell socket={socket} />
        </TabsContent>
        <TabsContent value="console" className="p-0 flex-1 overflow-hidden h-full">
          <Console />
        </TabsContent>
      </Tabs>
    </div>
  );
};
