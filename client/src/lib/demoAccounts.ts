export const demoAccounts = {
  client: {
    email: "client@demo.hive",
    password: "demo123",
    role: "client",
    name: "Emma Johnson",
    displayName: "Emma J.",
  },
  therapist: {
    email: "therapist@demo.hive",
    password: "demo123",
    role: "therapist",
    name: "Dr. Sarah Chen",
    displayName: "Dr. Chen",
  },
  admin: {
    email: "admin@demo.hive",
    password: "demo123",
    role: "admin",
    name: "Admin User",
    displayName: "Admin",
  },
  institution: {
    email: "org@demo.hive",
    password: "demo123",
    role: "institution",
    name: "University Counselling",
    displayName: "University",
  },
};

export type DemoAccountRole = keyof typeof demoAccounts;
export type DemoAccount = (typeof demoAccounts)[DemoAccountRole];
