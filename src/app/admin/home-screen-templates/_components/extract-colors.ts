/**
 * Reads a palette out of an image in the browser (canvas), for the form's
 * "Extract colors from uploaded image" button.
 *
 * Works on the LOCAL file just picked (a blob: URL). A saved image lives on the
 * media bucket, which sends no CORS header, so the canvas cannot read it — the
 * caller says so instead of failing silently.
 *
 * Returns hexes in role order: primary (most saturated), secondary, accent,
 * background (lightest), text (darkest).
 */

type Rgb = [number, number, number];

const toHex = ([r, g, b]: Rgb) =>
    `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase()}`;

const lightness = ([r, g, b]: Rgb) => (Math.max(r, g, b) + Math.min(r, g, b)) / 510;

const saturation = ([r, g, b]: Rgb) => {
    const max = Math.max(r, g, b) / 255;
    const min = Math.min(r, g, b) / 255;
    const l = (max + min) / 2;
    if (max === min) return 0;
    return l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
};

const distance = (a: Rgb, b: Rgb) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

const loadImage = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('load'));
        img.src = src;
    });

export async function extractColors(src: string): Promise<string[]> {
    const img = await loadImage(src);
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas');
    ctx.drawImage(img, 0, 0, size, size);
    // Throws on a cross-origin image without CORS (a saved, bucket-hosted file).
    const { data } = ctx.getImageData(0, 0, size, size);

    // Bucket into 4 bits per channel, average each bucket.
    const buckets = new Map<number, { sum: Rgb; n: number }>();
    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 128) continue;
        const key = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4);
        const b = buckets.get(key) ?? { sum: [0, 0, 0] as Rgb, n: 0 };
        b.sum = [b.sum[0] + data[i], b.sum[1] + data[i + 1], b.sum[2] + data[i + 2]];
        b.n += 1;
        buckets.set(key, b);
    }

    // Most common first, then keep only clearly different colours.
    const common = [...buckets.values()]
        .sort((a, b) => b.n - a.n)
        .map((b) => [b.sum[0] / b.n, b.sum[1] / b.n, b.sum[2] / b.n] as Rgb);
    const distinct: Rgb[] = [];
    for (const c of common) {
        if (distinct.every((d) => distance(d, c) > 48)) distinct.push(c);
        if (distinct.length >= 12) break;
    }
    if (!distinct.length) throw new Error('empty');

    const pool = [...distinct];
    const take = (score: (c: Rgb) => number) => {
        if (!pool.length) return distinct[0];
        let best = 0;
        pool.forEach((c, i) => { if (score(c) > score(pool[best])) best = i; });
        return pool.splice(best, 1)[0];
    };

    const background = take((c) => lightness(c));
    const text = take((c) => -lightness(c));
    const primary = take((c) => saturation(c) * (1 - Math.abs(lightness(c) - 0.5)));
    const secondary = take((c) => lightness(c) + saturation(c) * 0.3); // a soft tint
    const accent = take((c) => saturation(c));

    return [primary, secondary, accent, background, text].map(toHex);
}
