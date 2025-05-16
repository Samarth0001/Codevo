
import Button from "@/components/ui/button-custom";

const steps = [
  {
    number: "01",
    title: "Create a Project",
    description: "Start from scratch or choose from our templates. Import existing repositories from GitHub.",
    image: "/placeholder.svg"
  },
  {
    number: "02",
    title: "Write & Execute Code",
    description: "Use our powerful IDE to write code. Run it instantly with our integrated terminal.",
    image: "/placeholder.svg"
  },
  {
    number: "03",
    title: "Collaborate in Real-time",
    description: "Invite teammates to code alongside you. See changes, chat, and solve problems together.",
    image: "/placeholder.svg"
  },
  {
    number: "04",
    title: "Deploy & Share",
    description: "Deploy your application with a single click. Share your projects with custom URLs.",
    image: "/placeholder.svg"
  }
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-20 bg-dark-bg">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
            Simple, Yet Powerful Workflow
          </h2>
          <p className="text-lg text-gray-400">
            From idea to production in minutes, not hours.
          </p>
        </div>
        
        <div className="space-y-20 md:space-y-32">
          {steps.map((step, index) => (
            <div 
              key={index} 
              className={`flex flex-col ${index % 2 === 1 ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-8 md:gap-16`}
            >
              <div className="w-full md:w-1/2 space-y-4">
                <div className="inline-block px-4 py-2 bg-dark-card text-codevo-blue rounded-lg font-mono border border-dark-border">
                  {step.number}
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-white">{step.title}</h3>
                <p className="text-lg text-gray-400">{step.description}</p>
              </div>
              
              <div className="w-full md:w-1/2 bg-dark-card rounded-xl p-4 h-64 flex items-center justify-center border border-dark-border">
                <img 
                  src={step.image} 
                  alt={step.title} 
                  className="max-h-full" 
                />
                <div className="text-gray-500">Step {step.number} illustration</div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-20 text-center">
          <Button className="bg-gradient-to-r from-codevo-blue to-codevo-purple hover:from-codevo-purple hover:to-codevo-blue text-white transition-all duration-300 text-lg py-6 px-8 glow">
            Start Building Now
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
