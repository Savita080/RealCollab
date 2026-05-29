import { useState, useRef } from 'react';
import { FolderIcon, FileIcon, ChevronIcon } from './WikiIcons';
import s from '../../styles/modules/Wiki.module.css';

export default function WikiFolderTree({
  folders, pages, activePage,
  onPageClick, onDeletePage,
  onCreateFolder, onRenameFolder, onDeleteFolder,
  onMovePage,       // (pageId, folderId | null) => void
  onMoveFolder,     // (folderId, parentId | null) => void  [future]
  newFolderParent, setNewFolderParent,
  newFolderName, setNewFolderName
}) {
  const [openFolders, setOpenFolders] = useState({});
  const [renamingFolder, setRenamingFolder] = useState(null);
  const [renamingVal, setRenamingVal] = useState('');
  // drag-and-drop state
  const dragging = useRef(null); // { type: 'page'|'folder', id }

  const toggle = (id) => setOpenFolders(s => ({ ...s, [id]: !s[id] }));

  const rootPages = pages.filter(p => !p.folder);
  const folderPages = (folderId) => pages.filter(p => String(p.folder) === String(folderId));
  const rootFolders = folders.filter(f => !f.parent);
  const childFolders = (parentId) => folders.filter(f => String(f.parent) === String(parentId));

  const handleDrop = (e, targetFolderId) => {
    e.preventDefault();
    if (!dragging.current) return;
    const { type, id } = dragging.current;
    if (type === 'page') onMovePage(id, targetFolderId);
    dragging.current = null;
  };

  const renderPage = (pg) => (
    <div
      key={pg._id}
      className={`${s.pageRow} ${activePage?._id === pg._id ? s.activeRow : ''}`}
      draggable
      onDragStart={() => { dragging.current = { type: 'page', id: pg._id }; }}
    >
      <button className={`${s.pageItem} ${activePage?._id === pg._id ? s.active : ''}`} onClick={() => onPageClick(pg)}>
        <FileIcon /> <span className={s.pageLabel}>{pg.title}</span>
      </button>
      <button className={s.deletePageBtn} onClick={() => onDeletePage(pg)} title="Delete page">✕</button>
    </div>
  );

  const renderFolder = (folder, depth = 0) => {
    const isOpen = openFolders[folder._id] ?? true;
    const children = childFolders(folder._id);
    const fps = folderPages(folder._id);
    const isRenaming = renamingFolder === folder._id;

    return (
      <div key={folder._id} style={{ marginLeft: depth * 12 }}>
        <div
          className={s.folderRow}
          onDragOver={e => e.preventDefault()}
          onDrop={e => handleDrop(e, folder._id)}
        >
          <button className={s.folderToggle} onClick={() => toggle(folder._id)}>
            <ChevronIcon open={isOpen} />
            <FolderIcon open={isOpen} />
            {isRenaming ? (
              <form onSubmit={e => { e.preventDefault(); onRenameFolder(folder._id, renamingVal); setRenamingFolder(null); }} style={{ display: 'flex', gap: 4 }}>
                <input
                  className={s.folderRenameInput}
                  value={renamingVal}
                  onChange={e => setRenamingVal(e.target.value)}
                  autoFocus
                  onClick={e => e.stopPropagation()}
                />
                <button type="submit" className={s.miniBtn}>✓</button>
                <button type="button" className={s.miniBtn} onClick={e => { e.stopPropagation(); setRenamingFolder(null); }}>✕</button>
              </form>
            ) : (
              <span className={s.folderLabel}>{folder.name}</span>
            )}
          </button>
          <div className={s.folderActions}>
            {/* add sub-folder (only if root level) */}
            {!folder.parent && (
              <button className={s.miniIconBtn} title="Add sub-folder" onClick={() => { setNewFolderParent(folder._id); setNewFolderName(''); }}>+</button>
            )}
            <button className={s.miniIconBtn} title="Rename folder" onClick={() => { setRenamingFolder(folder._id); setRenamingVal(folder.name); }}>✏</button>
            <button className={s.miniIconBtn} title="Delete folder" onClick={() => onDeleteFolder(folder._id)}>✕</button>
          </div>
        </div>

        {/* inline new-sub-folder form */}
        {newFolderParent === folder._id && (
          <form className={s.newFolderForm} onSubmit={e => { e.preventDefault(); onCreateFolder(newFolderName, folder._id); setNewFolderParent(undefined); }} style={{ marginLeft: 20 }}>
            <input className={s.folderRenameInput} value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Sub-folder name" autoFocus />
            <button type="submit" className={s.miniBtn}>✓</button>
            <button type="button" className={s.miniBtn} onClick={() => setNewFolderParent(undefined)}>✕</button>
          </form>
        )}

        {isOpen && (
          <div style={{ marginLeft: 16 }}>
            {children.map(cf => renderFolder(cf, depth + 1))}
            {fps.map(renderPage)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={s.treeRoot}>
      {/* Root-level folders */}
      {rootFolders.map(f => renderFolder(f))}

      {/* Root-level pages (no folder) */}
      <div
        className={s.rootDropZone}
        onDragOver={e => e.preventDefault()}
        onDrop={e => handleDrop(e, null)}
      >
        {rootPages.map(renderPage)}
      </div>

      {/* Create new root folder */}
      {newFolderParent === null && (
        <form className={s.newFolderForm} onSubmit={e => { e.preventDefault(); onCreateFolder(newFolderName, null); setNewFolderParent(undefined); }}>
          <input className={s.folderRenameInput} value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Folder name" autoFocus />
          <button type="submit" className={s.miniBtn}>✓</button>
          <button type="button" className={s.miniBtn} onClick={() => setNewFolderParent(undefined)}>✕</button>
        </form>
      )}
    </div>
  );
}
