"""
L'image de partage, celle qui s'affiche quand on colle le lien.

Sans elle, un lien pose sur Instagram, WhatsApp ou Discord apparait nu :
une adresse en texte, sans rien autour. Avec, il occupe un rectangle et
il est reconnaissable avant meme d'etre lu.

Format impose par les reseaux : 1200 x 630. Le logo est place au centre
avec une marge large, car la plupart des applications rognent les bords.

  python3 scripts/image-partage.py
"""

import math, os
import numpy as np
from PIL import Image, ImageFilter

BG = ["#33217f", "#4e5bc0", "#9e63d6", "#c255c4", "#5a54c8", "#31217c"]
STOPS = [0.0, 0.22, 0.44, 0.62, 0.82, 1.0]
A1, A2, A3 = (232, 111, 216), (90, 114, 224), (180, 122, 234)
VOILE = (44, 16, 100)

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


S = 2
W, H = 1200 * S, 630 * S
x = np.arange(W)[None, :].repeat(H, 0).astype(np.float32)
y = np.arange(H)[:, None].repeat(W, 1).astype(np.float32)

# Le degrade du site. L'angle est retenu tel quel, mais l'image est
# large et non haute : le degrade traverse donc surtout en diagonale.
a = math.radians(150.0)
dx, dy = math.sin(a), math.cos(a)
L = abs(W * dx) + abs(H * dy)
t = np.clip(((x - W / 2) * dx + (H / 2 - y) * dy) / L + 0.5, 0, 1)

base = np.zeros((H, W, 3), np.float32)
cols = [rgb(c) for c in BG]
for i in range(len(STOPS) - 1):
    t0, t1 = STOPS[i], STOPS[i + 1]
    m = (t >= t0) & (t <= t1)
    k = ((t - t0) / (t1 - t0))[..., None]
    c0, c1 = np.array(cols[i], np.float32), np.array(cols[i + 1], np.float32)
    base = np.where(m[..., None], c0 + (c1 - c0) * k, base)


def nappe(img, cx, cy, r, couleur, force):
    d = np.sqrt((x - cx * W) ** 2 + (y - cy * H) ** 2) / (r * W)
    k = (np.clip(1 - d, 0, 1) ** 1.6 * force)[..., None]
    return img * (1 - k) + np.array(couleur, np.float32) * k


base = nappe(base, 0.16, 0.20, 0.46, A1, 0.70)
base = nappe(base, 0.86, 0.30, 0.42, A2, 0.62)
base = nappe(base, 0.30, 0.88, 0.44, A3, 0.58)
base = nappe(base, 0.78, 0.84, 0.38, A1, 0.46)

img = Image.fromarray(np.clip(base, 0, 255).astype(np.uint8))
img = img.filter(ImageFilter.GaussianBlur(26 * S))
arr = np.asarray(img, np.float32)

# Un voile leger au centre : le logo est blanc, il lui faut un fond qui
# ne remonte pas trop dans les clairs sous lui.
d = np.sqrt(((x - W / 2) / (W * 0.42)) ** 2 + ((y - H / 2) / (H * 0.58)) ** 2)
alpha = (0.34 * np.clip(1 - d, 0, 1) + 0.12)[..., None]
arr = arr * (1 - alpha) + np.array(VOILE, np.float32) * alpha
arr += np.random.default_rng(11).normal(0, 1.2, arr.shape)

fond = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).resize((1200, 630), Image.LANCZOS)

# Le logo, centre, a 40 % de la largeur. Les applications de messagerie
# rognent souvent les bords : tout ce qui compte doit tenir au milieu.
logo = Image.open(os.path.join(RACINE, "public", "brand", "logo-white.webp")).convert("RGBA")
largeur = 480
logo = logo.resize((largeur, round(logo.height * largeur / logo.width)), Image.LANCZOS)

# Une ombre portee douce, sinon le blanc du logo se perd sur les zones
# claires du degrade.
ombre = Image.new("RGBA", fond.size, (0, 0, 0, 0))
ombre.paste(logo, ((1200 - logo.width) // 2, (630 - logo.height) // 2 + 6), logo)
ombre = ombre.filter(ImageFilter.GaussianBlur(18))
fond = Image.alpha_composite(fond.convert("RGBA"), Image.new("RGBA", fond.size, (0, 0, 0, 0)))
fond.alpha_composite(Image.eval(ombre, lambda v: v))
fond.alpha_composite(logo, ((1200 - logo.width) // 2, (630 - logo.height) // 2))

sortie = os.path.join(RACINE, "public", "og.jpg")
fond.convert("RGB").save(sortie, quality=90, optimize=True)
print("image de partage :", sortie, fond.size)
