export type TicketCriterionStatus = 'pass' | 'fail' | 'unknown';

export interface TicketVideoProps {
  title: string;
  id: string;
  repo: string;
  description: string;
  criteria: {criterion: string; status: TicketCriterionStatus}[];
  filesChanged: number;
  buildDuration: string;
  riskLevel: string;
  pagesAffected: number;
  completionRate: number;
  // PM-focused user impact fields
  userImpactSummary: string;      // e.g. "Users can now reach the team directly from the app"
  userJourneyBefore: string;      // e.g. "Users had no way to contact the team in-app"
  userJourneyAfter: string;       // e.g. "Users fill a simple form and get a response within 2 days"
  affectedUserSegment: string;    // e.g. "All visitors" or "Logged-in users"
}

export interface TicketCompositionProps {
  ticket: TicketVideoProps;
}
