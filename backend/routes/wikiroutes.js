import express from 'express';
import { 
    createWikiPage, 
    getProjectWikiPages, 
    getWikiPageById, 
    updateWikiPage, 
    getWikiPageVersions, 
    deleteWikiPage,
    createWikiFolder,
    getProjectWikiFolders,
    updateWikiFolder,
    deleteWikiFolder,
    moveWikiPage
} from '../controllers/wikicontroller.js';
import { protectRoute } from '../middleware/authmiddleware.js';
import { requireProjectRole } from '../middleware/rbac.js';
import { checkLimit } from '../middleware/planLimits.js';
import { resolveWorkspace } from '../middleware/resolveWorkspace.js';
import { resolveProject } from '../middleware/resolveProject.js';

const router = express.Router({ mergeParams: true });
router.use(resolveWorkspace, resolveProject);

// ─────────────────────────────────────────────
// WIKI PAGE ROUTES
// ─────────────────────────────────────────────
router.post('/', protectRoute, requireProjectRole('CONTRIBUTOR'), checkLimit('wikiPages'), createWikiPage);
router.get('/', protectRoute, requireProjectRole('VIEWER'), getProjectWikiPages);
router.get('/:pageId', protectRoute, requireProjectRole('VIEWER'), getWikiPageById);
router.patch('/:pageId', protectRoute, requireProjectRole('CONTRIBUTOR'), updateWikiPage);
router.get('/:pageId/versions', protectRoute, requireProjectRole('VIEWER'), getWikiPageVersions);
router.delete('/:pageId', protectRoute, requireProjectRole('CONTRIBUTOR'), deleteWikiPage);
router.patch('/:pageId/move', protectRoute, requireProjectRole('CONTRIBUTOR'), moveWikiPage);

// ─────────────────────────────────────────────
// WIKI FOLDER ROUTES
// ─────────────────────────────────────────────
router.post('/folders', protectRoute, requireProjectRole('CONTRIBUTOR'), createWikiFolder);
router.get('/folders', protectRoute, requireProjectRole('VIEWER'), getProjectWikiFolders);
router.patch('/folders/:folderId', protectRoute, requireProjectRole('CONTRIBUTOR'), updateWikiFolder);
router.delete('/folders/:folderId', protectRoute, requireProjectRole('CONTRIBUTOR'), deleteWikiFolder);

export default router;