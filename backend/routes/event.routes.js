import express from 'express';
import { 
    getEvents, 
    getEvent, 
    getGroupEvents, 
    createNewEvent, 
    updateExistingEvent, 
    deleteExistingEvent, 
    rsvpEvent, 
    getEventAttendees, 
    getEventCities, 
    getMyOrganizerEvents, 
    getMyOrganizerRSVPs, 
    checkinAttendee, 
    getMyActivities, 
    cancelRsvp,
    listEventManagers,
    addEventManager,
    removeEventManager,
    addManualAttendee,
    getAttendeeDetails,
    removeAttendee,
    setPaymentStatus
} from '../controllers/event.controller.js';
import { 
    getAnnouncements, 
    postAnnouncement, 
    removeAnnouncement 
} from '../controllers/announcement.controller.js';
import { userAuth } from '../middleware/auth.middleware.js';
import { uploadEventImages } from '../middleware/upload.middleware.js';

const eventRouter = express.Router();

eventRouter.get('/',                 getEvents);             // public — list all
eventRouter.get('/cities',           getEventCities);        // public — event count by cities
eventRouter.get('/user/my-activities', userAuth, getMyActivities); // protected — user's own registered activities
eventRouter.get('/organizer/mine',   userAuth, getMyOrganizerEvents); // protected — organizer's own events
eventRouter.get('/organizer/rsvps',  userAuth, getMyOrganizerRSVPs);  // protected — recent RSVPs for organizer's events
eventRouter.get('/:id',             getEvent);              // public — single event
eventRouter.get('/:id/rsvps',    getEventAttendees);  // public — event attendees
eventRouter.get('/:id/attendees', userAuth, getAttendeeDetails); // protected — attendee contact details for the event's managers
eventRouter.delete('/:id/rsvps/:rsvpId', userAuth, removeAttendee); // protected — remove an attendee
eventRouter.patch('/:id/rsvps/:rsvpId/payment', userAuth, setPaymentStatus); // protected — mark an attendee paid or unpaid
eventRouter.post('/:id/rsvp',    userAuth, rsvpEvent); // protected — RSVP to event
eventRouter.delete('/:id/rsvp',  userAuth, cancelRsvp); // protected — cancel RSVP to event
eventRouter.patch('/:id/rsvps/:rsvpId/checkin', userAuth, checkinAttendee); // protected — check in attendee
eventRouter.get('/group/:groupId', getGroupEvents);   // public — events by group
eventRouter.post('/',            userAuth, uploadEventImages, createNewEvent); // protected with banner and logo upload

// Announcements routes
eventRouter.get('/:id/announcements', getAnnouncements); // public / attendees
eventRouter.post('/:id/announcements', userAuth, postAnnouncement); // protected (organizer/co-manager)
eventRouter.delete('/:id/announcements/:announcementId', userAuth, removeAnnouncement); // protected

// Co-managers routes
eventRouter.get('/:id/managers', userAuth, listEventManagers); // protected (organizer/co-manager)
eventRouter.post('/:id/managers', userAuth, addEventManager); // protected (organizer only)
eventRouter.delete('/:id/managers/:userId', userAuth, removeEventManager); // protected (organizer only)

// Manual attendee RSVP by email
eventRouter.post('/:id/manual-rsvp', userAuth, addManualAttendee); // protected (organizer/co-manager)

eventRouter.put('/:id',          userAuth, uploadEventImages, updateExistingEvent); // protected with optional new banner or logo
eventRouter.delete('/:id',       userAuth, deleteExistingEvent);     // protected

export default eventRouter;
