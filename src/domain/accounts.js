import { User, ACCOUNTS_STORAGE_KEY, USER_STORAGE_KEY } from '../classes/User.js';

export function logOut(storage = globalThis.localStorage) {
  if (!storage) throw new Error('Local storage is unavailable.');
  try { storage.removeItem(USER_STORAGE_KEY); }
  catch { throw new Error('Could not log out on this device. Please try again.'); }
  return new User();
}

export function signUp(fields, storage = globalThis.localStorage) {
  const name = fields.name?.trim();
  const username = fields.username?.trim();
  if (!name || !username || !fields.password) throw new Error('Complete all required fields.');
  if (!storage) throw new Error('Local storage is unavailable.');
  const accounts = JSON.parse(storage.getItem(ACCOUNTS_STORAGE_KEY) ?? '[]');
  if (accounts.some(account => account.profile.username === username)) throw new Error('This username is already taken.');
  const user = new User({ profile: { name, username, password: fields.password } });
  user.save(storage);
  return user;
}

export function logIn(username, password, storage = globalThis.localStorage) {
  if (!storage) throw new Error('Local storage is unavailable.');
  const accounts = JSON.parse(storage.getItem(ACCOUNTS_STORAGE_KEY) ?? '[]');
  const record = accounts.find(account => account.profile.username === username.trim() && account.profile.password === password);
  if (!record) throw new Error('Username or password is incorrect.');
  const user = User.fromJSON(record);
  user.save(storage);
  return user;
}
