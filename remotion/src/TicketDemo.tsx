import {AbsoluteFill} from 'remotion';
import {linearTiming, TransitionSeries} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {CriteriaChecklist} from './scenes/CriteriaChecklist';
import {SummaryStats} from './scenes/SummaryStats';
import {TitleCard} from './scenes/TitleCard';
import type {TicketCompositionProps} from './types';

export const TITLE_CARD_FRAMES = 90;
export const CRITERIA_FRAMES = 150;
export const SUMMARY_FRAMES = 90;
export const TRANSITION_FRAMES = 12;

const backgroundStyle = {
  backgroundColor: '#0f172a',
};

export const TicketDemo = ({ticket}: TicketCompositionProps) => {
  return (
    <AbsoluteFill style={backgroundStyle}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={TITLE_CARD_FRAMES}>
          <TitleCard title={ticket.title} id={ticket.id} repo={ticket.repo} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({durationInFrames: TRANSITION_FRAMES})}
        />
        <TransitionSeries.Sequence durationInFrames={CRITERIA_FRAMES}>
          <CriteriaChecklist criteria={ticket.criteria} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({durationInFrames: TRANSITION_FRAMES})}
        />
        <TransitionSeries.Sequence durationInFrames={SUMMARY_FRAMES}>
          <SummaryStats
            filesChanged={ticket.filesChanged}
            buildDuration={ticket.buildDuration}
            riskLevel={ticket.riskLevel}
          />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
