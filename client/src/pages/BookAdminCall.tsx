import { useEffect, useState } from 'react';
import { AdminCallBooking } from '@/components/AdminCallBooking';

export default function BookAdminCall() {
  const [therapistEmail, setTherapistEmail] = useState<string>('');

  useEffect(() => {
    // Get therapist email from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get('therapist');
    if (email) {
      setTherapistEmail(decodeURIComponent(email));
    }
  }, []);

  if (!therapistEmail) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Invalid Booking Link</h1>
          <p className="mt-2 text-gray-600">
            This booking link is invalid or expired. Please check your email for the correct link.
          </p>
        </div>
      </div>
    );
  }

  return <AdminCallBooking therapistEmail={therapistEmail} />;
}