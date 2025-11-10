// src/components/landing/LandingPage.jsx
import React from 'react';
import { Shield, TrendingUp, Users, CheckCircle, ArrowRight, Zap, Lock, Globe } from 'lucide-react';

const LandingPage = ({ onEnterApp }) => {
  const features = [
    {
      icon: Shield,
      title: "Regulatory Compliant",
      description: "Built-in KYC/AML verification ensures all transactions meet regulatory standards"
    },
    {
      icon: TrendingUp,
      title: "Fractional Ownership",
      description: "Own a piece of high-value assets that were previously inaccessible"
    },
    {
      icon: Lock,
      title: "Secure & Transparent",
      description: "All transactions are recorded on the OPN blockchain for complete transparency"
    },
    {
      icon: Globe,
      title: "Global Marketplace",
      description: "Access luxury assets from around the world, 24/7"
    }
  ];

  const steps = [
    {
      number: "01",
      title: "Connect & Verify",
      description: "Connect your wallet and complete KYC verification"
    },
    {
      number: "02",
      title: "Browse Assets",
      description: "Explore verified luxury assets in our marketplace"
    },
    {
      number: "03",
      title: "Purchase Fractions",
      description: "Buy fractional ownership with OPN tokens"
    },
    {
      number: "04",
      title: "Trade & Manage",
      description: "Track your portfolio and trade fractions anytime"
    }
  ];

  

  return (
   <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-black/80 backdrop-blur-sm z-50 border-b border-neutral-900">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <a href="/" className="inline-block transition-transform duration-200 hover:scale-105 active:scale-95">
              <img 
                src="/iopn.jpg" 
                alt="OPN Logo" 
                className="h-10 w-auto rounded-sm"
              />
            </a>
            <button
              onClick={onEnterApp}
              className="btn-primary"
            >
              Launch App
            </button>
          </div>
        </div>
      </nav>
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 lg:px-8 overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-light tracking-tight mb-6 animate-fadeIn">
              Democratizing Luxury
              <span className="block text-neutral-400">Through Fractionalization</span>
            </h1>
            <p className="text-xl text-neutral-400 mb-12 max-w-2xl mx-auto animate-fadeIn animation-delay-200">
              Own a piece of verified luxury assets on the OPN blockchain. 
              From rare watches to fine art, make exclusive investments accessible.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fadeIn animation-delay-400">
              <button
                onClick={onEnterApp}
                className="btn-primary text-lg px-8 py-4 flex items-center justify-center space-x-2"
              >
                <span>Enter Marketplace</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              <a
                href="#how-it-works"
                className="btn-secondary text-lg px-8 py-4"
              >
                Learn More
              </a>
            </div>
          </div>
        </div>

        {/* Animated Background Circles with inline styles */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Circle 1 - Large, slow pulse */}
          <div 
            className="absolute -top-40 -right-40 w-96 h-96 rounded-full border border-white/10"
            style={{
              animation: 'pulseSlow 4s ease-in-out infinite'
            }}
          />
          
          {/* Circle 2 - Medium, rotating */}
          <div 
            className="absolute top-20 -left-20 w-64 h-64 rounded-full border border-white/5"
            style={{
              animation: 'rotateSlow 20s linear infinite'
            }}
          />
          
          {/* Circle 3 - Small, pulsing gradient */}
          <div 
            className="absolute bottom-20 right-40 w-32 h-32 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
              animation: 'pulse 2s ease-in-out infinite'
            }}
          />
          
          {/* Circle 4 - Extra large, reverse rotation */}
          <div 
            className="absolute -bottom-64 -left-64 w-[32rem] h-[32rem] rounded-full border border-white/5"
            style={{
              animation: 'rotateReverse 30s linear infinite'
            }}
          />
          
          {/* Circle 5 - Medium gradient, floating */}
          <div 
            className="absolute top-1/2 right-1/3 w-48 h-48 rounded-full blur-xl"
            style={{
              background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 60%)',
              animation: 'floatAnimation 6s ease-in-out infinite'
            }}
          />
          
          {/* Additional decorative circles */}
          <div 
            className="absolute top-1/3 left-1/4 w-24 h-24 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)',
              animation: 'floatAnimation 8s ease-in-out infinite reverse'
            }}
          />
          
          <div 
            className="absolute bottom-1/3 right-1/4 w-40 h-40 rounded-full border border-white/5"
            style={{
              animation: 'pulseSlow 6s ease-in-out infinite'
            }}
          />
        </div>

        {/* CSS Animations */}
        <style jsx>{`
          @keyframes pulseSlow {
            0%, 100% { 
              opacity: 1; 
              transform: scale(1); 
            }
            50% { 
              opacity: 0.6; 
              transform: scale(1.05); 
            }
          }

          @keyframes rotateSlow {
            from { 
              transform: rotate(0deg); 
            }
            to { 
              transform: rotate(360deg); 
            }
          }

          @keyframes rotateReverse {
            from { 
              transform: rotate(360deg); 
            }
            to { 
              transform: rotate(0deg); 
            }
          }

          @keyframes floatAnimation {
            0%, 100% { 
              transform: translateY(0) translateX(0); 
            }
            25% { 
              transform: translateY(-20px) translateX(10px); 
            }
            50% { 
              transform: translateY(10px) translateX(-10px); 
            }
            75% { 
              transform: translateY(-10px) translateX(20px); 
            }
          }

          @keyframes pulse {
            0%, 100% { 
              opacity: 1; 
              transform: scale(1); 
            }
            50% { 
              opacity: 0.5; 
              transform: scale(0.95); 
            }
          }
        `}</style>
      </section>

     

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-light mb-4">
              Why Choose OPN Fractionalization
            </h2>
            <p className="text-neutral-400 max-w-2xl mx-auto">
              Access premium assets with confidence through our secure, regulated platform
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center group">
                <div className="inline-flex items-center justify-center w-16 h-16 
                              border border-neutral-800 rounded-sm mb-4 
                              group-hover:border-neutral-600 transition-colors">
                  <feature.icon className="w-8 h-8 text-neutral-400 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-lg font-normal mb-2">{feature.title}</h3>
                <p className="text-sm text-neutral-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

       {/* Blue Divider Line - ADD THIS */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="border-t border-blue-500/30"></div>
      </div>

      {/* How It Works Section */}
      <section className="py-20 bg-neutral-950" id="how-it-works">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-light mb-4">
              How It Works
            </h2>
            <p className="text-neutral-400 max-w-2xl mx-auto">
              Get started in minutes with our simple 4-step process
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                <div className="text-center lg:text-left">
                  <div className="inline-flex items-center justify-center w-24 h-24 
                                border border-neutral-800 rounded-sm mb-6">
                    <span className="text-2xl font-light text-neutral-600">{step.number}</span>
                  </div>
                  <h3 className="text-xl font-normal mb-3">{step.title}</h3>
                  <p className="text-neutral-400 text-sm">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Asset Types Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-light mb-4">
              Asset Categories
            </h2>
            <p className="text-neutral-400 max-w-2xl mx-auto">
              Discover a curated selection of verified luxury assets
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="group cursor-pointer">
              <div className="aspect-square bg-neutral-900 rounded-sm overflow-hidden mb-4">
                <img 
                  src="https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=800&q=80"
                  alt="Real Estate"
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 
                           group-hover:scale-105 transition-all duration-500"
                />
              </div>
              <h3 className="text-xl font-normal mb-2">Real Estate</h3>
              <p className="text-neutral-400 text-sm">
                Premium properties worldwide
              </p>
            </div>

            <div className="group cursor-pointer">
              <div className="aspect-square bg-neutral-900 rounded-sm overflow-hidden mb-4">
                <img 
                  src="https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800&q=80"
                  alt="Luxury Watches"
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 
                           group-hover:scale-105 transition-all duration-500"
                />
              </div>
              <h3 className="text-xl font-normal mb-2">Luxury Watches</h3>
              <p className="text-neutral-400 text-sm">
                Patek Philippe, Rolex, Audemars Piguet
              </p>
            </div>

            <div className="group cursor-pointer">
              <div className="aspect-square bg-neutral-900 rounded-sm overflow-hidden mb-4">
                <img 
                  src="https://images.unsplash.com/photo-1549277513-f1b32fe1f8f5?w=800&q=80"
                  alt="Fine Art"
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 
                           group-hover:scale-105 transition-all duration-500"
                />
              </div>
              <h3 className="text-xl font-normal mb-2">Fine Art</h3>
              <p className="text-neutral-400 text-sm">
                Contemporary pieces and classic masterworks
              </p>
            </div>

            <div className="group cursor-pointer">
              <div className="aspect-square bg-neutral-900 rounded-sm overflow-hidden mb-4">
                <img 
                  src="https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800&q=80"
                  alt="Classic Cars"
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 
                           group-hover:scale-105 transition-all duration-500"
                />
              </div>
              <h3 className="text-xl font-normal mb-2">Collectibles</h3>
              <p className="text-neutral-400 text-sm">
                Rare items and limited edition pieces
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 border-t border-neutral-900">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-light mb-6">
            Ready to Start Your Journey?
          </h2>
          <p className="text-xl text-neutral-400 mb-12 max-w-2xl mx-auto">
            Join thousands of users already building their luxury asset portfolio
          </p>
          <button
            onClick={onEnterApp}
            className="btn-primary text-lg px-12 py-4 flex items-center justify-center space-x-3 mx-auto"
          >
            <Zap className="w-5 h-5" />
            <span>Launch App</span>
          </button>
        </div>
      </section>

      {/* Footer - Fixed for Mobile */}
      <footer className="py-12 border-t border-neutral-900">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="mb-4 md:mb-0 text-center md:text-left">
              <h3 className="text-xl font-light mb-2">OPN Fractionalization</h3>
              <p className="text-sm text-neutral-500">
                Democratizing luxury through blockchain technology
              </p>
            </div>
            <div className="flex items-center space-x-6 text-sm text-neutral-500">
              <a href="#" className="hover:text-white transition-colors">Documentation</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Contact</a>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-neutral-900 text-center text-xs text-neutral-600">
            © 2025 OPN Fractionalization. Built on OPN Chain.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;