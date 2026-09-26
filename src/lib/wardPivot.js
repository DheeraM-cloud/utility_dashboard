const Asset = require('../models/Asset');
const { CATEGORIES } = require('./categorize');

// Builds the $group stage's per-category counters, e.g.
// Streetlight: { $sum: { $cond: [{ $eq: ['$category', 'Streetlight'] }, 1, 0] } }
function categoryCounters() {
  const counters = {};
  CATEGORIES.forEach((c) => {
    counters[c] = { $sum: { $cond: [{ $eq: ['$category', c] }, 1, 0] } };
  });
  return counters;
}

// Returns one row per ward: { WARD_NO, Streetlight, Manhole, ..., Total, minLat, maxLat, minLon, maxLon }
async function getWardPivot() {
  const projectFields = { _id: 0, WARD_NO: '$_id', Total: 1, minLat: 1, maxLat: 1, minLon: 1, maxLon: 1 };
  CATEGORIES.forEach((c) => { projectFields[c] = 1; });

  const rows = await Asset.aggregate([
    {
      $group: {
        _id: '$wardNo',
        ...categoryCounters(),
        Total: { $sum: 1 },
        minLat: { $min: '$lat' },
        maxLat: { $max: '$lat' },
        minLon: { $min: '$lon' },
        maxLon: { $max: '$lon' },
      },
    },
    { $project: projectFields },
    { $sort: { WARD_NO: 1 } },
  ]);

  return rows;
}

module.exports = { getWardPivot };
