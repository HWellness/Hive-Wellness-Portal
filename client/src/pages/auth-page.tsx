import React, { useEffect } from "react";
import { useLocation } from "wouter";
import EmailPasswordAuth from "@/components/auth/email-password-auth";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import logoPath from "@assets/Hive Logo_1752073128164.png";

const AuthPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();

  // Redirect if user is already authenticated
  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-hive-purple/10 to-blue-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-hive-purple mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if user is authenticated (will redirect)
  if (user) {
    return null;
  }

  const handleAuthSuccess = (userData: any) => {
    // Redirect based on user role and profile completion
    if (!userData.profileComplete) {
      setLocation("/profile-completion");
    } else {
      setLocation("/");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-hive-purple/10 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-screen">
          {/* Left Column - Authentication Form */}
          <div className="flex flex-col justify-center">
            <div className="text-center mb-8">
              <img src={logoPath} alt="Hive Wellness" className="h-16 mx-auto mb-4" />
              <h1 className="text-3xl font-display text-gray-900 mb-2">Welcome to Hive Wellness</h1>
              <p className="text-gray-600">Your trusted partner in mental health and wellbeing</p>
            </div>

            <EmailPasswordAuth onAuthSuccess={handleAuthSuccess} defaultRole="client" />

            {/* Demo Account Section */}
            <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-medium text-blue-900 mb-2">Demo Accounts Available</h3>
              <p className="text-sm text-blue-700 mb-3">
                You can also test the platform using our demo accounts:
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white p-2 rounded border">
                  <strong>Client Demo:</strong>
                  <br />
                  client@demo.hive
                  <br />
                  <span className="text-gray-500">No password needed</span>
                </div>
                <div className="bg-white p-2 rounded border">
                  <strong>Therapist Demo:</strong>
                  <br />
                  therapist@demo.hive
                  <br />
                  <span className="text-gray-500">No password needed</span>
                </div>
              </div>
              <p className="text-xs text-blue-600 mt-2">
                <a href="/portal" className="underline hover:no-underline">
                  Access demo portal directly
                </a>
              </p>
            </div>
          </div>

          {/* Right Column - Hero Section */}
          <div className="hidden lg:flex flex-col justify-center space-y-8">
            <div className="text-center">
              <div className="w-24 h-24 bg-hive-purple/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <div className="w-12 h-12 bg-hive-purple rounded-full flex items-center justify-center">
                  <div className="w-6 h-6 bg-white rounded-full"></div>
                </div>
              </div>
              <h2 className="text-2xl font-display text-gray-900 mb-4">
                Professional Therapy Platform
              </h2>
              <p className="text-gray-600 text-lg leading-relaxed">
                Connect with qualified therapists, manage appointments, and track your mental health
                journey with our comprehensive therapy management system.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="text-center p-4 bg-white/50 rounded-lg">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <div className="w-6 h-6 bg-green-500 rounded"></div>
                </div>
                <h3 className="font-medium text-gray-900 mb-2">Secure Sessions</h3>
                <p className="text-sm text-gray-600">HIPAA-compliant video therapy sessions</p>
              </div>

              <div className="text-center p-4 bg-white/50 rounded-lg">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <div className="w-6 h-6 bg-blue-500 rounded"></div>
                </div>
                <h3 className="font-medium text-gray-900 mb-2">Expert Matching</h3>
                <p className="text-sm text-gray-600">AI-powered therapist recommendations</p>
              </div>

              <div className="text-center p-4 bg-white/50 rounded-lg">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <div className="w-6 h-6 bg-purple-500 rounded"></div>
                </div>
                <h3 className="font-medium text-gray-900 mb-2">Progress Tracking</h3>
                <p className="text-sm text-gray-600">Monitor your mental health journey</p>
              </div>

              <div className="text-center p-4 bg-white/50 rounded-lg">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <div className="w-6 h-6 bg-orange-500 rounded"></div>
                </div>
                <h3 className="font-medium text-gray-900 mb-2">24/7 Support</h3>
                <p className="text-sm text-gray-600">Access to resources and crisis support</p>
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-500">
                Trusted by thousands of clients and therapists worldwide
              </p>
              <div className="flex justify-center items-center space-x-1 mt-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-4 h-4 bg-yellow-400 rounded-sm"></div>
                ))}
                <span className="ml-2 text-sm text-gray-600">4.9/5 rating</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
