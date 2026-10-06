# Trims the white frame some stores bake around box art, so covers can sit
# full-bleed in fixed-size boxes. Sides and bottom are trimmed whenever they
# carry a near-white margin; the top only when the image is framed on at least
# three sides (a real PS5 cover's white banner is white only at the top).
from PIL import Image

def trim_frame(im, thresh=238, min_frac=0.012):
    g = im.convert('L')
    bbox = g.point(lambda v: 255 if v < thresh else 0).getbbox()
    if not bbox:
        return im, False
    w, h = im.size
    l, t, r, b = bbox
    m = {'l': l / w, 't': t / h, 'r': (w - r) / w, 'b': (h - b) / h}
    framed = sum(v >= min_frac for v in m.values()) >= 3
    box = (l if m['l'] >= min_frac else 0,
           t if framed else 0,
           r if m['r'] >= min_frac else w,
           b if m['b'] >= min_frac else h)
    if box == (0, 0, w, h):
        return im, False
    return im.crop(box), True

if __name__ == '__main__':
    # In-place pass over already-built thumbnails: python thumbs/trim.py thumbs/lg thumbs/out
    import sys, glob, os
    for d in sys.argv[1:]:
        n = 0
        for f in glob.glob(os.path.join(d, '*.webp')):
            im = Image.open(f).convert('RGB')
            t, ok = trim_frame(im)
            if ok:
                t.save(f, 'WEBP', quality=80 if '/lg' in d else 74, method=6); n += 1
        print(d, 'trimmed', n)


def portraitize(im, ratio=5 / 7):
    """Wide promo art -> portrait cover: the full image centred on a blurred,
    darkened, enlarged copy of itself. Box art (already portrait) is returned as is."""
    from PIL import ImageFilter, ImageEnhance
    w, h = im.size
    if w / h <= 1.05:
        return im, False
    cw, ch = w, round(w / ratio)
    s = max(cw / w, ch / h)
    bg = im.resize((round(w * s), round(h * s)), Image.LANCZOS)
    bg = bg.crop(((bg.width - cw) // 2, (bg.height - ch) // 2, (bg.width - cw) // 2 + cw, (bg.height - ch) // 2 + ch))
    bg = ImageEnhance.Brightness(bg.filter(ImageFilter.GaussianBlur(radius=max(8, cw // 24)))).enhance(0.7)
    bg.paste(im, (0, (ch - h) // 2))
    return bg, True
