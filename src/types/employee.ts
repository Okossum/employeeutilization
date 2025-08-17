export type Employee = {
  firstName: string;
  lastName: string;
  email: string; // document ID (lowercased)
  company: string;
  businessLine: string;
  bereich: string; // may be empty for now
  competenceCenter: string;
  team: string;
  location: string;
  careerLevel: string;
  experienceSinceYear?: number; // e.g., 2015
  availableFrom?: string; // dd.mm.yyyy, will be stored as Timestamp later
  availableForStaffing?: boolean;
  profileUrl?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};
