
import React from "react";
import Button from "@/components/ui/button-custom";

const CTA: React.FC = () => {
  return (
    <section className="py-20 bg-dark-card relative overflow-hidden">
      <div className="absolute -z-10 w-full h-full">
        <div className="absolute top-0 left-0 w-1/3 h-1/3 bg-blue-500/10 blur-3xl rounded-full"></div>
        <div className="absolute bottom-0 right-0 w-1/3 h-1/3 bg-cyan-500/10 blur-3xl rounded-full"></div>
      </div>
      
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">
            Ready to Transform Your Development Workflow?
          </h2>
          <p className="text-xl mb-8 text-gray-300">
            Join thousands of developers who are building faster and collaborating better with Codevo.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              variant="default"
              className="text-lg py-6 px-8 shadow-md shadow-blue-500/20"
            >
              Get Started for Free
            </Button>
            <Button 
              variant="outline"
              className="text-lg py-6 px-8"
            >
              Schedule a Demo
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;
