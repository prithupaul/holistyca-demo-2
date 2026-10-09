import { bmi, bmiCategory } from '../domain/measurements.js';

const SYSTEM_TAGS = ['MB', 'CV', 'PM', 'EC', 'NC', 'CF'];

export class Question {
  constructor({ id, part, text, system, relatedSystems = [system], type, options = [], fields = [], rule, condition = null, indicator = true, hint = '', step = 0.1, allowNotApplicable = false }) {
    if (!id || !text || !SYSTEM_TAGS.includes(system) || ![1, 2, 3, 4].includes(part)) throw new Error('A question needs an ID, text, part, and one valid primary system tag.');
    Object.assign(this, { id, part, text, system, relatedSystems, type, options, fields, rule, condition, indicator, hint, step, allowNotApplicable });
    if (allowNotApplicable) this.options = [...options, { label: 'Not applicable', value: 'not_applicable' }];
  }

  isApplicable(answers) {
    if (!this.condition) return true;
    const { questionId, operator, value } = this.condition;
    const answer = answers[questionId];
    return operator === 'greaterThan' ? typeof answer === 'number' && answer > value : answer === value;
  }

  normalize(value) {
    if (value === null) return null;
    if (this.type === 'choice') {
      if (!this.options.some(option => option.value === value)) throw new Error('Choose one of the available answers.');
      return value;
    }
    if (this.type === 'checklist') {
      if (!Array.isArray(value) || value.some(item => !this.options.some(option => option.value === item))) throw new Error('Select valid dietary components.');
      return [...new Set(value)];
    }
    if (this.type === 'time') {
      if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error('Enter a valid time.');
      return value;
    }
    const validate = (raw, field) => {
      if (raw === undefined || raw === null || (typeof raw === 'string' && raw.trim() === '') || (typeof raw !== 'string' && typeof raw !== 'number')) throw new Error(`Enter your ${field.label.toLowerCase()}.`);
      const result = Number(raw);
      if (!Number.isFinite(result) || result < field.min || result > field.max) throw new Error(`Enter a value between ${field.min} and ${field.max} ${field.unit}.`);
      if (this.step === 1 && !Number.isInteger(result)) throw new Error('Enter a whole number.');
      return result;
    };
    if (this.type === 'number') return validate(value, this.fields[0]);
    if (this.type === 'measurements') return Object.fromEntries(this.fields.map(field => [field.key, validate(value?.[field.key], field)]));
    throw new Error('Unsupported question type.');
  }

  formatAnswer(value) {
    if (value === null) return 'I don’t know / not shared';
    if (this.type === 'choice') return this.options.find(option => option.value === value)?.label ?? 'Unknown';
    if (this.type === 'checklist') return value.length ? this.options.filter(option => value.includes(option.value)).map(option => option.label).join(', ') : 'None of these';
    if (this.type === 'measurements') return this.fields.map(field => `${field.label}: ${value[field.key]} ${field.unit}`).join(' · ');
    if (this.type === 'number') return `${value} ${this.fields[0].unit}`.trim();
    return value;
  }

  evaluate(answers) {
    const value = answers[this.id];
    if (value === undefined || value === null || value === 'not_applicable') return null;
    switch (this.rule) {
      case 'yes': return value === true;
      case 'bmi': return bmi(value.weight, value.height) >= 25;
      case 'age': return value >= 50;
      case 'neck': return value >= 40;
      case 'sex': return value === 'others' ? null : value === 'male';
      case 'weight_change': {
        const current = answers.body_measurements;
        if (!current) return null;
        return bmiCategory(bmi(current.weight, current.height)).index > bmiCategory(bmi(value, current.height)).index;
      }
      case 'waist': return answers.sex === 'male' ? value >= 95 : answers.sex === 'female' ? value >= 90 : null;
      case 'waist_hip': return answers.sex === 'male' ? value >= 0.9 : answers.sex === 'female' ? value >= 0.85 : null;
      case 'meal_pattern': {
        if (value <= 4) return false;
        const snacks = answers.late_snacks;
        const time = answers.last_meal;
        const late = typeof time === 'string' ? Number(time.slice(0, 2)) * 60 + Number(time.slice(3)) > 22 * 60 : null;
        if (snacks === true || late === true) return true;
        return snacks === false && late === false ? false : null;
      }
      case 'diet': return this.options.some(option => !value.includes(option.value));
      case 'sleep_hours': return value < 7;
      case 'bedtime': return value > 2;
      case 'hba1c': return value > 5.5;
      case 'none': return null;
      default: throw new Error(`Unknown risk rule: ${this.rule}`);
    }
  }
}
