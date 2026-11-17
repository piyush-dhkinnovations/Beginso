// Copies the Looks from the backend's single source (Beginso-Backend/src/data/formLooks.json) into this repo, byte for byte, as the bundled fallback
// the app uses when the API cannot be reached. Run it after the backend's Looks change:
//
//   npm run sync:looks                     (reads ../Beginso-Backend/src/data/formLooks.json)
//   npm run sync:looks -- --from <file>    (reads another copy)
//   npm run sync:looks -- --check          (changes nothing; exits 1 when this copy differs)
//
// The app also loads the live list (GET /api/form-looks) and prefers it when its version differs, so a stale copy is only ever the offline fallback.
import { copyFileSync, existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const flag = (name) => args.indexOf(name);
const from = resolve(flag('--from') >= 0 ? args[flag('--from') + 1] : '../Beginso-Backend/src/data/formLooks.json');
const to = resolve('src/data/formLooks.json');

if (!existsSync(from)) {
  console.error(`Not found: ${from}`);
  process.exit(1);
}
const text = (file) => readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
const same = text(from) === text(to);
if (args.includes('--check')) {
  console.log(same ? 'The bundled Looks match the backend file.' : 'The bundled Looks DIFFER from the backend file. Run: npm run sync:looks');
  process.exit(same ? 0 : 1);
}
if (same) console.log('Already up to date.');
else {
  copyFileSync(from, to);
  console.log(`Copied ${from} to ${to}`);
}
