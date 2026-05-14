import { Bitmap } from "./bitmap.js";

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

const mapGlyphs = (glyphs, mapping) => [...mapping].reduce((map, c, i) => ((map[c] = glyphs[i]), map), {});

const defaultMapper = (map, c) => map[c] || map[" "];
const upperCaseMapper = (map, c) => map[c.toUpperCase()] || map[" "];

const createFont = (
  bitmap,
  repertoire,
  { mapper = defaultMapper, defaultTracking = 1, defaultLeading = 2 } = {},
) => {
  const glyphs = unpackGlyphs(bitmap);
  const map = mapGlyphs(glyphs, repertoire);
  const height = glyphs.reduce((h, g) => Math.max(h, g.height), 0);

  return {
    defaultTracking,
    defaultLeading,
    height,
    repertoire,
    glyphs,
    bitmap,
    map: (char) => mapper(map, char),
  };
};

const isBreakableChar = (c) => /[^a-zA-Z0-9']/.test(c);

const getWidth = (line, tracking) =>
  line.reduce((w, s) => w + s.glyph.width, 0) + (line.length - 1) * tracking;
const getHeight = (lines, tracking, height = lines[0][0].glyph.height) =>
  lines.length * height + (lines.length - 1) * tracking;

const truncateX = (line, tracking, maxWidth, truncation) => {
  if (getWidth(line, tracking) + getWidth(truncation) > maxWidth) {
    while (
      getWidth(line, tracking) + getWidth(truncation, tracking) > maxWidth ||
      !line.at(-1).isWhitespace
    ) {
      line.pop();
    }
  }
  while (line.at(-1).isWhitespace) {
    line.pop();
  }
  line.push(...truncation);
};

const truncateY = (lines, tracking, maxHeight, truncation) => {
  const truncationHeight = getHeight([truncation], tracking);
  while (getHeight(lines, tracking) + truncationHeight > maxHeight) {
    lines.pop();
  }
  const lastLine = lines.at(-1);
  while (lastLine.length && lastLine.at(-1).isWhitespace) {
    lastLine.pop();
  }
};

const layoutText = (
  text,
  font,
  {
    tracking = 1,
    leading = 2,
    maxWidth = Infinity,
    maxHeight = Infinity,
    truncate = false,
    truncation = null,
    truncateText = "...",
    align = "left",
  } = {},
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
      lineWidth = getWidth(line, tracking);
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
  if (truncate && getHeight(lines, leading) > maxHeight) {
    if (!truncation) {
      truncation = [];
      for (let i = 0; i < 3; i++) {
        truncation.push({
          char: ".",
          glyph: font.map("."),
          isBreakable: false,
          isWhitespace: false,
        });
      }
    }
    truncateY(lines, leading, maxHeight, truncation);
    truncateX(lines.at(-1), tracking, maxWidth, truncation);
  }

  const placements = [];
  let x = 0;
  let y = 0;
  let width = -Infinity;
  let height = -Infinity;
  for (let line of lines) {
    x = 0;
    if (line.length) {
      while (line.at(-1).isWhitespace) {
        line.pop();
      }
      const totalWidth = line.reduce(
        (w, { glyph }) => w + glyph.width + tracking,
        -tracking,
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
  }
  return {
    placements,
    width,
    height,
  };
};

const renderLayout = (
  layout,
  { bitmap, remap, width, height, offsetX = 0, offsetY = 0 } = {},
) => {
  width = width || layout.width;
  height = height || layout.height;
  if (!bitmap) {
    bitmap = Bitmap.fromDimensions(width, height);
  }
  for (let i = 0; i < layout.placements.length; i++) {
    const p = layout.placements[i];
    bitmap.putRect(p.x + offsetX, p.y + offsetY, p.glyph, remap);
  }
  return bitmap;
};

export { createFont, defaultMapper, upperCaseMapper, layoutText, renderLayout, truncateX, truncateY };
