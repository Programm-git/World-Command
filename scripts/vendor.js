// Kopiert die Kartenbibliotheken und Weltdaten nach public/vendor,
// damit die Seite ohne CDN und auch ohne fetch() funktioniert.
const fs = require('fs');
const path = require('path');
const out = path.join(__dirname, '..', 'public', 'vendor');
fs.mkdirSync(out, { recursive: true });
fs.copyFileSync(path.join(__dirname, '..', 'node_modules', 'd3', 'dist', 'd3.min.js'), path.join(out, 'd3.min.js'));
fs.copyFileSync(path.join(__dirname, '..', 'node_modules', 'topojson-client', 'dist', 'topojson-client.min.js'), path.join(out, 'topojson-client.min.js'));
const world = require('world-atlas/countries-110m.json');
fs.writeFileSync(path.join(out, 'world.js'), 'window.WORLD_TOPO=' + JSON.stringify(world) + ';');
console.log('vendor files written to', out);
