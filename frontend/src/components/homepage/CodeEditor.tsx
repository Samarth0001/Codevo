
const CodeEditor = () => {
  return (
    <div className="flex flex-col h-96">
      <div className="flex items-center bg-gray-900 px-4 py-2 border-b border-gray-800">
        <div className="flex space-x-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
        </div>
        <div className="flex-1 flex justify-center">
          <div className="px-3 py-1 text-xs text-gray-300 bg-gray-800 rounded-md">
            index.js - Codevo
          </div>
        </div>
        <div className="text-gray-400 text-xs">
          <span className="mr-2">Connected</span>
          <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
        </div>
      </div>
      
      <div className="bg-gray-900 flex-1 p-4 font-mono text-sm overflow-hidden">
        <div className="flex">
          <div className="text-gray-500 mr-4 select-none">
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className="h-6">{i + 1}</div>
            ))}
          </div>
          
          <div className="text-gray-200 flex-1">
            <div className="h-6">
              <span className="text-blue-400">import</span>
              <span className="text-white"> React </span>
              <span className="text-blue-400">from</span>
              <span className="text-white"> </span>
              <span className="text-green-400">'react'</span>
              <span className="text-white">;</span>
            </div>
            <div className="h-6 text-white">
              <span className="text-blue-400">import</span>
              <span className="text-white"> ReactDOM </span>
              <span className="text-blue-400">from</span>
              <span className="text-white"> </span>
              <span className="text-green-400">'react-dom'</span>
              <span className="text-white">;</span>
            </div>
            <div className="h-6"></div>
            <div className="h-6 text-yellow-400">
              <span>// Collaborative real-time editor</span>
            </div>
            <div className="h-6 text-pink-400">
              <span>function</span>
              <span className="text-blue-300"> App</span>
              <span className="text-white">() {`{`}</span>
            </div>
            <div className="h-6 pl-4 text-white">
              <span className="text-blue-400">return</span>
              <span> (</span>
            </div>
            <div className="h-6 pl-8 text-white">
              <span className="text-gray-300">{`<`}</span>
              <span className="text-codevo-blue">div</span>
              <span className="text-codevo-light-blue"> className</span>
              <span className="text-white">=</span>
              <span className="text-green-400">"container"</span>
              <span className="text-gray-300">{`>`}</span>
            </div>
            <div className="h-6 pl-12 text-white">
              <span className="text-gray-300">{`<`}</span>
              <span className="text-codevo-blue">h1</span>
              <span className="text-gray-300">{`>`}</span>
              <span className="text-white">Welcome to Codevo</span>
              <span className="text-gray-300">{`</`}</span>
              <span className="text-codevo-blue">h1</span>
              <span className="text-gray-300">{`>`}</span>
            </div>
            <div className="h-6 pl-12 text-white">
              <span className="relative animate-pulse">|</span>
            </div>
            <div className="h-6 pl-8 text-white">
              <span className="text-gray-300">{`</`}</span>
              <span className="text-codevo-blue">div</span>
              <span className="text-gray-300">{`>`}</span>
            </div>
            <div className="h-6 pl-4 text-white">);</div>
            <div className="h-6 text-white">{`}`}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;
