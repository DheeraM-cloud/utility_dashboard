const express = require('express');
const { getWardPivot } = require('../lib/wardPivot');

const router = express.Router();

// GET /api/insights — the four Field Notes findings, computed live from
// whatever is currently in the `assets` collection (not hardcoded text).
router.get('/', async (_req, res, next) => {
  try {
    const wards = await getWardPivot();
    const cityTotal = wards.reduce((s, w) => s + w.Total, 0);
    const cityStreetlight = wards.reduce((s, w) => s + w.Streetlight, 0);
    const cityManhole = wards.reduce((s, w) => s + w.Manhole, 0);
    const cityAvgRatio = cityManhole > 0 ? cityStreetlight / cityManhole : 0;

    // 1. Water access gap — wards with the least mapped water infrastructure.
    const byWaterAsc = [...wards].sort((a, b) => a.Water - b.Water).slice(0, 6);
    const worstWater = byWaterAsc[0];
    const oneEachCount = byWaterAsc.filter((w) => w.Water === 1).length;
    const waterGap = {
      flag: 'Water access gap',
      title: `${byWaterAsc.filter((w) => w.Water <= 1).length} wards are running on almost no mapped water infrastructure`,
      body: `Ward ${worstWater.WARD_NO} has ${worstWater.Water === 0 ? 'zero' : worstWater.Water} mapped hand pumps or tanks despite ${worstWater.Total} other assets logged` +
        (oneEachCount ? `, and ${oneEachCount} more ward${oneEachCount > 1 ? 's have' : ' has'} only one each` : '') +
        `. Worth a ground check — either these wards genuinely lack public water points, or the survey missed them.`,
      wards: byWaterAsc.map((w) => w.WARD_NO),
    };

    // 2. Transformer load — wards running many streetlights off very few transformers.
    const withTransformers = wards.filter((w) => w.Transformer > 0);
    const byLoadDesc = withTransformers
      .map((w) => ({ ...w, ratio: w.Streetlight / w.Transformer }))
      .sort((a, b) => b.ratio - a.ratio)
      .slice(0, 6);
    const worstLoad = byLoadDesc[0];
    const secondLoad = byLoadDesc[1];
    const transformerLoad = {
      flag: 'Transformer load',
      title: 'A handful of wards run a lot of streetlights off very few transformers',
      body: `Ward ${worstLoad.WARD_NO} carries ${worstLoad.Streetlight} streetlights on ${worstLoad.Transformer === 1 ? 'a single mapped transformer' : `just ${worstLoad.Transformer} mapped transformers`}` +
        (secondLoad ? `, and Ward ${secondLoad.WARD_NO} runs ${secondLoad.Streetlight} lights off ${secondLoad.Transformer}` : '') +
        `. Both are candidates for a load review before more lighting gets added.`,
      wards: byLoadDesc.map((w) => w.WARD_NO),
    };

    // 3. Lighting vs. drainage — streetlights per manhole, as a rough proxy for road/drain network size.
    const roadHeavy = wards.filter((w) => w.Manhole > 10);
    const byLightRatioAsc = roadHeavy
      .map((w) => ({ ...w, ratio: w.Manhole > 0 ? w.Streetlight / w.Manhole : 0 }))
      .sort((a, b) => a.ratio - b.ratio)
      .slice(0, 6);
    const lightingGap = {
      flag: 'Lighting vs. drainage',
      title: 'Some road-dense wards are comparatively under-lit',
      body: `Comparing streetlights to manholes (a rough proxy for road/drain network size), ` +
        `Wards ${byLightRatioAsc.slice(0, 3).map((w) => w.WARD_NO).join(', ')} have fewer than ${byLightRatioAsc[2] ? byLightRatioAsc[2].ratio.toFixed(2) : '—'} lights per manhole — ` +
        `well below the city's ~${cityAvgRatio.toFixed(2)} average — suggesting streets there may be darker relative to their infrastructure footprint.`,
      wards: byLightRatioAsc.map((w) => w.WARD_NO),
    };

    // 4. Survey density — top and bottom wards by total mapped assets.
    const byTotalDesc = [...wards].sort((a, b) => b.Total - a.Total);
    const top3 = byTotalDesc.slice(0, 3);
    const bottom3 = byTotalDesc.slice(-3).reverse();
    const topSharePct = ((top3[0].Total / cityTotal) * 100).toFixed(0);
    const bottomMin = Math.min(...bottom3.map((w) => w.Total));
    const bottomMax = Math.max(...bottom3.map((w) => w.Total));
    const bottomRange = bottomMin === bottomMax ? `${bottomMin}` : `${bottomMin}-${bottomMax}`;
    const surveyDensity = {
      flag: 'Survey density',
      title: `Ward ${top3[0].WARD_NO} alone accounts for ${topSharePct}% of every mapped asset in the city`,
      body: `Ward ${top3.map((w) => `${w.WARD_NO} (${w.Total})`).join(', ')} dwarf Ward${bottom3.length > 1 ? 's' : ''} ${bottom3.map((w) => w.WARD_NO).join(', ')} ` +
        `(${bottomRange} assets each). That gap may reflect real infrastructure density — or uneven survey coverage. ` +
        `Either way, it's the first thing to verify before using this data for budget allocation.`,
      wards: [...top3.map((w) => w.WARD_NO), ...bottom3.map((w) => w.WARD_NO)],
    };

    res.json({ waterGap, transformerLoad, lightingGap, surveyDensity });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
