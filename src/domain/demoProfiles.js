import { User } from '../classes/User.js';
import { getApplicableQuestions } from '../questions.js';

// Typical demo input ranges, kept separate from clinical scoring thresholds.
const NUMBER_RANGES = {
  age: [18, 85, 1], neck: [28, 50, 0.5], previous_weight: [45, 140, 0.5],
  waist: [65, 135, 0.5], waist_hip_ratio: [0.65, 1.15, 0.01], meals: [2, 6, 1],
  sleep_hours: [4, 9, 0.5], bedtime_variability: [0, 4, 0.5], hba1c: [4.5, 9, 0.1],
};

function randomNumber(min, max, step, random) {
  const steps = Math.round((max - min) / step);
  return Number((min + Math.floor(random() * (steps + 1)) * step).toFixed(2));
}

export function randomAnswer(question, random = Math.random) {
  switch (question.type) {
    case 'choice': {
      // Known answers make demo risk summaries more useful than all-unknown profiles.
      const options = question.options.filter(option => option.value !== null && option.value !== 'not_applicable');
      return options[Math.floor(random() * options.length)].value;
    }
    case 'measurements': return { height: randomNumber(150, 200, 1, random), weight: randomNumber(45, 140, 0.5, random) };
    case 'number': {
      const [min, max, step] = NUMBER_RANGES[question.id] ?? [question.fields[0].min, question.fields[0].max, question.step];
      return randomNumber(min, max, step, random);
    }
    case 'checklist': return question.options.filter(() => random() < 0.65).map(option => option.value);
    case 'time': {
      const minutes = randomNumber(18 * 60, 23 * 60 + 45, 15, random);
      return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
    }
    default: throw new Error(`Cannot generate an answer for ${question.type}.`);
  }
}

export function createDemoProfile(mode, random = Math.random) {
  if (!['all', 'some'].includes(mode)) throw new Error('Choose a valid demo profile option.');
  let user = new User();
  let current;
  // Resolve each next question from the answers, so conditional questions are respected.
  while ((current = getApplicableQuestions(user.answerMap).find(question => !user.hasAnswer(question.id)))) {
    user = user.withAnswer(current, randomAnswer(current, random));
  }
  if (mode === 'all') return user;

  const count = randomNumber(Math.ceil(user.answers.length * 0.25), Math.floor(user.answers.length * 0.5), 1, random);
  // Keep a sequential prefix so the chat resumes naturally at the next question.
  const answers = user.answers.slice(0, count);
  return new User({ id: user.id, createdAt: user.createdAt, updatedAt: answers.at(-1).answeredAt, answers });
}

export function saveDemoProfile(mode, storage = globalThis.localStorage, random = Math.random) {
  const user = createDemoProfile(mode, random);
  // Save the finished batch atomically; a failure leaves the previous profile intact.
  user.save(storage);
  return user;
}
