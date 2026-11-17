"""Genera Excel di esempio con dati FINTI ma stessa struttura e stessi difetti dell'export reale."""
# Uso: python3 genera_esempi.py <cartella-di-output>
import sys, datetime as dt, openpyxl
out = sys.argv[1]
HDR = ['Associazione','Anno Associativo','Cognome','Nome','Sesso','Data Nascita','Città Nascita','Cod. Fiscale','Telefono','Cellulare','Indirizzo','CAP','Città','Prov.','Frazione','Settore',"Fasce d'età",'Legame','N. Legame','Ruolo','SR','LM','Pagato','A','B','C','D','E','Incarico','Professione','Stato Civile','MLAC','MSAC']
ANNO = 2026   # anno associativo 2026/27; nell'export compare come "Anno 2027" (Anno N = (N-1)/N)
def fascia(settore, y):
    age = ANNO - y
    if settore == 'ADULTI': return 'AD'
    for lo, hi in [(0,5),(6,8),(9,11),(12,14),(15,18),(19,25),(26,30)]:
        if lo <= age <= hi: return f'{lo}/{hi}'
    raise ValueError(age)
def settore_for(y):
    age = ANNO - y
    return 'RAGAZZI' if age <= 14 else 'GIOVANI' if age <= 30 else 'ADULTI'
MESI = 'ABCDEHLMPRST'
def cf(cog, nom, sesso, d):
    cons = lambda s: [c for c in s.upper() if c.isalpha() and c not in 'AEIOU']
    voc = lambda s: [c for c in s.upper() if c in 'AEIOU']
    c3 = (cons(cog)+voc(cog)+['X']*3)[:3]
    cn = cons(nom); n3 = ([cn[0],cn[2],cn[3]] if len(cn)>3 else (cn+voc(nom)+['X']*3)[:3])
    gg = d.day + (40 if sesso=='F' else 0)
    return ''.join(c3+n3)+f"{d.year%100:02d}{MESI[d.month-1]}{gg:02d}G348X"   # carattere di controllo fittizio 'X'

# (cognome, nome, sesso, data, indirizzo, legame, n_legame, ruolo, extra)
P = []
def add(cog, nom, s, d, ind, leg=None, nleg=None, ruolo=None, **kw):
    P.append(dict(cog=cog, nom=nom, s=s, d=d, ind=ind, leg=leg, nleg=nleg, ruolo=ruolo, **kw))
D = dt.datetime
# --- Famiglia 900001 C2: coppia di adulti
add('ROSSI','MARIO','M',D(1965,3,12),'VIA DELLE ROSE 1','C2',900001,'CG', cfok=True, prof='07', sc='2', sr='SR')
add('BIANCHI','LUCIA','F',D(1968,7,2),'VIA DELLE ROSE 1','C2',900001,'CG', cfok=True, prof='14', sc='2')
# --- 900002 C3: 2 adulti + 1 ACR  -> scatta lo sconto
add('VERDI','PAOLO','M',D(1980,1,20),'VIA DEI GIGLI 4','C3',900002,'CG', cfok=True, prof='05', sc='2')
add('NERI','ANNA','F',D(1982,11,5),'VIA DEI GIGLI, 4','C3',900002,'CG', cfok=True, sc='2')      # indirizzo scritto diversamente
add('VERDI','SOFIA','F',D(2016,4,9),'VIA DEI GIGLI 4','C3',900002,'F')
# --- 900003 C4: 2 adulti + 2 ACR di fasce diverse
add('GALLO','LUCA','M',D(1978,6,30),'VIA ROMA 10','C4',900003,'CG', cfok=True, sc='2')
add('CONTI','MARTA','F',D(1981,2,14),'VIA ROMA 10','C4',900003,'CG', sc='2', inc='21')
add('GALLO','TOMMASO','M',D(2014,9,1),'VIA ROMA 10','C4',900003,'F')
add('GALLO','GIULIA','F',D(2019,12,24),'VIA ROMA 10','C4',900003,'F')
# --- 900004 C6: 2 adulti + 3 giovani + 1 ACR
add('FERRARA','ANTONIO','M',D(1970,5,5),'VIA PALERMO 22','C6',900004,'CG', cfok=True, prof='01', sc='2')
add('LOMBARDO','ROSA','F',D(1972,8,18),'VIA PALERMO 22','C6',900004,'CG', cfok=True, sc='2', sr='SR')
add('FERRARA','MARCO','M',D(1999,10,10),'VIA PALERMO 22','C6',900004,'F', cfok=True, sc='1')
add('FERRARA','CHIARA','F',D(2005,3,3),'VIA PALERMO 22','C6',900004,'F', sc='1')
add('FERRARA','DAVIDE','M',D(2010,1,15),'VIA PALERMO 22','C6',900004,'F')
add('FERRARA','ELISA','F',D(2013,6,6),'VIA PALERMO 22','C6',900004,'F')
# --- 900005 N2: solo due fratelli ACR (genitori non tesserati)
add('MARINO','LEONARDO','M',D(2015,2,2),'VIA VERDI 3','N2',900005,'FS')
add('MARINO','EMMA','F',D(2018,10,30),'VIA VERDI 3','N2',900005,'FS')
# --- 900006 N3: tre fratelli (1 giovane + 2 ACR) -> sconto senza adulti
add('RICCI','ALESSANDRO','M',D(2009,4,4),'VIA MANZONI 8','N3',900006,'FS')
add('RICCI','GIORGIA','F',D(2013,7,7),'VIA MANZONI 8','N3',900006,'FS')
add('RICCI','FRANCESCO','M',D(2017,9,9),'VIA MANZONI  8','N3',900006,'FS')       # doppio spazio
# --- 900007 N2: ruolo A (altro/nonno?) + ACR
add('COLOMBO','GIUSEPPE','M',D(1948,12,1),'VIA GARIBALDI 15','N2',900007,'A', cfok=True, sc='3')
add('ESPOSITO','MATTIA','M',D(2016,5,25),'VIA GARIBALDI 15','N2',900007,'F', nascita=None)   # città di nascita mancante
# --- 900008 N3: un genitore + 1 giovane + 1 ACR
add('ROMANO','FRANCESCA','F',D(1985,9,19),'VIA CAVOUR 2','N3',900008,'CG', cfok=True, sc='1', cell='3330000001')
add('GRECO','NICOLO','M',D(2011,11,11),'VIA CAVOUR 2','N3',900008,'F')
add('GRECO','AURORA','F',D(2020,1,1),'VIA CAVOUR 2','N3',900008,'F')
# --- 900009 C2: coppia giovane (adulto + giovane)
add('BRUNO','STEFANO','M',D(1993,4,22),'VIA DANTE 5','C2',900009,'CG', cfok=True, sc='2')
add('RIZZO','VALERIA','F',D(1997,8,8),'VIA DANTE 5','C2',900009,'CG', cfok=True, sc='2', sr='SR', inc='20')
# --- singoli (nessun legame)
add('MORETTI','CARLA','F',D(1955,1,30),'VIA ITALIA 40', cfok=True, sc='3', tel='0910000001')
add('BARBIERI','SALVATORE','M',D(1960,10,3),'VIA ITALIA 41', sc='2')
add('FONTANA','ILARIA','F',D(1990,6,15),'C/DA SAN MARTINO', cfok=True, sc='1', inc='9')
add('SANTORO','GABRIELE','M',D(2001,2,28),'VIA FIRENZE 7', sc='1')
add('MARIANI','ALICE','F',D(2008,12,12),'VIA FIRENZE 9')
add('RINALDI','PIETRO','M',D(2012,3,3),'VIA NAPOLI 1')
add('CARUSO','BEATRICE','F',D(2017,5,5),'VIA NAPOLI 3')
add('FERRI','SAMUELE','M',D(2019,7,7),'VIA TORINO 12')
add('GATTI','MIA','F',D(2022,9,9),'VIA TORINO 14')                                   # fascia 0/5
add('PELLEGRINO','GIOVANNI ','M',D(2015,8,8),'VIA MILANO 6')               # spazio finale nel nome

files = {'ACR':'RAGAZZI','Giovani':'GIOVANI','Adulti':'ADULTI'}
for fname, sett in files.items():
    wb = openpyxl.Workbook(); ws = wb.active; ws.title = 'ElencoAdesioniExcel'; ws.append(HDR)
    for p in P:
        y = p['d'].year; s = settore_for(y)
        if s != sett: continue
        adult = s == 'ADULTI'
        ws.append([
            'S. GIOACCHINO - 440 ', f'Anno {ANNO + 1}', p['cog'], p['nom'], p['s'], p['d'],
            p.get('nascita', 'PALERMO' if y % 2 else 'PARTINICO'),
            cf(p['cog'], p['nom'], p['s'], p['d']) if p.get('cfok') else None,
            p.get('tel', '' if adult else None), p.get('cell'),
            p['ind'], '90047', 'PARTINICO', 'PA', None, s, fascia(s, y),
            p['leg'], p['nleg'], p['ruolo'], p.get('sr', ''), None, 'Sì', 'A','B','C','D','E',
            p.get('inc'), p.get('prof'), p.get('sc'),
            0 if adult else None, 0 if adult else None])
    wb.save(f"{out}/ElencoAdesioni_{fname}.xlsx")
    print(fname, ws.max_row - 1, "righe")
