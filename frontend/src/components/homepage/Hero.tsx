
import Button from "@/components/ui/button-custom";
import CodeEditor from "./CodeEditor";

const Hero = () => {
  return (
    <section className="py-16 md:py-24 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center gap-12">
          <div className="w-full md:w-1/2 space-y-6">
            <div className="inline-flex items-center gap-2 bg-dark-card/60 text-codevo-blue px-3 py-1 rounded-full border border-dark-border">
              <span className="w-2 h-2 bg-codevo-blue rounded-full animate-pulse"></span>
              <span className="text-sm font-medium">Now in public beta</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight max-w-xl">
              Code, Collaborate, <span className="text-gradient glow-text">Create</span>
            </h1>
            
            <div className="typing-container py-3">
              <div className="typing-text text-xl md:text-2xl text-gray-300">
                {"> Build faster together with real-time collaboration"}
              </div>
            </div>
            
            <p className="text-lg text-gray-400 max-w-md">
              The complete development environment for teams. 
              Code together in real-time, with built-in IDE and terminal access.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button className="bg-codevo-blue hover:bg-codevo-dark-blue text-white transition-all duration-300 text-lg py-6 px-8 shadow-md shadow-codevo-blue/20">
                Get Started for Free
              </Button>
              <Button variant="outline" className="border-dark-border hover:border-codevo-blue text-gray-300 hover:text-codevo-blue transition-colors text-lg py-6 px-8">
                View Demo
              </Button>
            </div>
            
            <div className="pt-6">
              <p className="text-sm text-gray-500">
                No credit card required. Free plan includes unlimited personal projects.
              </p>
            </div>
          </div>
          
          <div className="w-full md:w-1/2 md:mt-0 relative">
            <div className="absolute -z-10 w-3/4 h-3/4 bg-gradient-to-r from-codevo-blue/10 to-codevo-cyan/10 rounded-full blur-3xl opacity-30 top-10 right-10"></div>
            <div className="glass-card overflow-hidden shadow-xl shadow-codevo-blue/10">
              <CodeEditor />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
