import sys; import os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rank import *
for c in CASES:
    j=jd(c['dob'],c['time']); true=sg(lagna(j,c['lat'],c['lon']))
    pos,res=ev_scores(c)
    print('\n',c['name'],'(true Lagna',SIGNS[true]+')')
    print('  event            date        dasha  transit  | lagnas (of 12) explaining it at least as well as the TRUE one')
    for typ,sm in res:
        row={}
        for ls in range(12):
            bd=bt=0
            for md,ad,pd,tp in sm:
                d=0.3*link(md,pos,ls,typ)+0.4*link(ad,pos,ls,typ)+0.3*link(pd,pos,ls,typ)
                pl=['Saturn','Mars','Rahu'] if typ in HARD else ['Jupiter','Saturn']
                t=sum(tlink(P,tp,ls,typ) for P in pl)/len(pl)
                bd=max(bd,d); bt=max(bt,t)
            row[ls]=(bd,bt)
        d,t=row[true]; e=max(d,t)
        n=sum(1 for ls in range(12) if max(row[ls])>=e-1e-9)
        dateev=[x for x in c['ev'] if x[0]==typ]
        print(f"  {typ:15} {'':10}  {d*100:5.0f}  {t*100:6.0f}   | {n}/12")
