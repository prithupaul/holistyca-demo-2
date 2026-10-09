import { getApplicableQuestions } from '../questions.js';
import { explainPositive } from './positiveExplanation.js';

const tones = { below: 'low', moderate: 'moderate', high: 'high' };

export function getOverallReasons(scores) {
  const sections = scores.parts.filter(part => !part.unreachable && tones[part.level] === scores.overallRisk.level);
  const systems = scores.systems.filter(system => scores.positiveTotal > 0 && system.positiveCount / scores.positiveTotal > 0.5);
  return [
    {
      title: 'Sections with the highest risk rating',
      items: sections.map(part => `${part.shortTitle}: ${tones[part.level]}${part.provisional ? ' (so far)' : ''}`),
      empty: 'No section has an available risk rating yet.',
    },
    {
      title: 'Systems contributing more than 50%',
      items: systems.map(system => `${system.label}: ${system.contributionPercentage}% of all positive indicators (${system.positiveCount} of ${scores.positiveTotal}).`),
      empty: 'No system contributes more than 50% of all positive indicators.',
    },
  ];
}

export function getPositiveReasons(user, { partId, systemTag }) {
  const answers = user.answerMap;
  const items = getApplicableQuestions(answers)
    .filter(question => question.indicator && question.evaluate(answers) === true
      && (partId === undefined || question.part === partId)
      && (systemTag === undefined || question.system === systemTag))
    .map(question => explainPositive(question, answers));
  const groups = [{ items, empty: 'No positive indicators have been recorded here yet.' }];
  if (partId === 1) {
    const part = user.scores.parts.find(section => section.id === 1);
    if (part.classicTriad) groups.push({ title: 'Rating rule', items: ['Snoring, daytime fatigue and observed breathing pauses together give this section a high rating.'] });
    if (part.positiveCount > part.score) groups.push({ title: 'Scoring note', items: ['Age, biological sex and hypertension are supporting indicators. They add section points only when a primary STOPBANG indicator is positive.'] });
  }
  return groups;
}
