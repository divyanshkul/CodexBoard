import {AbsoluteFill} from 'remotion';
import {linearTiming, TransitionSeries} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {CriteriaChecklist} from './scenes/CriteriaChecklist';
import {SummaryStats} from './scenes/SummaryStats';
import {TitleCard} from './scenes/TitleCard';
import {UserImpact} from './scenes/UserImpact';
import type {TicketCompositionProps} from './types';

export const TITLE_CARD_FRAMES = 90;
export const USER_IMPACT_FRAMES = 120;
export const CRITERIA_FRAMES = 150;
export const SUMMARY_FRAMES = 90;
export const TRANSITION_FRAMES = 12;

export const TicketDemo = ({ticket}: TicketCompositionProps) => {
  const passCount = ticket.criteria.filter(c => c.status === 'pass').length;
  const completionRate = ticket.completionRate ?? (
    ticket.criteria.length > 0
      ? Math.round((passCount / ticket.criteria.length) * 100)
      : 0
  );

  return (
    <AbsoluteFill style={{backgroundColor: '#F8F9FA'}}>
      <TransitionSeries>
        {/* Scene 1: Feature announcement */}
        <TransitionSeries.Sequence durationInFrames={TITLE_CARD_FRAMES}>
          <TitleCard
            title={ticket.title}
            id={ticket.id}
            description={ticket.description || ticket.title}
            buildDuration={ticket.buildDuration}
          />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({durationInFrames: TRANSITION_FRAMES})}
        />

        {/* Scene 2: User impact -- before/after journey */}
        <TransitionSeries.Sequence durationInFrames={USER_IMPACT_FRAMES}>
          <UserImpact
            userImpactSummary={ticket.userImpactSummary || 'This feature improves the user experience'}
            userJourneyBefore={ticket.userJourneyBefore || 'Users did not have this capability'}
            userJourneyAfter={ticket.userJourneyAfter || 'Users can now use this feature seamlessly'}
            affectedUserSegment={ticket.affectedUserSegment || 'All users'}
            pagesAffected={ticket.pagesAffected ?? 1}
          />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({durationInFrames: TRANSITION_FRAMES})}
        />

        {/* Scene 3: Acceptance criteria checklist */}
        <TransitionSeries.Sequence durationInFrames={CRITERIA_FRAMES}>
          <CriteriaChecklist
            criteria={ticket.criteria}
            completionRate={completionRate}
          />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({durationInFrames: TRANSITION_FRAMES})}
        />

        {/* Scene 4: Delivery metrics */}
        <TransitionSeries.Sequence durationInFrames={SUMMARY_FRAMES}>
          <SummaryStats
            buildDuration={ticket.buildDuration}
            pagesAffected={ticket.pagesAffected ?? 1}
            completionRate={completionRate}
            riskLevel={ticket.riskLevel}
          />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
