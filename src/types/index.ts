export type UserRole = 'overall' | 'director' | 'officer' | 'training';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
}

export interface Company {
  id: string;
  name: string; // Company Name
  role?: string;
  package?: string; // Package
  packageOffer?: string; // Package Offered
  status: 'Visiting' | 'Ongoing' | 'Completed'; // Status
  driveDate: string; // Drive Date
  selections?: number;
  dept?: string;
}

export interface Student {
  id: string;
  regNo: string; // Register Number
  name: string; // Student Name
  dept: string; // Department
  batchYear: string; // Batch Year
  company?: string; // Company
  package?: string; // Package
  status: 'Placed' | 'Pending' | 'Rejected' | 'Applied'; // Placement Status
  
  // Training scores fallback compatibility
  aptitude?: number;
  coding?: number;
  communication?: number;
  mockInterview?: number;
  attendance?: number;
  avgScore?: number;
  readinessLevel?: 'Highly Placeable' | 'Placement Ready' | 'Needs Improvement' | 'High Risk';
}

