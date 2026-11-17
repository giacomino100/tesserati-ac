#!/usr/bin/env node
'use strict';
/**
 * Inizializza il listino 2026/27: scrive feeSchedules/2026 con i valori di
 * firebase/seed/fee-schedule-2026.json (specifica 003, ricerca R6). Si lancia UNA volta.
 *
 *   node firebase/scripts/seed-fee-schedule.cjs --email <indirizzo di chi gestisce il progetto>
 *   node firebase/scripts/seed-fee-schedule.cjs --emulator --email seed@example.org
 *
 * In produzione usa le credenziali della CLI Firebase già autenticata (`firebase login`).
 * Se il documento esiste già, si ferma senza scrivere nulla.
 */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const args = process.argv.slice(2);
const emulator = args.includes('--emulator');
const emailAt = args.indexOf('--email');
const email = emailAt >= 0 ? (args[emailAt + 1] || '').trim().toLowerCase() : '';
const projectAt = args.indexOf('--project');

if (!/^[^@\s]+@[^@\s]+$/.test(email)) {
  console.error('Manca --email <indirizzo> (finisce in updatedBy, in minuscolo).');
  process.exit(1);
}
const projectId = projectAt >= 0 ? args[projectAt + 1] : emulator ? 'demo-tesseramento' : 'tesseramento-ac';

const seed = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'seed', 'fee-schedule-2026.json'), 'utf8'),
);

function toValue(v) {
  if (typeof v === 'number') return { integerValue: String(v) };
  if (typeof v === 'string') return { stringValue: v };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
  return { mapValue: { fields: toFields(v) } };
}
function toFields(o) {
  return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, toValue(v)]));
}

async function accessToken() {
  if (emulator) return 'owner'; // l'emulatore ignora le regole per questo token
  const store = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
  const refresh = JSON.parse(fs.readFileSync(store, 'utf8')).tokens?.refresh_token;
  if (!refresh) throw new Error('Nessun accesso trovato: lancia `firebase login`.');
  const api = require('firebase-tools/lib/api');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refresh,
      client_id: api.clientId(),
      client_secret: api.clientSecret(),
    }),
  });
  if (!res.ok) throw new Error(`Accesso non riuscito (${res.status}): lancia \`firebase login\`.`);
  return (await res.json()).access_token;
}

async function main() {
  const host = emulator
    ? `http://${process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080'}`
    : 'https://firestore.googleapis.com';
  const base = `${host}/v1/projects/${projectId}/databases/(default)/documents/feeSchedules`;
  const headers = { authorization: `Bearer ${await accessToken()}`, 'content-type': 'application/json' };

  const existing = await fetch(`${base}/${seed.associationYear}`, { headers });
  if (existing.ok) {
    console.log(`feeSchedules/${seed.associationYear} esiste già: nulla da fare.`);
    return;
  }
  if (existing.status !== 404) throw new Error(`Lettura non riuscita (${existing.status}).`);

  const doc = { ...seed, updatedAt: new Date(), updatedBy: email };
  const res = await fetch(`${base}?documentId=${seed.associationYear}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ fields: toFields(doc) }),
  });
  if (!res.ok) throw new Error(`Scrittura non riuscita (${res.status}): ${await res.text()}`);
  console.log(`Creato feeSchedules/${seed.associationYear} (${emulator ? 'emulatore' : projectId}).`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
