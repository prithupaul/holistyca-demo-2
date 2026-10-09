import { Button, LinearProgress } from '@mui/material';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import ChatBubbleOutlineRounded from '@mui/icons-material/ChatBubbleOutlineRounded';
import './chat-progress.css';

export function ChatProgress({ scores, onChat, onPartSelect, availableParts = [] }) {
  return <div className="chat-progress-widget">
    <h2 className="chat-progress-title">{scores.answeredCount === 0 ? 'Start by answering a few questions' : scores.complete ? 'Evaluation complete' : 'Answer a few more questions for a complete evaluation.'}</h2>
    <div className="chat-progress-segments" role="group" aria-label="Questionnaire progress by part">
      {scores.parts.map(section => {
        const complete = section.total > 0 && section.answered >= section.total;
        const bar = <LinearProgress variant="determinate" value={section.total ? section.answered / section.total * 100 : 0} aria-label={section.shortTitle + ' progress'} aria-valuetext={section.answered + ' of ' + section.total + ' questions answered'} sx={{ height: '.5rem', border: '1px solid rgba(255, 255, 255, .25)', borderRadius: 'var(--app-radius)', backgroundColor: 'rgba(255, 255, 255, .25)', backgroundClip: 'padding-box', '& .MuiLinearProgress-bar': { backgroundColor: complete ? 'var(--brand-green)' : 'var(--risk-moderate)' } }} />;
        return onPartSelect ? <button key={section.id} type="button" className="chat-progress-segment" disabled={!availableParts.includes(section.id)} aria-label={'Scroll to Part ' + section.id + ': ' + section.shortTitle} title={section.shortTitle} onClick={() => onPartSelect(section.id)}>{bar}</button> : <div key={section.id}>{bar}</div>;
      })}
    </div>
    {onChat && <Button className="chat-progress-action" onClick={onChat} startIcon={<ChatBubbleOutlineRounded />} endIcon={<ArrowForwardRounded />}>{scores.answeredCount === 0 ? 'Lets talk' : scores.complete ? 'Review chat' : 'Continue chat'}</Button>}
  </div>;
}
