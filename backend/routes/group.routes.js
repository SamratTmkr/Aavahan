import express from 'express';
import { getGroups, getGroup, createNewGroup, updateExistingGroup, deleteExistingGroup, getMyOrganizerGroups } from '../controllers/group.controller.js';
import { userAuth } from '../middleware/auth.middleware.js';

const groupRouter = express.Router();

groupRouter.get('/',                 getGroups);                          // public — list all
groupRouter.get('/organizer/mine',   userAuth, getMyOrganizerGroups);      // protected — organizer's groups
groupRouter.get('/:id',              getGroup);                           // public — single group
groupRouter.post('/',       userAuth, createNewGroup);           // protected
groupRouter.put('/:id',     userAuth, updateExistingGroup);      // protected
groupRouter.delete('/:id',  userAuth, deleteExistingGroup);      // protected

export default groupRouter;
