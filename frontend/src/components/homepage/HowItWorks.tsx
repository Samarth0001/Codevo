
import Button from "@/components/ui/button-custom";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const steps = [
  {
    number: "01",
    title: "Create a Project",
    description: "Start from scratch or choose from our templates. Import existing repositories from GitHub.",
    videoUrl: "https://res.cloudinary.com/dyk6yrjqz/video/upload/v1755336691/project-creation-video_khdrvk.mp4"
  },
  {
    number: "02",
    title: "Write & Execute Code",
    description: "Use our powerful IDE to write code. Run it instantly with our integrated terminal.",
    videoUrl: "https://res.cloudinary.com/dyk6yrjqz/video/upload/v1755336691/executing-code-video_v0fnuc.mp4"
  },
  {
    number: "03",
    title: "Collaborate in Real-time",
    description: "Invite teammates to code alongside you. See changes, chat, and solve problems together.",
    videoUrl: "https://res.cloudinary.com/dyk6yrjqz/video/upload/v1755336691/invite-collag-video_xfvdzm.mp4"
  },
  {
    number: "04",
    title: "Preview Your Application",
    description: "See your application running in real-time. Test and debug with live preview functionality.",
    videoUrl: "https://res.cloudinary.com/dyk6yrjqz/video/upload/v1755336692/preview-video_ivaylr.mp4" // Replace with your video URL
  },
  {
    number: "05",
    title: "Connect to Github & Get Version Control",
    description: "Deploy your application with a single click. Share your projects with custom URLs.",
    videoUrl: "https://res.cloudinary.com/dyk6yrjqz/video/upload/v1756630671/Git-video_ocisky.mp4"
  },
  {
    number: "06",
    title: "AI-Powered Code Assistant",
    description: "Get instant code generation, explanations, and learning support. Ask questions, get code suggestions, and understand complex concepts with our intelligent AI chatbot.",
    videoUrl: "https://res.cloudinary.com/dyk6yrjqz/video/upload/v1757165529/Ai-chatbot-video_qvdevw.mp4"
  }
];

const HowItWorks = () => {
  const [visibleVideos, setVisibleVideos] = useState<number[]>([]);
  const videoRefs = useRef<(HTMLDivElement | null)[]>([]);
  const navigate = useNavigate();


  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = parseInt(entry.target.getAttribute('data-index') || '0');
          if (entry.isIntersecting) {
            setVisibleVideos(prev => [...prev, index]);
          } else {
            setVisibleVideos(prev => prev.filter(i => i !== index));
          }
        });
      },
      {
        threshold: 0.3,
        rootMargin: '0px 0px -100px 0px'
      }
    );

    videoRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

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
              
                <div 
                 ref={(el) => (videoRefs.current[index] = el)}
                 data-index={index}
                 className={`w-full md:w-1/2 bg-dark-card rounded-xl p-4 h-80 flex items-center justify-center border border-dark-border overflow-hidden transition-all duration-700 ease-out ${
                   visibleVideos.includes(index) 
                     ? 'scale-110 h-96 shadow-2xl shadow-blue-500/30' 
                     : 'scale-100 h-80'
                 } hover:scale-120 hover:h-[130%] hover:w-[130%] hover:shadow-2xl hover:shadow-blue-500/20`}
               >
                {step.videoUrl && (step.videoUrl.endsWith('.mp4') || step.videoUrl.endsWith('.webm') || step.videoUrl.endsWith('.mov') || step.videoUrl.includes('commondatastorage.googleapis.com') || step.videoUrl.includes('sample-videos.com')) ? (
                  <div className="w-full h-full relative">
                      <video 
                        src={step.videoUrl} 
                        className="w-full h-full object-cover rounded-lg transition-all duration-300 ease-in-out"
                        muted
                        loop
                        autoPlay
                        playsInline
                        preload="metadata"
                        poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25'%3E%3Crect width='100%25' height='100%25' fill='%23374151'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239CA3AF' font-family='Arial' font-size='16'%3ELoading Video...%3C/text%3E%3C/svg%3E"
                      onError={(e) => {
                        // console.error(`Video failed to load: ${step.videoUrl}`, e);
                        const videoElement = e.target as HTMLVideoElement;
                        const container = videoElement.parentElement;
                        if (container) {
                          container.innerHTML = `
                            <div class="text-gray-500 text-center w-full h-full flex flex-col items-center justify-center">
                              <div class="mb-2 text-4xl">📹</div>
                              <div class="text-lg font-medium">Video for Step ${step.number}</div>
                              <div class="text-sm mt-2 text-gray-400">Video could not be loaded</div>
                              <div class="text-xs mt-1 text-gray-500">Check the video URL: ${step.videoUrl}</div>
                            </div>
                          `;
                        }
                      }}
                      onLoadStart={() => {
                        // console.log(`Video loading started: ${step.videoUrl}`);
                      }}
                      onCanPlay={() => {
                        // console.log(`Video can play: ${step.videoUrl}`);
                      }}
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                ) : (
                  <div className="text-gray-500 text-center">
                    <div className="mb-2 text-4xl">📹</div>
                    <div className="text-lg font-medium">Video for Step {step.number}</div>
                    <div className="text-sm mt-2 text-gray-400">No video URL provided</div>
                    <div className="text-xs mt-1 text-gray-500">Add a video URL to the step configuration</div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-20 text-center">
          <Button className="bg-gradient-to-r from-codevo-blue to-codevo-purple hover:from-codevo-purple hover:to-codevo-blue text-white transition-all duration-300 text-lg py-6 px-8 glow"
          onClick={() => navigate("/signup")}
          >
            Start Building Now
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
