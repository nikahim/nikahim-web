from PIL import Image

HEART = 'logo-heart.png'
WORD  = 'nikahim-text-logo.png'

# Microsoft oranı: kalp yüksekliği ~= yazı yüksekliği (yazı ascender+i-noktası içerdiği için
# bu ~1.2x cap-height'e denk gelir), boşluk 0.25*kalp genişliği, dikey ortalı.
RATIO = 1.18       # kalp_yükseklik / yazı_yükseklik (Microsoft gibi üstten-alttan biraz taşar)
GAP_FRAC = 0.25    # yatay boşluk / kalp genişliği
VGAP_FRAC = 0.20   # dikey boşluk / kalp yüksekliği

def trim(im):
    im = im.convert('RGBA')
    b = im.getbbox()
    return im.crop(b) if b else im

heart = trim(Image.open(HEART))
word  = trim(Image.open(WORD))

wh = word.height
wW = word.width
# kalbi yazı yüksekliğine göre ölçekle
target_hh = int(round(wh * RATIO))
scale = target_hh / heart.height
hw = int(round(heart.width * scale))
heart_s = heart.resize((hw, target_hh), Image.LANCZOS)

# ---- YATAY ----
gap = int(round(hw * GAP_FRAC))
H = max(target_hh, wh)
W = hw + gap + wW
canvas = Image.new('RGBA', (W, H), (0,0,0,0))
canvas.alpha_composite(heart_s, (0, (H - target_hh)//2))
canvas.alpha_composite(word,   (hw + gap, (H - wh)//2))
canvas.save('logo-yatay.webp', 'WEBP', quality=92, method=6)
canvas.save('logo-yatay.png', 'PNG', optimize=True)
print(f'YATAY: {W}x{H}  (kalp {hw}x{target_hh}, boşluk {gap}, yazı {wW}x{wh})')

# ---- DİKEY ----
vgap = int(round(target_hh * VGAP_FRAC))
VW = max(hw, wW)
VH = target_hh + vgap + wh
vcanvas = Image.new('RGBA', (VW, VH), (0,0,0,0))
vcanvas.alpha_composite(heart_s, ((VW - hw)//2, 0))
vcanvas.alpha_composite(word,    ((VW - wW)//2, target_hh + vgap))
vcanvas.save('logo-dikey.webp', 'WEBP', quality=92, method=6)
print(f'DIKEY: {VW}x{VH}')

# ---- MAIL PNG (optimize, küçük) — dikey, genişlik ~480 ----
mail_w = 480
mscale = mail_w / VW
mail = vcanvas.resize((mail_w, int(round(VH*mscale))), Image.LANCZOS)
mail.save('logo-dikey-mail.png', 'PNG', optimize=True)
print(f'MAIL PNG: {mail.size}')