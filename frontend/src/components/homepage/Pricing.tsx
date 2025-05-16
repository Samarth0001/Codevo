
import Button from "@/components/ui/button-custom";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "0",
    features: [
      "Unlimited personal projects",
      "Up to 3 collaborators",
      "Basic IDE features",
      "Terminal access",
      "500MB storage",
      "Community support"
    ],
    isPopular: false,
    buttonVariant: "outline" as const
  },
  {
    name: "Pro",
    price: "12",
    features: [
      "Unlimited projects",
      "Up to 10 collaborators",
      "Advanced IDE features",
      "Terminal with sudo access",
      "5GB storage",
      "Priority support",
      "Custom domains",
      "Private projects"
    ],
    isPopular: true,
    buttonVariant: "default" as const
  },
  {
    name: "Team",
    price: "39",
    features: [
      "Everything in Pro",
      "Unlimited collaborators",
      "Team management",
      "Role-based permissions",
      "20GB storage",
      "24/7 dedicated support",
      "Advanced analytics",
      "SSO Authentication"
    ],
    isPopular: false,
    buttonVariant: "outline" as const
  }
];

const Pricing = () => {
  return (
    <section id="pricing" className="py-20 bg-dark-bg">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-gray-400">
            Choose the plan that's right for you and start coding today.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <div 
              key={index} 
              className={`glass-card transition-all duration-300 ${
                plan.isPopular 
                  ? "border-2 border-codevo-blue shadow-lg shadow-codevo-blue/20 relative z-10 scale-105" 
                  : "border-dark-border hover:border-dark-highlight hover:shadow-sm"
              }`}
            >
              {plan.isPopular && (
                <div className="absolute -top-4 inset-x-0 flex justify-center">
                  <div className="bg-codevo-blue text-white px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </div>
                </div>
              )}
              
              <div className="p-6 md:p-8">
                <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-bold text-white">${plan.price}</span>
                  <span className="ml-1 text-gray-400">/month</span>
                </div>
                
                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center text-gray-300">
                      <Check className="h-5 w-5 text-codevo-blue shrink-0 mr-2" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <div className="mt-8">
                  <Button 
                    className={`w-full ${
                      plan.isPopular 
                        ? "bg-codevo-blue hover:bg-codevo-dark-blue text-white" 
                        : "text-white bg-dark-accent/30 hover:bg-codevo-blue/80 border-codevo-blue/50"
                    } transition-colors duration-300`}
                    variant={plan.buttonVariant}
                  >
                    {index === 0 ? "Get Started" : "Subscribe"}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-12 text-center">
          <p className="text-gray-400">
            Need a custom solution for your enterprise? <a href="#" className="text-codevo-blue font-medium hover:underline">Contact us</a>
          </p>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
