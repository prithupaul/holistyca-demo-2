import { PARTS, SYSTEMS, getApplicableQuestions } from '../questions.js';
import { bmi, bmiCategory } from './measurements.js';
import { getOverallOsaRisk } from './overallRisk.js';

export function calculateScores(answers) {
  const applicable = getApplicableQuestions(answers);
  const evaluated = applicable.filter(question => question.indicator).map(question => ({
    question, positive: question.evaluate(answers), answered: Object.hasOwn(answers, question.id),
  }));
  const core = evaluated.filter(item => item.question.part === 1);
  const corePositive = id => core.find(item => item.question.id === id)?.positive === true;
  const supportingIds = ['hypertension', 'age', 'sex'];
  const hasPrimaryCoreRisk = core.some(item => !supportingIds.includes(item.question.id) && item.positive === true);
  const corePoints = core.filter(item => item.positive === true && (hasPrimaryCoreRisk || !supportingIds.includes(item.question.id))).length;

  const parts = PARTS.map(part => {
    const items = evaluated.filter(item => item.question.part === part.id);
    const partQuestions = applicable.filter(question => question.part === part.id);
    const positiveCount = items.filter(item => item.positive === true).length;
    const evaluatedCount = items.filter(item => item.positive !== null).length;
    const assessableCount = items.filter(item => answers[item.question.id] !== 'not_applicable').length;
    const answered = partQuestions.filter(question => Object.hasOwn(answers, question.id)).length;
    const complete = answered === partQuestions.length;
    const score = part.id === 1 ? corePoints : positiveCount;
    const unreachable = part.moderate > items.length || part.high > items.length;
    const classicTriad = part.id === 1 && ['snoring', 'daytime_fatigue', 'observed_apnea'].every(corePositive);
    let level = score >= part.high || classicTriad ? 'high' : score >= part.moderate ? 'moderate' : 'below';
    if (unreachable) level = 'unconfigured';
    else if (!complete && level === 'below') level = 'pending';
    else if (complete && evaluatedCount < assessableCount && level === 'below') level = 'inconclusive';
    return { ...part, score, positiveCount, evaluatedCount, indicatorCount: items.length, answered, total: partQuestions.length, complete, level, provisional: !complete, classicTriad, unreachable };
  });

  const positiveTotal = evaluated.filter(item => item.positive === true).length;
  const systems = Object.entries(SYSTEMS).map(([tag, label]) => {
    const items = evaluated.filter(item => item.question.system === tag);
    const positiveCount = items.filter(item => item.positive === true).length;
    const evaluatedCount = items.filter(item => item.positive !== null).length;
    return {
      tag, label, positiveCount, evaluatedCount, total: items.length,
      unknownCount: items.filter(item => item.answered && item.positive === null && answers[item.question.id] !== 'not_applicable').length,
      notApplicableCount: items.filter(item => answers[item.question.id] === 'not_applicable').length,
      positivePercentage: evaluatedCount ? Math.round(positiveCount / evaluatedCount * 1000) / 10 : null,
      contributionPercentage: positiveTotal ? Math.round(positiveCount / positiveTotal * 1000) / 10 : null,
    };
  });

  const measurements = answers.body_measurements;
  const currentBmi = measurements ? bmi(measurements.weight, measurements.height) : null;
  const previousBmi = measurements && typeof answers.previous_weight === 'number' ? bmi(answers.previous_weight, measurements.height) : null;
  const weightedItems = [
    { id: 'snoring', weight: 10 },
    { id: 'daytime_fatigue', weight: corePositive('snoring') && corePositive('observed_apnea') ? 9 : 7 },
    { id: 'observed_apnea', weight: 10 },
    { id: 'hypertension', weight: answers.resistant_hypertension === true ? 9 : 6, supporting: true },
    { id: 'body_measurements', weight: currentBmi > 30 ? 10 : 6 },
    { id: 'age', weight: 5, supporting: true },
    { id: 'neck', weight: 8 },
  ].map(item => ({ ...item, points: corePositive(item.id) && (!item.supporting || hasPrimaryCoreRisk) ? item.weight : 0 }));

  const notes = [
    'These are the supplied demo rules, not a validated diagnosis or a probability of OSA.',
    'Part 4 uses the updated thresholds: 4-9 positive indicators are moderate risk; 10 or more are high risk.',
    'One primary system tag is used for percentages. Additional associations are retained on each question; assignments absent from the document are provisional.',
    'Part 2 snacks and meal timing count as one combined indicator: with more than four meals, late snacks/heavy evening meals or a last meal after 22:00 are positive.',
    'Overall OSA risk shows the most severe achieved section classification. Section point scores remain separate; the overall label is not a probability.',
    'The weighted core subtotal excludes biological sex (no weight supplied). Female snoring relevance and an age multiplier have no numerical adjustment specified.',
  ];
  if (answers.sex === 'female') notes.push('The document considers snoring less relevant in females and highlights fatigue, irritability, depression and mood changes. No numerical reduction was supplied.');

  return {
    parts, systems, positiveTotal, overallRisk: getOverallOsaRisk(parts),
    answeredCount: applicable.filter(question => Object.hasOwn(answers, question.id)).length,
    totalQuestions: applicable.length,
    complete: applicable.every(question => Object.hasOwn(answers, question.id)),
    coreWeightedSubtotal: weightedItems.reduce((total, item) => total + item.points, 0), weightedItems,
    measurements: { bmi: currentBmi, bmiCategory: bmiCategory(currentBmi)?.label ?? null, previousBmi, previousBmiCategory: bmiCategory(previousBmi)?.label ?? null },
    notes,
  };
}
