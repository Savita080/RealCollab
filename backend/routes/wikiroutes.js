import express from 'express';
import { 
    createWikiPage, 
    getProjectWikiPages, 
    getWikiPageById, 
    updateWikiPage, 
    getWikiPageVersions, 
    deleteWikiPage 
} from '../controllers/wikicontroller.js';
import { protectRoute } from '../middleware/authmiddleware.js';
import { requireProjectRole } from '../middleware/rbac.js';

// mergeParams: true allows us to access the :projectId from the parent router
const router = express.Router({ mergeParams: true });

router.post('/', protectRoute, requireProjectRole('CONTRIBUTOR'), createWikiPage);
router.get('/', protectRoute, requireProjectRole('VIEWER'), getProjectWikiPages);
router.get('/:pageId', protectRoute, requireProjectRole('VIEWER'), getWikiPageById);
router.patch('/:pageId', protectRoute, requireProjectRole('CONTRIBUTOR'), updateWikiPage);
router.get('/:pageId/versions', protectRoute, requireProjectRole('VIEWER'), getWikiPageVersions);
router.delete('/:pageId', protectRoute, requireProjectRole('CONTRIBUTOR'), deleteWikiPage);

export default router;
