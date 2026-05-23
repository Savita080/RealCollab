import express from 'express';
import { 
    createSnippet, 
    getProjectSnippets, 
    getSnippetById, 
    updateSnippet, 
    deleteSnippet 
} from '../controllers/snippetcontroller.js';
import { protectRoute } from '../middleware/authmiddleware.js';
import { requireProjectRole } from '../middleware/rbac.js';

// mergeParams: true allows us to access the :projectId from the parent router
const router = express.Router({ mergeParams: true });

router.post('/', protectRoute, requireProjectRole('CONTRIBUTOR'), createSnippet);
router.get('/', protectRoute, requireProjectRole('VIEWER'), getProjectSnippets);
router.get('/:id', protectRoute, requireProjectRole('VIEWER'), getSnippetById);
router.patch('/:id', protectRoute, requireProjectRole('CONTRIBUTOR'), updateSnippet);
router.delete('/:id', protectRoute, requireProjectRole('CONTRIBUTOR'), deleteSnippet);

export default router;
