import {Composition} from 'remotion';
import {TicketDemo} from './TicketDemo';
import type {TicketVideoProps} from './types';

const sampleTicket: TicketVideoProps = {
  title: 'Add password reset to settings page',
  id: 'CB-002',
  repo: 'my-react-app',
  criteria: [
    {
      criterion: 'Reset button appears on settings page',
      status: 'pass',
    },
    {
      criterion: 'Email confirmation is sent',
      status: 'pass',
    },
    {
      criterion: 'Works on mobile viewport',
      status: 'pass',
    },
  ],
  filesChanged: 5,
  buildDuration: '3m 22s',
  riskLevel: 'low',
};

export const RemotionRoot = () => {
  return (
    <Composition
      id="CodexBoardDemo"
      component={TicketDemo}
      defaultProps={{ticket: sampleTicket}}
      calculateMetadata={() => {
        const sceneFrames = 90 + 150 + 90;
        const overlapFrames = 2 * 12;

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
