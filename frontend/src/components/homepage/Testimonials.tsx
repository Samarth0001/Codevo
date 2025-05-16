
const testimonials = [
  {
    quote: "Codevo has transformed how our team collaborates. The real-time editing and integrated terminal make our development process seamless.",
    name: "Alex Johnson",
    title: "Senior Developer, TechCorp",
    avatar: "/placeholder.svg"
  },
  {
    quote: "As an educator, Codevo provides the perfect environment for teaching coding. Students can collaborate and I can provide feedback in real-time.",
    name: "Sarah Williams",
    title: "Computer Science Professor, Tech University",
    avatar: "/placeholder.svg"
  },
  {
    quote: "Our startup has been using Codevo since day one. It's incredible how much faster we can iterate and build features with the collaborative environment.",
    name: "Michael Chen",
    title: "CTO, StartupLabs",
    avatar: "/placeholder.svg"
  }
];

const Testimonials = () => {
  return (
    <section id="testimonials" className="py-20 bg-dark-accent">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
            Loved by Developers Worldwide
          </h2>
          <p className="text-lg text-gray-400">
            See what others are saying about their experience with Codevo.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index} 
              className="glass-card p-8 hover:border-dark-highlight transition-all duration-300"
            >
              <div className="mb-6">
                <svg className="h-8 w-8 text-codevo-blue opacity-80" fill="currentColor" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 8v8H6c0 4.4 3.6 8 8 8h2v-8h-4V8h-2zm12 0v8h-4c0 4.4 3.6 8 8 8h2v-8h-4V8h-2z"/>
                </svg>
              </div>
              
              <p className="text-gray-300 mb-6">{testimonial.quote}</p>
              
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-dark-muted mr-3">
                  <img 
                    src={testimonial.avatar} 
                    alt={testimonial.name} 
                    className="h-10 w-10 rounded-full"
                  />
                </div>
                <div>
                  <h4 className="font-medium text-white">{testimonial.name}</h4>
                  <p className="text-sm text-gray-400">{testimonial.title}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
