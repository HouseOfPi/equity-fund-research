"""Download audited official Excel sources, validate complete portfolios, import via API.
Usage: python scripts/sync-disclosures.py [--month YYYY-MM] [--no-import]
Archive labels/filenames are not reporting-date evidence: the sheet is checked too.
"""
import argparse, calendar, concurrent.futures, datetime as dt, hashlib, io, json, math, os, re, subprocess, zipfile
from pathlib import Path
import pandas as pd
import requests
ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT / 'data' / 'disclosures'
FUNDS = json.loads(subprocess.check_output(['node','--input-type=module','-e', 'import {funds} from "./server/funds.js"; console.log(JSON.stringify(funds))'],cwd=ROOT))

def number(value):
    if isinstance(value, str):
        value = value.replace(',', '').replace('%','').strip()
        if re.fullmatch(r'\$\d+(?:\.\d+)?', value):
            value = value[1:]  # Official Invesco footnote: below 0.005%, displayed as $0.00.
    try:
        result=float(value)
        return result if math.isfinite(result) else None
    except (ValueError,TypeError): return None

def parse_sheet(frame, source, retrieved):
    rows=frame.fillna('').values.tolist()
    scheme=next(f['name'] for f in FUNDS if f['id']==source['fundId'])
    normalized=lambda v:re.sub(r'[^a-z0-9]','',v.lower())
    if source.get('layout') == 'uti-consolidated':
        starts=[i for i,r in enumerate(rows) if str(r[0]).strip() == 'SCHEME: '+scheme]
        if len(starts)!=1:raise ValueError('Expected exactly one matching UTI scheme block')
        start=starts[0]
        end=next((i for i in range(start+1,len(rows)) if str(rows[i][0]).strip().startswith('SCHEME:')),len(rows))
        rows=rows[start:end]
    title=' '.join(str(c) for r in rows[:18] for c in r)
    notes=' '.join(str(c) for r in rows for c in r)
    if normalized(scheme) not in normalized(title):
        raise ValueError('Scheme name does not match workbook contents: '+scheme)
    # Require the actual month-end date in the workbook, not a URL or archive label.
    year,month=map(int,source['month'].split('-'));day=calendar.monthrange(year,month)[1]
    disclosure=f'{year}-{month:02}-{day:02}'
    monthname=calendar.month_name[month]
    patterns=[re.escape(disclosure),rf'{monthname[:3]}(?:{monthname[3:]})?\s*{day},?\s*{year}',rf'{day}[\s/-]+{monthname[:3]}(?:{monthname[3:]})?[\s,/-]+{year}',rf'{day}[./-]0?{month}[./-]{year}']
    if not any(re.search(p,title,re.I) for p in patterns):
        raise ValueError('Workbook does not attest the requested month-end date')
    header=next((i for i,r in enumerate(rows[:25]) if any(str(v).strip().lower().startswith('isin') for v in r) and any('quantity' in str(v).lower() for v in r)),None)
    if header is None:raise ValueError('Missing instrument table header')
    labels=[re.sub(r'\s+', ' ', str(v).lower()).strip() for v in rows[header]]
    def col(match):return next(i for i,v in enumerate(labels) if match(v))
    nc=col(lambda v:'name' in v and 'instrument' in v);ic=col(lambda v:v.startswith('isin'))
    qc=col(lambda v:'quantity' in v);ac=col(lambda v:'%' in v and ('nav' in v or 'net asset' in v or 'aum' in v))
    vc=col(lambda v:'value' in v and ('market' in v or 'fair' in v or 'mkt' in v))
    is_grand=lambda name:bool(re.fullmatch(r'grand\s*total(?:\s*\(aum\))?',str(name).strip(),re.I)) or (source.get('layout')=='uti-consolidated' and re.fullmatch(r'TOTAL\s*:\s*'+re.escape(scheme),str(name).strip(),re.I))
    total=next((r for r in rows[header+1:] if is_grand(r[nc])),None)
    if total is None:raise ValueError('Missing grand total; incomplete table')
    grand=number(total[ac])
    if grand is None and source.get('layout')=='uti-consolidated':grand=100  # UTI leaves total % blank; NAV is the denominator.
    scale=100 if grand is not None and abs(grand-1)<0.01 else 1
    if grand is None or abs(grand*scale-100)>0.1:raise ValueError('Unexpected percentage units')
    total_value=number(total[vc])
    if total_value is None or total_value<=0:raise ValueError('Missing positive net asset value')
    skip_rows=set()
    if source.get('cashAggregate'):
        # Mahindra publishes both cash components and their combined balance.
        config=source['cashAggregate'];matches=[i for i,r in enumerate(rows[header+1:],header+1) if str(r[nc]).strip()==config['label'] and number(r[vc]) is not None]
        if len(matches)!=2:raise ValueError('Cash aggregate layout changed')
        components=[i for i,r in enumerate(rows[header+1:matches[-1]],header+1) if str(r[nc]).strip() in config['components'] and number(r[vc]) is not None]
        if len(components)!=len(config['components']):raise ValueError('Cash aggregate components missing')
        if abs(sum(number(rows[i][vc]) for i in components+[matches[0]])-number(rows[matches[-1]][vc]))>0.02:raise ValueError('Cash aggregate does not reconcile')
        skip_rows.update(components+[matches[0]])
    holdings={};section='equity';market_sum=0;unknown=[]
    for index,r in enumerate(rows[header+1:],header+1):
        if index in skip_rows:continue
        name=str(r[nc]).strip();isin=str(r[ic]).strip().upper();allocation=number(r[ac]);value=number(r[vc])
        if is_grand(name):break
        low=name.lower()
        if re.search(r'^(sub\s*total|total)(\s|:|$)',low):continue
        allocation_evidence=None
        raw_allocation=str(r[ac]).strip()
        if allocation is None and value is not None and re.fullmatch(r'#0(?:\.0+)?%',raw_allocation) and re.search(r'#.*?less\s*than\s*0\.005',notes,re.I):
            allocation=0
            allocation_evidence='AMC displays #0.00% and defines # as less than 0.005%; the holding is retained at its published rounded weight.'
        if allocation is None and value is not None and raw_allocation=='*' and re.search(r'Percentage\s+to\s+NAV\s+less\s+than\s+0\.01',notes,re.I):
            allocation=value/total_value*100/scale
            allocation_evidence='AMC reports * (less than 0.01%); allocation calculated as disclosed market value / disclosed net assets × 100.'
        if allocation is None or value is None:
            if 'equity' in low:section='equity'
            elif re.search('treps|triparty|tri-party|reverse repo',low):section='treps'
            elif re.search('money market|debt|commercial paper|certificate of deposit|treasury bill',low):section='debt'
            elif re.search('fund units|mutual fund|reit|invit',low):section='fund_unit'
            elif re.search('cash|short term deposit|term deposits',low):section='cash'
            elif 'derivative' in low:section='derivative'
            if value not in (None,0):raise ValueError('Valued row has an unrecognized allocation: '+name)
            continue
        if not name:
            if value==0 and allocation==0 and not isin and number(r[qc]) is None:continue  # Explicit empty/NIL section placeholder.
            unknown.append(r);continue
        if re.search('treps|triparty|tri-party|reverse repo',low):instrument='treps'
        elif re.search('cash|margin|receiv|payable|net current',low):instrument='cash'
        else:instrument=section
        unresolved=instrument=='equity' and not re.fullmatch(r'[A-Z]{2}[A-Z0-9]{9}[0-9]',isin)
        if unresolved and (isin or name not in source.get('missingIsinNames',[])):raise ValueError('Equity row lacks an ISIN: '+name)
        qty=number(r[qc])
        if qty is not None and (qty<0 or qty>9007199254740991 or instrument=='equity' and not qty.is_integer()):raise ValueError('Invalid quantity: '+name)
        key=isin if isin else f'{instrument}:{normalized(name)}'
        if unresolved:key=f'unresolved:{source["fundId"]}:{normalized(name)}'
        if source.get('layout')=='uti-consolidated':name=re.sub(r'^EQ\s*-\s*','',name)
        item={'companyId':key,'company':name,'instrument':instrument,'quantity':int(qty) if qty is not None and qty.is_integer() else qty,'allocation':round(allocation*scale,8)}
        if isin:item['identifierEvidence']='ISIN in official monthly portfolio: '+isin
        if unresolved:
            item['reviewReason']='Official AMC workbook leaves the ISIN blank; identity must be reconciled before comparing share movements.'
            item['identifierEvidence']='Name and quantity taken from the official workbook; fund-scoped unresolved identifier used.'
        if allocation_evidence:item['allocationEvidence']=allocation_evidence
        if key in holdings:
            old=holdings[key]
            if old['instrument']!=instrument:raise ValueError('Ambiguous duplicated ISIN: '+isin)
            old['allocation']=round(old['allocation']+item['allocation'],8)
            old['quantity']=old['quantity']+item['quantity'] if old['quantity'] is not None and item['quantity'] is not None else None
        else:holdings[key]=item
        market_sum+=value
    if unknown:raise ValueError('Unrecognized valued rows')
    allocation_sum=sum(h['allocation'] for h in holdings.values())
    if total_value is None or abs(market_sum-total_value)>max(2,len(holdings)*0.02):raise ValueError(f'Market value does not reconcile: {market_sum} vs {total_value}')
    if abs(allocation_sum-100)>0.5:raise ValueError(f'Allocations do not reconcile: {allocation_sum}')
    if not any(h['instrument']=='equity' for h in holdings.values()):raise ValueError('No equity holdings')
    snapshot={'fundId':source['fundId'],'month':source['month'],'disclosureDate':disclosure,'complete':True,'verification':'official','sources':[{'label':scheme+' — official monthly portfolio','url':source['url'],'type':'official','disclosureDate':disclosure,'retrievedAt':retrieved,'result':'agrees'}],'holdings':list(holdings.values())}
    # Workbook values are explicitly in INR lakhs; 100 lakhs = 1 crore.
    if 'lakh' in labels[vc] or 'lac' in labels[vc] or source.get('layout')=='uti-consolidated' and 'market value in lacs' in title.lower():snapshot['aum']={'crore':total_value/100,'date':disclosure,'sourceUrl':source['url'],'verified':True}
    return snapshot

def download(source):
    url=source['url']
    if not url.startswith('https://'):raise ValueError('HTTPS source required')
    key=hashlib.sha256(url.encode()).hexdigest()[:16]
    response=requests.get(url,headers={'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'},timeout=45);response.raise_for_status()
    retrieved=dt.datetime.now(dt.timezone.utc).isoformat().replace('+00:00','Z')
    payload=response.content
    ARCHIVE.mkdir(parents=True,exist_ok=True)
    suffix='.zip' if 'member' in source else Path(url.split('?')[0]).suffix
    (ARCHIVE/(key+suffix)).write_bytes(payload)
    evidence={'url':url,'retrievedAt':retrieved,'sha256':hashlib.sha256(payload).hexdigest(),'bytes':len(payload)}
    (ARCHIVE/(key+'.evidence.json')).write_text(json.dumps(evidence,indent=2))
    if 'member' in source:payload=zipfile.ZipFile(io.BytesIO(payload)).read(source['member'])
    sheet=pd.read_excel(io.BytesIO(payload),sheet_name=source['sheet'],header=None)
    return parse_sheet(sheet,source,retrieved)

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--month');parser.add_argument('--funds',help='Comma-separated fund IDs');parser.add_argument('--no-import',action='store_true');args=parser.parse_args()
    sources=json.loads((ROOT/'scripts/disclosure-sources.json').read_text())
    if args.month:sources=[s for s in sources if s['month']==args.month]
    if args.funds:sources=[s for s in sources if s['fundId'] in args.funds.split(',')]
    snapshots=[];report=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        futures={pool.submit(download,s):s for s in sources}
        for future in concurrent.futures.as_completed(futures):
            s=futures[future]
            try:
                snap=future.result();snapshots.append(snap);entry={'fundId':s['fundId'],'month':s['month'],'status':'verified','holdings':len(snap['holdings'])}
            except Exception as error:entry={'fundId':s['fundId'],'month':s['month'],'status':'failed','error':str(error)}
            report.append(entry);print(json.dumps(entry),flush=True)
    snapshots.sort(key=lambda s:(s['month'],s['fundId']))
    batch={'note':'Imported official month-end Excel portfolios. Workbook scheme/date, ISINs, share quantities, percentage units, signed cash balances and grand totals checked. Independent cross-checks not performed. Source files and SHA-256 evidence archived in data/disclosures. Duplicate ISIN rows consolidated; corporate actions require review before inferring purchases.','snapshots':snapshots}
    ARCHIVE.mkdir(parents=True,exist_ok=True);(ARCHIVE/'sync-report.json').write_text(json.dumps(report,indent=2))
    if not snapshots:raise SystemExit('No verified snapshots; nothing imported.')
    output=ARCHIVE/'verified-batch.json';output.write_text(json.dumps(batch,indent=2))
    # Always use the authoritative Zod schema, including in dry runs.
    subprocess.run(['node','--input-type=module','-e','import fs from "node:fs"; import {importSchema} from "./server/schema.js"; importSchema.parse(JSON.parse(fs.readFileSync(process.argv[1],"utf8")));',str(output)],cwd=ROOT,check=True)
    if not args.no_import:subprocess.run(['node','server/import-cli.js',str(output)],cwd=ROOT,check=True)
    if any(r['status']=='failed' for r in report):raise SystemExit(1)

if __name__=='__main__':main()
