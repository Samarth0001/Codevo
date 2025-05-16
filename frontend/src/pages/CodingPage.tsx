import { useEffect, useState } from "react";
import { FileExplorer } from "@/components/codingPage/FileExplorer";
import { Preview } from "@/components/codingPage/Preview";
import EditorHeader from "@/components/codingPage/EditorHead";
import { ActionSidebar } from "@/components/codingPage/ActionSidebar";
import { CodeEditorPanel } from "@/components/codingPage/CodeEditorPanel";
import { TerminalPanel } from "@/components/codingPage/TerminalPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ChevronLeft, X } from "lucide-react";
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";

type TabType = 'preview' | 'shell' | 'console';

const CodingPage = () => {
  const [showFileExplorer, setShowFileExplorer] = useState(true);
  const [activeTabs, setActiveTabs] = useState<TabType[]>([]);
  const [selectedTab, setSelectedTab] = useState<TabType | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState("vs-dark");
  const [isRightLayout, setIsRightLayout] = useState(false);

  const addTab = (tab: TabType) => {
    if (!activeTabs.includes(tab)) {
      setActiveTabs([...activeTabs, tab]);
      setSelectedTab(tab);
    } else {
      setSelectedTab(tab);
    }
  };

  const removeTab = (tab: TabType) => {
    const newTabs = activeTabs.filter(t => t !== tab);
    setActiveTabs(newTabs);
    if (selectedTab === tab) {
      setSelectedTab(newTabs.length > 0 ? newTabs[newTabs.length - 1] : null);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const toggleLayout = () => {
    setIsRightLayout(!isRightLayout);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-gray-900 text-white overflow-hidden">
      {/* Header */}
      <EditorHeader 
        isFullscreen={isFullscreen} 
        toggleFullscreen={toggleFullscreen}
        toggleTerminal={() => addTab('shell')}
        togglePreview={() => addTab('preview')}
        toggleLayout={toggleLayout}
        isRightLayout={isRightLayout}
      />

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Vertical action sidebar */}
        <ActionSidebar 
          showFileExplorer={showFileExplorer}
          showTerminal={activeTabs.includes('shell')}
          showPreview={activeTabs.includes('preview')}
          toggleFileExplorer={() => setShowFileExplorer(!showFileExplorer)}
          toggleTerminal={() => addTab('shell')}
          togglePreview={() => addTab('preview')}
        />

        {/* Main layout */}
        <div className="flex-1 h-full relative">
          {isRightLayout ? (
            <PanelGroup direction="horizontal">
              {showFileExplorer && (
                <>
                  <Panel defaultSize={10} minSize={10} maxSize={30}>
                    <div className="h-full relative">
                      <FileExplorer />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute -right-3 top-1/2 -translate-y-1/2 bg-white hover:bg-gray-700 border border-gray-700 rounded-full h-12 w-8"
                        onClick={() => setShowFileExplorer(false)}
                      >
                        <ChevronLeft size={14} color="black"/>
                      </Button>
                    </div>
                  </Panel>
                  <PanelResizeHandle className="w-1 bg-gray-700 hover:bg-blue-500 transition-colors" />
                </>
              )}
              <Panel defaultSize={showFileExplorer ? 90 : 100}>
                <PanelGroup direction="horizontal">
                  <Panel defaultSize={70} minSize={30}>
                    <CodeEditorPanel 
                      currentTheme={currentTheme}
                      setCurrentTheme={setCurrentTheme}
                    />
                  </Panel>
                  {activeTabs.length > 0 && (
                    <>
                      <PanelResizeHandle className="w-1 bg-gray-700 hover:bg-blue-500 transition-colors" />
                      <Panel defaultSize={30} minSize={20}>
                        <div className="h-full flex flex-col border-l border-gray-700">
                          <Tabs value={selectedTab || undefined} onValueChange={(val) => setSelectedTab(val as TabType)} className="flex flex-col h-full">
                            <TabsList className="bg-gray-800 border-b border-gray-700 flex ">
                              {activeTabs.map((tab) => (
                                <div key={tab} className="flex items-center ">
                                  <TabsTrigger 
                                    value={tab} 
                                    className="data-[state=active]:bg-gray-700 "
                                  >
                                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                  </TabsTrigger>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 p-0 hover:bg-gray-700"
                                    onClick={() => removeTab(tab)}
                                  >
                                    <X size={14} />
                                  </Button>
                                </div>
                              ))}
                            </TabsList>
                            <div className="flex-1 min-h-0">
                              {activeTabs.map((tab) => (
                                <TabsContent key={tab} value={tab} className="h-full m-0">
                                  {tab === 'preview' && <Preview />}
                                  {tab === 'shell' && (
                                    <TerminalPanel 
                                      terminalTab="shell"
                                      setTerminalTab={() => {}}
                                      toggleTerminal={() => removeTab('shell')}
                                    />
                                  )}
                                  {tab === 'console' && (
                                    <TerminalPanel 
                                      terminalTab="console"
                                      setTerminalTab={() => {}}
                                      toggleTerminal={() => removeTab('console')}
                                    />
                                  )}
                                </TabsContent>
                              ))}
                            </div>
                          </Tabs>
                        </div>
                      </Panel>
                    </>
                  )}
                </PanelGroup>
              </Panel>
            </PanelGroup>
          ) : (
            <PanelGroup direction="horizontal">
              {showFileExplorer && (
                <>
                  <Panel defaultSize={10} minSize={10} maxSize={30}>
                    <div className="h-full relative">
                      <FileExplorer />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute -right-3 top-1/2 -translate-y-1/2 bg-white hover:bg-gray-700 border border-gray-700 rounded-full h-12 w-8"
                        onClick={() => setShowFileExplorer(false)}
                      >
                        <ChevronLeft size={14} color="black"/>
                      </Button>
                    </div>
                  </Panel>
                  <PanelResizeHandle className="w-1 bg-gray-700 hover:bg-blue-500 transition-colors" />
                </>
              )}
              <Panel defaultSize={showFileExplorer ? 90 : 100}>
                <PanelGroup direction="vertical">
                  <Panel defaultSize={70} minSize={30}>
                    <CodeEditorPanel 
                      currentTheme={currentTheme}
                      setCurrentTheme={setCurrentTheme}
                    />
                  </Panel>
                  {activeTabs.length > 0 && (
                    <>
                      <PanelResizeHandle className="h-1 bg-gray-700 hover:bg-blue-500 transition-colors" />
                      <Panel defaultSize={30} minSize={20}>
                        <div className="h-full flex flex-col border-t border-gray-700">
                          <Tabs value={selectedTab || undefined} onValueChange={(val) => setSelectedTab(val as TabType)} className="flex flex-col h-full">
                            <TabsList className="bg-gray-800 border-b border-gray-700 shrink-0">
                              {activeTabs.map((tab) => (
                                <div key={tab} className="flex items-center">
                                  <TabsTrigger 
                                    value={tab} 
                                    className="data-[state=active]:bg-gray-700"
                                  >
                                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                  </TabsTrigger>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 p-0 hover:bg-gray-700"
                                    onClick={() => removeTab(tab)}
                                  >
                                    <X size={14} />
                                  </Button>
                                </div>
                              ))}
                            </TabsList>
                            <div className="flex-1 min-h-0">
                              {activeTabs.map((tab) => (
                                <TabsContent key={tab} value={tab} className="h-full m-0">
                                  {tab === 'preview' && <Preview />}
                                  {tab === 'shell' && (
                                    <TerminalPanel 
                                      terminalTab="shell"
                                      setTerminalTab={() => {}}
                                      toggleTerminal={() => removeTab('shell')}
                                    />
                                  )}
                                  {tab === 'console' && (
                                    <TerminalPanel 
                                      terminalTab="console"
                                      setTerminalTab={() => {}}
                                      toggleTerminal={() => removeTab('console')}
                                    />
                                  )}
                                </TabsContent>
                              ))}
                            </div>
                          </Tabs>
                        </div>
                      </Panel>
                    </>
                  )}
                </PanelGroup>
              </Panel>
            </PanelGroup>
          )}
        </div>
      </div>
    </div>
  );
};

export default CodingPage;
