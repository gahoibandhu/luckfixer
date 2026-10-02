import sys; import os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from chart import *
CASES=[
 dict(name='Rourkela 1982-02-20 19:15',dob='1982-02-20',time='19:15',lat=22.2604,lon=84.8536,ev=[('marriage','2011-02-06'),('foreign_travel','2014-12-14'),('child_birth','2016-09-28'),('property','2023-10-20')]),
 dict(name='Orai 1984-03-06 09:10',dob='1984-03-06',time='09:10',lat=25.9886,lon=79.4507,ev=[('marriage','2013-01-13'),('child_birth','2014-10-27'),('child_birth','2019-04-13'),('property','2019-04-15'),('mother_death','2021-06-04')]),
]
H={'marriage':[7,2,11],'child_birth':[5,2,9,11],'foreign_travel':[12,9,3],'property':[4,11,2],'mother_death':[4,8,12]}
def owned(lagsign):  # planet -> houses it lords
    o={}
    for s in range(12): o.setdefault(SL[s],[]).append((s-lagsign)%12+1)
    return o
def rel(P,pos,lagsign,house):
    """how planet P connects to house `house` (whole sign)"""
    hs=(lagsign+house-1)%12; ps=sg(pos[P]); r=[]
    if house in owned(lagsign).get(P,[]): r.append('lord')
    if ps==hs: r.append('in')
    if (P in ASP or True) and hs in [(ps+o)%12 for o in ASP.get(P,[6])] and ps!=hs: r.append('asp')
    hl=SL[hs]
    if hl!=P and sg(pos[hl])==ps: r.append('conj-lord('+hl[:3]+')')
    if P in('Rahu','Ketu'):
        d=SL[ps]; 
        if house in owned(lagsign).get(d,[]): r.append('via-'+d[:3])
    return r
def show(c):
    j=jd(c['dob'],c['time']); pos=positions(j); lg=lagna(j,c['lat'],c['lon']); ls=sg(lg)
    print('\n=====',c['name'],'| Lagna',SIGNS[ls],f'{lg%30:.1f}','| Moon',SIGNS[sg(pos["Moon"])],f'{pos["Moon"]%30:.1f}','nak#',int(pos['Moon']//NAK))
    print('natal:',', '.join(f"{p[:3]} {SIGNS[sg(pos[p])]} H{(sg(pos[p])-ls)%12+1}" for p in PL))
    birth=dt.datetime.strptime(c['dob']+' '+c['time'],'%Y-%m-%d %H:%M')-dt.timedelta(hours=5.5)
    for typ,date in c['ev']:
        at=dt.datetime.strptime(date,'%Y-%m-%d')+dt.timedelta(hours=6.5)
        md,ad,pd=dasha(pos['Moon'],birth,at)
        tp=positions(jd(date,'12:00'))
        print(f"\n[{typ} {date}]  dasha {md}/{ad}/{pd}   event houses {H[typ]}")
        for lvl,P in (('MD',md),('AD',ad),('PD',pd)):
            hp=(sg(pos[P])-ls)%12+1
            conns={h:rel(P,pos,ls,h) for h in H[typ] if rel(P,pos,ls,h)}
            print(f"   {lvl} {P:8} natal H{hp} owns {owned(ls).get(P,[])}  -> {conns if conns else 'no link to event houses'}")
        for P in ('Jupiter','Saturn','Mars','Rahu'):
            ts=sg(tp[P]); h=(ts-ls)%12+1; hm=(ts-sg(pos['Moon']))%12+1
            hits=[x for x in H[typ] if (ts+0)%12==(ls+x-1)%12 or (ls+x-1)%12 in [(ts+o)%12 for o in ASP.get(P,[6])]]
            print(f"   transit {P:7} {SIGNS[ts]} = H{h} from Lagna, H{hm} from Moon; touches event houses {hits}")
if __name__=='__main__':
    for c in CASES: show(c)
