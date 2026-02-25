import mongoose from 'mongoose';

const timelineStepSchema = new mongoose.Schema({
  label : { type: String, required: true },
  done  : { type: Boolean, default: false },
  date  : { type: String, default: null },
}, { _id: false });

const feedbackSchema = new mongoose.Schema({
  rating   : { type: Number, min: 1, max: 5 },
  comment  : { type: String, default: '' },
  resolved : { type: String, enum: ['yes', 'no', 'partially'] },
}, { _id: false });

const complaintSchema = new mongoose.Schema(
  {
    // ── Identity ────────────────────────────────────────────────
    complaintId  : { type: String, unique: true },   // JV-2026-XXXXX
    citizenId    : { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    citizenName  : { type: String, required: true },
    citizenPhone : { type: String, required: true },

    // ── Issue details ───────────────────────────────────────────
    title       : { type: String, required: true },
    description : { type: String, required: true },
    category    : { type: String, enum: ['Road', 'Water', 'Sanitation', 'Electricity', 'Other'], required: true },
    priority    : { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
    status      : {
      type    : String,
      enum    : ['Submitted', 'Under Review', 'In Progress', 'Resolved', 'Rejected'],
      default : 'Submitted',
    },

    // ── Location ─────────────────────────────────────────────────
    ward     : { type: Number, required: true },
    location : { type: String, default: '' },
    gpsCoords: {
      lat: { type: Number, default: 0 },
      lng: { type: Number, default: 0 },
    },

    // ── Media ────────────────────────────────────────────────────
    photo        : { type: String, default: '' },  // base64 or URL
    resolvePhoto : { type: String, default: '' },

    // ── Admin fields ─────────────────────────────────────────────
    adminNote       : { type: String, default: '' },
    assignedOfficer : { type: String, default: '' },
    department      : { type: String, default: '' },

    // ── Stats ────────────────────────────────────────────────────
    mergedCount  : { type: Number, default: 0 },
    supportCount : { type: Number, default: 0 },
    supportedBy  : [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // ── Timeline ─────────────────────────────────────────────────
    timeline : {
      type    : [timelineStepSchema],
      default : () => [
        { label: 'Submitted',   done: true,  date: new Date().toISOString().split('T')[0] },
        { label: 'Under Review', done: false, date: null },
        { label: 'In Progress', done: false, date: null },
        { label: 'Resolved',    done: false, date: null },
      ],
    },

    estimatedResolution : { type: String, default: '' },
    feedback            : { type: feedbackSchema, default: null },

    // ── SOS flag ─────────────────────────────────────────────────
    isSOS   : { type: Boolean, default: false },
    sosType : { type: String, default: '' },
  },
  { timestamps: true }
);

// ── Auto-generate complaintId before save ─────────────────────
complaintSchema.pre('save', async function (next) {
  try {
    if (!this.complaintId) {
      const count = await mongoose.model('Complaint').countDocuments();
      this.complaintId = `JV-2026-${String(count + 1).padStart(5, '0')}`;
    }
    return next();
  } catch (err) {
    return next(err);
  }
});

export const Complaint = mongoose.model('Complaint', complaintSchema);