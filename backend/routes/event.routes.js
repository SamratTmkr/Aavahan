import express from 'express';
import { getEvents, getEvent, getGroupEvents, createNewEvent, updateExistingEvent, deleteExistingEvent, rsvpEvent, getEventAttendees, getEventCities, getMyOrganizerEvents, getMyOrganizerRSVPs, checkinAttendee, getMyActivities, cancelRsvp } from '../controllers/event.controller.js';
import { userAuth } from '../middleware/auth.middleware.js';
import { uploadEventBanner } from '../middleware/upload.middleware.js';

const eventRouter = express.Router();

eventRouter.get('/',                 getEvents);             // public — list all
eventRouter.get('/cities',           getEventCities);        // public — event count by cities
eventRouter.get('/user/my-activities', userAuth, getMyActivities); // protected — user's own registered activities
eventRouter.get('/organizer/mine',   userAuth, getMyOrganizerEvents); // protected — organizer's own events
eventRouter.get('/organizer/rsvps',  userAuth, getMyOrganizerRSVPs);  // protected — recent RSVPs for organizer's events
eventRouter.get('/:id',             getEvent);              // public — single event
eventRouter.get('/:id/rsvps',    getEventAttendees);  // public — event attendees
eventRouter.post('/:id/rsvp',    userAuth, rsvpEvent); // protected — RSVP to event
eventRouter.delete('/:id/rsvp',  userAuth, cancelRsvp); // protected — cancel RSVP to event
eventRouter.patch('/:id/rsvps/:rsvpId/checkin', userAuth, checkinAttendee); // protected — check in attendee
eventRouter.get('/group/:groupId', getGroupEvents);   // public — events by group
eventRouter.post('/',            userAuth, uploadEventBanner, createNewEvent); // protected with banner upload

eventRouter.put('/:id',          userAuth, updateExistingEvent);     // protected
eventRouter.delete('/:id',       userAuth, deleteExistingEvent);     // protected

export default eventRouter;
