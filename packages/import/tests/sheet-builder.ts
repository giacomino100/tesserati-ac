/**
 * Costruisce righe sintetiche di un foglio con le 33 colonne dell'export (docs/dominio/excel-esempio/README.md).
 * Solo nomi inventati.
 */
export const HEADERS = [
  'Associazione', 'Anno Associativo', 'Cognome', 'Nome', 'Sesso', 'Data Nascita', 'Città Nascita', 'Cod. Fiscale',
  'Telefono', 'Cellulare', 'Indirizzo', 'CAP', 'Città', 'Prov.', 'Frazione', 'Settore', "Fasce d'età", 'Legame',
  'N. Legame', 'Ruolo', 'SR', 'LM', 'Pagato', 'A', 'B', 'C', 'D', 'E', 'Incarico', 'Professione', 'Stato Civile',
  'MLAC', 'MSAC',
] as const;

export type Header = (typeof HEADERS)[number];
export type RowValues = Partial<Record<Header, unknown>>;

/** Riga ACR completa e valida; `over` sostituisce singole colonne. */
export function acrRow(over: RowValues = {}): RowValues {
  return {
    Associazione: 'S. GIOACCHINO - 440 ',
    'Anno Associativo': 'Anno 2026',
    Cognome: 'PROVA',
    Nome: 'ALFA',
    Sesso: 'F',
    'Data Nascita': '09/04/2016',
    'Città Nascita': 'PALERMO',
    'Cod. Fiscale': null,
    Telefono: "''",
    Cellulare: null,
    Indirizzo: 'VIA DI PROVA 1',
    CAP: '90047',
    Città: 'PARTINICO',
    'Prov.': 'PA',
    Frazione: null,
    Settore: 'RAGAZZI',
    "Fasce d'età": '9/11',
    Legame: 'C3',
    'N. Legame': 900002,
    Ruolo: 'F',
    SR: '',
    LM: null,
    Pagato: 'Sì',
    A: 'A', B: 'B', C: 'C', D: 'D', E: 'E',
    Incarico: null,
    Professione: null,
    'Stato Civile': null,
    MLAC: null,
    MSAC: null,
    ...over,
  };
}

/** Foglio: intestazioni (nell'ordine dato) + righe. */
export function sheet(rows: RowValues[], headers: readonly string[] = HEADERS): unknown[][] {
  return [[...headers], ...rows.map((r) => headers.map((h) => (r as Record<string, unknown>)[h] ?? null))];
}

export const SHEET = 'ElencoAdesioniExcel';
