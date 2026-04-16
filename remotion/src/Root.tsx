import {Composition} from 'remotion';
import {TicketDemo, TITLE_CARD_FRAMES, USER_IMPACT_FRAMES, CRITERIA_FRAMES, SUMMARY_FRAMES, TRANSITION_FRAMES} from './TicketDemo';
import type {TicketVideoProps} from './types';

const sampleTicket: TicketVideoProps = {
  title: 'Add a contact page with a form',
  id: 'CB-002',
  repo: 'demo-project',
  description: 'Users can now reach the team through a dedicated contact page.',
  criteria: [
    {criterion: 'Contact page exists at /contact route', status: 'pass'},
    {criterion: 'Form has name, email, and message fields', status: 'pass'},
    {criterion: 'Submit button is present and styled', status: 'pass'},
  ],
  filesChanged: 2,
  buildDuration: '5m 53s',
  riskLevel: 'low',
  pagesAffected: 2,
  completionRate: 100,
  userImpactSummary: 'Users can now reach the team directly from the app',
  userJourneyBefore: 'No way to contact the team from within the application',
  userJourneyAfter: 'Simple form lets users send a message and get a response within 2 business days',
  affectedUserSegment: 'All visitors',
};

export const RemotionRoot = () => {
  return (
    <Composition
      id="CodexBoardDemo"
      component={TicketDemo}
      defaultProps={{ticket: sampleTicket}}
      calculateMetadata={() => {
        const sceneFrames = TITLE_CARD_FRAMES + USER_IMPACT_FRAMES + CRITERIA_FRAMES + SUMMARY_FRAMES;
        const overlapFrames = 3 * TRANSITION_FRAMES; // 3 transitions between 4 scenes

        return {
          durationInFrames: sceneFrames - overlapFrames,
          fps: 30,
          width: 1920,
          height: 1080,
        };
      }}
    />
  );
};
