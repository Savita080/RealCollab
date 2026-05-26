// pages/Profile.jsx — User profile editor
import { useState } from 'react';
import { useAuth } from '../store/auth';
import { useUI } from '../store/ui';
import Button from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import ProfileCardBadge from '../components/layout/ProfileCardBadge';
import s from '../styles/modules/Profile.module.css';

const PRESET_AVATARS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=Felix',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Jack',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Mimi',
  'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Bubble',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=Ruby',
];

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const { toast } = useUI();

  const [form, setForm] = useState({
    name:      user?.name      || '',
    bio:       user?.bio       || '',
    githubUrl: user?.githubUrl || '',
    avatar:    user?.avatar    || '',
  });
  const [skills, setSkills] = useState(user?.skills || []);
  const [skillInput, setSkillInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (key) => (e) => {
    setForm(f => ({ ...f, [key]: e.target.value }));
    setSaved(false);
  };

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !skills.includes(s)) setSkills(prev => [...prev, s]);
    setSkillInput('');
  };

  const removeSkill = (sk) => setSkills(prev => prev.filter(x => x !== sk));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile({ ...form, skills });
      setSaved(true);
      toast('Profile updated ✓', 'success');
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to update profile', 'error');
    } finally { setLoading(false); }
  };

  const initials = (user?.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const previewUser = {
    ...user,
    name: form.name,
    avatar: form.avatar,
    githubUrl: form.githubUrl,
    skills: skills,
  };

  return (
    <div className={s.container}>
      <div className={s.leftColumn}>
        <div className={s.header}>
          <h1 className={s.title}>My Profile</h1>
          <p className={s.subtitle}>Manage your personal information and preferences</p>
        </div>

        <form onSubmit={handleSubmit} className={s.card}>
          {/* Avatar preview */}
          <div className={s.avatarSection}>
            {form.avatar ? (
              <img src={form.avatar} alt="avatar" className={s.avatarPreview} onError={e => { e.target.style.display = 'none'; }} />
            ) : (
              <div className={s.avatarFallback}>{initials}</div>
            )}
            <div style={{ flex: 1 }}>
              <div className={s.presetsContainer}>
                <span className={s.presetsLabel}>Choose a Template:</span>
                <div className={s.presetsGrid}>
                  {PRESET_AVATARS.map((url, index) => (
                    <button
                      key={index}
                      type="button"
                      className={`${s.presetBtn} ${form.avatar === url ? s.activePreset : ''}`}
                      onClick={() => setForm(f => ({ ...f, avatar: url }))}
                    >
                      <img src={url} alt={`avatar-${index}`} className={s.presetImg} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Name + GitHub */}
          <div className={s.row}>
            <Input label="Full name" value={form.name} onChange={set('name')} required />
            <Input label="GitHub URL" placeholder="https://github.com/yourhandle" value={form.githubUrl} onChange={set('githubUrl')} />
          </div>

          {/* Bio */}
          <Textarea
            label="Bio"
            placeholder="Tell your team a bit about yourself…"
            value={form.bio}
            onChange={set('bio')}
            rows={3}
          />

          {/* Skills */}
          <div className={s.skillsSection}>
            <span className={s.skillsLabel}>Skills & Technologies</span>
            <div className={s.skillsTags}>
              {skills.map(sk => (
                <span key={sk} className={s.skillTag}>
                  {sk}
                  <button type="button" className={s.skillRemove} onClick={() => removeSkill(sk)}>✕</button>
                </span>
              ))}
              {skills.length === 0 && <span style={{ fontSize: 12, color: 'var(--text-3)' }}>No skills added yet</span>}
            </div>
            <div className={s.skillInput}>
              <Input
                placeholder="Add skill (e.g. React, Node.js)"
                value={skillInput}
                onChange={e => setSkillInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
              />
              <Button type="button" variant="ghost" size="sm" onClick={addSkill}>Add</Button>
            </div>
          </div>

          {/* Email (read-only) */}
          <div>
            <Input label="Email" value={user?.email || ''} readOnly disabled />
          </div>

          {/* Save */}
          <div className={s.actions}>
            <Button type="submit" variant="primary" size="md" loading={loading}>Save Changes</Button>
            {saved && <span className={s.saved}>✓ Saved</span>}
            <span className={s.badge}>{user?.role || 'Member'}</span>
          </div>
        </form>
      </div>

      <div className={s.rightColumn}>
        <div className={s.previewWrapper}>
          <h2 className={s.previewTitle}>Live Preview</h2>
          <div className={s.wallHook}>
            <div className={s.hookPeg} />
          </div>
          <div className={s.cardHanger}>
            <ProfileCardBadge
              user={previewUser}
              onClose={() => {}}
              onLogout={() => {}}
              style={{
                position: 'relative',
                top: '0',
                right: 'auto',
                animation: 'none',
                marginTop: '0',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
