import { questions, getApplicableQuestions } from '../questions.js';
import { calculateScores } from '../domain/scoring.js';

export const USER_STORAGE_KEY = 'holistyca.osa.user.v1';
export const ACCOUNTS_STORAGE_KEY = 'holistyca.accounts.v1';

export class User {
  constructor({ id, createdAt, updatedAt, profile = {}, answers = [] } = {}) {
    this.schemaVersion = 1;
    this.id = id ?? globalThis.crypto?.randomUUID?.() ?? `user-${Date.now()}`;
    this.createdAt = createdAt ?? new Date().toISOString();
    this.updatedAt = updatedAt ?? this.createdAt;
    this.profile = { ...profile };
    this.answers = answers;
    const map = this.answerMap;
    this.answers = answers.map(entry => ({ ...entry, riskPositive: questions.find(question => question.id === entry.questionId)?.evaluate(map) ?? null }));
    this.scores = calculateScores(this.answerMap);
  }

  get answerMap() {
    return Object.fromEntries(this.answers.map(answer => [answer.questionId, answer.value]));
  }

  hasAnswer(questionId) {
    return this.answers.some(answer => answer.questionId === questionId);
  }

  withAnswer(question, value, text) {
    if (!question.isApplicable(this.answerMap)) throw new Error('This question is not applicable.');
    const entry = { questionId: question.id, part: question.part, system: question.system, value: question.normalize(value), answeredAt: new Date().toISOString() };
    if (typeof text === 'string' && text.trim()) entry.text = text.trim();
    const answers = this.answers.filter(answer => answer.questionId !== question.id).concat(entry);
    const map = Object.fromEntries(answers.map(answer => [answer.questionId, answer.value]));
    const applicableIds = new Set(getApplicableQuestions(map).map(item => item.id));
    return new User({ ...this, updatedAt: entry.answeredAt, answers: answers.filter(answer => applicableIds.has(answer.questionId)) });
  }

  toJSON() {
    return { schemaVersion: this.schemaVersion, id: this.id, createdAt: this.createdAt, updatedAt: this.updatedAt, profile: this.profile, answers: this.answers, scores: this.scores };
  }

  save(storage = globalThis.localStorage) {
    if (!storage) throw new Error('Local storage is unavailable. Your answer has not been saved.');
    try {
      if (this.profile.username) {
        const accounts = JSON.parse(storage.getItem(ACCOUNTS_STORAGE_KEY) ?? '[]');
        const others = accounts.filter(account => account.profile.username !== this.profile.username);
        storage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify([...others, this.toJSON()]));
      }
      storage.setItem(USER_STORAGE_KEY, JSON.stringify(this));
    }
    catch { throw new Error('Could not save your answer on this device. Check browser storage settings and try again.'); }
  }

  static clearData(storage = globalThis.localStorage) {
    if (!storage) throw new Error('Local storage is unavailable. Your saved data has not been cleared.');
    try {
      const current = User.load(storage);
      if (current.profile.username) {
        const fresh = new User({ id: current.id, createdAt: current.createdAt, profile: current.profile });
        fresh.save(storage);
        return fresh;
      }
      storage.removeItem(USER_STORAGE_KEY);
    }
    catch { throw new Error('Could not clear your saved data. Check browser storage settings and try again.'); }
    return new User();
  }

  static load(storage = globalThis.localStorage) {
    if (!storage) throw new Error('Local storage is unavailable.');
    const raw = storage.getItem(USER_STORAGE_KEY);
    if (!raw) return new User();
    return User.fromJSON(JSON.parse(raw));
  }

  static fromJSON(parsed) {
    if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.answers)) throw new Error('Saved chat format is not supported.');
    const answers = [];
    for (const entry of parsed.answers) {
      const question = questions.find(item => item.id === entry.questionId);
      if (!question) continue;
      const value = question.normalize(entry.value);
      const record = { questionId: question.id, part: question.part, system: question.system, value, answeredAt: entry.answeredAt };
      if (typeof entry.text === 'string' && entry.text.trim()) record.text = entry.text.trim();
      const existing = answers.findIndex(item => item.questionId === question.id);
      if (existing >= 0) answers[existing] = record;
      else answers.push(record);
    }
    // Scores are recomputed rather than trusting a saved calculated result.
    const map = Object.fromEntries(answers.map(entry => [entry.questionId, entry.value]));
    const applicableIds = new Set(getApplicableQuestions(map).map(question => question.id));
    return new User({ id: parsed.id, createdAt: parsed.createdAt, updatedAt: parsed.updatedAt, profile: parsed.profile, answers: answers.filter(entry => applicableIds.has(entry.questionId)) });
  }
}
