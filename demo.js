import {
  createFont,
  layoutText,
  renderLayout,
  upperCaseMapper,
} from "./pxfont.js";
import { Bitmap, toCanvas, toImageData, toBitmap } from "./bitmap.js";

import {
  kAlignCenter,
  kAlignEnd,
  kDirectionHorizontal,
  kDirectionVertical,
  Tree,
} from "./playout.js";

const loadImage = (url) =>
  new Promise((done, err) => {
    const img = new Image();
    img.crossOrigin = true;
    img.onload = () => done(img);
    img.onerror = err;
    img.src = url;
  });

const outline = (img, size, color, rad = false) => {
  const canvas = document.createElement("canvas");
  const isize = Math.ceil(size);
  const width = img.width + isize * 2;
  const height = img.height + isize * 2;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, isize, isize);
  const id = ctx.getImageData(0, 0, width, height);
  const out = ctx.getImageData(0, 0, width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      for (let dy = -isize; dy <= isize; dy++) {
        for (let dx = -isize; dx <= isize; dx++) {
          if (dx === 0 && dy === 0) continue;
          if (rad && Math.hypot(dx, dy) > size) continue;
          const tx = x + dx;
          const ty = y + dy;
          if (tx < 0 || ty < 0 || tx >= width || ty >= height) continue;
          if (id.data[(ty * width + tx) * 4 + 3] > 0) {
            out.data[idx] = color[0];
            out.data[idx + 1] = color[1];
            out.data[idx + 2] = color[2];
            out.data[idx + 3] = color[3];
            break;
          }
        }
      }
    }
  }
  ctx.putImageData(out, 0, 0);
  ctx.drawImage(img, isize, isize);
  return canvas;
};

const passage = `

ABCDEFGHIJKLMNOPQRSTUVWXYZ
abcdefghijklmnopqrstuvwxyz
1234567890

The quick brown fox jumps over the lazy dog. Sphinx of black quartz: judge my vow! Fill my box with twelve liquor jugs?

Teenage Mutant
Ninja Turtles`;

// Call me Ishmael. Some years ago-never mind how long precisely-having little or no money in my purse, and nothing particular to interest me on shore, I thought I would sail about a little and see the watery part of the world. It is a way I have of driving off the spleen and regulating the circulation. Whenever I find myself growing grim about the mouth; whenever it is a damp, drizzly November in my soul; whenever I find myself involuntarily pausing before coffin warehouses, and bringing up the rear of every funeral I meet; and especially whenever my hypos get such an upper hand of me, that it requires a strong moral principle to prevent me from deliberately stepping into the street, and methodically knocking people's hats off-then, I account it high time to get to sea as soon as I can. This is my substitute for pistol and ball. With a philosophical flourish Cato throws himself upon his sword; I quietly take to the ship. There is nothing surprising in this. If they but knew it, almost all men in their degree, some time or other, cherish very nearly the same feelings towards the ocean with me.

// -Moby Dick, 1867`;

const load = async (url) => toBitmap(toImageData(await loadImage(url)));

async function main() {
  const Remus = createFont(
    await load("/remus-sans.png"),
    `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890.?!,;:'" -`,
  );

  const RemusBold = createFont(
    await load("/Remus-Sans-Bold.png"),
    `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890.?!,;:'" -`,
  );

  const Pico = createFont(
    await load("/pico-pica.png"),
    `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890.?!,;:'" -`,
  );

  const PicoRelaxed = createFont(
    await load("/Pico-Relaxed.png"),
    `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890.?!,;:'" -`,
  );

  const PicoMidi = createFont(
    await load("/Pico-Midi.png"),
    `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890.?!,;:'" -`,
  );

  const Glasgow = createFont(
    await load("/Glasgow.png"),
    `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890.?!,;:'" -`,
  );

  const Almanac = createFont(
    await load("/Almanac.png"),
    `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890.?!,;:'" -`,
  );

  const Expo = createFont(
    await load("/Expo.png"),
    `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890.?!,;:'" -`,
  );

  const Chomnk = createFont(
    await load("/Chomnk.png"),
    `ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890!?., -"'`,
    { mapper: upperCaseMapper, defaultTracking: 1, defaultLeading: 4 },
  );

  const Spimndle = createFont(
    await load("/Spimndle.png"),
    `ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890.?!,;:'" -`,
    { mapper: upperCaseMapper, defaultTracking: 1, defaultLeading: 4 },
  );

  const Fivehead = createFont(
    await load("/Fivehead.png"),
    `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890.?!,;:'" -`,
    { defaultTracking: 1, defaultLeading: 4 },
  );

  const Cush = createFont(
    await load("/Cush.png"),
    `ABCDEFGHIJKLMNOPQRSTUVWXYZ .!?,:;'"-1234567890`,
    { mapper: upperCaseMapper, defaultTracking: 2, defaultLeading: 4 },
  );

  const fonts = {
    Pico,
    PicoRelaxed,
    PicoMidi,
    Expo,
    Remus,
    RemusBold,
    Almanac,
    Glasgow,
    Chomnk,
    Spimndle,
    Fivehead,
    Cush,
  };

  function draw(font, name) {
    const c = document.createElement("canvas");
    const layout = layoutText(name + " " + font.height + passage, font, {
      maxWidth: font.map("M").width * 32,
      leading: (font.defaultLeading * 1.6) | 0,
      tracking: font.defaultTracking,
      align: "left",
    });
    c.width = layout.width;
    c.height = layout.height;
    c.style.width = c.width * 2 + "px";
    c.style.aspectRatio = c.width + "/" + c.height;
    const ctx = c.getContext("2d");

    const palette = [
      [0, 0, 0, 0],
      [255, 255, 255, 255],
    ];

    ctx.putImageData(renderLayout(layout).toImageData(palette), 0, 0);

    document.body.append(c);
  }

  Object.entries(fonts).forEach(([name, font]) => draw(font, name));

  function drawText(text, font, options = {}) {
    const layout = layoutText(text, font, {
      maxWidth: options.maxWidth,
      maxHeight: options.maxHeight ?? Infinity,
      leading: options.leading ?? font.defaultLeading,
      tracking: options.tracking ?? font.defaultTracking,
      align: options.align ?? "left",
    });
    const palette = options.palette ?? [
      [0, 0, 0, 0],
      options.color ?? [255, 255, 255, 255],
    ];
    return toCanvas(renderLayout(layout), { palette });
  }

  (() => {
    const WIDTH = 192;

    const header = outline(
      drawText("potch dot me", Cush, {
        maxWidth: WIDTH,
        color: [255, 192, 0, 255],
      }),
      2.25,
      [0, 0, 0, 255],
      true,
    );

    const titleText = `One of the first significant things I ever coded in QBasic was a falling snow simulation- I think they're very soothing to watch, fun to customize, and there's lots of possibilities for extra little delight. Here's one I built on idle afternoons over the holidays this year at my parents. Enjoy!`;
    const title = drawText(titleText, Almanac, {
      maxWidth: WIDTH - 24,
      maxHeight: 48,
    });

    const today = drawText(
      new Intl.DateTimeFormat("en-GB", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(new Date()),
      PicoMidi,
      { maxWidth: 96, color: [0, 0, 0, 255] },
    );

    const tile = document.createElement("canvas");
    tile.width = WIDTH;
    tile.height = 144;
    tile.style.width = "512px";
    tile.style.aspectRatio = tile.width + "/" + tile.height;
    const tileCtx = tile.getContext("2d");

    const t = Tree.build(({ box, img }) =>
      box(
        {
          backgroundColor: "#088",
          direction: kDirectionVertical,
          hAlign: kAlignCenter,
          paddingTop: 8,
        },
        [
          img(header),
          box({ flex: 1 }),
          img(
            drawText("snow simulation toy", Glasgow, {
              maxWidth: tile.width - 32,
              color: [255, 255, 255, 255],
            }),
          ),
          box({ flex: 2 }),
          img(title),
          box({ flex: 3 }),
          box(
            {
              backgroundColor: "#ccc",
              border: [1, 0, 0, 0],
              borderColor: "#000",
              direction: kDirectionHorizontal,
              padding: [3, 3, 2, 4],
              hAlign: kAlignEnd,
            },
            [
              box({ flex: 1 }),
              box(
                {
                  backgroundColor: "#ccc",
                  padding: [3, 4, 2],
                  border: 1,
                  borderColor: ["#888", "#fff", "#fff", "#888"],
                },
                [img(today)],
              ),
            ],
          ),
        ],
      ),
    );

    t.layout({ maxWidth: tile.width, maxHeight: tile.height });
    t.draw(tile.getContext("2d"));

    document.body.append(tile);
  })();

  ((font) => {
    const el = document.createElement("div");
    Object.assign(el.style, {
      display: "flex",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: "4px",
      color: "#fff",
      textAlign: "center",
    });
    document.body.append(toCanvas(font.bitmap, { scale: 2 }));
    font.repertoire.split("").forEach((c) => {
      const glyph = font.map(c);
      const sample = document.createElement("div");
      sample.style.padding = "4px";
      sample.style.background = "#888";
      const char = toCanvas(glyph, { scale: 4 });
      sample.append(char);
      sample.append(c);
      el.append(sample);
    });
    document.body.append(el);
  })(Cush);
}

main().catch((e) => console.error(e));
