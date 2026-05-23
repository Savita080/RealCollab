import express from 'express';
import { 
    createSnippet, 
    getProjectSnippets, 
    getSnippetById, 
    updateSnippet, 
    deleteSnippet 
} from '../controllers/snippetcontroller.js';
import { protectRoute } from '../middleware/authmiddleware.js';

// mergeParams: true allows us to access the :projectId from the parent router
const router = express.Router({ mergeParams: true });

router.post('/', protectRoute, createSnippet);
router.get('/', protectRoute, getProjectSnippets);
router.get('/:id', protectRoute, getSnippetById);
router.patch('/:id', protectRoute, updateSnippet);
router.delete('/:id', protectRoute, deleteSnippet);

export default router;
