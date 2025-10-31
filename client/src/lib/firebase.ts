// Firebase authentication has been removed from Hive Wellness
// The platform now uses email/password authentication and demo authentication only
// This file is kept for reference but no longer used

export interface HiveUser {
  uid: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: "client" | "therapist" | "admin" | "institution";
  profileComplete: boolean;
  createdAt: Date;
  lastLoginAt: Date;
}

// Placeholder functions for backward compatibility
export const signInWithGoogle = async (): Promise<any> => {
  throw new Error(
    "Firebase authentication has been removed. Please use email/password authentication or demo accounts."
  );
};

export const signInWithEmail = async (email: string, password: string): Promise<any> => {
  throw new Error(
    "Firebase authentication has been removed. Please use email/password authentication or demo accounts."
  );
};

export const signUpWithEmail = async (
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  role: "client" | "therapist" = "client"
): Promise<any> => {
  throw new Error(
    "Firebase authentication has been removed. Please use email/password authentication or demo accounts."
  );
};

export const signOutUser = async (): Promise<void> => {
  // Redirect to logout page
  window.location.href = "/api/auth/logout";
};

export const resetPassword = async (email: string): Promise<void> => {
  throw new Error(
    "Firebase authentication has been removed. Please contact support for password reset."
  );
};

export const getCurrentUser = (): Promise<any> => {
  return Promise.resolve(null);
};

export const getUserData = async (uid: string): Promise<HiveUser | null> => {
  return null;
};
