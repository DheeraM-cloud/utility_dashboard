const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema(
  {
    objectId: { type: Number, required: true },      // original OBJECTID from the sheet
    rawName: { type: String, required: true },        // original label, e.g. "Man Hole"
    category: { type: String, required: true, index: true }, // normalised: Streetlight, Manhole, ...
    wardNo: { type: Number, required: true, index: true },
    x: { type: Number, required: true },               // original UTM Zone 44N easting
    y: { type: Number, required: true },               // original UTM Zone 44N northing
    lat: { type: Number, required: true },             // reprojected WGS84
    lon: { type: Number, required: true },
  },
  { timestamps: true }
);

assetSchema.index({ wardNo: 1, category: 1 });

module.exports = mongoose.model('Asset', assetSchema);
