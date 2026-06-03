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
  status: 'Placed' | 'Pending' | 'Rejected' | 'Applied' | 'Not Placed'; // Placement Status
  
  // Training scores fallback compatibility
  aptitude?: number;
  coding?: number;
  communication?: number;
  mockInterview?: number;
  attendance?: number;
  avgScore?: number;
  readinessLevel?: 'Highly Placeable' | 'Placement Ready' | 'Needs Improvement' | 'High Risk';
}

export interface PortalSettings {
  key: string;
  institution: {
    college_name: string;
    college_logo: string;
    placement_cell_email: string;
    placement_cell_phone: string;
  };
  placement_rules: {
    default_cgpa_cutoff: number;
    default_arrear_limit: number;
    default_placement_status: string;
  };
  importer_settings: {
    default_conflict_policy: string;
    allowed_file_types: string[];
    maximum_upload_size_mb: number;
  };
  dashboard_preferences: {
    default_landing_dashboard: string;
    theme_preference: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface PortalSettingsMeta {
  application_version: string;
  build_information: {
    environment: string;
    node_version: string;
    process_id: number;
    server_time: string;
    uptime_seconds: number;
  };
  mongodb_connection_status: {
    ready_state: number;
    status: string;
    host: string;
    name: string;
  };
}

export interface PortalSettingsResponse {
  settings: PortalSettings;
  meta: PortalSettingsMeta;
}

export interface SettingsPayload {
  institution: PortalSettings['institution'];
  placement_rules: PortalSettings['placement_rules'];
  importer_settings: PortalSettings['importer_settings'];
  dashboard_preferences: PortalSettings['dashboard_preferences'];
}

export interface DbStudent {
  _id: string;
  name: string;
  reg_no: string;
  department: string;
  batch_year: string;
  cgpa?: number;
  arrears?: number;
  skills?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface DbCompany {
  _id: string;
  company_name: string;
  batch_year: string;
  status: string;
  package: number;
  drive_date?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DbPlacement {
  _id: string;
  name: string;
  reg_no: string;
  department: string;
  batch_year?: string;
  year?: string;
  company: string;
  placement_status?: string;
  role?: string;
  package?: number | string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DbHrContact {
  _id: string;
  hr_name: string;
  batch_year: string;
  company_name: string;
  email: string;
  phone?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DbTrainingDetail {
  _id: string;
  name: string;
  reg_no: string;
  department: string;
  batch_year: string;
  aptitude?: number;
  coding?: number;
  communication?: number;
  mockInterview?: number;
  aptitude_score?: number;
  coding_score?: number;
  communication_score?: number;
  mock_interview_score?: number;
  attendance?: number;
  avgScore?: number;
  readinessLevel?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GlobalSearchResponse {
  students: DbStudent[];
  companies: DbCompany[];
  placements: DbPlacement[];
  hr_contacts: DbHrContact[];
  training_details: DbTrainingDetail[];
}


