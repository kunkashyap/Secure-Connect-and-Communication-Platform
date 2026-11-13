const Note = require('../models/Note');
const { eventService, EVENTS } = require('../services/eventService');

/**
 * Create a new personal note
 * POST /api/notes
 */
const createNote = async (req, res, next) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required fields',
      });
    }

    if (title.trim().length === 0 || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Title and content cannot be blank',
      });
    }

    const note = await Note.create({
      title: title.trim(),
      content: content.trim(),
      userId: req.user._id,
    });

    // Emit NOTE_CREATED event
    eventService.emit(EVENTS.NOTE_CREATED, {
      noteId: note._id.toString(),
      userId: req.user._id.toString(),
      title: note.title,
    });

    return res.status(201).json({
      success: true,
      message: 'Note created successfully',
      data: { note },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve all personal notes for the authenticated user
 * GET /api/notes
 */
const getNotes = async (req, res, next) => {
  try {
    // Database-level isolation: only fetch notes belonging to the authenticated user
    const notes = await Note.find({ userId: req.user._id }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: 'Notes retrieved successfully',
      data: {
        count: notes.length,
        notes,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve a specific personal note by ID
 * GET /api/notes/:id
 */
const getNoteById = async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found',
      });
    }

    // Ownership check: strictly enforce that only the owner can access the note
    if (note.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden: You do not have permission to view this note',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Note retrieved successfully',
      data: { note },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing personal note
 * PUT /api/notes/:id
 */
const updateNote = async (req, res, next) => {
  try {
    const { title, content } = req.body;

    if (!title && !content) {
      return res.status(400).json({
        success: false,
        message: 'At least one field (title or content) must be provided for update',
      });
    }

    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found',
      });
    }

    // Ownership check: prevent updating notes belonging to other users
    if (note.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden: You do not have permission to modify this note',
      });
    }

    const updatedFields = [];
    if (title !== undefined) {
      if (title.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Title cannot be empty',
        });
      }
      note.title = title.trim();
      updatedFields.push('title');
    }

    if (content !== undefined) {
      if (content.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Content cannot be empty',
        });
      }
      note.content = content.trim();
      updatedFields.push('content');
    }

    const updatedNote = await note.save();

    // Emit NOTE_UPDATED event
    eventService.emit(EVENTS.NOTE_UPDATED, {
      noteId: updatedNote._id.toString(),
      userId: req.user._id.toString(),
      updatedFields,
    });

    return res.status(200).json({
      success: true,
      message: 'Note updated successfully',
      data: { note: updatedNote },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete an existing personal note
 * DELETE /api/notes/:id
 */
const deleteNote = async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found',
      });
    }

    // Ownership check: prevent deleting notes belonging to other users
    if (note.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden: You do not have permission to delete this note',
      });
    }

    await note.deleteOne();

    // Emit NOTE_DELETED event
    eventService.emit(EVENTS.NOTE_DELETED, {
      noteId: req.params.id,
      userId: req.user._id.toString(),
    });

    return res.status(200).json({
      success: true,
      message: 'Note deleted successfully',
      data: { id: req.params.id },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createNote,
  getNotes,
  getNoteById,
  updateNote,
  deleteNote,
};
