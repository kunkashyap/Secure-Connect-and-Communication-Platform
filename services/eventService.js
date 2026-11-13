const EventEmitter = require('events');

class AppEventEmitter extends EventEmitter {
  constructor() {
    super();
    // In-memory event audit log for tracking and verification
    this.eventLogs = [];
    this.maxLogs = 200;
  }

  logEvent(eventName, payload) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event: eventName,
      payload,
    };

    this.eventLogs.push(logEntry);
    if (this.eventLogs.length > this.maxLogs) {
      this.eventLogs.shift();
    }

    console.log(`[EventService] [${logEntry.timestamp}] [EVENT: ${eventName}]`, JSON.stringify(payload));
  }

  getLogs() {
    return [...this.eventLogs];
  }

  clearLogs() {
    this.eventLogs = [];
  }
}

const eventService = new AppEventEmitter();

const EVENTS = {
  USER_REGISTERED: 'USER_REGISTERED',
  USER_LOGGED_IN: 'USER_LOGGED_IN',
  NOTE_CREATED: 'NOTE_CREATED',
  NOTE_UPDATED: 'NOTE_UPDATED',
  NOTE_DELETED: 'NOTE_DELETED',
  MESSAGE_SENT: 'MESSAGE_SENT',
};

// Register listeners for all specified application events
eventService.on(EVENTS.USER_REGISTERED, (data) => {
  eventService.logEvent(EVENTS.USER_REGISTERED, {
    userId: data.userId,
    name: data.name,
    email: data.email,
    role: data.role,
  });
});

eventService.on(EVENTS.USER_LOGGED_IN, (data) => {
  eventService.logEvent(EVENTS.USER_LOGGED_IN, {
    userId: data.userId,
    email: data.email,
    role: data.role,
    loginTime: new Date().toISOString(),
  });
});

eventService.on(EVENTS.NOTE_CREATED, (data) => {
  eventService.logEvent(EVENTS.NOTE_CREATED, {
    noteId: data.noteId,
    userId: data.userId,
    title: data.title,
  });
});

eventService.on(EVENTS.NOTE_UPDATED, (data) => {
  eventService.logEvent(EVENTS.NOTE_UPDATED, {
    noteId: data.noteId,
    userId: data.userId,
    updatedFields: data.updatedFields,
  });
});

eventService.on(EVENTS.NOTE_DELETED, (data) => {
  eventService.logEvent(EVENTS.NOTE_DELETED, {
    noteId: data.noteId,
    userId: data.userId,
  });
});

eventService.on(EVENTS.MESSAGE_SENT, (data) => {
  eventService.logEvent(EVENTS.MESSAGE_SENT, {
    messageId: data.messageId,
    senderId: data.senderId,
    roomId: data.roomId,
    preview: data.preview,
  });
});

module.exports = {
  eventService,
  EVENTS,
};
