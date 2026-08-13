"""
Le decor du site, rendu en image pour les emails.

Un client mail ne sait pas animer, ni flouter, ni degrader de facon
fiable. On rend donc le fond une fois pour toutes, ici, et les gabarits
d'email n'ont plus qu'a le poser en image.

Deux fichiers en sortent, et le second est decoupe DANS le premier :
c'est ce qui donne l'impression d'un panneau de verre plutot que de deux
rectangles superposes.

  python3 scripts/fond-emails.py

A relancer si les couleurs de globals.css changent, en les recopiant
ci-dessous.
"""

import math, os
import numpy as np
from PIL import Image, ImageFilter

BG = ["#33217f", "#4e5bc0", "#9e63d6", "#c255c4", "#5a54c8", "#31217c"]
STOPS = [0.0, 0.22, 0.44, 0.62, 0.82, 1.0]
A1, A2, A3 = (232,111,216), (90,114,224), (180,122,234)
VOILE = (44, 16, 100)
FIN = (49, 33, 124)          # --bg-6, la couleur de repli du mail

def rgb(h):
    h = h.lstrip("#"); return tuple(int(h[i:i+2],16) for i in (0,2,4))

S = 2
W, H = 600*S, 1200*S
x = np.arange(W)[None,:].repeat(H,0).astype(np.float32)
y = np.arange(H)[:,None].repeat(W,1).astype(np.float32)

a = math.radians(168.0); dx, dy = math.sin(a), math.cos(a)
L = abs(W*dx) + abs(H*dy)
t = np.clip(((x-W/2)*dx + (H/2-y)*dy)/L + 0.5, 0, 1)

base = np.zeros((H,W,3), np.float32)
cols = [rgb(c) for c in BG]
for i in range(len(STOPS)-1):
    t0,t1 = STOPS[i], STOPS[i+1]
    m = (t>=t0)&(t<=t1); k = ((t-t0)/(t1-t0))[...,None]
    c0,c1 = np.array(cols[i],np.float32), np.array(cols[i+1],np.float32)
    base = np.where(m[...,None], c0+(c1-c0)*k, base)

def nappe(img, cx, cy, r, couleur, force):
    d = np.sqrt((x-cx*W)**2 + (y-cy*H)**2)/(r*W)
    k = (np.clip(1-d,0,1)**1.6*force)[...,None]
    return img*(1-k) + np.array(couleur,np.float32)*k

base = nappe(base, 0.28, 0.14, 0.70, A1, 0.72)
base = nappe(base, 0.88, 0.34, 0.62, A2, 0.66)
base = nappe(base, 0.14, 0.60, 0.66, A3, 0.60)
base = nappe(base, 0.78, 0.78, 0.60, A1, 0.52)
base = nappe(base, 0.30, 0.95, 0.55, A2, 0.42)

img = Image.fromarray(np.clip(base,0,255).astype(np.uint8))
img = img.filter(ImageFilter.GaussianBlur(30*S))
grand = np.asarray(img, np.float32)

# Le bas rejoint la couleur de repli : si le message est plus haut que
# l'image, la jonction ne se voit pas.
fondu = np.clip((y/H - 0.80)/0.20, 0, 1)[...,None]
grand = grand*(1-fondu) + np.array(FIN,np.float32)*fondu

# Un voile leger sur le fond exterieur : on veut la couleur, pas du texte dessus.
v = np.array(VOILE, np.float32)
grand = grand*(1-0.14) + v*0.14

rng = np.random.default_rng(7)
def sortir(arr, taille, chemin, q=88):
    a = arr + rng.normal(0, 1.2, arr.shape)
    im = Image.fromarray(np.clip(a,0,255).astype(np.uint8)).resize(taille, Image.LANCZOS)
    im.convert("RGB").save(chemin, quality=q, optimize=True)
    return im.size

DOSSIER = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "emails") + os.sep
print("fond ", sortir(grand, (600,1200), DOSSIER+"fond-email.jpg"))

# La carte : la MEME image, au bon endroit, plus floue et voilee. C'est
# ce qui donne l'impression d'un panneau de verre pose dessus.
x0, y0 = 20*S, 44*S
carte = grand[y0:y0+880*S, x0:x0+560*S].copy()
carte = np.asarray(
    Image.fromarray(np.clip(carte,0,255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(14*S)),
    np.float32)
# Le voile suit la clarte au lieu d'etre uniforme : les zones deja
# sombres gardent toute leur couleur, seules les plus claires sont
# retenues. C'est ce qui permet de garder un fond vivant ET du texte
# blanc lisible, ce qu'un voile plat ne sait pas faire.
lum = carte @ np.array([0.2126, 0.7152, 0.0722], np.float32)
alpha = (0.26 + 0.52*np.clip((lum-58)/78, 0, 1))[...,None]
carte = carte*(1-alpha) + v*alpha
# On rend ensuite un peu de saturation, que le voile avait mangee.
gris = (carte @ np.array([0.2126,0.7152,0.0722], np.float32))[...,None]
carte = np.clip(gris + (carte-gris)*1.22, 0, 255)
print("clarte max de la carte :", round(float((carte @ np.array([0.2126,0.7152,0.0722],np.float32)).max()),1))
print("carte", sortir(carte, (560,880), DOSSIER+"fond-carte.jpg"))
