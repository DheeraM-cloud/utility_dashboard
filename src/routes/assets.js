const express = require('express');
const Asset = require('../models/Asset');

const router = express.Router();

// GET /api/assets?ward=12&category=Water
// Returns the point data the map needs — kept lean on purpose (no _id/objectId/rawName)
// since the frontend renders ~7.5k of these at once.
router.get('/', async (req, res, next) => {
  try {
    const { ward, category } = req.query;
    const filter = {};
    if (ward) filter.wardNo = Number(ward);
    if (category) filter.category = category;

    const docs = await Asset.find(filter, { lat: 1, lon: 1, category: 1, wardNo: 1, _id: 0 })
      .lean();

    const points = docs.map((d) => ({ lat: d.lat, lon: d.lon, category: d.category, ward: d.wardNo }));
    res.json(points);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
