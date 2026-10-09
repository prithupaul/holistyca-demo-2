import { Button } from '@mui/material';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import BedtimeOutlined from '@mui/icons-material/BedtimeOutlined';
import HotelOutlined from '@mui/icons-material/HotelOutlined';
import RestaurantRounded from '@mui/icons-material/RestaurantRounded';
import ShowChartRounded from '@mui/icons-material/ShowChartRounded';
import NightsStayOutlined from '@mui/icons-material/NightsStayOutlined';
import FavoriteBorderRounded from '@mui/icons-material/FavoriteBorderRounded';
import AirRounded from '@mui/icons-material/AirRounded';
import ScienceOutlined from '@mui/icons-material/ScienceOutlined';
import PsychologyOutlined from '@mui/icons-material/PsychologyOutlined';
import FaceOutlined from '@mui/icons-material/FaceOutlined';
import { EvaluationWidget } from './EvaluationWidget.jsx';
import { getSectionPercentage, getOverallPercentage } from '../domain/evaluationPercentage.js';
import { getSystemRiskTone } from '../domain/systemRisk.js';
import { getOverallReasons, getPositiveReasons } from '../domain/evaluationReasons.js';

const PART_ICONS = [HotelOutlined, RestaurantRounded, NightsStayOutlined, FavoriteBorderRounded];
const SYSTEM_ICONS = { MB: ShowChartRounded, CV: FavoriteBorderRounded, PM: AirRounded, EC: ScienceOutlined, NC: PsychologyOutlined, CF: FaceOutlined };
const tones = { below: 'low', moderate: 'moderate', high: 'high' };

export function ScreeningSummary({ user, onContinue }) {
  const { scores } = user;
  return <section className="summary-page page-enter">
    <div className="eyebrow">YOUR SLEEP & OSA EVALUATION</div>
    <div className="dashboard-overall"><EvaluationWidget
      title="Overall OSA risk"
      icon={<BedtimeOutlined />}
      percentage={getOverallPercentage(scores.parts)}
      chartLabel="Highest section percentage score"
      value={scores.overallRisk.level}
      tone={scores.overallRisk.level ?? 'neutral'}
      barColorMode="rating"
      reasons={getOverallReasons(scores)}
      description={scores.overallRisk.level ? scores.overallRisk.provisional ? 'Highest section result so far.' : 'Highest result across available section evaluations.' : 'Answer questions in Chat to see your overall result.'}
    /></div>
    <p className="summary-intro">{scores.answeredCount} / {scores.totalQuestions} questions answered. {scores.complete ? 'Your chat is complete.' : 'Your sleep insights take shape as you go.'}</p>
    <div className="section-results">{scores.parts.map((part, index) => {
      const Icon = PART_ICONS[index];
      const tone = tones[part.level] ?? 'neutral';
      const description = part.unreachable
        ? 'Thresholds need review: they exceed the available indicators.'
        : part.level === 'inconclusive' ? 'Unknown answers leave this section inconclusive.'
        : part.level === 'pending' ? 'Continue Chat to complete this section.'
        : part.score + ' scored points / ' + part.indicatorCount + ' indicators' + (part.provisional ? ' so far.' : '.');
      return <div className="dashboard-part" key={part.id}><EvaluationWidget
        title={part.shortTitle}
        icon={<Icon />}
        value={tones[part.level] ?? null}
        tone={tone}
        barColorMode="rating"
        reasons={getPositiveReasons(user, { partId: part.id })}
        description={description}
        percentage={getSectionPercentage(part)}
        chartLabel={part.shortTitle + ' percentage score'}
      /></div>;
    })}</div>
    <div className="system-results">
      <h2>Contributing systems</h2>
      <p className="system-explanation">Positive indicators as a percentage of evaluated answers. Unknown answers are excluded.</p>
      <div className="dashboard-system-grid">{scores.systems.map(system => {
        const Icon = SYSTEM_ICONS[system.tag];
        const percentage = system.positivePercentage;
        const tone = getSystemRiskTone(percentage);
        return <div className="dashboard-system" key={system.tag}><EvaluationWidget
          title={system.label}
          value={<Icon />}
          valueLabel={system.label + ': ' + (percentage === null ? 'no evaluated answers' : percentage + '% positive indicators')}
          tone={tone}
          reasons={getPositiveReasons(user, { systemTag: system.tag })}
          description={percentage === null ? 'No evaluated answers yet.' : system.positiveCount + ' / ' + system.evaluatedCount + ' positive indicators'}
          percentage={percentage}
          chartLabel={system.label + ': ' + (percentage === null ? 'no evaluated answers' : percentage + '% positive indicators')}
        /></div>;
      })}</div>
      <p className="system-explanation">Green: 0-33%. Yellow: above 33% through 67%. Red: above 67%.</p>
    </div>
    <details className="scoring-details"><summary>How this demo is scored</summary>
      <p>Demo evaluation based on the supplied rules. These indicators are not a diagnosis or a probability of OSA.</p>
      <p>Weighted core subtotal: <strong>{scores.coreWeightedSubtotal}</strong>. This is separate from section scores.</p>
      {scores.measurements.bmi !== null && <p>BMI: {scores.measurements.bmi.toFixed(1)} / {scores.measurements.bmiCategory}</p>}
      <ul>{scores.notes.map(note => <li key={note}>{note}</li>)}</ul>
    </details>
    <Button onClick={onContinue} variant="contained" color="secondary" endIcon={<ArrowForwardRounded />}>{scores.complete ? 'Review chat' : 'Continue chat'}</Button>
  </section>;
}
