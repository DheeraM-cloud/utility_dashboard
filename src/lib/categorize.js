// Maps the raw "Name" values from the municipal survey sheet to the
// seven broad utility categories the frontend understands.
// Keep this file as the single source of truth — both the import
// script and the API import it so category logic never drifts apart.

const CATEGORY_MAP = {
  'Light Tube': 'Streetlight',
  'Sodium Light Tube': 'Streetlight',
  'Light Sodium': 'Streetlight',
  'Man Hole': 'Manhole',
  'Transformer': 'Transformer',
  'Small Water Tank': 'Water',
  'Big Water Tank': 'Water',
  'Hand Pumb': 'Water',
  'Dust Pin': 'Waste',
  'Small Bridge': 'Structure',
  'Cell Tower': 'Structure',
  'Temple': 'Landmark',
  'CHOLA': 'Landmark',
  'COLLECTOR OFFICE': 'Landmark',
};

const CATEGORIES = [
  'Streetlight',
  'Manhole',
  'Transformer',
  'Water',
  'Waste',
  'Structure',
  'Landmark',
];

function categorize(rawName) {
  return CATEGORY_MAP[String(rawName).trim()] || 'Other';
}

module.exports = { categorize, CATEGORY_MAP, CATEGORIES };
