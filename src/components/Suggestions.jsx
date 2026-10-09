import { useEffect, useId, useRef, useState } from 'react';
import { Button, Chip, InputAdornment, TextField } from '@mui/material';
import SearchRounded from '@mui/icons-material/SearchRounded';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import WbSunnyRounded from '@mui/icons-material/WbSunnyRounded';
import WbTwilightRounded from '@mui/icons-material/WbTwilightRounded';
import BedtimeRounded from '@mui/icons-material/BedtimeRounded';
import RestaurantRounded from '@mui/icons-material/RestaurantRounded';
import FitnessCenterRounded from '@mui/icons-material/FitnessCenterRounded';
import DirectionsCarRounded from '@mui/icons-material/DirectionsCarRounded';
import MedicalServicesRounded from '@mui/icons-material/MedicalServicesRounded';
import SoupKitchenRounded from '@mui/icons-material/SoupKitchenRounded';
import ShoppingCartRounded from '@mui/icons-material/ShoppingCartRounded';
import EventNoteRounded from '@mui/icons-material/EventNoteRounded';
import WorkOutlineRounded from '@mui/icons-material/WorkOutlineRounded';
import SpaRounded from '@mui/icons-material/SpaRounded';
import HealthAndSafetyRounded from '@mui/icons-material/HealthAndSafetyRounded';
import { filterSuggestionsByTags, getAvailableSuggestionTags, getSuggestionTags, tagTypes } from '../domain/suggestionMatching.js';
import './suggestions.css';

const tagIcons = {
  morning: WbSunnyRounded, day: WbSunnyRounded, evening: WbTwilightRounded, night: BedtimeRounded,
  meals: RestaurantRounded, driving: DirectionsCarRounded, procedure: MedicalServicesRounded,
  cooking: SoupKitchenRounded, shopping: ShoppingCartRounded,
  planning: EventNoteRounded, work_break: WorkOutlineRounded,
  dietary: RestaurantRounded, exercise: FitnessCenterRounded, lifestyle: SpaRounded,
  sleep: BedtimeRounded, medical_follow_up: MedicalServicesRounded, safety: HealthAndSafetyRounded,
};

function TagPill({ tag, onClick, onDelete, ...props }) {
  const Icon = tagIcons[tag.value ?? tag.id.split(':')[1]] ?? AutoAwesomeRounded;
  return <Chip size="small" icon={<Icon aria-hidden="true" style={{ color: 'var(--tag-icon-color)' }} />} className={`suggestion-tag suggestion-tag--${tag.type}`} label={tag.label} onClick={onClick} onDelete={onDelete} {...props} />;
}

export function Suggestions({ suggestions, filters, onFiltersChange, visited, onVisited, active, onChat, onRead }) {
  const pageRef = useRef(null);
  const visible = filterSuggestionsByTags(suggestions, filters);
  const filterKey = filters.join('|');
  const previousFilters = useRef(filterKey);
  const [animation, setAnimation] = useState({ enabled: false, revision: 0 });
  const [waitingForFirstVisit, setWaitingForFirstVisit] = useState(!visited);

  useEffect(() => {
    if (active && waitingForFirstVisit) {
      setWaitingForFirstVisit(false);
      setAnimation(current => ({ enabled: true, revision: current.revision + 1 }));
      onVisited();
    }
  }, [active, waitingForFirstVisit, onVisited]);

  useEffect(() => {
    if (previousFilters.current === filterKey) return;
    previousFilters.current = filterKey;
    setAnimation(current => ({ enabled: true, revision: current.revision + 1 }));
  }, [filterKey]);

  useEffect(() => {
    if (!active || waitingForFirstVisit || !onRead || typeof IntersectionObserver === 'undefined') return;
    const page = pageRef.current;
    const root = page?.closest('.main-app-shell');
    if (!root) return;
    const headerHeight = root.querySelector('.topbar')?.getBoundingClientRect().height ?? 0;
    const dock = root.parentElement.querySelector('.suggestion-filter-dock');
    const coveredBottom = dock ? Math.max(0, root.getBoundingClientRect().bottom - dock.getBoundingClientRect().top) : 0;
    const observer = new IntersectionObserver(entries => {
      const ids = [];
      for (const entry of entries) {
        if (!entry.isIntersecting || entry.intersectionRect.height < Math.min(100, entry.boundingClientRect.height / 2)) continue;
        ids.push(entry.target.dataset.suggestionId);
        observer.unobserve(entry.target);
      }
      if (ids.length) onRead(ids);
    }, { root, rootMargin: `-${headerHeight}px 0px -${coveredBottom}px 0px`, threshold: [0, .1, .2, .25, .5, 1] });
    page.querySelectorAll('[data-suggestion-id]').forEach(card => observer.observe(card));
    return () => observer.disconnect();
  }, [active, waitingForFirstVisit, filterKey, animation.revision, suggestions, onRead]);

  return <section ref={pageRef} className="suggestions-page">
    <div className="eyebrow">YOUR SLEEP WELLNESS PLAN</div>
    <h1>Small habits.<br /><span>Better sleep.</span></h1>
    <p className="suggestions-intro">Suggestions from your evaluation to support sleep wellness and OSA care.</p>
    <div className="suggestion-tag-legend" aria-label="Tag colors">{Object.entries(tagTypes).map(([type, label]) => <span key={type} className={`suggestion-tag-key suggestion-tag-key--${type}`}>{label}</span>)}</div>
    <p className="suggestion-result-count" role="status">{visible.length} {visible.length === 1 ? 'suggestion' : 'suggestions'}{filters.length ? ' matching all selected tags' : ' for you'}</p>
    <div className={`suggestion-bubbles${waitingForFirstVisit ? ' suggestion-bubbles--waiting' : ''}`}>
      {visible.map((suggestion, index) => <article key={`${animation.revision}:${suggestion.id}`} data-suggestion-id={suggestion.id} className={`suggestion-bubble${animation.enabled ? ' suggestion-bubble--pop' : ''}`} style={{ '--pop-delay': `${Math.min(index, 8) * 55}ms` }}>
        <span className="suggestion-bubble-icon" aria-hidden="true"><AutoAwesomeRounded /></span>
        <h2>{suggestion.title}</h2>
        <p className="suggestion-body">{suggestion.suggestion}</p>
        {suggestion.contextNotes.length > 0 && <div className="suggestion-context">{suggestion.contextNotes.map(note => <p key={note}>{note}</p>)}</div>}
        <div className="suggestion-bubble-tags" aria-label="Suggestion tags">{getSuggestionTags(suggestion).map(tag => <TagPill key={tag.id} tag={tag} />)}</div>
      </article>)}
    </div>
    {!visible.length && <div className="suggestion-empty">
      <AutoAwesomeRounded aria-hidden="true" />
      <h2>{filters.length ? 'Try a different combination.' : 'Better sleep starts with a conversation.'}</h2>
      <p>{filters.length ? 'No suggestions match all these tags. Remove a filter to see more.' : 'Share your sleep habits in Chat for suggestions that fit your sleep wellness needs.'}</p>
      <Button onClick={filters.length ? () => onFiltersChange([]) : onChat}>{filters.length ? 'Clear filters' : 'Go to chat'}</Button>
    </div>}
  </section>;
}

export function SuggestionFilterDock({ suggestions, filters, onFiltersChange }) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef(null);
  const popupId = useId();
  const tags = getAvailableSuggestionTags(suggestions);
  const selectedTags = filters.map(id => tags.find(tag => tag.id === id) ?? {
    id, type: id.split(':')[0], label: id.split(':')[1].replaceAll('_', ' '),
  });
  const search = query.trim().toLowerCase().replaceAll('_', ' ');
  const matches = tags.filter(tag => !filters.includes(tag.id) && tag.label.includes(search));
  const open = focused;

  function selectTag(tag) {
    onFiltersChange([...filters, tag.id]);
    setQuery('');
    setHighlighted(0);
    setFocused(false);
    inputRef.current?.blur();
  }

  function handleKey(event) {
    if (event.key === 'Escape') { setFocused(false); return; }
    if (!open || !matches.length) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlighted(index => (index + (event.key === 'ArrowDown' ? 1 : -1) + matches.length) % matches.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      selectTag(matches[Math.min(highlighted, matches.length - 1)]);
    }
  }

  return <div className="suggestion-filter-dock">
    {selectedTags.length > 0 && <div className="suggestion-selected-filters" aria-label="Selected tag filters" inert={open}>
      {selectedTags.map(tag => <TagPill key={tag.id} tag={tag} onDelete={() => onFiltersChange(filters.filter(id => id !== tag.id))} />)}
      <Button size="small" onClick={() => onFiltersChange([])}>Clear filters</Button>
    </div>}
    <div className="suggestion-filter-input">
    {open && <div className="suggestion-tag-popup" id={popupId} role="listbox" aria-label="Matching tags">
      <p>{matches.length ? 'Add a tag' : 'No matching tags'}</p>
      <div className="suggestion-tag-options">{matches.map((tag, index) => <TagPill key={tag.id} tag={tag} id={`${popupId}-${index}`} role="option" aria-selected={index === highlighted} tabIndex={-1} onMouseDown={event => event.preventDefault()} onClick={() => selectTag(tag)} />)}</div>
    </div>}
    <TextField fullWidth size="small" label="Filter by tags" placeholder="Try morning, cooking, dietary…" value={query} inputRef={inputRef}
      onChange={event => { setQuery(event.target.value); setHighlighted(0); setFocused(true); }}
      onFocus={() => setFocused(true)} onClick={() => setFocused(true)} onBlur={() => setFocused(false)} onKeyDown={handleKey}
      slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRounded /></InputAdornment> }, htmlInput: { role: 'combobox', 'aria-autocomplete': 'list', 'aria-expanded': open, 'aria-controls': open ? popupId : undefined, 'aria-activedescendant': open && matches.length ? `${popupId}-${Math.min(highlighted, matches.length - 1)}` : undefined } }} />
    </div>
  </div>;
}
