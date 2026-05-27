import { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Input } from '../ui/Input';
import { fmtDate } from '../../lib/utils';
import s from '../../styles/modules/WikiHistoryModal.module.css';

function versionShortId(version) {
  const id = version?._id?.toString() || '';
  return id.slice(-5) || '?????';
}

function fmtTimestamp(dateString) {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d)) return '';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function WikiHistoryModal({
  open,
  onClose,
  pageTitle,
  versions,
  loading,
  saving,
  onRestore,
}) {
  const [selected, setSelected] = useState(null);
  const [commitMsg, setCommitMsg] = useState('');
  const [showRestoreForm, setShowRestoreForm] = useState(false);

  useEffect(() => {
    if (!open) {
      setSelected(null);
      setShowRestoreForm(false);
      setCommitMsg('');
    }
  }, [open]);

  const openDetail = (version) => {
    setSelected(version);
    setShowRestoreForm(false);
    setCommitMsg(`restoring version ${versionShortId(version)}`);
  };

  const backToList = () => {
    setSelected(null);
    setShowRestoreForm(false);
    setCommitMsg('');
  };

  const startRestore = () => {
    setCommitMsg(`restoring version ${versionShortId(selected)}`);
    setShowRestoreForm(true);
  };

  const handleRestoreSubmit = async (e) => {
    e.preventDefault();
    if (!selected || commitMsg.trim().length < 10) return;
    await onRestore(selected, commitMsg.trim());
  };

  const modalTitle = selected
    ? `Version ${versionShortId(selected)} — ${pageTitle || 'Wiki'}`
    : `History — ${pageTitle || 'Wiki'}`;

  return (
    <Modal open={open} onClose={onClose} title={modalTitle} size="lg">
      {loading && (
        <p className={s.muted}>Loading history…</p>
      )}

      {!loading && !selected && (
        <div className={s.list}>
          {versions.length === 0 && (
            <p className={s.muted}>No version history yet.</p>
          )}
          {versions.map((v) => (
            <button
              key={v._id}
              type="button"
              className={s.listItem}
              onClick={() => openDetail(v)}
            >
              <span className={s.commitMessage}>{v.commitMessage || 'No commit message'}</span>
              <span className={s.meta}>
                {v.savedBy?.name || 'Unknown'}
                <span className={s.metaSep}>·</span>
                {fmtTimestamp(v.createdAt)}
              </span>
            </button>
          ))}
        </div>
      )}

      {!loading && selected && (
        <div className={s.detail}>
          <button type="button" className={s.backBtn} onClick={backToList}>
            ← All versions
          </button>

          <div className={s.detailMeta}>
            <p className={s.detailCommit}>{selected.commitMessage || 'No commit message'}</p>
            <p className={s.detailAuthorTime}>
              {selected.savedBy?.name || 'Unknown'}
              <span className={s.metaSep}>·</span>
              {fmtTimestamp(selected.createdAt)}
            </p>
          </div>

          <div
            className={s.preview}
            dangerouslySetInnerHTML={{ __html: selected.content || '' }}
          />

          {!showRestoreForm ? (
            <div className={s.detailActions}>
              <Button variant="primary" size="sm" onClick={startRestore}>
                Restore this version
              </Button>
            </div>
          ) : (
            <form className={s.restoreForm} onSubmit={handleRestoreSubmit}>
              <p className={s.restoreHint}>
                This will replace the current page content. You can edit the commit message below (min. 10 characters).
              </p>
              <Input
                label="Commit message"
                value={commitMsg}
                onChange={(e) => setCommitMsg(e.target.value)}
                required
              />
              <div className={s.restoreActions}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRestoreForm(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={saving}
                  disabled={commitMsg.trim().length < 10}
                >
                  Restore
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </Modal>
  );
}
