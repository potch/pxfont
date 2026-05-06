import {
  Box,
  Img,
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

const toImageData = (img) => {
  const canvas = document.createElement("canvas");
  const { width, height } = img;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, width, height);
};

const outline = (img, size, color, rad = false) => {
  const canvas = document.createElement("canvas");
  const width = img.width + size * 2;
  const height = img.height + size * 2;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, size, size);
  const id = ctx.getImageData(0, 0, width, height);
  const out = ctx.getImageData(0, 0, width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      for (let dy = -size; dy <= size; dy++) {
        for (let dx = -size; dx <= size; dx++) {
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
  ctx.drawImage(img, size, size);
  return canvas;
};

class Bitmap {
  constructor(array, width) {
    this.array = array;
    this.width = width;
    this.height = array.length / width;
  }
  get(x, y) {
    return this.array[y * this.width + x];
  }
  set(x, y, v) {
    this.array[y * this.width + x] = v;
  }
  getRect(x, y, width, height) {
    const array = new this.array.constructor(width * height);
    for (let sy = 0; sy < height; sy++) {
      for (let sx = 0; sx < width; sx++) {
        array[sy * width + sx] = this.get(x + sx, y + sy);
      }
    }
    return new Bitmap(array, width);
  }
}

const toBitmap = (id) => {
  const { width, height } = id;
  const out = new Uint8ClampedArray(width * height);
  for (let i = 0; i < out.length; i++) {
    out[i] = id.data[i * 4] < 127 ? 1 : 0;
  }
  return new Bitmap(out, width);
};

const scanY = (bitmap, x, sy, val) => {
  let y = sy;
  while (bitmap.get(x, y) !== val) {
    y++;
    if (y > bitmap.height) return null;
  }
  return y;
};

const scanX = (bitmap, sx, y, val) => {
  let x = sx;
  while (bitmap.get(x, y) !== val) {
    x++;
    if (x > bitmap.width) return null;
  }
  return x;
};

const unpackGlyphs = (bitmap) => {
  const glyphs = [];
  let cy = scanY(bitmap, 0, 0, 1);

  while (cy) {
    // find glyph metrics
    const top = cy;
    const bottom = scanY(bitmap, 0, top + 1, 0);
    const height = bottom - top;

    let cx = scanX(bitmap, 0, top - 2, 1);
    while (cx) {
      const left = cx;
      const right = scanX(bitmap, left + 1, top - 2, 0);
      const width = right - left;
      glyphs.push(bitmap.getRect(left, top, width, height));
      cx = scanX(bitmap, right + 1, top - 2, 1);
    }

    cy = scanY(bitmap, 0, bottom + 1, 1);
  }
  return glyphs;
};

const toCanvas = (bitmap, { scale = 1, palette = ["#000", "#fff"] } = {}) => {
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width * scale;
  canvas.height = bitmap.height * scale;
  const ctx = canvas.getContext("2d");
  for (let y = 0; y < bitmap.height; y++) {
    for (let x = 0; x < bitmap.width; x++) {
      ctx.fillStyle = palette[bitmap.get(x, y)];
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  return canvas;
};

const renderBitmap = (
  id,
  b,
  x,
  y,
  {
    palette = [
      [0, 0, 0, 0],
      [255, 255, 255, 255],
    ],
  } = {},
) => {
  const idWidth = id.width;
  const bWidth = b.width;
  for (let i = 0; i < b.array.length; i++) {
    const bx = i % bWidth;
    const by = (i / bWidth) | 0;
    const idx = ((y + by) * idWidth + (x + bx)) * 4;
    const color = palette[b.array[i]] || palette[0];
    id.data[idx] = color[0];
    id.data[idx + 1] = color[1];
    id.data[idx + 2] = color[2];
    id.data[idx + 3] = color[3];
  }
  return id;
};

const k1 = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];
const k2 = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
];
const k3 = [
  [-1, -2],
  [0, -2],
  [1, -2],
  [-2, -1],
  [-1, -1],
  [0, -1],
  [1, -1],
  [2, -1],
  [-2, 0],
  [-1, 0],
  [1, 0],
  [2, 0],
  [-2, 1],
  [-1, 1],
  [0, 1],
  [1, 1],
  [2, 1],
  [-1, 2],
  [0, 2],
  [1, 2],
];
const stroke = (id, { kernel = k1, color = [255, 255, 255, 255] } = {}) => {
  const { width, height, data } = id;
  const out = new ImageData(width, height);
  const outData = out.data;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      if (data[idx + 3] > 0) {
        outData[idx] = data[idx];
        outData[idx + 1] = data[idx + 1];
        outData[idx + 2] = data[idx + 2];
        outData[idx + 3] = data[idx + 3];
        continue;
      }
      let done = false;
      for (let i = 0; i < kernel.length && !done; i++) {
        const tx = x + kernel[i][0];
        const ty = y + kernel[i][1];
        if (tx < 0 || ty < 0 || tx >= width || ty >= height) continue;
        if (data[(ty * width + tx) * 4 + 3]) {
          outData[idx] = color[0];
          outData[idx + 1] = color[1];
          outData[idx + 2] = color[2];
          outData[idx + 3] = color[3];
          done = true;
        }
      }
    }
  }
  return out;
};

const mapGlyphs = (glyphs, mapping) => {
  const map = {};
  [...mapping].forEach((c, i) => (map[c] = glyphs[i]));
  return map;
};

const createFont = (
  img,
  repertoire,
  mapper,
  { defaultTracking = 1, defaultLeading = 2 } = {},
) => {
  console.log("creating font", img);
  const data = toImageData(img);
  const b = toBitmap(data);
  let glyphs;
  try {
    glyphs = unpackGlyphs(b);
  } catch (e) {
    document.body.append(toCanvas(b, { scale: 4 }));
    throw e;
  }
  const map = mapGlyphs(glyphs, repertoire);
  let height = 0;
  glyphs.forEach((g) => (height = Math.max(height, g.height)));

  return {
    defaultTracking,
    defaultLeading,
    height,
    repertoire,
    glyphs,
    bitmap: b,
    map: (char) => mapper(map, char),
  };
};

const isBreakableChar = (c) => /[^a-zA-Z0-9']/.test(c);

const layoutText = (
  text,
  font,
  { tracking = 1, leading = 2, maxWidth = Infinity, align = "left" } = {},
) => {
  const chars = [...text];
  let lineWidth = 0;
  let lines = [];
  let line = [];
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    const isBreakable = isBreakableChar(char);
    const isWhitespace = /\s/.test(char);
    const glyph = font.map(char);
    if (lineWidth + glyph.width > maxWidth) {
      let breakpoint = line.findLastIndex((o) => o.isBreakable);
      lines.push(line.slice(0, breakpoint + 1));
      line = line.slice(breakpoint + 1);
      while (line.length && line[0].isWhitespace) {
        line.shift();
      }
      lineWidth = line.reduce((w, o) => w + o.glyph.width + tracking, 0);
    }
    if (char === "\n") {
      lines.push(line);
      lineWidth = 0;
      line = [];
    }
    if (line.length > 0 || !isWhitespace) {
      line.push({ char, glyph, isBreakable, isWhitespace });
      lineWidth += glyph.width;
      lineWidth += tracking;
    }
  }
  lines.push(line);
  const placements = [];
  let x = 0;
  let y = 0;
  let width = -Infinity;
  let height = -Infinity;
  lines.forEach((line) => {
    x = 0;
    if (line.length) {
      while (line.at(-1).isWhitespace) {
        line.pop();
      }
      const totalWidth = line.reduce(
        (w, { glyph }) => w + glyph.width + tracking,
        0,
      );
      const diff = maxWidth - totalWidth;
      let offset = 0;
      if (align === "center") {
        offset = (diff / 2) | 0;
      } else if (align === "right") {
        offset = diff;
      }
      x += offset;
      line.forEach(({ glyph }) => {
        placements.push({
          x,
          y,
          glyph,
        });
        x += glyph.width + tracking;
        width = Math.max(width, x - tracking);
      });
    }
    y += font.height + leading;
    height = Math.max(height, y - leading);
  });
  return {
    placements,
    width,
    height,
  };
};

const renderLayout = (
  layout,
  { imageData, palette, width, height, offsetX = 0, offsetY = 0 } = {},
) => {
  width = width || layout.width;
  height = height || layout.height;
  if (!imageData) {
    imageData = new ImageData(width, height);
  }
  for (let i = 0; i < layout.placements.length; i++) {
    const p = layout.placements[i];
    renderBitmap(imageData, p.glyph, p.x + offsetX, p.y + offsetY, {
      palette,
    });
  }
  return imageData;
};

const passage = `

ABCDEFGHIJKLMNOPQRSTUVWXYZ
abcdefghijklmnopqrstuvwxyz
1234567890

The quick brown fox jumps over the lazy dog. Sphinx of black quartz: judge my vow! Fill my box with twelve liquor jugs?

Teenage Mutant
Ninja Turtles

Call me Ishmael. Some years ago-never mind how long precisely-having little or no money in my purse, and nothing particular to interest me on shore, I thought I would sail about a little and see the watery part of the world. It is a way I have of driving off the spleen and regulating the circulation. Whenever I find myself growing grim about the mouth; whenever it is a damp, drizzly November in my soul; whenever I find myself involuntarily pausing before coffin warehouses, and bringing up the rear of every funeral I meet; and especially whenever my hypos get such an upper hand of me, that it requires a strong moral principle to prevent me from deliberately stepping into the street, and methodically knocking people's hats off-then, I account it high time to get to sea as soon as I can. This is my substitute for pistol and ball. With a philosophical flourish Cato throws himself upon his sword; I quietly take to the ship. There is nothing surprising in this. If they but knew it, almost all men in their degree, some time or other, cherish very nearly the same feelings towards the ocean with me.

-Moby Dick, 1867`;

async function main() {
  const Remus = createFont(
    await loadImage("/remus-sans.png"),
    `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890.?!,;:'" -`,
    (map, c) => map[c] || map[" "],
  );

  const RemusBold = createFont(
    await loadImage("/Remus-Sans-Bold.png"),
    `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890.?!,;:'" -`,
    (map, c) => map[c] || map[" "],
  );

  const Pico = createFont(
    await loadImage("/pico-pica.png"),
    `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890.?!,;:'" -`,
    (map, c) => map[c] || map[" "],
  );

  const PicoRelaxed = createFont(
    await loadImage("/Pico-Relaxed.png"),
    `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890.?!,;:'" -`,
    (map, c) => map[c] || map[" "],
  );

  const PicoMidi = createFont(
    await loadImage("/Pico-Midi.png"),
    `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890.?!,;:'" -`,
    (map, c) => map[c] || map[" "],
  );

  const Glasgow = createFont(
    await loadImage("/Glasgow.png"),
    `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890.?!,;:'" -`,
    (map, c) => map[c] || map[" "],
  );

  const Almanac = createFont(
    await loadImage("/Almanac.png"),
    `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890.?!,;:'" -`,
    (map, c) => map[c] || map[" "],
  );

  const Expo = createFont(
    await loadImage("/Expo.png"),
    `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890.?!,;:'" -`,
    (map, c) => map[c] || map[" "],
  );

  const Chomnk = createFont(
    await loadImage("/Chomnk.png"),
    `ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890!?., -"'`,
    (map, c) => map[c.toUpperCase()] || map[" "],
    { defaultTracking: 1, defaultLeading: 4 },
  );

  const Spimndle = createFont(
    await loadImage("/Spimndle.png"),
    `ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890.?!,;:'" -`,
    (map, c) => map[c.toUpperCase()] || map[" "],
    { defaultTracking: 1, defaultLeading: 4 },
  );

  const Fivehead = createFont(
    await loadImage("/Fivehead.png"),
    `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890.?!,;:'" -`,
    (map, c) => map[c] || map[" "],
    { defaultTracking: 1, defaultLeading: 4 },
  );

  const Cush = createFont(
    await loadImage("/Cush.png"),
    `ABCDEFGHIJKLMNOPQRSTUVWXYZ .!?,:;'"-1234567890`,
    (map, c) => map[c.toUpperCase()] || map[" "],
    { defaultTracking: 2, defaultLeading: 4 },
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
      maxWidth: font.map("M").width * 36,
      leading: (font.defaultLeading * 1.6) | 0,
      tracking: font.defaultTracking,
      align: "left",
    });
    c.width = layout.width;
    c.height = layout.height;
    c.style.width = c.width * 2 + "px";
    c.style.aspectRatio = c.width + "/" + c.height;
    const ctx = c.getContext("2d");

    ctx.putImageData(
      renderLayout(layout, {
        palette: [
          [0, 0, 0, 0],
          [255, 255, 255, 255],
        ],
      }),
      0,
      0,
    );

    document.body.append(c);
  }

  Object.entries(fonts).forEach(([name, font]) => draw(font, name));

  function drawText(text, font, options = {}) {
    const c = document.createElement("canvas");
    const layout = layoutText(text, font, {
      maxWidth: options.maxWidth,
      leading: options.leading ?? font.defaultLeading,
      tracking: options.tracking ?? font.defaultTracking,
      align: options.align ?? "left",
    });
    c.width = layout.width;
    c.height = Math.ceil(layout.height);
    const ctx = c.getContext("2d");
    const palette = options.palette ?? [
      [0, 0, 0, 0],
      options.color ?? [255, 255, 255, 255],
    ];
    ctx.putImageData(
      renderLayout(layout, {
        palette,
      }),
      0,
      0,
    );
    return c;
  }

  (() => {
    const WIDTH = 128;

    // const header = outline(
    //   drawText("potch.me", Cush, {
    //     maxWidth: WIDTH,
    //     align: "center",
    //     color: [255, 192, 0, 255],
    //   }),
    //   2,
    //   [0, 0, 0, 255],
    //   false,
    // );
    const header = drawText("potch.me", Cush, {
      maxWidth: WIDTH,
      align: "center",
      color: [255, 192, 0, 255],
    });
    document.body.appendChild(header);
    header.style.border = "1px solid red";
    const title = drawText(
      "How I Learned To Stop Worrying And Love Pixels",
      Almanac,
      {
        maxWidth: WIDTH - 16,
      },
    );

    const today = drawText(
      new Intl.DateTimeFormat("en-GB", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(new Date()),
      PicoRelaxed,
      { maxWidth: 96, color: [0, 0, 0, 255] },
    );

    const tile = document.createElement("canvas");
    tile.width = WIDTH;
    tile.height = 96;
    tile.style.width = "512px";
    tile.style.aspectRatio = WIDTH + "/96";
    const tileCtx = tile.getContext("2d");

    const t = Tree.build(({ box, img }) =>
      box(
        {
          backgroundColor: "#088",
          direction: kDirectionVertical,
          hAlign: kAlignCenter,
          paddingTop: 6,
        },
        [
          img(header),
          box({ flex: 2 }),
          img(title),
          box({ flex: 3 }),
          box(
            {
              backgroundColor: "#ccc",
              border: [1, 0, 0, 0],
              borderColor: ["#000", "#000", "#000", "#000"],
              direction: kDirectionHorizontal,
              padding: [2, 2, 1, 3],
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

  // const el = document.createElement("div");
  // Object.assign(el.style, {
  //   display: "flex",
  //   flexDirection: "row",
  //   flexWrap: "wrap",
  //   gap: "4px",
  //   color: "#fff",
  //   textAlign: "center",
  // });
  // console.log(PicoRelaxed);
  // document.body.append(toCanvas(PicoRelaxed.bitmap, { scale: 6 }));
  // console.log(unpackGlyphs(PicoRelaxed.bitmap));
  // PicoRelaxed.repertoire.split("").forEach((c) => {
  //   const glyph = PicoRelaxed.map(c);
  //   const sample = document.createElement("div");
  //   sample.append(toCanvas(glyph, { scale: 6 }));
  //   sample.append(c);
  //   el.append(sample);
  // });
  // document.body.append(el);
}

main().catch((e) => console.error(e));
