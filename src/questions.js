import { Question } from './classes/Question.js';

export const SYSTEMS = {
  MB: 'Metabolic health', CV: 'Cardiovascular health', PM: 'Pulmonary health',
  EC: 'Endocrine health', NC: 'Neuro-cognitive health', CF: 'Cranio-facial attributes',
};
export const PARTS = [
  { id: 1, title: 'STOPBANG', shortTitle: 'STOPBANG', moderate: 3, high: 5 },
  { id: 2, title: 'Weight change & eating patterns', shortTitle: 'Weight & eating', moderate: 3, high: 4 },
  { id: 3, title: 'Diet, sleep & metabolic health', shortTitle: 'Sleep & metabolism', moderate: 3, high: 6 },
  { id: 4, title: 'Cardiovascular, neurological & functional indicators', shortTitle: 'Health & daily life', moderate: 4, high: 10 },
];
const yesNo = [{ label: 'Yes', value: true }, { label: 'No', value: false }, { label: 'I don’t know', value: null }];
const q = config => new Question(config);
const binary = (id, part, text, system, relatedSystems = [system], extra = {}) => q({ id, part, text, system, relatedSystems, type: 'choice', options: yesNo, rule: 'yes', ...extra });
const fieldLabels = { age: 'Age', neck: 'Neck circumference', previous_weight: 'Weight 6 months ago', waist: 'Waist circumference', waist_hip_ratio: 'Waist-to-hip ratio', meals: 'Meals per day', sleep_hours: 'Uninterrupted sleep', bedtime_variability: 'Bedtime variation', hba1c: 'HbA1c' };
const number = (id, part, text, system, rule, min, max, unit, extra = {}) => q({ id, part, text, system, type: 'number', rule, fields: [{ key: 'value', label: fieldLabels[id] ?? text, min, max, unit }], ...extra });

export const questions = [
  binary('snoring', 1, 'Do you snore loudly or regularly?', 'CF', ['MB', 'CF']),
  binary('daytime_fatigue', 1, 'Do you experience excessive daytime sleepiness or fatigue?', 'NC', ['MB', 'NC']),
  binary('observed_apnea', 1, 'Has anyone observed that you stop breathing during sleep?', 'PM', ['MB', 'PM', 'CF', 'NC']),
  binary('hypertension', 1, 'Do you have high blood pressure or hypertension?', 'CV', ['CV', 'MB', 'PM']),
  q({ id: 'body_measurements', part: 1, text: 'What is your height and current weight?', system: 'MB', relatedSystems: ['MB', 'EC'], type: 'measurements', rule: 'bmi', hint: 'Use centimeters and kilograms. We’ll calculate your BMI.', fields: [
    { key: 'height', label: 'Height', unit: 'cm', min: 50, max: 250 },
    { key: 'weight', label: 'Weight', unit: 'kg', min: 10, max: 500 },
  ] }),
  number('age', 1, 'How old are you?', 'MB', 'age', 1, 120, 'years', { hint: 'Age is a supporting indicator in this evaluation.', step: 1 }),
  number('neck', 1, 'What is your neck circumference?', 'CF', 'neck', 15, 100, 'cm', { relatedSystems: ['MB', 'CF', 'EC'], hint: 'Measure around the base of your neck, where a collar sits. If you don’t know, you can skip the measurement.' }),
  q({ id: 'sex', part: 1, text: 'What is your biological sex?', system: 'CF', type: 'choice', rule: 'sex', hint: 'Used for the sex-specific thresholds in your evaluation. You can choose not to share.', options: [
    { label: 'Male', value: 'male' }, { label: 'Female', value: 'female' }, { label: 'others', value: 'others' }, { label: 'Prefer not to say', value: null },
  ] }),
  number('previous_weight', 2, 'What was your approximate weight 6 months ago?', 'MB', 'weight_change', 10, 500, 'kg', { relatedSystems: ['MB', 'EC'], hint: 'We’ll compare your previous and current BMI categories using the same height.' }),
  number('waist', 2, 'What is your waist circumference?', 'MB', 'waist', 30, 250, 'cm', { relatedSystems: ['MB', 'EC'], hint: 'Measure around your waist with a relaxed abdomen.' }),
  number('waist_hip_ratio', 2, 'What is your waist-to-hip ratio?', 'MB', 'waist_hip', 0.3, 3, '', { relatedSystems: ['MB', 'EC'], hint: 'Divide your waist circumference by your hip circumference, using the same units. For example, 90 ÷ 100 = 0.9.', step: 0.01 }),
  number('meals', 2, 'How many meals do you typically eat per day?', 'MB', 'meal_pattern', 1, 20, 'meals', { relatedSystems: ['MB', 'EC'], step: 1 }),
  binary('late_snacks', 2, 'Do you often eat late-night snacks or heavy evening meals?', 'MB', ['MB', 'EC'], { condition: { questionId: 'meals', operator: 'greaterThan', value: 4 }, indicator: false }),
  q({ id: 'last_meal', part: 2, text: 'At what time do you usually have your last meal of the day?', system: 'MB', relatedSystems: ['MB', 'EC'], type: 'time', rule: 'none', indicator: false, condition: { questionId: 'meals', operator: 'greaterThan', value: 4 }, hint: 'Use the 24-hour clock. Meals after 22:00 are a risk indicator in this demo.' }),
  q({ id: 'diet', part: 3, text: 'Which of these are regularly part of your diet?', system: 'MB', relatedSystems: ['MB', 'EC'], type: 'checklist', rule: 'diet', hint: 'Select all that apply. Leave an item unchecked if it is inadequate in your diet.', options: [
    { label: 'Whole grains, fruits, vegetables & legumes', value: 'plants' },
    { label: 'Lean protein sources', value: 'protein' }, { label: 'Healthy fats', value: 'fats' },
    { label: 'Adequate water intake (document: ~3 L/day)', value: 'water' },
  ] }),
  binary('interrupted_sleep', 3, 'Is your sleep frequently interrupted?', 'PM', ['MB', 'PM', 'CF', 'NC']),
  number('sleep_hours', 3, 'How many hours of uninterrupted sleep do you get on average?', 'NC', 'sleep_hours', 0, 24, 'hours', { relatedSystems: ['NC', 'MB'], step: 0.5 }),
  number('bedtime_variability', 3, 'How much does your bedtime vary from day to day?', 'NC', 'bedtime', 0, 24, 'hours', { hint: 'Enter 0 if you go to bed at the same time. A variation of more than 2 hours is an indicator.', step: 0.5 }),
  binary('hypothyroidism', 3, 'Do you have hypothyroidism or symptoms suggestive of it?', 'EC', ['EC', 'MB']),
  binary('diabetes', 3, 'Do you have diabetes?', 'EC', ['EC', 'MB']),
  binary('insulin_switch', 3, 'Have you recently switched from oral diabetes medication to insulin?', 'EC', ['EC', 'MB'], { condition: { questionId: 'diabetes', operator: 'equals', value: true } }),
  number('hba1c', 3, 'What is your most recent HbA1c value?', 'EC', 'hba1c', 2, 25, '%', { relatedSystems: ['EC', 'MB'], hint: 'HbA1c reflects average blood sugar over roughly 3 months. Enter the percentage from your report, or choose “I don’t know”.', step: 0.1 }),
  binary('pcod', 3, 'Do you have Polycystic Ovarian Disease (PCOD)?', 'EC', ['EC', 'MB'], { allowNotApplicable: true }),
  binary('resistant_hypertension', 4, 'Do you have resistant or difficult-to-control hypertension?', 'CV', ['CV', 'MB']),
  binary('ischemic_heart_disease', 4, 'Do you have ischemic heart disease?', 'CV', ['CV', 'MB']),
  binary('cardiac_hospitalization', 4, 'Have you previously been hospitalized for a cardiac condition?', 'CV', ['CV', 'MB']),
  binary('arrhythmias', 4, 'Do you have arrhythmias (an irregular heart rhythm)?', 'CV', ['CV', 'MB']),
  binary('stroke_tia', 4, 'Have you had a stroke or transient ischemic attack (TIA)?', 'NC', ['NC', 'CV', 'MB']),
  binary('headaches', 4, 'Do you have chronic or early-morning headaches?', 'NC', ['NC', 'CF']),
  binary('cognitive_changes', 4, 'Have you noticed memory loss, mood changes, or poor concentration?', 'NC'),
  binary('night_awakenings', 4, 'Do you wake up frequently during the night?', 'PM', ['MB', 'PM', 'CF', 'NC']),
  binary('unrefreshing_sleep', 4, 'Do you feel unrefreshed after sleeping?', 'NC', Object.keys(SYSTEMS)),
  binary('reduced_productivity', 4, 'Have you experienced reduced productivity?', 'NC', Object.keys(SYSTEMS)),
  binary('sleepiness_accidents', 4, 'Have you had a motor vehicle accident related to sleepiness?', 'NC'),
  binary('sedentary_sleepiness', 4, 'Do you feel sleepy during sedentary activities, such as reading or watching TV?', 'NC'),
  binary('driving_sleepiness', 4, 'Do you experience sleepiness while driving?', 'NC'),
  binary('glaucoma', 4, 'Do you have glaucoma?', 'NC'),
  binary('acid_reflux', 4, 'Do you have acid reflux?', 'MB'),
  binary('copd_asthma_hypoxia', 4, 'Do you have COPD or asthma with daytime hypoxia (low blood oxygen)?', 'PM', ['CV', 'PM']),
  binary('kidney_disease', 4, 'Do you have chronic kidney disease?', 'CV'),
  binary('peripheral_vascular_disease', 4, 'Do you have peripheral vascular disease?', 'CV'),
  binary('anesthesia_complications', 4, 'Have you experienced anesthesia-related complications?', 'PM'),
  binary('neuromuscular_disorders', 4, 'Do you have a neuromuscular disorder?', 'NC'),
  binary('nocturia', 4, 'Do you wake up at night to urinate (nocturia)?', 'EC'),
  binary('pregnancy_complications', 4, 'Have you had pregnancy-related metabolic or hypertensive complications?', 'EC', ['EC', 'MB', 'CV'], { allowNotApplicable: true }),
  binary('adverse_pregnancy_outcomes', 4, 'Have you experienced adverse pregnancy outcomes?', 'EC', ['EC'], { allowNotApplicable: true }),
  binary('infertility_ed', 4, 'Do you have infertility or erectile dysfunction?', 'EC', ['EC'], { allowNotApplicable: true }),
];

export function getApplicableQuestions(answers = {}) {
  return questions.filter(question => question.isApplicable(answers));
}

// API boundary: replace these local operations with backend calls when ready.
export async function getQuestion(user) {
  return getApplicableQuestions(user.answerMap).find(question => !user.hasAnswer(question.id)) ?? null;
}

export async function submitAnswer(user, questionId, value, text) {
  const question = questions.find(item => item.id === questionId);
  if (!question) throw new Error('Question not found.');
  const next = user.withAnswer(question, value, text);
  next.save();
  return next;
}
