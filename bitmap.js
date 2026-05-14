// indexed-color bitmap
export class Bitmap {
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
  // get bitmap from sub-rect of this bitmap
  getRect(x, y, width, height) {
    const array = new this.array.constructor(width * height);
    for (let sy = 0; sy < height; sy++) {
      for (let sx = 0; sx < width; sx++) {
        array[sy * width + sx] = this.get(x + sx, y + sy);
      }
    }
    return new Bitmap(array, width);
  }
  // blit another bitmap into this one
  putRect(dx, dy, bitmap) {
    const array = this.array;
    const { width, height } = bitmap;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        array[(dy + y) * this.width + (dx + x)] = bitmap.get(x, y);
      }
    }
  }
  // nearest-neighbor scale
  scale(sx, sy = sx) {
    const bitmap = Bitmap.fromDimensions(this.width * sx, this.height * sy);
    const { width, height } = bitmap;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        bitmap.set(x, y, this.get((x / sx) | 0, (y / sy) | 0));
      }
    }
    return bitmap;
  }
  toImageData(palette) {
    const { width, height, array } = this;
    const id = new ImageData(width, height);
    for (let i = 0; i < array.length; i++) {
      const x = i % width;
      const y = (i / width) | 0;
      const idx = (y * width + x) * 4;
      const color = palette[array[i]] ?? palette[0];
      id.data[idx] = color[0];
      id.data[idx + 1] = color[1];
      id.data[idx + 2] = color[2];
      id.data[idx + 3] = color[3];
    }
    return id;
  }

  toPPM(palette) {
    let data = ["P3", this.width + " " + this.height, 255];
    for (let i = 0; i < this.array.length; i++) {
      data.push(palette[this.array[i] ?? palette[0]].join(" "));
    }
    return data.join("\n");
  }

  static fromDimensions(width, height, constructor = Uint8ClampedArray) {
    return new Bitmap(new constructor(width * height), width);
  }
}

export const toBitmap = (id, { useThreshold = true, threshold = 128 } = {}) => {
  const { width, height } = id;
  const out = new Uint8ClampedArray(width * height);
  const knownColors = new Map();
  const colorKey = (r, g, b, a) => (r << 6) + (g << 4) + (b << 2) + a;
  let paletteId = 0;
  for (let i = 0; i < out.length; i++) {
    const idx = i * 4;
    if (useThreshold) {
      // assume black and white, use red channel for thresholding
      out[i] = id.data[idx] < threshold ? 1 : 0;
    } else {
      const r = id.data[idx];
      const g = id.data[idx + 1];
      const b = id.data[idx + 2];
      const a = id.data[idx + 3];
      const key = (r << 6) + (g << 4) + (b << 2) + a;
      if (!knownColors.has(key)) {
        knownColors.set(key, paletteId);
        paletteId++;
      }
      out[i] = knownColors.get(key);
    }
  }
  return new Bitmap(out, width);
};

export const toCanvas = (
  bitmap,
  {
    scale = 1,
    palette = [
      [0, 0, 0, 255],
      [255, 255, 255, 255],
    ],
  } = {},
) => {
  const id = bitmap.scale(scale).toImageData(palette);
  const canvas = document.createElement("canvas");
  canvas.width = id.width;
  canvas.height = id.height;
  canvas.getContext("2d").putImageData(id, 0, 0);
  return canvas;
};

export const toImageData = (img) => {
  const canvas = document.createElement("canvas");
  const { width, height } = img;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, width, height);
};
