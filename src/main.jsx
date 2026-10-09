import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, CssBaseline, Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Snackbar } from '@mui/material';
import HomeRounded from '@mui/icons-material/HomeRounded';
import ChatBubbleOutlineRounded from '@mui/icons-material/ChatBubbleOutlineRounded';
import GridViewRounded from '@mui/icons-material/GridViewRounded';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import SpaOutlined from '@mui/icons-material/SpaOutlined';
import BedtimeOutlined from '@mui/icons-material/BedtimeOutlined';
import { AuthScreen } from './components/AuthScreen.jsx';
import { LoadingIndicator } from './components/LoadingIndicator.jsx';
import { User } from './classes/User.js';
import { Questionnaire } from './components/Questionnaire.jsx';
import { ChatProgress } from './components/ChatProgress.jsx';
import { ScreeningSummary } from './components/ScreeningSummary.jsx';
import { UserMenu } from './components/UserMenu.jsx';
import { EvaluationWidget } from './components/EvaluationWidget.jsx';
import { Suggestions, SuggestionFilterDock } from './components/Suggestions.jsx';
import { getRelevantSuggestions } from './domain/suggestionMatching.js';
import { countUnreadSuggestions, loadSuggestionReads, saveSuggestionReads } from './domain/suggestionReads.js';
import { getOverallPercentage } from './domain/evaluationPercentage.js';
import { getOverallReasons } from './domain/evaluationReasons.js';
import { createDemoProfile } from './domain/demoProfiles.js';
import { logOut } from './domain/accounts.js';
import { theme } from './theme.js';
import './styles.css';
import './components/screening.css';

const pages = [
  { id: 'home', label: 'Home', icon: HomeRounded },
  { id: 'chat', label: 'Chat', icon: ChatBubbleOutlineRounded },
  { id: 'dashboard', label: 'Dashboard', icon: GridViewRounded },
  { id: 'for-you', label: 'Suggestions', icon: AutoAwesomeRounded },
];

function App() {
  const [page, setPage] = useState('home');
  const [initial] = useState(() => {
    try { return { user: User.load(), error: '' }; }
    catch { return { user: new User(), error: 'Your saved chat could not be restored. Start again to create a new chat.' }; }
  });
  const [user, setUser] = useState(initial.user);
  const [authenticated, setAuthenticated] = useState(Boolean(initial.user.profile.username));
  const [storageError, setStorageError] = useState(initial.error);
  const [restartOpen, setRestartOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [answerBusy, setAnswerBusy] = useState(false);
  const [demoProfile, setDemoProfile] = useState(null);
  const [suggestionFilters, setSuggestionFilters] = useState([]);
  const [suggestionsVisited, setSuggestionsVisited] = useState(false);
  const suggestions = useMemo(() => getRelevantSuggestions(user.answerMap), [user]);
  const [suggestionReads, setSuggestionReads] = useState(() => ({ userId: initial.user.id, ids: loadSuggestionReads(initial.user.id) }));
  const readIds = suggestionReads.userId === user.id ? suggestionReads.ids : new Set();
  const unreadSuggestions = countUnreadSuggestions(suggestions, readIds);
  useEffect(() => {
    if (suggestionReads.userId !== user.id) setSuggestionReads({ userId: user.id, ids: loadSuggestionReads(user.id) });
    else saveSuggestionReads(user.id, suggestionReads.ids);
  }, [user.id, suggestionReads]);
  const markSuggestionsRead = useCallback(ids => {
    setSuggestionReads(current => {
      if (current.userId !== user.id) return current;
      const next = new Set(current.ids);
      ids.forEach(id => next.add(id));
      return next.size === current.ids.size ? current : { userId: user.id, ids: next };
    });
  }, [user.id]);
  const scrollRef = useRef(null);
  const [loading, setLoading] = useState(null);
  const [loadingLeaving, setLoadingLeaving] = useState(false);
  const [transition, setTransition] = useState(null);
  const [authVisible, setAuthVisible] = useState(!initial.user.profile.username);
  const [authMotion, setAuthMotion] = useState(null);
  const loadingTimer = useRef(null);
  const navigationBusy = useRef(false);

  useEffect(() => () => clearTimeout(loadingTimer.current), []);

  function showLoading(variant = 'overlay', duration = 1000, onComplete) {
    clearTimeout(loadingTimer.current);
    setLoadingLeaving(false);
    setLoading(variant);
    loadingTimer.current = setTimeout(() => {
      if (variant === 'spinner') {
        setLoading(null);
        onComplete?.();
        return;
      }
      setLoadingLeaving(true);
      loadingTimer.current = setTimeout(() => {
        setLoading(null);
        setLoadingLeaving(false);
        onComplete?.();
      }, 200);
    }, duration);
  }

  function navigate(nextPage) {
    if (!authenticated || nextPage === page || navigationBusy.current || loading) return;
    navigationBusy.current = true;
    const direction = pages.findIndex(item => item.id === nextPage) > pages.findIndex(item => item.id === page) ? 'forward' : 'backward';
    showLoading('overlay', 1000, () => {
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
      setTransition({ nextPage, direction });
      loadingTimer.current = setTimeout(() => {
        setPage(nextPage);
        setTransition(null);
        navigationBusy.current = false;
      }, 350);
    });
  }

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [page, user.id]);

  useEffect(() => {
    if (page !== 'chat' || (demoProfile && user.answers.length >= demoProfile.answers.length)) setDemoProfile(null);
  }, [page, user.answers.length, demoProfile]);

  function updateUser(next, expectedUserId) {
    setUser(current => !expectedUserId || current.id === expectedUserId ? next : current);
    setStorageError('');
  }
  function handleAuthenticated(next) {
    if (navigationBusy.current) return;
    navigationBusy.current = true;
    updateUser(next);
    setSuggestionFilters([]);
    setSuggestionsVisited(false);
    setPage('home');
    setAuthenticated(true);
    showLoading('overlay', 1000, () => {
      setAuthMotion('leaving');
      loadingTimer.current = setTimeout(() => {
        setAuthVisible(false);
        setAuthMotion(null);
        navigationBusy.current = false;
      }, 350);
    });
  }
  function handleUserAction(action) {
    try {
      if (action === 'logout') {
        if (navigationBusy.current || loading) return;
        const signedOutUser = logOut();
        navigationBusy.current = true;
        showLoading('overlay', 1000, () => {
          setDemoProfile(null);
          setRestartOpen(false);
          setNotice('');
          setAnswerBusy(false);
          setAuthVisible(true);
          setAuthMotion('entering');
          loadingTimer.current = setTimeout(() => {
            updateUser(signedOutUser);
            setAuthenticated(false);
            setPage('home');
            setAuthMotion(null);
            navigationBusy.current = false;
          }, 350);
        });
      } else if (action === 'clear') {
        setDemoProfile(null);
        updateUser(User.clearData());
        setRestartOpen(false);
        navigate('home');
        setNotice('Your answers and evaluations have been cleared.');
      } else if (page === 'chat' && ['all', 'some'].includes(action)) {
        const profile = createDemoProfile(action);
        const freshUser = new User({ id: profile.id, createdAt: profile.createdAt, profile: user.profile });
        freshUser.save();
        updateUser(freshUser);
        setDemoProfile(profile);
      }
    } catch (error) { setNotice(error.message || 'Could not update your profile. Please try again.'); }
  }
  function restart() {
    try {
      setDemoProfile(null);
      const next = new User({ profile: user.profile });
      next.save();
      updateUser(next);
      setRestartOpen(false);
    } catch (error) { setStorageError(error.message); setRestartOpen(false); }
  }

  function renderScreen(screen) {
    return <>
      {screen === 'home' && <section className="home-page page-enter">
        <div className="eyebrow">SLEEP WELLNESS & OSA</div>
        <h1>Understand your sleep.<br /><span>Support your wellbeing.</span></h1>
        <p className="intro">Explore your sleep habits and obstructive sleep apnea (OSA) risk.<br className="desktop-break" /> Let’s start with how you sleep.</p>
        <div className="home-chat-progress"><ChatProgress scores={user.scores} onChat={() => navigate('chat')} /></div>
        <div className="home-evaluation"><EvaluationWidget
          title="Overall OSA risk"
          icon={<BedtimeOutlined />}
          percentage={getOverallPercentage(user.scores.parts)}
          chartLabel="Highest section percentage score"
          value={user.scores.overallRisk.level}
          tone={user.scores.overallRisk.level ?? 'neutral'}
          barColorMode="rating"
          reasons={getOverallReasons(user.scores)}
          description={user.scores.overallRisk.level ? user.scores.overallRisk.provisional ? 'Highest section result so far.' : 'Highest result across available section evaluations.' : 'Answer questions in Chat to see your result.'}
          link={{ label: 'learn more', onClick: () => navigate('dashboard') }}
        /></div>
        <p className="placeholder-note">Build healthier sleep habits, one step at a time.</p>
      </section>}

      {screen === 'chat' && <Questionnaire user={user} demoAnswer={demoProfile?.answers[user.answers.length]} onDemoError={() => setDemoProfile(null)} onUserChange={next => updateUser(next, user.id)} onBusyChange={setAnswerBusy} onDashboard={() => navigate('dashboard')} onRestart={() => setRestartOpen(true)} storageError={storageError} />}
      {screen === 'dashboard' && <>
        <div className="page-chat-progress"><ChatProgress scores={user.scores} onChat={() => navigate('chat')} /></div>
        <ScreeningSummary user={user} onContinue={() => navigate('chat')} />
      </>}

      {screen === 'for-you' && <>
        <div className="page-chat-progress"><ChatProgress scores={user.scores} onChat={() => navigate('chat')} /></div>
        <Suggestions suggestions={suggestions} filters={suggestionFilters}
        onFiltersChange={setSuggestionFilters} visited={suggestionsVisited} onVisited={() => setSuggestionsVisited(true)}
        active={page === 'for-you' && !transition && !loading && !authVisible} onRead={markSuggestionsRead} onChat={() => navigate('chat')} />
      </>}

    </>;
  }

  const backgroundPage = transition?.nextPage ?? page;
  const backgroundOffset = pages.findIndex(item => item.id === backgroundPage) / (pages.length - 1) * -50;

  return <>
    <div style={{ display: 'contents' }} inert={Boolean(loading || transition || authMotion)} aria-busy={Boolean(loading || transition || authMotion)}>
    <div style={{ display: 'contents' }} inert={authVisible} aria-hidden={authVisible ? true : undefined}>
    {authenticated && <div className="app-gradient-viewport" aria-hidden="true">
      <div className="app-gradient" style={{ transform: `translateX(${backgroundOffset}%)` }} />
    </div>}
    {authenticated && page === 'home' && <div className="home-background" aria-hidden="true">
        <div className="welcome-art" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="petal petal-blue" /><div className="petal petal-green" /><div className="petal petal-blue-light" /><div className="petal petal-green-light" /><div className="art-center"><SpaOutlined /></div><span className="art-dot dot-one" /><span className="art-dot dot-two" /></div>
    </div>}
    <div className="app-shell main-app-shell" ref={scrollRef}>
    <header className="topbar">
      <a className="brand" href="#" onClick={event => { event.preventDefault(); navigate('home'); }}><span className="brand-mark"><SpaOutlined /></span>holistyca<span className="brand-dot">.</span></a>
      {authenticated && <UserMenu page={page} onAction={handleUserAction} disabled={answerBusy || Boolean(demoProfile)} />}
    </header>
    <main>
      {authenticated && <div className={`screen-stack${transition ? ` screen-stack--${transition.direction}` : ''}`}>
        {[page, ...(transition ? [transition.nextPage] : [])].map(screen => <div
          key={screen}
          className={`screen-panel${transition ? screen === page ? ' screen-panel--outgoing' : ' screen-panel--incoming' : ''}`}
          aria-hidden={transition && screen === page ? true : undefined}
        >{renderScreen(screen)}</div>)}
      </div>}
    </main>
    <Dialog open={restartOpen} onClose={() => setRestartOpen(false)} maxWidth="xs" fullWidth>
      <DialogTitle>Start a new chat?</DialogTitle>
      <DialogContent><DialogContentText>This will replace your saved answers and scores on this device.</DialogContentText></DialogContent>
      <DialogActions><Button onClick={() => setRestartOpen(false)}>Keep my answers</Button><Button onClick={restart}>Start again</Button></DialogActions>
    </Dialog>
    <Snackbar open={Boolean(notice)} autoHideDuration={4000} onClose={(_, reason) => { if (reason !== 'clickaway') setNotice(''); }} message={notice} anchorOrigin={{ vertical: 'top', horizontal: 'center' }} />
    </div>
    {authenticated && <nav className="bottom-nav" aria-label="Main navigation">{pages.map(({ id, label, icon: Icon }) => <button key={id} className={page === id ? 'nav-item active' : 'nav-item'} onClick={() => navigate(id)} aria-current={page === id ? 'page' : undefined} aria-label={id === 'for-you' && unreadSuggestions ? `${label}, ${unreadSuggestions} unread suggestions` : label}><span className="nav-icon"><Icon />{id === 'for-you' && unreadSuggestions > 0 && <span className="nav-unread-count" aria-hidden="true">{unreadSuggestions}</span>}</span><span>{label}</span></button>)}</nav>}
    {authenticated && page === 'for-you' && !transition && <SuggestionFilterDock suggestions={suggestions} filters={suggestionFilters} onFiltersChange={setSuggestionFilters} />}
    </div>
    {authVisible && <div className={`app-shell auth-screen-panel${authMotion ? ` auth-screen-panel--${authMotion}` : ''}`}>
      <header className="topbar">
        <span className="brand"><span className="brand-mark"><SpaOutlined /></span>holistyca<span className="brand-dot">.</span></span>
      </header>
      <main><AuthScreen onModeChange={() => showLoading('spinner', 500)} onAuthenticated={handleAuthenticated} /></main>
    </div>}
    </div>
    <LoadingIndicator variant={loading} leaving={loadingLeaving} />
  </>;
}

createRoot(document.getElementById('root')).render(<ThemeProvider theme={theme}><CssBaseline /><App /></ThemeProvider>);
