import  { PNG } from "pngjs";
import {
  createFont,
  layoutText,
  renderLayout,
  upperCaseMapper,
} from "./pxfont.js";
import { Bitmap, toCanvas, toImageData, toBitmap } from "./bitmap.js";
import {
  unpackShorthand,
  kAlignCenter,
  kAlignEnd,
  kDirectionHorizontal,
  kDirectionVertical,
  Tree,
  Box,
  Img,
} from "./playout.js";
import { writeFile, readFile } from "fs/promises";

const loadImage = async path => {
  const data = await readFile(path);
  return PNG.sync.read(data);
}

class BitmapBox extends Box {
  draw(bitmap, rect) {
    let props = this.properties;
    if (this.style) {
      props = { ...props, ...this.style };
    }

    const border = props.border ?? 0;
    const [borderTop, borderRight, borderBottom, borderLeft] = unpackShorthand(
      border,
      props.borderTop,
      props.borderRight,
      props.borderBottom,
      props.borderLeft,
    );

    this.rect = rect;

    if (props.backgroundColor) {
      const fillRect = border
        ? rect.insetBy(borderTop, borderRight, borderBottom, borderLeft)
        : rect;
      bitmap.setRect(
        fillRect.x,
        fillRect.y,
        fillRect.width,
        fillRect.height,
        props.backgroundColor,
      );
    }

    if (border) {
      const [colorTop, colorRight, colorBottom, colorLeft] = unpackShorthand(
        props.borderColor,
      );
      console.log("drawing border", {
        border,
        borderTop,
        borderRight,
        borderBottom,
        borderLeft,
        colorTop,
        colorRight,
        colorBottom,
        colorLeft,
      });
      if (borderTop > 0) {
        console.log("drawing top border", borderTop, colorTop);
        bitmap.setRect(rect.x, rect.y, rect.width, borderTop, colorTop);
        console.log(bitmap.get(rect.x, rect.y), colorTop);
      }
      if (borderRight > 0) {
        bitmap.setRect(
          rect.x + rect.width - borderRight,
          rect.y,
          borderRight,
          rect.height,
          colorRight,
        );
      }
      if (borderBottom > 0) {
        bitmap.setRect(
          rect.x,
          rect.y + rect.height - borderBottom,
          rect.width,
          borderBottom,
          colorBottom,
        );
      }
      if (borderLeft > 0) {
        bitmap.setRect(rect.x, rect.y, borderLeft, rect.height, colorLeft);
      }
    }

    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i];
      const drawRect = this.childRects[i].offsetBy(rect.x, rect.y);
      child.draw(bitmap, drawRect);
    }
  }
}

class BitmapImg extends Img {
  draw(bitmap, rect) {
    bitmap.putRect(rect.x, rect.y, this.img);
  }
}

class BitmapTree extends Tree {
  draw(bitmap) {
    if (!this.rect) {
      this.layout();
    }
    const rect = this.rect;
    this.root.draw(bitmap, rect);
    return bitmap;
  }

  static build(builder, options) {
    return new BitmapTree({
      ...options,
      root: builder({
        box: (...args) => new BitmapBox(...args),
        img: (...args) => new BitmapImg(...args),
      }),
    });
  }
}

const outline = (bitmap, size, bgColor, fgColor, color, rad = false) => {
  const isize = Math.ceil(size);
  const width = bitmap.width + isize * 2;
  const height = bitmap.height + isize * 2;
  const output = Bitmap.fromDimensions(width, height);
  output.setRect(0, 0, width, height, bgColor);
  output.putRect(isize, isize, bitmap);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      for (let dy = -isize; dy <= isize; dy++) {
        for (let dx = -isize; dx <= isize; dx++) {
          if (dx === 0 && dy === 0) continue;
          if (rad && Math.hypot(dx, dy) > size) continue;
          const tx = x + dx;
          const ty = y + dy;
          if (tx < 0 || ty < 0 || tx >= width || ty >= height) continue;
          if (output.get(tx, ty) === fgColor && output.get(x, y) === bgColor) {
            output.set(x, y, color);
            break;
          }
        }
      }
    }
  }
  return output;
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

const load = async (url) => toBitmap(await loadImage(url));

async function main() {
  const Remus = createFont(
    await load("./remus-sans.png"),
    `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890.?!,;:'" -`,
  );

  const RemusBold = createFont(
    await load("./Remus-Sans-Bold.png"),
    `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890.?!,;:'" -`,
  );

  const Pico = createFont(
    await load("./pico-pica.png"),
    `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890.?!,;:'" -`,
  );

  const PicoRelaxed = createFont(
    await load("./Pico-Relaxed.png"),
    `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890.?!,;:'" -`,
  );

  const PicoMidi = createFont(
    await load("./Pico-Midi.png"),
    `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890.?!,;:'" -`,
  );

  const Glasgow = createFont(
    await load("./Glasgow.png"),
    `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890.?!,;:'" -`,
  );

  const Almanac = createFont(
    await load("./Almanac.png"),
    `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890.?!,;:'" -`,
  );

  const Expo = createFont(
    await load("./Expo.png"),
    `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890.?!,;:'" -`,
  );

  const Chomnk = createFont(
    await load("./Chomnk.png"),
    `ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890!?., -"'`,
    { mapper: upperCaseMapper, defaultTracking: 1, defaultLeading: 4 },
  );

  const Spimndle = createFont(
    await load("./Spimndle.png"),
    `ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890.?!,;:'" -`,
    { mapper: upperCaseMapper, defaultTracking: 1, defaultLeading: 4 },
  );

  const Fivehead = createFont(
    await load("./Fivehead.png"),
    `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890.?!,;:'" -`,
    { defaultTracking: 1, defaultLeading: 4 },
  );

  const Cush = createFont(
    await load("./Cush.png"),
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

  function drawText(text, font, options = {}) {
    const layout = layoutText(text, font, {
      maxWidth: options.maxWidth,
      maxHeight: options.maxHeight ?? Infinity,
      leading: options.leading ?? font.defaultLeading,
      tracking: options.tracking ?? font.defaultTracking,
      align: options.align ?? "left",
      truncate: options.truncate ?? false,
    });
    const colorMap = options.colorMap ?? [0, 1];
    const bitmap =
      options.bitmap ?? Bitmap.fromDimensions(layout.width, layout.height);
    bitmap.setRect(0, 0, bitmap.width, bitmap.height, colorMap[0]);
    return renderLayout(layout, { remap: (v) => colorMap[v] ?? 0, bitmap });
  }

  const palette = [
    [0, 0, 0, 255],
    [255, 255, 255, 255],
    [0, 128, 128, 255],
    [255, 192, 0, 255],
    [128, 128, 128, 255],
    [192, 192, 192, 255],
  ];

  await (async () => {
    const WIDTH = 192;

    // const header = outline(
    //   drawText("potch dot me", Cush, {
    //     maxWidth: WIDTH,
    //     color: [255, 192, 0, 255],
    //   }),
    //   2.25,
    //   [0, 0, 0, 255],
    //   true,
    // );
    const header = outline(drawText("potch dot me", Cush, {
      maxWidth: WIDTH,
      colorMap: [2, 3],
    }), 2.25, 2, 3, 0, true);

    const titleText = `One of the first significant things I ever coded in QBasic was a falling snow simulation- I think they're very soothing to watch, fun to customize, and there's lots of possibilities for extra little delight. Here's one I built on idle afternoons over the holidays this year at my parents. Enjoy!`;
    const title = drawText(titleText, Almanac, {
      maxWidth: WIDTH - 24,
      maxHeight: 56,
      truncate: true,
      colorMap: [2, 1],
    });

    const today = drawText(
      new Intl.DateTimeFormat("en-GB", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(new Date()),
      PicoMidi,
      { maxWidth: 96, colorMap: [5, 0] },
    );

    // const tile = document.createElement("canvas");
    // tile.width = WIDTH;
    // tile.height = 144;
    // const tileCtx = tile.getContext("2d");
    const tile = Bitmap.fromDimensions(WIDTH, 144);

    const t = BitmapTree.build(({ box, img }) =>
      box(
        {
          backgroundColor: 2,
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
              colorMap: [2, 1],
            }),
          ),
          box({ flex: 2 }),
          img(title),
          box({ flex: 3 }),
          box(
            {
              backgroundColor: 5,
              border: [1, 0, 0, 0],
              borderColor: 0,
              direction: kDirectionHorizontal,
              padding: [3, 3, 2, 4],
              hAlign: kAlignEnd,
            },
            [
              box({ flex: 1 }),
              box(
                {
                  backgroundColor: 5,
                  padding: [3, 4, 2],
                  border: 1,
                  borderColor: [4, 1, 1, 4],
                },
                [img(today)],
              ),
            ],
          ),
        ],
      ),
    );

    t.layout({ maxWidth: tile.width, maxHeight: tile.height });
    // t.draw(tile.getContext("2d"));
    tile.setRect(0, 0, tile.width, tile.height, 2);
    t.draw(tile);

    const SCALE = 4;

    await writeFile("tile.ppm", tile.scale(4).toPPM(palette));

    // const scaled = createCanvas(tile.width * SCALE, tile.height * SCALE);
    // const scaledCtx = scaled.getContext("2d");
    // scaledCtx.imageSmoothingEnabled = false;
    // scaledCtx.drawImage(tile, 0, 0, scaled.width, scaled.height);

    // await writeFile("tile.png", scaled.toBuffer());
    console.log("done!");
  })();
}

main().catch((e) => console.error(e));
