import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import hiveWellnessLogo from "@assets/Hive Logo_1752073128164.png";
import ChatbotWidget from "@/components/chatbot/chatbot-widget";

export default function Landing() {
  return (
    <div className="min-h-screen relative">
      {/* Hero Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('/header-hero-bg.png')`,
          opacity: 0.9,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-hive-purple/20 via-hive-background/40 to-hive-light-blue/30" />

      {/* Content */}
      <div className="relative z-10">
        {/* Navigation Header */}
        <div className="w-full py-4 px-6 bg-white/10 backdrop-blur-sm border-b border-white/20">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img src={hiveWellnessLogo} alt="Hive Wellness" className="h-10 w-auto" />
              <span className="text-xl font-display font-bold text-hive-dark">Hive Wellness</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/therapist-login">
                <Button
                  variant="outline"
                  className="bg-white/20 border-white/30 text-hive-dark hover:bg-white/30 hover:text-hive-purple font-secondary backdrop-blur-sm"
                >
                  Therapist Portal Access
                </Button>
              </Link>
              <Link to="/portal">
                <Button className="bg-hive-purple hover:bg-hive-purple/90 text-white font-secondary">
                  Client Portal
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <div className="container mx-auto px-6 py-16">
          <div className="text-center mb-16">
            <div className="mx-auto mb-8 flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-hive-light-purple via-hive-background to-hive-light-blue rounded-full blur-2xl opacity-60 scale-110"></div>
                <img
                  src={hiveWellnessLogo}
                  alt="Hive Wellness Logo"
                  className="relative w-80 h-auto object-contain drop-shadow-lg"
                />
              </div>
            </div>
            <h1 className="text-7xl md:text-8xl font-display font-bold bg-gradient-to-r from-hive-dark via-hive-purple to-hive-purple bg-clip-text text-transparent mb-6 drop-shadow-sm">
              Hive Wellness
            </h1>
            <p className="text-3xl font-body text-hive-dark mb-4 font-semibold">
              Therapy Tailored to You
            </p>
            <p className="text-lg font-body text-hive-gray max-w-3xl mx-auto leading-relaxed">
              In a world where AI and technology are often used to connect people with services,
              therapy needs something more—authentic human connection and personalised care.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* For Clients */}
            <div className="card-modern p-10 group hover:scale-[1.02] transition-all duration-300">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-hive-light-purple to-hive-purple rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <svg
                    className="w-10 h-10 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <h3 className="text-2xl font-display font-bold text-hive-dark mb-4">For Clients</h3>
                <p className="text-hive-gray font-body text-lg leading-relaxed">
                  Finding the right therapist shouldn't be overwhelming. We connect you with the
                  perfect therapist for your unique journey—seamlessly and stress-free.
                </p>
              </div>
              <div className="space-y-4 mb-8">
                <div className="flex items-center font-body text-hive-dark">
                  <div className="w-6 h-6 bg-hive-background rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                    <div className="w-2 h-2 bg-hive-purple rounded-full"></div>
                  </div>
                  Complimentary 20-minute consultation
                </div>
                <div className="flex items-center font-body text-hive-dark">
                  <div className="w-6 h-6 bg-hive-background rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                    <div className="w-2 h-2 bg-hive-purple rounded-full"></div>
                  </div>
                  Expert human-led therapist matching
                </div>
                <div className="flex items-center font-body text-hive-dark">
                  <div className="w-6 h-6 bg-hive-background rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                    <div className="w-2 h-2 bg-hive-purple rounded-full"></div>
                  </div>
                  GDPR-compliant secure video sessions
                </div>
              </div>
              <div className="space-y-3">
                <Link to="/book-session">
                  <button className="button-primary w-full" data-testid="button-view-pricing">
                    View Pricing & Book Session
                  </button>
                </Link>
                <Link to="/portal">
                  <button
                    className="w-full py-3 px-6 bg-white text-hive-purple border-2 border-hive-purple rounded-lg font-semibold hover:bg-hive-purple/5 transition-colors"
                    data-testid="button-get-started"
                  >
                    Get Started
                  </button>
                </Link>
              </div>
            </div>

            {/* For Therapists */}
            <div className="card-modern p-10 group hover:scale-[1.02] transition-all duration-300">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-hive-purple to-hive-dark rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <svg
                    className="w-10 h-10 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-2xl font-display font-bold text-hive-dark mb-4">
                  For Therapists
                </h3>
                <p className="text-hive-gray font-body text-lg leading-relaxed">
                  A professional platform designed to support your practice and growth. Focus on
                  what you do best— helping people thrive.
                </p>
              </div>
              <div className="space-y-4 mb-8">
                <div className="flex items-center font-body text-hive-dark">
                  <div className="w-6 h-6 bg-hive-background rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                    <div className="w-2 h-2 bg-hive-purple rounded-full"></div>
                  </div>
                  Intelligent scheduling system
                </div>
                <div className="flex items-center font-body text-hive-dark">
                  <div className="w-6 h-6 bg-hive-background rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                    <div className="w-2 h-2 bg-hive-purple rounded-full"></div>
                  </div>
                  Streamlined payment processing
                </div>
                <div className="flex items-center font-body text-hive-dark">
                  <div className="w-6 h-6 bg-hive-background rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                    <div className="w-2 h-2 bg-hive-purple rounded-full"></div>
                  </div>
                  Professional practice tools
                </div>
              </div>
              <Link to="/portal">
                <button className="button-primary w-full">Join Our Network</button>
              </Link>
            </div>
          </div>

          {/* Features */}
          <div className="mt-16 text-center">
            <h2 className="text-3xl font-century font-bold text-hive-dark mb-8">
              Why Choose Hive Wellness?
            </h2>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="text-center">
                <div className="w-12 h-12 bg-hive-purple rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-hive-dark mb-2">Human Connection</h3>
                <p className="text-hive-gray">
                  Real people, not algorithms, helping you find the right therapist
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-hive-purple rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-hive-dark mb-2">Secure & Professional</h3>
                <p className="text-hive-gray">
                  GDPR & UK Data Protection Act compliant platform with enterprise-grade security
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-hive-purple rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-hive-dark mb-2">Seamless Experience</h3>
                <p className="text-hive-gray">
                  Everything you need in one platform - scheduling, payments, sessions
                </p>
              </div>
            </div>
          </div>

          {/* How It Works Section */}
          <div className="mt-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-century font-bold text-hive-black mb-4">How It Works</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                We've designed a simple, secure process to connect you with the right therapist.
                Here's exactly what happens when you get started.
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-6 max-w-6xl mx-auto mb-16">
              {/* Step 1 */}
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-hive-purple font-bold text-xl">1</span>
                </div>
                <h3 className="font-semibold text-hive-black mb-2">Quick Sign Up</h3>
                <p className="text-sm text-gray-600">
                  Create your secure account in under 2 minutes. We only ask for basic information
                  to get started.
                </p>
              </div>

              {/* Step 2 */}
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-purple-600 font-bold text-xl">2</span>
                </div>
                <h3 className="font-semibold text-hive-black mb-2">Tell Us About You</h3>
                <p className="text-sm text-gray-600">
                  Complete a brief questionnaire about your therapy goals and preferences. Takes
                  10-15 minutes.
                </p>
              </div>

              {/* Step 3 */}
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-green-600 font-bold text-xl">3</span>
                </div>
                <h3 className="font-semibold text-hive-black mb-2">Meet Your Connections</h3>
                <p className="text-sm text-gray-600">
                  Our team reviews your responses and presents 3-5 carefully selected therapist
                  connections.
                </p>
              </div>

              {/* Step 4 */}
              <div className="text-center">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-orange-600 font-bold text-xl">4</span>
                </div>
                <h3 className="font-semibold text-hive-black mb-2">Start Your Journey</h3>
                <p className="text-sm text-gray-600">
                  Book your free 20-minute consultation, then schedule your first session whenever
                  you're ready.
                </p>
              </div>
            </div>
          </div>

          {/* What to Expect */}
          <div className="mt-16 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-century font-bold text-hive-black mb-6 text-center">
                What to Expect During Sign Up
              </h2>

              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-semibold text-hive-black mb-3">Time Investment</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-center">
                      <div className="w-2 h-2 bg-hive-purple rounded-full mr-3"></div>
                      Account creation: 2 minutes
                    </li>
                    <li className="flex items-center">
                      <div className="w-2 h-2 bg-hive-purple rounded-full mr-3"></div>
                      Intake questionnaire: 10-15 minutes
                    </li>
                    <li className="flex items-center">
                      <div className="w-2 h-2 bg-hive-purple rounded-full mr-3"></div>
                      Reviewing connections: 5-10 minutes
                    </li>
                    <li className="flex items-center">
                      <div className="w-2 h-2 bg-hive-purple rounded-full mr-3"></div>
                      Booking consultation: 2 minutes
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-hive-black mb-3">Information We'll Ask For</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-center">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                      Basic contact information
                    </li>
                    <li className="flex items-center">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                      Therapy preferences and goals
                    </li>
                    <li className="flex items-center">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                      Areas you'd like to work on
                    </li>
                    <li className="flex items-center">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                      Availability and budget preferences
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-8 p-4 bg-white rounded-lg border-l-4 border-hive-purple">
                <p className="text-gray-700 italic">
                  <strong>Privacy Note:</strong> All information is kept strictly confidential and
                  is only used to match you with the most suitable therapist. You can update or
                  delete your information at any time.
                </p>
              </div>
            </div>
          </div>

          {/* Therapist Application Section */}
          <div className="mt-16">
            <div className="bg-gradient-to-r from-hive-purple/10 to-purple-100/50 rounded-3xl p-8 max-w-4xl mx-auto border border-hive-purple/20">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-century font-bold text-hive-black mb-4">
                  Join Our Therapy Team
                </h2>
                <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                  Ready to make a meaningful impact? We're looking for qualified therapists who
                  share our commitment to personalised, human-centred care.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-8 mb-8">
                <div>
                  <h3 className="font-semibold text-hive-black mb-3">What We Offer</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-center">
                      <div className="w-2 h-2 bg-hive-purple rounded-full mr-3"></div>
                      85% of all session fees (highest in the industry)
                    </li>
                    <li className="flex items-center">
                      <div className="w-2 h-2 bg-hive-purple rounded-full mr-3"></div>
                      Flexible scheduling - work when it suits you
                    </li>
                    <li className="flex items-center">
                      <div className="w-2 h-2 bg-hive-purple rounded-full mr-3"></div>
                      Professional support and development
                    </li>
                    <li className="flex items-center">
                      <div className="w-2 h-2 bg-hive-purple rounded-full mr-3"></div>
                      No client acquisition stress
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-hive-black mb-3">Requirements</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-center">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                      HCPC, BPS, BACP, UKCP or equivalent registration
                    </li>
                    <li className="flex items-center">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                      Enhanced DBS certificate (or willing to obtain)
                    </li>
                    <li className="flex items-center">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                      Professional indemnity insurance
                    </li>
                    <li className="flex items-center">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                      Commitment to our values of human connection
                    </li>
                  </ul>
                </div>
              </div>

              <div className="text-center">
                <Link to="/therapist-enquiry">
                  <Button className="bg-hive-purple hover:bg-hive-purple/90 text-white font-secondary text-lg px-8 py-3 mb-4">
                    Apply to Join Our Team
                  </Button>
                </Link>
                <p className="text-sm text-gray-500">
                  Complete application takes about 15-20 minutes • Introduction call included
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-16 text-center">
            <div className="bg-hive-white rounded-2xl p-8 max-w-2xl mx-auto">
              <h2 className="text-2xl font-century font-bold text-hive-black mb-4">
                Ready to Get Started?
              </h2>
              <p className="text-gray-600 mb-6">
                We're here when you're ready. It's completely normal to feel unsure - that's exactly
                why we're here to help. The whole process takes about 20 minutes.
              </p>
              <Link to="/portal">
                <Button className="btn-primary text-lg px-8 py-3 mb-4">Start Your Journey</Button>
              </Link>
              <p className="text-sm text-gray-500">
                No commitment required • Free 20-minute consultation included
              </p>
            </div>
          </div>
        </div>

        {/* AI Chat Assistant Widget */}
        <ChatbotWidget
          primaryColor="#9306B1"
          position="bottom-right"
          initialMessage="👋 Hello! I'm your Hive Wellness guide. I can help you understand our therapy platform, walk you through the sign-up process, explain pricing, and answer any questions about getting started. How can I assist you today?"
          showBranding={true}
        />
      </div>
    </div>
  );
}
