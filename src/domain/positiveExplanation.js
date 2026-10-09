import { bmi, bmiCategory } from './measurements.js';

const reports = {
  snoring: 'You reported loud or regular snoring.',
  daytime_fatigue: 'You reported excessive daytime sleepiness or fatigue.',
  observed_apnea: 'Someone has observed pauses in your breathing during sleep.',
  hypertension: 'You reported high blood pressure or hypertension.',
  interrupted_sleep: 'You reported that your sleep is frequently interrupted.',
  hypothyroidism: 'You reported hypothyroidism or symptoms suggestive of it.',
  diabetes: 'You reported diabetes.',
  insulin_switch: 'You reported recently switching from oral diabetes medication to insulin.',
  pcod: 'You reported Polycystic Ovarian Disease (PCOD).',
  resistant_hypertension: 'You reported hypertension that is resistant or difficult to control.',
  ischemic_heart_disease: 'You reported ischemic heart disease.',
  cardiac_hospitalization: 'You reported a previous hospitalization for a cardiac condition.',
  arrhythmias: 'You reported an irregular heart rhythm (arrhythmia).',
  stroke_tia: 'You reported a previous stroke or transient ischemic attack (TIA).',
  headaches: 'You reported chronic or early-morning headaches.',
  cognitive_changes: 'You reported memory loss, mood changes or difficulty concentrating.',
  night_awakenings: 'You reported waking frequently during the night.',
  unrefreshing_sleep: 'You reported feeling unrefreshed after sleep.',
  reduced_productivity: 'You reported reduced productivity.',
  sleepiness_accidents: 'You reported a motor vehicle accident related to sleepiness.',
  sedentary_sleepiness: 'You reported feeling sleepy during sedentary activities, such as reading or watching TV.',
  driving_sleepiness: 'You reported feeling sleepy while driving.',
  glaucoma: 'You reported glaucoma.',
  acid_reflux: 'You reported acid reflux.',
  copd_asthma_hypoxia: 'You reported COPD or asthma with low blood oxygen during the day.',
  kidney_disease: 'You reported chronic kidney disease.',
  peripheral_vascular_disease: 'You reported peripheral vascular disease.',
  anesthesia_complications: 'You reported previous complications related to anesthesia.',
  neuromuscular_disorders: 'You reported a neuromuscular disorder.',
  nocturia: 'You reported waking during the night to urinate.',
  pregnancy_complications: 'You reported metabolic or hypertensive complications during pregnancy.',
  adverse_pregnancy_outcomes: 'You reported adverse pregnancy outcomes.',
  infertility_ed: 'You reported infertility or erectile dysfunction.',
};

export function explainPositive(question, answers) {
  if (reports[question.id]) return reports[question.id];
  const value = answers[question.id];
  switch (question.id) {
    case 'body_measurements':
      return `Your height of ${value.height} cm and weight of ${value.weight} kg give a BMI of ${bmi(value.weight, value.height).toFixed(1)}, meeting this section's threshold of 25.`;
    case 'age': return `Your age of ${value} years meets the evaluation threshold of 50 years.`;
    case 'neck': return `Your neck circumference of ${value} cm meets the evaluation threshold of 40 cm.`;
    case 'sex': return 'You reported male biological sex, which is a supporting indicator in this evaluation.';
    case 'previous_weight': {
      const current = answers.body_measurements;
      const previousCategory = bmiCategory(bmi(value, current.height)).label.toLowerCase();
      const currentCategory = bmiCategory(bmi(current.weight, current.height)).label.toLowerCase();
      return `Your weight changed from ${value} kg six months ago to ${current.weight} kg. At your height of ${current.height} cm, your BMI category increased from ${previousCategory} to ${currentCategory}.`;
    }
    case 'waist': return `Your waist circumference of ${value} cm meets the ${answers.sex === 'male' ? 95 : 90} cm threshold used for your reported biological sex.`;
    case 'waist_hip_ratio': return `Your waist-to-hip ratio of ${value} meets the ${answers.sex === 'male' ? 0.9 : 0.85} threshold used for your reported biological sex.`;
    case 'meals': {
      const reasons = [];
      if (answers.late_snacks === true) reasons.push('you often have late-night snacks or heavy evening meals');
      if (typeof answers.last_meal === 'string' && answers.last_meal > '22:00') reasons.push(`your last meal is at ${answers.last_meal}, after 22:00`);
      return `You eat ${value} meals per day, more than four, and ${reasons.join(' and ')}. These count as one combined indicator.`;
    }
    case 'diet': {
      const labels = { plants: 'whole grains, fruits, vegetables and legumes', protein: 'lean protein', fats: 'healthy fats', water: 'adequate water intake' };
      const missing = question.options.filter(option => !value.includes(option.value)).map(option => labels[option.value]);
      return `Your dietary answers indicate inadequate intake of ${missing.join('; ')}. These count as one dietary indicator.`;
    }
    case 'sleep_hours': return `You reported ${value} hours of uninterrupted sleep on average, below the seven-hour evaluation threshold.`;
    case 'bedtime_variability': return `Your bedtime varies by ${value} hours, exceeding the two-hour evaluation threshold.`;
    case 'hba1c': return `Your reported HbA1c of ${value}% exceeds the evaluation threshold of 5.5%.`;
    default: throw new Error(`Missing positive explanation for ${question.id}.`);
  }
}
