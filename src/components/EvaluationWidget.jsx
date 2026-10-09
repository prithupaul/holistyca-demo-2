import { useEffect, useId, useRef, useState } from 'react';
import { Accordion, AccordionDetails, AccordionSummary, Link } from '@mui/material';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import './evaluation-widget.css';
import { getSystemRiskTone } from '../domain/systemRisk.js';

/**
 * Reusable evaluation card for Home, Dashboard, and recommendations.
 * `value` accepts text, numbers, percentages, or a React node (such as an icon).
 * `percentage` accepts a number from 0 to 100, or null when not evaluated; `link` accepts { label, href?, onClick? }.
 * `barColorMode="rating"` uses the card's risk tone; the default uses percentage thresholds.
 */
export function EvaluationWidget({ title, icon, value, valueLabel, description, percentage, chartLabel, link, reasons, tone = 'neutral', barColorMode = 'percentage' }) {
  const reasonsId = useId();
  const chartRef = useRef(null);
  const [chartVisible, setChartVisible] = useState(false);
  const hasChart = percentage !== undefined;

  useEffect(() => {
    if (!hasChart || !chartRef.current) return;
    if (typeof IntersectionObserver === 'undefined') {
      setChartVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      setChartVisible(entry.isIntersecting && entry.intersectionRatio >= 0.25);
    }, { threshold: [0, 0.25] });
    observer.observe(chartRef.current);
    return () => observer.disconnect();
  }, [hasChart]);

  const progress = Number.isFinite(percentage) ? Math.min(100, Math.max(0, percentage)) : null;
  const safeTone = ['neutral', 'high', 'moderate', 'low'].includes(tone) ? tone : 'neutral';
  const barTone = barColorMode === 'rating' ? safeTone : getSystemRiskTone(progress);

  return <article className={`evaluation-widget evaluation-widget--${safeTone}`} aria-label={title}>
    <div className="evaluation-widget-heading">
      {icon && <span className="evaluation-widget-icon" aria-hidden="true">{icon}</span>}
      <h2>{title}</h2>
    </div>
    <div className="evaluation-widget-value" aria-label={valueLabel}>{value ?? '—'}</div>
    {description && <p className="evaluation-widget-description">{description}</p>}
    {reasons && <Accordion className="evaluation-widget-why" disableGutters elevation={0}>
      <AccordionSummary expandIcon={<ExpandMoreRounded />} id={reasonsId + '-summary'} aria-controls={reasonsId + '-content'} aria-label={'Why? ' + title}>Why?</AccordionSummary>
      <AccordionDetails id={reasonsId + '-content'}>
        {reasons.map((group, index) => <div className="evaluation-widget-reason-group" key={group.title ?? index}>
          {group.title && <h3>{group.title}</h3>}
          {group.items.length ? <ul>{group.items.map(item => <li key={item}>{item}</li>)}</ul> : <p>{group.empty}</p>}
        </div>)}
      </AccordionDetails>
    </Accordion>}
    {percentage !== undefined && <div className="evaluation-widget-chart">
      <span className="evaluation-widget-chart-value">{progress === null ? 'Not evaluated' : progress + '%'}</span>
      <div ref={chartRef} className="evaluation-widget-chart-track" role="progressbar" aria-label={chartLabel ?? title + ' percentage score'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress ?? undefined} aria-valuetext={progress === null ? 'Not evaluated' : progress + '%'}>
        <span className="evaluation-widget-chart-bar" style={{ width: (progress ?? 0) + '%', transform: `scaleX(${chartVisible ? 1 : 0})`, backgroundColor: barTone === 'neutral' ? 'var(--brand-blue)' : 'var(--risk-' + barTone + ')' }} />
      </div>
    </div>}
    {link && <Link className="evaluation-widget-link" component={link.href ? 'a' : 'button'} type={link.href ? undefined : 'button'} href={link.href} onClick={link.onClick} underline="none">{link.label}<ArrowForwardRounded fontSize="inherit" aria-hidden="true" /></Link>}
  </article>;
}
