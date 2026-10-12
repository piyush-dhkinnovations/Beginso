export interface DashboardActivityForm {
  _id: string;
  title: string;
}

export interface DashboardActivity {
  id: string;
  type: 'response_submitted';
  occurredAt: string;
  form: DashboardActivityForm;
  responseId: string;
}

/** One place responses came from: a position rounded to about 1 km, and how many came from it. */
export interface ResponseLocation {
  country: string;
  region: string | null;
  city: string | null;
  lat: number;
  lng: number;
  count: number;
}

export interface DashboardAnalytics {
  totalForms: number;
  publishedForms: number;
  totalResponses: number;
  responsesThisMonth: number;
  recentActivity: DashboardActivity[];
  /** Absent when the server predates locations. */
  locations?: ResponseLocation[];
}
