import { useState } from 'react';
import { Divider, IconButton, Menu, MenuItem, Tooltip } from '@mui/material';
import PersonOutlineRounded from '@mui/icons-material/PersonOutlineRounded';

export function UserMenuItems({ page, onAction, disabled = false }) {
  return <>
    <MenuItem disabled={disabled} onClick={() => onAction('logout')} className="profile-menu-option">Log out</MenuItem>
    <MenuItem disabled={disabled} onClick={() => onAction('clear')} className="profile-menu-option">Clear data</MenuItem>
    {page === 'chat' && <>
      <Divider />
      <MenuItem disabled className="profile-menu-heading">Create a new demo profile</MenuItem>
      <MenuItem disabled={disabled} onClick={() => onAction('all')} className="profile-menu-option"><div>Answer all questions</div></MenuItem>
      <MenuItem disabled={disabled} onClick={() => onAction('some')} className="profile-menu-option"><div>Answer some questions</div></MenuItem>
      <MenuItem disabled className="profile-menu-note">Replaces your saved answers</MenuItem>
    </>}
  </>;
}

export function UserMenu({ page, onAction, disabled = false }) {
  const [anchor, setAnchor] = useState(null);
  function select(action) {
    setAnchor(null);
    onAction(action);
  }
  return <>
    <Tooltip title="User menu">
      <span><IconButton className="user-menu-button" aria-label="User menu" aria-haspopup="menu" aria-controls={anchor ? 'user-menu' : undefined} aria-expanded={Boolean(anchor)} disabled={disabled} onClick={event => setAnchor(event.currentTarget)}><PersonOutlineRounded fontSize="small" /></IconButton></span>
    </Tooltip>
    <Menu id="user-menu" anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }} slotProps={{ paper: { sx: { mt: 1, borderRadius: 'var(--app-radius)', minWidth: 225, border: '1px solid #e7edf5', boxShadow: '0 8px 30px #25324a18' } }, list: { 'aria-label': 'User actions' } }}>
      <UserMenuItems page={page} onAction={select} disabled={disabled} />
    </Menu>
  </>;
}
