export type TicketCriterionStatus = 'pass' | 'fail' | 'unknown';

export interface TicketVideoProps {
  title: string;
  id: string;
  repo: string;
  criteria: {criterion: string; status: TicketCriterionStatus}[];
  filesChanged: number;
  buildDuration: string;
  riskLevel: string;
}

export interface TicketCompositionProps {
  ticket: TicketVideoProps;
}
