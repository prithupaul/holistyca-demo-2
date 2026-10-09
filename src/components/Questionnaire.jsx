import { useEffect, useRef, useState } from 'react';
import { Button, IconButton, TextField } from '@mui/material';
import { ChatProgress } from './ChatProgress.jsx';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import ArrowUpwardRounded from '@mui/icons-material/ArrowUpwardRounded';
import CheckRounded from '@mui/icons-material/CheckRounded';
import SpaOutlined from '@mui/icons-material/SpaOutlined';
import { parseTextAnswer } from '../domain/textAnswers.js';
import { PARTS, questions, getApplicableQuestions, getQuestion, submitAnswer } from '../questions.js';

export function Questionnaire({ user, onUserChange, onBusyChange, onDashboard, onRestart, storageError, demoAnswer, onDemoError }) {
  const [draft, setDraft] = useState({});
  const [textAnswer, setTextAnswer] = useState('');
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [visibleQuestionKey, setVisibleQuestionKey] = useState(null);
  const pending = useRef(false);
  const transcriptRef = useRef(null);
  const localHour = new Date().getHours();
  const greeting = localHour < 12 ? 'Good morning' : localHour < 18 ? 'Good afternoon' : 'Good evening';
  const name = user.profile.name?.trim();
  const applicable = getApplicableQuestions(user.answerMap);
  const current = applicable.find(question => !user.hasAnswer(question.id)) ?? null;
  const part = PARTS.find(item => item.id === current?.part);
  const score = user.scores;
  const questionKey = current ? `${user.id}:${current.id}` : null;
  const questionLoading = Boolean(current && visibleQuestionKey !== questionKey);
  const answerDisabled = busy || questionLoading || Boolean(demoAnswer);

  useEffect(() => {
    if (!questionKey) return;
    const timer = setTimeout(() => setVisibleQuestionKey(questionKey), 250);
    return () => clearTimeout(timer);
  }, [questionKey]);

  useEffect(() => {
    setDraft({}); setTextAnswer(''); setSelected([]); setError('');
  }, [current?.id, user.id]);

  useEffect(() => {
    // The app shell owns scrolling, including the greeting and answer controls.
    if (!user.answers.length) return;
    const scroller = transcriptRef.current?.closest('.main-app-shell');
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
  }, [current?.id, user.id, questionLoading]);

  useEffect(() => {
    if (questionLoading || !current || demoAnswer?.questionId !== current.id) return;
    // Let the full question remain visible after the same 250ms loading phase.
    const timer = setTimeout(() => answer(demoAnswer.value), 250);
    return () => clearTimeout(timer);
  }, [questionLoading, current?.id, user.id, demoAnswer]);

  async function answer(value, text) {
    if (!current || questionLoading || pending.current) return;
    pending.current = true; setBusy(true); onBusyChange?.(true); setError('');
    try {
      const nextUser = await submitAnswer(user, current.id, value, text);
      await getQuestion(nextUser);
      onUserChange(nextUser);
    } catch (failure) { setError(failure.message || 'Could not save your answer. Please try again.'); onDemoError?.(); }
    finally { pending.current = false; setBusy(false); onBusyChange?.(false); }
  }

  function submitText(event) {
    event.preventDefault();
    if (answerDisabled || !current) return;
    try { answer(parseTextAnswer(current, textAnswer), textAnswer); }
    catch (failure) { setError(failure.message); }
  }

  function submitForm(event) {
    event.preventDefault();
    const value = current.type === 'measurements' ? draft : current.type === 'time' ? draft.value : draft.value ?? '';
    answer(value);
  }

  function scrollToPart(partId) {
    const transcript = transcriptRef.current;
    const section = transcript?.querySelector(`[data-part-id="${partId}"]`);
    const scroller = transcript?.closest('.main-app-shell');
    if (!section || !scroller) return;
    const headerHeight = scroller.querySelector('.topbar')?.getBoundingClientRect().height ?? 0;
    const progressHeight = scroller.querySelector('.chat-progress-sticky')?.getBoundingClientRect().height ?? 0;
    scroller.scrollTo({
      top: scroller.scrollTop + section.getBoundingClientRect().top - scroller.getBoundingClientRect().top - headerHeight - progressHeight - 16,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  }

  return <section className="chat-page page-enter">
    <div className="chat-progress-sticky">
      <ChatProgress scores={score} onPartSelect={scrollToPart} availableParts={[...user.answers.map(entry => entry.part), ...(current ? [current.part] : [])]} />
    </div>
    <div className="section-heading">
      <div><h1>{greeting}{name ? `, ${name}` : ''}<span className="title-dot">.</span></h1><p>Let’s chat a little to understand your sleep wellness.</p></div>
    </div>
    <div className="chat-panel">
      <div ref={transcriptRef} className="chat-history" role="log" aria-live="polite">
        <div className="chat-date">YOUR CHAT</div>
        {user.answers.map((entry, index) => {
          const question = questions.find(item => item.id === entry.questionId);
          if (!question) return null;
          const previous = user.answers[index - 1];
          return <div key={entry.questionId}>
            {previous?.part !== entry.part && <div className="transcript-section" data-part-id={entry.part}>Part {entry.part} · {PARTS[entry.part - 1].shortTitle}</div>}
            <div className="message-row assistant"><span className="assistant-avatar"><SpaOutlined fontSize="small" /></span><div className="message-bubble">{question.text}</div></div>
            <div className="message-row user"><div className="message-bubble">{entry.text ?? question.formatAnswer(entry.value)}</div><span className="user-avatar"><CheckRounded fontSize="small" /></span></div>
          </div>;
        })}
        {current && user.answers.at(-1)?.part !== current.part && <div className="transcript-section" data-part-id={current.part}>Part {current.part} · {part.shortTitle}</div>}
        <div className="message-row assistant"><span className="assistant-avatar"><SpaOutlined fontSize="small" /></span><div className="message-bubble current-question" aria-busy={questionLoading}>{questionLoading ? <span role="status" aria-label="Loading question">...</span> : current?.text ?? 'Your chat is complete. Explore what your answers tell us about your sleep health.'}</div></div>
      </div>
      <div className="answer-area">
        {(error || storageError) && <p role="alert" className="error">{error || storageError}</p>}
        {current?.hint && !questionLoading && <p className="answer-hint">{current.hint}</p>}
        {current && <form className="answer-form default-text-answer" onSubmit={submitText}>
          <TextField label="Your answer" placeholder={current.type === 'measurements' ? 'e.g. 170 cm, 70 kg' : 'Type your answer'} type="text" value={textAnswer} onChange={event => setTextAnswer(event.target.value)} disabled={answerDisabled} fullWidth size="small" />
          <IconButton type="submit" aria-label="Send text answer" disabled={answerDisabled || !textAnswer.trim()} className="send-button"><ArrowUpwardRounded /></IconButton>
        </form>}
        {current?.type === 'choice' && <div className="answer-options answer-pills">{current.options.map((option, index) => <Button key={index} variant="outlined" disabled={answerDisabled} onClick={() => answer(option.value)}>{option.label}</Button>)}</div>}
        {current?.type === 'checklist' && <div className="diet-options">
          <div className="answer-options answer-pills">{current.options.map(option => <Button key={option.value} variant={selected.includes(option.value) ? 'contained' : 'outlined'} aria-pressed={selected.includes(option.value)} disabled={answerDisabled} onClick={() => setSelected(previous => previous.includes(option.value) ? previous.filter(item => item !== option.value) : [...previous, option.value])}>{option.label}</Button>)}</div>
          <Button variant="contained" color="secondary" disabled={answerDisabled} onClick={() => answer(selected)} endIcon={<ArrowForwardRounded />}>Continue</Button>
        </div>}
        {current && ['number', 'measurements', 'time'].includes(current.type) && <form onSubmit={submitForm} className="measurement-form">
          <div className="measurement-fields">{(current.type === 'time' ? [{ key: 'value', label: 'Last meal time' }] : current.fields).map(field => <TextField key={`${current.id}-${field.key}`} label={`${field.label}${field.unit ? ` (${field.unit})` : ''}`} type={current.type === 'time' ? 'time' : 'number'} value={draft[field.key] ?? ''} onChange={event => setDraft(previous => ({ ...previous, [field.key]: event.target.value }))} disabled={answerDisabled} fullWidth size="small" required slotProps={{ htmlInput: { min: field.min, max: field.max, step: current.type === 'time' ? 60 : 'any' }, inputLabel: { shrink: true } }} />)}</div>
          <IconButton type="submit" aria-label="Send answer" disabled={answerDisabled} className="send-button"><ArrowUpwardRounded /></IconButton>
        </form>}
        {current && current.type !== 'choice' && <Button className="unknown-answer" size="small" color="inherit" disabled={answerDisabled} onClick={() => answer(null)}>I don’t know</Button>}
        {!current && <div className="completion"><span className="complete-icon"><CheckRounded /></span><p>Your chat is complete.</p><Button onClick={onDashboard} endIcon={<ArrowForwardRounded />}>View sleep summary</Button><Button size="small" color="inherit" onClick={onRestart}>Start again</Button></div>}
        <p className="chat-footnote">Saved on this device after every answer.</p>
      </div>
    </div>
    {current && <div className="checkin-actions"><Button size="small" onClick={onDashboard}>View progress</Button><Button size="small" color="inherit" onClick={onRestart} disabled={busy || Boolean(demoAnswer)}>Start again</Button></div>}
  </section>;
}
