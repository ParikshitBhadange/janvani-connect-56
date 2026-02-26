import { Complaint } from '../models/Complaint.js';
import { User }      from '../models/User.js';

// ─────────────────────────────────────────────────────────────
// POST /api/complaints
// ─────────────────────────────────────────────────────────────
export const createComplaint = async (req, res) => {
  try {
    const citizen = req.user;
    const {
      title, description, category, priority, ward, location,
      gpsCoords, photo, estimatedResolution, isSOS, sosType,
    } = req.body;

    if (!title || !description || !category) {
      return res.status(400).json({
        success: false,
        message: 'Title, description and category are required',
      });
    }

    // FIX: Run complaint creation + points update in PARALLEL
    const [complaint] = await Promise.all([
      Complaint.create({
        citizenId    : citizen._id,
        citizenName  : citizen.name,
        citizenPhone : citizen.phone,
        title, description, category,
        priority     : priority || 'Medium',
        ward         : ward || citizen.ward || 1,
        location     : location || '',
        gpsCoords    : gpsCoords || { lat: 0, lng: 0 },
        photo        : photo || '',
        estimatedResolution: estimatedResolution || '',
        isSOS        : isSOS || false,
        sosType      : sosType || '',
        department   : mapCategoryToDept(category),
      }),
      User.findByIdAndUpdate(citizen._id, {
        $inc: { points: 50, complaintsSubmitted: 1 },
      }),
    ]);

    await updateBadge(citizen._id);

    const complaintObj     = complaint.toObject();
    complaintObj.citizenEmail = citizen.email || '';
    complaintObj.id           = complaintObj.complaintId || complaintObj._id;

    return res.status(201).json({ success: true, complaint: complaintObj });
  } catch (err) {
    console.error('createComplaint error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/complaints
// FIX 1: Was N+1 queries (one DB call per complaint for email)
//         Now uses .populate() — single query for all emails
// FIX 2: Added .lean() — returns plain JS objects, 5-10x faster
// FIX 3: Skips photo/resolvePhoto in list view (heavy base64 fields)
// FIX 4: countDocuments runs in PARALLEL with find()
// ─────────────────────────────────────────────────────────────
export const getComplaints = async (req, res) => {
  try {
    const {
      category, priority, status, ward, citizenId,
      search, page = 1, limit = 200,
    } = req.query;

    const filter = {};

    // Citizens only see their own complaints — enforced on backend
    if (req.user.role === 'citizen') {
      filter.citizenId = req.user._id;
    } else if (citizenId) {
      filter.citizenId = citizenId;
    }

    if (category) filter.category = category;
    if (priority) filter.priority = priority;
    if (status)   filter.status   = status;
    if (ward)     filter.ward     = parseInt(ward);

    if (search) {
      filter.$or = [
        { title       : { $regex: search, $options: 'i' } },
        { complaintId : { $regex: search, $options: 'i' } },
        { citizenName : { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(500, Math.max(1, parseInt(limit)));

    // Both queries run in PARALLEL
    const [complaints, total] = await Promise.all([
      Complaint.find(filter)
        .select('-photo -resolvePhoto -supportedBy')  // skip heavy fields
        .populate('citizenId', 'email')               // get email in same query
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),                                       // plain objects — much faster
      Complaint.countDocuments(filter),
    ]);

    // Flatten citizenEmail — pure JS, no extra DB calls
    const enriched = complaints.map(c => ({
      ...c,
      id          : c.complaintId || c._id,
      citizenEmail: c.citizenId?.email || '',
      citizenId   : c.citizenId?._id || c.citizenId,
    }));

    res.json({ success: true, complaints: enriched, total });
  } catch (err) {
    console.error('getComplaints error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/complaints/:id
// ─────────────────────────────────────────────────────────────
export const getComplaintById = async (req, res) => {
  try {
    const complaint = await Complaint.findOne(buildIdFilter(req.params.id))
      .populate('citizenId', 'email')
      .lean();

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    const citizenObjId = complaint.citizenId?._id || complaint.citizenId;
    if (
      req.user.role === 'citizen' &&
      citizenObjId?.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({
      success  : true,
      complaint: {
        ...complaint,
        id          : complaint.complaintId || complaint._id,
        citizenEmail: complaint.citizenId?.email || '',
        citizenId   : complaint.citizenId?._id || complaint.citizenId,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// PATCH /api/complaints/:id/status
// FIX: Was fetch → modify → save (2 round trips)
//      Now fetch timeline only → findOneAndUpdate (1.5 round trips)
// ─────────────────────────────────────────────────────────────
export const updateStatus = async (req, res) => {
  try {
    const { status, adminNote, assignedOfficer } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }

    const idFilter = buildIdFilter(req.params.id);
    const today    = new Date().toISOString().split('T')[0];

    const update = { status };
    if (adminNote)       update.adminNote       = adminNote;
    if (assignedOfficer) update.assignedOfficer = assignedOfficer;

    const statusToStep = { 'Under Review': 1, 'In Progress': 2, 'Resolved': 3 };
    const stepIdx = statusToStep[status];

    // Fetch only timeline field — minimal data transfer
    const existing = await Complaint.findOne(idFilter).select('timeline');
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    if (stepIdx !== undefined) {
      for (let i = 1; i <= stepIdx; i++) {
        if (existing.timeline[i] && !existing.timeline[i].done) {
          existing.timeline[i].done = true;
          existing.timeline[i].date = today;
        }
      }
      update.timeline = existing.timeline;
    }

    const updated = await Complaint.findOneAndUpdate(
      idFilter,
      { $set: update },
      { new: true }
    ).populate('citizenId', 'email').lean();

    res.json({
      success  : true,
      complaint: {
        ...updated,
        id          : updated.complaintId || updated._id,
        citizenEmail: updated.citizenId?.email || '',
        citizenId   : updated.citizenId?._id || updated.citizenId,
      },
    });
  } catch (err) {
    console.error('updateStatus error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// PATCH /api/complaints/:id/resolve
// FIX: Points update runs in PARALLEL with complaint update
// ─────────────────────────────────────────────────────────────
export const resolveComplaint = async (req, res) => {
  try {
    const { resolvePhoto, adminNote, assignedOfficer } = req.body;
    const idFilter = buildIdFilter(req.params.id);
    const today    = new Date().toISOString().split('T')[0];

    const complaint = await Complaint.findOne(idFilter)
      .select('citizenId timeline adminNote assignedOfficer');
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    const timeline = complaint.timeline.map(step => ({
      ...step.toObject(),
      done: true,
      date: step.date || today,
    }));

    const update = {
      status          : 'Resolved',
      timeline,
      resolvePhoto    : resolvePhoto    || '',
      adminNote       : adminNote       || complaint.adminNote,
      assignedOfficer : assignedOfficer || complaint.assignedOfficer,
    };

    // Complaint update + points award run in PARALLEL
    const [updated] = await Promise.all([
      Complaint.findOneAndUpdate(idFilter, { $set: update }, { new: true })
        .populate('citizenId', 'email')
        .lean(),
      User.findByIdAndUpdate(complaint.citizenId, {
        $inc: { points: 100, complaintsResolved: 1 },
      }),
    ]);

    await updateBadge(complaint.citizenId);

    res.json({
      success  : true,
      complaint: {
        ...updated,
        id          : updated.complaintId || updated._id,
        citizenEmail: updated.citizenId?.email || '',
        citizenId   : updated.citizenId?._id || updated.citizenId,
      },
    });
  } catch (err) {
    console.error('resolveComplaint error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/complaints/:id/support
// FIX: Uses atomic $addToSet — no fetch needed before update
// ─────────────────────────────────────────────────────────────
export const supportComplaint = async (req, res) => {
  try {
    const idFilter = buildIdFilter(req.params.id);
    const userId   = req.user._id;

    const result = await Complaint.findOneAndUpdate(
      { ...idFilter, supportedBy: { $ne: userId } },
      { $addToSet: { supportedBy: userId }, $inc: { supportCount: 1 } },
      { new: true, select: 'supportCount citizenId' }
    ).lean();

    if (!result) {
      const exists = await Complaint.exists(idFilter);
      return res.status(exists ? 400 : 404).json({
        success: false,
        message: exists ? 'Already supported' : 'Complaint not found',
      });
    }

    // Award points in background — don't block response
    User.findByIdAndUpdate(result.citizenId, { $inc: { points: 10 } })
      .then(() => updateBadge(result.citizenId))
      .catch(console.error);

    res.json({ success: true, supportCount: result.supportCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/complaints/:id/feedback
// ─────────────────────────────────────────────────────────────
export const submitFeedback = async (req, res) => {
  try {
    const { rating, comment, resolved } = req.body;
    const idFilter = buildIdFilter(req.params.id);

    const complaint = await Complaint.findOne(idFilter)
      .select('status citizenId feedback')
      .lean();

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }
    if (complaint.status !== 'Resolved') {
      return res.status(400).json({ success: false, message: 'Can only rate resolved complaints' });
    }
    const citizenObjId = complaint.citizenId?._id || complaint.citizenId;
    if (citizenObjId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not your complaint' });
    }
    if (complaint.feedback) {
      return res.status(400).json({ success: false, message: 'Already submitted feedback' });
    }

    const [updated] = await Promise.all([
      Complaint.findOneAndUpdate(
        idFilter,
        { $set: { feedback: { rating, comment, resolved } } },
        { new: true }
      ).populate('citizenId', 'email').lean(),
      User.findByIdAndUpdate(req.user._id, { $inc: { points: 25 } }),
    ]);

    await updateBadge(req.user._id);

    res.json({
      success  : true,
      complaint: {
        ...updated,
        id          : updated.complaintId || updated._id,
        citizenEmail: updated.citizenId?.email || '',
        citizenId   : updated.citizenId?._id || updated.citizenId,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// DELETE /api/complaints/:id
// ─────────────────────────────────────────────────────────────
export const deleteComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findOneAndDelete(buildIdFilter(req.params.id))
      .select('_id').lean();
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }
    res.json({ success: true, message: 'Complaint deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/complaints/stats
// FIX: Was 4 sequential awaits — now ALL 6 queries run in PARALLEL
//      Saves ~3x the round-trip time on admin dashboard load
// ─────────────────────────────────────────────────────────────
export const getStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // All 6 queries in PARALLEL — not one after another
    const [total, resolvedToday, critical, feedbacks, catAgg, wardAgg] =
      await Promise.all([
        Complaint.countDocuments(),
        Complaint.countDocuments({
          status    : 'Resolved',
          updatedAt : { $gte: today },
        }),
        Complaint.countDocuments({
          priority : 'Critical',
          status   : { $nin: ['Resolved', 'Rejected'] },
        }),
        Complaint.find(
          { feedback: { $ne: null } },
          { 'feedback.rating': 1, _id: 0 }  // only fetch rating field
        ).lean(),
        Complaint.aggregate([
          { $group: { _id: '$category', count: { $sum: 1 } } },
          { $sort : { count: -1 } },
        ]),
        Complaint.aggregate([
          { $group: {
            _id      : '$ward',
            count    : { $sum: 1 },
            resolved : { $sum: { $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0] } },
          }},
          { $sort: { _id: 1 } },
        ]),
      ]);

    const avgRating = feedbacks.length
      ? (feedbacks.reduce((s, c) => s + (c.feedback?.rating || 0), 0) / feedbacks.length).toFixed(1)
      : 0;

    res.json({
      success: true,
      stats  : {
        total, resolvedToday, critical,
        satisfaction : Math.round(Number(avgRating) * 20),
        categories   : catAgg.map(a  => ({ name: a._id, count: a.count })),
        wards        : wardAgg.map(a => ({ ward: a._id, count: a.count, resolved: a.resolved })),
      },
    });
  } catch (err) {
    console.error('getStats error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const buildIdFilter = (id) => {
  const isObjectId = /^[a-f\d]{24}$/i.test(id);
  return {
    $or: [
      ...(isObjectId ? [{ _id: id }] : []),
      { complaintId: id },
    ],
  };
};

const mapCategoryToDept = (cat) => ({
  Road        : 'Roads & Infrastructure',
  Water       : 'Water Supply',
  Sanitation  : 'Sanitation',
  Electricity : 'Electricity',
  Other       : 'General Administration',
}[cat] || 'General Administration');

const updateBadge = async (userId) => {
  try {
    const user = await User.findById(userId).select('points role badge');
    if (!user || user.role !== 'citizen') return;
    const newBadge =
      user.points >= 1000 ? 'Gold' :
      user.points >= 500  ? 'Silver' : 'Bronze';
    if (newBadge !== user.badge) {
      await User.findByIdAndUpdate(userId, { badge: newBadge });
    }
  } catch (err) {
    console.error('updateBadge error:', err);
  }
};