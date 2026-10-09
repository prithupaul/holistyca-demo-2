import { useState } from 'react';
import { Button, TextField } from '@mui/material';
import { logIn, signUp } from '../domain/accounts.js';
import './auth-screen.css';

export function AuthScreen({ onAuthenticated, onModeChange }) {
  const [mode, setMode] = useState('login');
  const [fields, setFields] = useState({ name: '', username: '', password: '' });
  const [error, setError] = useState('');
  const signingUp = mode === 'signup';
  const update = key => event => setFields(previous => ({ ...previous, [key]: event.target.value }));
  function submit(event) {
    event.preventDefault();
    setError('');
    try {
      onAuthenticated(signingUp ? signUp(fields) : logIn(fields.username, fields.password));
    } catch (failure) { setError(failure.message || 'Could not save your account.'); }
  }
  return <section className="auth-page page-enter">
    <div className="eyebrow">SLEEP WELLNESS & OSA</div>
    <h1>{signingUp ? 'Start with better sleep.' : 'Welcome back to sleep wellness.'}</h1>
    <p className="auth-intro">{signingUp ? 'Create an account to explore your sleep wellness and OSA risk.' : 'Continue your sleep evaluation and explore habits that support better sleep.'}</p>
    <form className="auth-form" onSubmit={submit}>
      {signingUp && <TextField label="Name" required value={fields.name} onChange={update('name')} autoComplete="name" />}
      <TextField label="Username" required value={fields.username} onChange={update('username')} autoComplete="username" />
      <TextField label="Password" type="password" required value={fields.password} onChange={update('password')} autoComplete={signingUp ? 'new-password' : 'current-password'} />
      {error && <p className="error" role="alert">{error}</p>}
      <Button type="submit" variant="contained" color="secondary">{signingUp ? 'Sign up' : 'Log in'}</Button>
      <Button type="button" onClick={() => { setMode(signingUp ? 'login' : 'signup'); setError(''); onModeChange?.(); }}>{signingUp ? 'Already have an account? Log in' : 'New here? Sign up'}</Button>
    </form>
  </section>;
}
