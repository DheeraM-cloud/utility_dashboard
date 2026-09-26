const express = require('express');
const Asset = require('../models/Asset');

const router = express.Router();

// GET /api/stats — total assets, ward count, and per-category totals.
router.get('/', async (_req, res, next) => {
  try {
    const [total, wardNos, catAgg] = await Promise.all([
      Asset.countDocuments(),
      Asset.distinct('wardNo'),
      Asset.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    res.json({
      total,
      wards: wardNos.length,
      categories: catAgg.map((c) => ({ category: c._id, count: c.count })),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
