const express = require('express');
const { getWardPivot } = require('../lib/wardPivot');

const router = express.Router();

// GET /api/wards — one row per ward, pivoted counts per category + Total + bounding box.
// Drives both the ward chart and the "jump to ward" zoom.
router.get('/', async (_req, res, next) => {
  try {
    const rows = await getWardPivot();
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
