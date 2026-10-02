import swisseph as swe, datetime as dt, math
swe.set_sid_mode(swe.SIDM_LAHIRI)
SIGNS=['Ari','Tau','Gem','Can','Leo','Vir','Lib','Sco','Sag','Cap','Aqu','Pis']
SL={0:'Mars',1:'Venus',2:'Mercury',3:'Moon',4:'Sun',5:'Mercury',6:'Venus',7:'Mars',8:'Jupiter',9:'Saturn',10:'Saturn',11:'Jupiter'}
PL=['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Rahu','Ketu']
IDS={'Sun':swe.SUN,'Moon':swe.MOON,'Mars':swe.MARS,'Mercury':swe.MERCURY,'Jupiter':swe.JUPITER,'Venus':swe.VENUS,'Saturn':swe.SATURN,'Rahu':swe.MEAN_NODE}
ASP={'Mars':[3,6,7],'Jupiter':[4,6,8],'Saturn':[2,6,9],'Rahu':[4,6,8],'Ketu':[4,6,8]}
DY={'Ketu':7,'Venus':20,'Sun':6,'Moon':10,'Mars':7,'Rahu':18,'Jupiter':16,'Saturn':19,'Mercury':17}
ORDER=['Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury']
NAK=360/27
def jd(date,time,tz=5.5):
    y,m,d=map(int,date.split('-')); h,mi=map(int,time.split(':'))
    ut=h+mi/60-tz
    return swe.julday(y,m,d,ut)
def positions(j):
    out={}
    for p,i in IDS.items():
        r=swe.calc_ut(j,i,swe.FLG_SIDEREAL)[0]; out[p]=r[0]
    out['Ketu']=(out['Rahu']+180)%360
    return out
def lagna(j,lat,lon):
    c,a=swe.houses_ex(j,lat,lon,b'P',swe.FLG_SIDEREAL); return a[0]%360
sg=lambda deg:int(deg//30)
def dasha(moon,birth_dt,at):
    nk=int(moon//NAK); lord=ORDER[nk%9]; frac=(moon%NAK)/NAK
    start=birth_dt-dt.timedelta(days=DY[lord]*frac*365.25)
    t=start; i=ORDER.index(lord)
    Y=365.25
    while True:
        L=ORDER[i%9]; end=t+dt.timedelta(days=DY[L]*Y)
        if t<=at<end:
            md=(L,t,end); break
        t=end;i+=1
    out=[md[0]]
    t0,t1=md[1],md[2]; span=(t1-t0)
    for level in range(2):
        j0=ORDER.index(out[-1]); t=t0
        for k in range(9):
            L=ORDER[(j0+k)%9]; seg=span*DY[L]/120
            if t<=at<t+seg: out.append(L); t0,span=t,seg; break
            t+=seg
    return out  # MD, AD, PD
