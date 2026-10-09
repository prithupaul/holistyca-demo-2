import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MenuList } from '@mui/material';
import { createServer } from 'vite';
import { User } from '../src/classes/User.js';
import { questions } from '../src/questions.js';

let server, Questionnaire, ScreeningSummary, UserMenu, UserMenuItems, EvaluationWidget, ChatProgress;
before(async () => {
  server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  ({ Questionnaire } = await server.ssrLoadModule('/src/components/Questionnaire.jsx'));
  ({ ScreeningSummary } = await server.ssrLoadModule('/src/components/ScreeningSummary.jsx'));
  ({ UserMenu, UserMenuItems } = await server.ssrLoadModule('/src/components/UserMenu.jsx'));
  ({ EvaluationWidget } = await server.ssrLoadModule('/src/components/EvaluationWidget.jsx'));
  ({ ChatProgress } = await server.ssrLoadModule('/src/components/ChatProgress.jsx'));
});
after(async () => { await server?.close(); });
const renderCheckin = user => renderToString(React.createElement(Questionnaire, { user, onUserChange() {}, onDashboard() {}, onRestart() {}, storageError: '' }));

test('every question type and conditional branch renders without runtime errors', () => {
  let user = new User();
  let html;
  for (const question of questions) {
    assert.equal(question.isApplicable(user.answerMap), true);
    html = renderCheckin(user);
    assert.ok(html.includes('aria-label="Loading question"'));
    assert.ok(html.includes('aria-busy="true"'));
    assert.ok(html.includes('Saved on this device after every answer.'));
    if (question.type === 'choice') assert.ok(html.includes('answer-options'));
    if (question.type === 'number') assert.ok(html.includes('type="number"'));
    if (question.type === 'measurements') {
      assert.ok(html.includes('Height (cm)'));
      assert.ok(html.includes('Weight (kg)'));
    }
    if (question.type === 'time') assert.ok(html.includes('type="time"'));
    assert.ok(html.includes('default-text-answer'));
    if (question.type === 'checklist') assert.ok(html.includes('aria-pressed="false"'));
    const value = question.id === 'meals' ? 5 : question.id === 'diabetes' ? true : null;
    user = user.withAnswer(question, value);
  }
  html = renderCheckin(user);
  assert.ok(html.includes('Your chat is complete.'));
  assert.ok(!html.includes('aria-label="Loading question"'));
  assert.ok(html.includes('View sleep summary'));
  assert.equal(user.answers.length, 47);
});

test('summary renders all six systems and four valid section widgets', () => {
  const user = new User().withAnswer(questions[0], true);
  const html = renderToString(React.createElement(ScreeningSummary, { user, onContinue() {} }));
  for (const label of ['Metabolic health', 'Cardiovascular health', 'Pulmonary health', 'Endocrine health', 'Neuro-cognitive health', 'Cranio-facial attributes']) assert.ok(html.includes(label));
  assert.ok(!html.includes('Thresholds need review'));
  assert.ok(html.includes('STOPBANG'));
  assert.equal((html.match(/class="dashboard-part"/g) ?? []).length, 4);
  assert.equal((html.match(/class="dashboard-system"/g) ?? []).length, 6);
  assert.ok(html.includes('Continue chat'));
  assert.ok(html.includes('100%'));
});

test('user icon is available on all pages and random-answer options are exclusive to Chat', () => {
  for (const page of ['home', 'chat', 'dashboard', 'for-you']) {
    const icon = renderToString(React.createElement(UserMenu, { page, onAction() {} }));
    assert.ok(icon.includes('aria-label="User menu"'));
    const options = renderToString(React.createElement(MenuList, null, React.createElement(UserMenuItems, { page, onAction() {} })));
    assert.ok(options.includes('Log out'));
    assert.ok(options.includes('Clear data'));
    assert.equal(options.includes('Answer all questions'), page === 'chat');
    assert.equal(options.includes('Answer some questions'), page === 'chat');
  }
});

test('evaluation widget supports an icon, percentage value, bar chart and external link', () => {
  const html = renderToString(React.createElement(EvaluationWidget, {
    title: 'Sleep health', icon: React.createElement('span', null, 'Icon'), value: '75%',
    percentage: 75,
    link: { label: 'learn more', href: '/dashboard' }, tone: 'moderate',
  }));
  assert.ok(html.includes('Sleep health'));
  assert.ok(html.includes('evaluation-widget-icon'));
  assert.ok(html.includes('75%'));
  assert.ok(html.includes('role="progressbar"'));
  assert.ok(html.includes('aria-valuenow="75"'));
  assert.ok(html.includes('width:75%'));
  assert.ok(html.includes('background-color:var(--risk-high)'));
  assert.ok(html.includes('href="/dashboard"'));
});

test('evaluation widget omits optional elements and preserves numeric zero', () => {
  const html = renderToString(React.createElement(EvaluationWidget, { title: 'Risk indicators', value: 0 }));
  assert.ok(html.includes('>0</div>'));
  assert.ok(!html.includes('evaluation-widget-icon'));
  assert.ok(!html.includes('evaluation-widget-chart'));
  assert.ok(!html.includes('evaluation-widget-link'));
});

test('evaluation widget can display an icon value and a callback navigation link', () => {
  const html = renderToString(React.createElement(EvaluationWidget, {
    title: 'Sleep status', value: React.createElement('span', null, 'Moon'), valueLabel: 'Restful',
    link: { label: 'learn more', onClick() {} },
  }));
  assert.ok(html.includes('aria-label="Restful"'));
  assert.ok(html.includes('Moon'));
  assert.ok(html.includes('<button'));
  assert.ok(html.includes('learn more'));
});

test('horizontal bar colors follow percentages independently of the card risk and preserve unknown values', () => {
  for (const [percentage, tone] of [[0, 'low'], [33, 'low'], [33.1, 'moderate'], [67, 'moderate'], [67.1, 'high'], [100, 'high']]) {
    const html = renderToString(React.createElement(EvaluationWidget, { title: 'Indicators', percentage, tone: 'neutral' }));
    assert.ok(html.includes('width:' + percentage + '%'));
    assert.ok(html.includes('background-color:var(--risk-' + tone + ')'));
    assert.equal((html.match(/role="progressbar"/g) ?? []).length, 1);
  }
  const unknown = renderToString(React.createElement(EvaluationWidget, { title: 'Indicators', percentage: null }));
  assert.ok(unknown.includes('Not evaluated'));
  assert.ok(!unknown.includes('aria-valuenow'));
});

test('Chat begins with four equally allocated section progress bars using answered counts', () => {
  const user = new User().withAnswer(questions[0], true);
  const html = renderCheckin(user);
  assert.ok(html.indexOf('chat-progress-sticky') < html.indexOf('section-heading'));
  assert.ok(!html.includes('step-badge'));
  assert.equal((html.match(/role="progressbar"/g) ?? []).length, 4);
  assert.ok(html.includes('aria-label="STOPBANG progress"'));
  assert.ok(html.includes('aria-valuenow="12.5"'));
  for (const section of user.scores.parts) assert.ok(html.includes('aria-valuetext="' + section.answered + ' of ' + section.total + ' questions answered"'));
});

test('shared progress shows completion messages and the chat action only on Home', () => {
  const scores = new User().scores;
  for (const complete of [false, true]) {
    const html = renderToString(React.createElement(ChatProgress, { scores: { ...scores, complete, answeredCount: 1 }, onChat() {} }));
    assert.ok(html.includes(complete ? 'Evaluation complete' : 'Answer a few more questions for a complete evaluation.'));
    assert.ok(html.includes(complete ? 'Review chat' : 'Continue chat'));
    assert.equal((html.match(/role="progressbar"/g) ?? []).length, 4);
  }
  const empty = renderToString(React.createElement(ChatProgress, { scores, onChat() {} }));
  assert.ok(empty.includes('Start by answering a few questions'));
  const chat = renderToString(React.createElement(ChatProgress, { scores, onPartSelect() {}, availableParts: [1] }));
  assert.ok(!chat.includes('chat-progress-action'));
  assert.ok(chat.includes('Scroll to Part 1: STOPBANG'));
  assert.equal((chat.match(/disabled=""/g) ?? []).length, 3);
});

test('chat transcript marks answered and current sections as progress navigation targets', () => {
  let user = new User();
  for (const question of questions.filter(question => question.part === 1)) user = user.withAnswer(question, null);
  const html = renderCheckin(user);
  assert.ok(html.includes('data-part-id="1"'));
  assert.ok(html.includes('data-part-id="2"'));
  assert.ok(!html.includes('data-part-id="3"'));
});

test('rating bars use the risk classification even when percentage thresholds disagree', () => {
  for (const [percentage, tone] of [[25, 'moderate'], [37.5, 'high'], [75, 'low']]) {
    const html = renderToString(React.createElement(EvaluationWidget, {
      title: 'Section risk', percentage, tone, barColorMode: 'rating',
    }));
    assert.ok(html.includes('width:' + percentage + '%'));
    assert.ok(html.includes('background-color:var(--risk-' + tone + ')'));
  }
  const pending = renderToString(React.createElement(EvaluationWidget, {
    title: 'Section risk', percentage: 25, tone: 'neutral', barColorMode: 'rating',
  }));
  assert.ok(pending.includes('background-color:var(--brand-blue)'));
});

test('dashboard overall and STOPBANG bars use high rating for a 37.5% classic triad score', () => {
  let user = new User();
  for (const id of ['snoring', 'daytime_fatigue', 'observed_apnea']) {
    user = user.withAnswer(questions.find(question => question.id === id), true);
  }
  const html = renderToString(React.createElement(ScreeningSummary, { user, onContinue() {} }));
  assert.equal((html.match(/width:37\.5%;transform:scaleX\(0\);background-color:var\(--risk-high\)/g) ?? []).length, 2);
});
