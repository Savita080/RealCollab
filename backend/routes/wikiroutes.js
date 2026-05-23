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

// mergeParams: true allows us to access the :projectId from the parent router
const router = express.Router({ mergeParams: true });

router.post('/', protectRoute, createWikiPage);
router.get('/', protectRoute, getProjectWikiPages);
router.get('/:pageId', protectRoute, getWikiPageById);
router.patch('/:pageId', protectRoute, updateWikiPage);
router.get('/:pageId/versions', protectRoute, getWikiPageVersions);
router.delete('/:pageId', protectRoute, deleteWikiPage);

export default router;
