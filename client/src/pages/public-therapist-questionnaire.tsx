import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PublicTherapistQuestionnaire from '@/components/forms/public-therapist-questionnaire';

export default function PublicTherapistQuestionnairePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-hive-light-purple/20 to-white dark:from-hive-light-purple/10 dark:to-gray-900">
      {/* Navigation Header */}
      <div className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/">
              <Button variant="ghost" className="text-hive-purple hover:text-hive-purple/80">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Return to Hive Wellness Website
              </Button>
            </Link>
            
            <div className="flex items-center space-x-4">
              <Link href="/portal">
                <Button variant="outline" className="border-hive-purple text-hive-purple hover:bg-hive-purple hover:text-white">
                  Existing User? Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <PublicTherapistQuestionnaire />

      {/* Footer */}
      <footer className="mt-20 border-t bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-sm font-secondary text-hive-black">
              © 2025 Hive Wellness. All rights reserved. |{' '}
              <a href="mailto:admin@hive-wellness.co.uk" className="text-hive-purple hover:underline">
                admin@hive-wellness.co.uk
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}