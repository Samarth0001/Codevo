import Navbar from "@/components/homepage/Navbar";
import Hero from "@/components/homepage/Hero";
import Features from "@/components/homepage/Features";
import HowItWorks from "@/components/homepage/HowItWorks";
import Testimonials from "@/components/homepage/Testimonials";
import Pricing from "@/components/homepage/Pricing";
import CTA from "@/components/homepage/CTA";
import Footer from "@/components/homepage/Footer";
import Spinner from "@/components/auth/Spinner";
import { AuthContext } from "@/context/AuthContext";
import { useContext } from "react";

const Index = () => {
  const {loading} = useContext(AuthContext);
  if(loading){
    return (
      <div className="w-screen h-screen">
        <Spinner/>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-dark-bg text-white">
      <Navbar />
      <main>
        <div className="w-11/12 mx-auto">
          <Hero />
          <Features />
          <HowItWorks />
        </div>
        <Testimonials />
        <Pricing />
        <CTA />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
