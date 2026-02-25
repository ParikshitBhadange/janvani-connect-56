import { Complaint } from '../models/Complaint.js';
import { User } from '../models/User.js';

// ─────────────────────────────────────────────────────────────
// POST /api/complaints  — citizen submits a complaint
// ─────────────────────────────────────────────────────────────
export const createComplaint = async (req, res) => {
  try {
    const citizen = req.user;
    const {
      title, description, category, priority, ward, location,
      gpsCoords, photo, estimatedResolution, isSOS, sosType,
    } = req.body;

    const complaint = await Complaint.create({
      citizenId    : citizen._id,
      citizenName  : citizen.name,
      citizenPhone : citizen.phone,
      title, description, category,
      priority     : priority || 'Medium',
      ward         : ward || citizen.ward,
      location     : location || '',
      gpsCoords    : gpsCoords || { lat: 0, lng: 0 },
      photo        : photo || '',
      estimatedResolution,
      isSOS        : isSOS || false,
      sosType      : sosType || '',
      department   : mapCategoryToDept(category),
    });

    // Award 50 points to citizen
    await User.findByIdAndUpdate(citizen._id, {
      $inc: { points: 50, complaintsSubmitted: 1 },
    });
    await updateBadge(citizen._id);

    return res.status(201).json({ success: true, complaint });
  } catch (err) {
    console.error('createComplaint error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/complaints  — admin gets all; citizen gets their own
// ─────────────────────────────────────────────────────────────
export const getComplaints = async (req, res) => {
  try {
    const { category, priority, status, ward, search, page = 1, limit = 50 } = req.query;
    const filter = {};

    // Citizens only see their own
    if (req.user.role === 'citizen') filter.citizenId = req.user._id;

    if (category) filter.category = category;
    if (priority)  filter.priority  = priority;
    if (status)    filter.status    = status;
    if (ward)      filter.ward      = parseInt(ward);
    if (search)    filter.$or = [
      { title       : { $regex: search, $options: 'i' } },
      { complaintId : { $regex: search, $options: 'i' } },
    ];

    const complaints = await Complaint.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Complaint.countDocuments(filter);
    res.json({ success: true, complaints, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/complaints/:id  — get single complaint
// ─────────────────────────────────────────────────────────────
export const getComplaintById = async (req, res) => {
  try {
    const query = { $or: [{ _id: req.params.id }, { complaintId: req.params.id }] };
    const complaint = await Complaint.findOne(query);
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

    // Citizen can only view their own
    if (req.user.role === 'citizen' && complaint.citizenId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, complaint });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// PATCH /api/complaints/:id/status  — admin updates status
// ─────────────────────────────────────────────────────────────
export const updateStatus = async (req, res) => {
  try {
    const { status, adminNote, assignedOfficer } = req.body;
    const complaint = await Complaint.findOne({
      $or: [{ _id: req.params.id }, { complaintId: req.params.id }],
    });

    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

    const today = new Date().toISOString().split('T')[0];

    // Update timeline based on new status
    const statusToStep = {
      'Under Review' : 1,
      'In Progress'  : 2,
      'Resolved'     : 3,
    };

    const stepIdx = statusToStep[status];
    if (stepIdx !== undefined) {
      for (let i = 1; i <= stepIdx; i++) {
        if (!complaint.timeline[i].done) {
          complaint.timeline[i].done = true;
          complaint.timeline[i].date = today;
        }
      }
    }

    complaint.status = status;
    if (adminNote)       complaint.adminNote = adminNote;
    if (assignedOfficer) complaint.assignedOfficer = assignedOfficer;

    await complaint.save();
    res.json({ success: true, complaint });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// PATCH /api/complaints/:id/resolve  — admin resolves with photo
// ─────────────────────────────────────────────────────────────
export const resolveComplaint = async (req, res) => {
  try {
    const { resolvePhoto, adminNote, assignedOfficer } = req.body;
    const complaint = await Complaint.findOne({
      $or: [{ _id: req.params.id }, { complaintId: req.params.id }],
    });

    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

    const today = new Date().toISOString().split('T')[0];

    // Mark all timeline steps done
    complaint.timeline = complaint.timeline.map((step, i) => ({
      ...step.toObject(),
      done : true,
      date : step.date || today,
    }));

    complaint.status         = 'Resolved';
    complaint.resolvePhoto   = resolvePhoto || '';
    complaint.adminNote      = adminNote || complaint.adminNote;
    complaint.assignedOfficer = assignedOfficer || complaint.assignedOfficer;

    await complaint.save();

    // Award 100 points to citizen
    await User.findByIdAndUpdate(complaint.citizenId, {
      $inc: { points: 100, complaintsResolved: 1 },
    });
    await updateBadge(complaint.citizenId);

    res.json({ success: true, complaint });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/complaints/:id/support  — citizen supports an issue
// ─────────────────────────────────────────────────────────────
export const supportComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findOne({
      $or: [{ _id: req.params.id }, { complaintId: req.params.id }],
    });
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

    const userId = req.user._id;

    // Prevent double support
    if (complaint.supportedBy.includes(userId)) {
      return res.status(400).json({ success: false, message: 'Already supported' });
    }

    complaint.supportedBy.push(userId);
    complaint.supportCount = complaint.supportedBy.length;
    await complaint.save();

    // +10 points to citizen who submitted the complaint
    await User.findByIdAndUpdate(complaint.citizenId, { $inc: { points: 10 } });
    await updateBadge(complaint.citizenId);

    res.json({ success: true, supportCount: complaint.supportCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/complaints/:id/feedback  — citizen submits feedback
// ─────────────────────────────────────────────────────────────
export const submitFeedback = async (req, res) => {
  try {
    const { rating, comment, resolved } = req.body;
    const complaint = await Complaint.findOne({
      $or: [{ _id: req.params.id }, { complaintId: req.params.id }],
    });

    if (!complaint) return res.status(404).json({ success: false, message: 'Not found' });
    if (complaint.status !== 'Resolved')
      return res.status(400).json({ success: false, message: 'Can only rate resolved complaints' });
    if (complaint.citizenId.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not your complaint' });
    if (complaint.feedback)
      return res.status(400).json({ success: false, message: 'Already submitted feedback' });

    complaint.feedback = { rating, comment, resolved };
    await complaint.save();

    // +25 points
    await User.findByIdAndUpdate(req.user._id, { $inc: { points: 25 } });
    await updateBadge(req.user._id);

    res.json({ success: true, complaint });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// DELETE /api/complaints/:id  — admin only
// ─────────────────────────────────────────────────────────────
export const deleteComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findOneAndDelete({
      $or: [{ _id: req.params.id }, { complaintId: req.params.id }],
    });
    if (!complaint) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Complaint deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/complaints/stats  — admin dashboard stats
// ─────────────────────────────────────────────────────────────
export const getStats = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [total, resolvedToday, critical, feedbacks] = await Promise.all([
      Complaint.countDocuments(),
      Complaint.countDocuments({ status: 'Resolved', updatedAt: { $gte: new Date(today) } }),
      Complaint.countDocuments({ priority: 'Critical', status: { $nin: ['Resolved', 'Rejected'] } }),
      Complaint.find({ feedback: { $ne: null } }, 'feedback'),
    ]);

    const avgRating = feedbacks.length
      ? (feedbacks.reduce((s, c) => s + (c.feedback?.rating || 0), 0) / feedbacks.length).toFixed(1)
      : 0;

    // Category counts
    const catAgg = await Complaint.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);

    // Ward counts
    const wardAgg = await Complaint.aggregate([
      { $group: { _id: '$ward', count: { $sum: 1 } } },
    ]);

    // 7-day volume
    const sevenDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    res.json({
      success: true,
      stats: {
        total, resolvedToday, critical,
        satisfaction: Math.round(avgRating * 20),   // convert 5-star to %
        categories   : catAgg.map(a => ({ name: a._id, count: a.count })),
        wards        : wardAgg.map(a => ({ ward: a._id, count: a.count })),
        days         : sevenDays,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const mapCategoryToDept = (cat) => {
  const map = {
    Road        : 'Roads & Infrastructure',
    Water       : 'Water Supply',
    Sanitation  : 'Sanitation',
    Electricity : 'Electricity',
    Other       : 'General Administration',
  };
  return map[cat] || 'General Administration';
};

const updateBadge = async (userId) => {
  const user = await User.findById(userId);
  if (!user || user.role !== 'citizen') return;
  user.updateBadge();
  await user.save();
};