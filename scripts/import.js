/**
 * Import the Pudukkottai Utility GIS Excel sheet into MongoDB.
 *
 * Usage:
 *   MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/pudukkottai" \
 *   node scripts/import.js path/to/Pudukottai_Utilities.xls
 *
 * If no path is given, it looks for a file in ./data/.
 *
 * What it does:
 *   1. Reads the sheet (OBJECTID, Id, Name, WARD_NO, X_Coordinate, Y_Coordinate)
 *   2. Reprojects X/Y from UTM Zone 44N (EPSG:32644) to WGS84 lat/lon.
 *   3. Normalises each raw "Name" into one of 7 categories (src/lib/categorize.js).
 *   4. Drops any existing documents in the `assets` collection and inserts fresh.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const proj4 = require('proj4');
const { connect, mongoose } = require('../src/db');
const Asset = require('../src/models/Asset');
const { categorize } = require('../src/lib/categorize');

const UTM44N = '+proj=utm +zone=44 +datum=WGS84 +units=m +no_defs';
const WGS84 = '+proj=longlat +datum=WGS84 +no_defs';
const toWGS84 = proj4(UTM44N, WGS84);

function resolveInputFile(argPath) {
  if (argPath) return argPath;
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) return null;
  const candidate = fs
    .readdirSync(dataDir)
    .find((f) => f.toLowerCase().endsWith('.xls') || f.toLowerCase().endsWith('.xlsx'));
  return candidate ? path.join(dataDir, candidate) : null;
}

async function main() {
  const inputFile = resolveInputFile(process.argv[2]);
  if (!inputFile || !fs.existsSync(inputFile)) {
    console.error(
      'No input file found. Pass a path: node scripts/import.js path/to/file.xls\n' +
        'or drop the .xls/.xlsx file into ./data/'
    );
    process.exit(1);
  }
  if (!process.env.MONGODB_URI) {
    console.error(
      'MONGODB_URI is not set. Example:\n' +
      '  MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/pudukkottai" node scripts/import.js ...'
    );
    process.exit(1);
  }

  console.log(`Reading ${inputFile} ...`);
  const workbook = XLSX.readFile(inputFile);
  const sheetName = workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
  console.log(`Parsed ${rows.length} rows from sheet "${sheetName}"`);

  const records = rows.map((r) => {
    const x = Number(r.X_Coordinate);
    const y = Number(r.Y_Coordinate);
    const [lon, lat] = toWGS84.forward([x, y]);
    return {
      objectId: Number(r.OBJECTID),
      rawName: String(r.Name).trim(),
      category: categorize(r.Name),
      wardNo: Number(r.WARD_NO),
      x,
      y,
      lat,
      lon,
    };
  });

  const clean = records.filter(
    (r) => Number.isFinite(r.lat) && Number.isFinite(r.lon) && Number.isFinite(r.wardNo)
  );
  const skipped = records.length - clean.length;
  if (skipped) console.warn(`Skipping ${skipped} rows with missing/invalid coordinates or ward.`);

  await connect();

  console.log('Clearing existing documents...');
  await Asset.deleteMany({});

  console.log(`Inserting ${clean.length} documents...`);
  const BATCH = 1000;
  for (let i = 0; i < clean.length; i += BATCH) {
    const batch = clean.slice(i, i + BATCH);
    await Asset.insertMany(batch, { ordered: false });
    process.stdout.write(`  ${Math.min(i + BATCH, clean.length)}/${clean.length}\r`);
  }
  console.log(`\nDone. ${clean.length} assets loaded.`);

  const counts = await Asset.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  console.table(counts.map((c) => ({ category: c._id, count: c.count })));

  await mongoose.connection.close();
}

main().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
