import sys; import os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from chart import *
from analyze import CASES,H
W={'marriage':1.0,'child_birth':1.0,'foreign_travel':0.7,'property':0.7,'mother_death':1.0}
KAR={'marriage':['Venus'],'child_birth':['Jupiter'],'foreign_travel':['Rahu','Saturn'],'property':['Mars','Venus'],'mother_death':['Moon','Saturn']}
HARD={'mother_death'}
LOOK={'property':180}
def owned(ls):
    o={}
    for s in range(12): o.setdefault(SL[s],[]).append((s-ls)%12+1)
    return o
def link(P,pos,ls,typ):
    """0..1 strength of planet P's tie to the event's houses in lagna ls (lord/occupant/aspect/conjunct-lord/node agency)"""
    best=0; ow=owned(ls); ps=sg(pos[P])
    for i,h in enumerate(H[typ]):
        w=1.0 if i==0 else 0.6; hs=(ls+h-1)%12; hl=SL[hs]; v=0
        if h in ow.get(P,[]): v=1.0
        elif ps==hs: v=0.9
        elif sg(pos[hl])==ps and hl!=P: v=0.7
        elif hs in [(ps+o)%12 for o in ASP.get(P,[6])]: v=0.7
        elif P in('Rahu','Ketu') and h in ow.get(SL[ps],[]): v=0.7
        best=max(best,w*v)
    if P in KAR[typ]: best=max(best,0.5)
    return best
def tlink(P,tpos,ls,typ):
    best=0; ts=sg(tpos[P])
    for i,h in enumerate(H[typ]):
        hs=(ls+h-1)%12; w=1.0 if i==0 else 0.6
        if ts==hs: best=max(best,w*1.0)
        elif hs in [(ts+o)%12 for o in ASP.get(P,[6])]: best=max(best,w*0.8)
    return best
def ev_scores(case):
    j=jd(case['dob'],case['time']); pos=positions(j)
    birth=dt.datetime.strptime(case['dob']+' '+case['time'],'%Y-%m-%d %H:%M')-dt.timedelta(hours=5.5)
    res=[]
    for typ,date in case['ev']:
        d0=dt.datetime.strptime(date,'%Y-%m-%d'); samples=[0]+list(range(30,LOOK.get(typ,0)+1,30))
        sm=[]
        for back in samples:
            d=d0-dt.timedelta(days=back); at=d+dt.timedelta(hours=6.5)
            md,ad,pd=dasha(pos['Moon'],birth,at); tp=positions(jd(d.strftime('%Y-%m-%d'),'12:00'))
            sm.append((md,ad,pd,tp))
        res.append((typ,sm))
    return pos,res
def lagna_scores(case):
    pos,res=ev_scores(case); out={}
    for ls in range(12):
        sc={'dasha':0,'transit':0,'both':0,'either':0}; tw=0
        for typ,sm in res:
            bd=bt=bb=be=0
            for md,ad,pd,tp in sm:
                d=0.3*link(md,pos,ls,typ)+0.4*link(ad,pos,ls,typ)+0.3*link(pd,pos,ls,typ)
                pl=['Saturn','Mars','Rahu'] if typ in HARD else ['Jupiter','Saturn']
                t=sum(tlink(P,tp,ls,typ) for P in pl)/len(pl)
                bd=max(bd,d); bt=max(bt,t); bb=max(bb,0.5*d+0.5*t); be=max(be,max(d,t))
            w=W[typ]; tw+=w
            sc['dasha']+=w*bd; sc['transit']+=w*bt; sc['both']+=w*bb; sc['either']+=w*be
        out[ls]={k:round(100*v/tw,1) for k,v in sc.items()}
    return out
if __name__=='__main__':
    for c in CASES:
        j=jd(c['dob'],c['time']); true=sg(lagna(j,c['lat'],c['lon']))
        S=lagna_scores(c)
        print('\n',c['name'],'| true Lagna =',SIGNS[true])
        for k in ('dasha','transit','both','either'):
            order=sorted(range(12),key=lambda l:-S[l][k]); rank=order.index(true)+1
            print(f"  {k:8} true={S[true][k]:5}  best={SIGNS[order[0]]} {S[order[0]][k]:5}  true rank #{rank}/12 | top3: "+', '.join(f"{SIGNS[l]} {S[l][k]}" for l in order[:3]))
