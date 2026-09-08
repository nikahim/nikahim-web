from PIL import Image

HEART = 'logo-heart.png'
WORD  = 'nikahim-text-logo.png'

# İki knob: kalp sabit (HEART_RATIO), yazı ayrıca küçülür (WORD_SCALE) — kalbi
# küçültmeden yazıyı incelt. boşluk 0.25*kalp genişliği, yazı biraz yukarı, dikey ortalı.
HEART_RATIO = 1.18   # kalp yüksekliği / ORİJİNAL yazı yüksekliği (kalbi sabit tutar)
WORD_SCALE  = 0.88   # yazı bu kadar küçülür (kalbe dokunmaz) — yazı baskın olmasın
GAP_FRAC = 0.14    # yatay boşluk / kalp genişliği (yazı kalbe yakın dursun)
VGAP_FRAC = 0.20   # dikey boşluk / kalp yüksekliği
WORD_DY_FRAC = 0.05  # yatayda yazı bu kadar (yazı yüksekliğinin oranı) YUKARI kayar

def trim(im):
    im = im.convert('RGBA')
    b = im.getbbox()
    return im.crop(b) if b else im

heart = trim(Image.open(HEART))
word  = trim(Image.open(WORD))

# kalbi ORİJİNAL yazı yüksekliğine göre ölçekle (yazı küçülse de kalp değişmez)
base = word.height
target_hh = int(round(base * HEART_RATIO))
scale = target_hh / heart.height
hw = int(round(heart.width * scale))
heart_s = heart.resize((hw, target_hh), Image.LANCZOS)

# yazıyı küçült
word = word.resize((int(round(word.width * WORD_SCALE)), int(round(word.height * WORD_SCALE))), Image.LANCZOS)
wh = word.height
wW = word.width

# ---- YATAY ----
gap = int(round(hw * GAP_FRAC))
H = max(target_hh, wh)
W = hw + gap + wW
canvas = Image.new('RGBA', (W, H), (0,0,0,0))
word_dy = int(round(wh * WORD_DY_FRAC))
canvas.alpha_composite(heart_s, (0, (H - target_hh)//2))
canvas.alpha_composite(word,   (hw + gap, (H - wh)//2 - word_dy))
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
print(f'DIKEY webp: {VW}x{VH}')

# ---- MAIL PNG = logo-dikey.png (küçük+optimize; mail sadece bunu kullanır, redeploy gerekmez) ----
mail_w = 480
mscale = mail_w / VW
mail = vcanvas.resize((mail_w, int(round(VH*mscale))), Image.LANCZOS)
mail.save('logo-dikey.png', 'PNG', optimize=True)
print(f'MAIL logo-dikey.png: {mail.size}')