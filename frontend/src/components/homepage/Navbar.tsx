import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from "@/components/ui/button-custom";
import { Menu, X } from 'lucide-react';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="bg-dark-bg/70 backdrop-blur-lg sticky top-0 z-50 py-4 border-b border-dark-border/50">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <div className="flex items-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-codevo-blue to-codevo-cyan rounded-md flex items-center justify-center glow">
              <span className="text-white font-bold text-lg">&lt;/&gt;</span>
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-codevo-blue to-codevo-cyan glow-text">
              Codevo
            </span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-6">
          <a href="#features" className="text-gray-300 hover:text-codevo-blue transition-colors">
            Features
          </a>
          <a href="#how-it-works" className="text-gray-300 hover:text-codevo-blue transition-colors">
            How It Works
          </a>
          <a href="#testimonials" className="text-gray-300 hover:text-codevo-blue transition-colors">
            Testimonials
          </a>
          <a href="#pricing" className="text-gray-300 hover:text-codevo-blue transition-colors">
            Pricing
          </a>
        </div>

        <div className="hidden md:flex items-center space-x-4">
          <Link to="/login">
            <Button variant="outline" className="border-dark-border text-white hover:bg-dark-accent/50 hover:border-codevo-blue transition-colors">
              Log In
            </Button>
          </Link>
          <Link to="/signup">
            <Button className="bg-codevo-blue hover:bg-codevo-dark-blue text-white transition-all duration-300">
              Sign Up Free
            </Button>
          </Link>
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden">
          <button
            onClick={toggleMenu}
            className="p-2 rounded-md text-gray-300 hover:text-codevo-blue transition-colors"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-dark-card/95 backdrop-blur-lg absolute left-0 right-0 top-16 shadow-lg z-50 animate-fade-in border-b border-dark-border/50">
          <div className="container mx-auto px-4 py-4 flex flex-col space-y-4">
            <a 
              href="#features" 
              className="p-2 text-gray-300 hover:text-codevo-blue hover:bg-dark-accent/30 rounded-md transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Features
            </a>
            <a 
              href="#how-it-works" 
              className="p-2 text-gray-300 hover:text-codevo-blue hover:bg-dark-accent/30 rounded-md transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              How It Works
            </a>
            <a 
              href="#testimonials" 
              className="p-2 text-gray-300 hover:text-codevo-blue hover:bg-dark-accent/30 rounded-md transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Testimonials
            </a>
            <a 
              href="#pricing" 
              className="p-2 text-gray-300 hover:text-codevo-blue hover:bg-dark-accent/30 rounded-md transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Pricing
            </a>
            <div className="flex flex-col space-y-2 pt-2 border-t border-dark-border">
              <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                <Button variant="outline" className="border-dark-border text-white hover:bg-dark-accent/50 hover:border-codevo-blue transition-colors w-full">
                  Log In
                </Button>
              </Link>
              <Link to="/signup" onClick={() => setIsMenuOpen(false)}>
                <Button className="bg-codevo-blue hover:bg-codevo-dark-blue text-white transition-all duration-300 w-full">
                  Sign Up Free
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
