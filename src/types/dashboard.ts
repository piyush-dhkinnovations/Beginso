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

export interface DashboardAnalytics {
  totalForms: number;
  publishedForms: number;
  totalResponses: number;
  responsesThisMonth: number;
  recentActivity: DashboardActivity[];
}
