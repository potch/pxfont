// simple canvas layout

class Rect {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  offset(dx, dy) {
    this.x += dx;
    this.y += dy;
  }

  offsetBy(dx, dy) {
    return new Rect(this.x + dx, this.y + dy, this.width, this.height);
  }

  inset(dx, dy = dx, dx2 = dx, dy2 = dy) {
    this.x += dx;
    this.y += dy;
    this.width -= dx - dx2;
    this.height -= dy - dy2;
  }

  insetBy(dx, dy = dx, dx2 = dx, dy2 = dy) {
    return new Rect(
      this.x + dx,
      this.y + dy,
      this.width - dx - dx2,
      this.height - dy - dy2,
    );
  }

  fill(ctx, color) {
    ctx.save();
    ctx.beginPath();
    if (color) {
      ctx.fillStyle = color;
    }
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.restore();
  }

  fillRounded(ctx, radius, color) {
    ctx.save();
    ctx.beginPath();
    if (color) {
      ctx.fillStyle = color;
    }
    ctx.roundRect(this.x, this.y, this.width, this.height, radius);
    ctx.fill();
    ctx.restore();
  }
}

function inheritProperty(name, node, fallback) {
  let cursor = node;
  let value;
  let style;
  do {
    style = cursor.properties.style ?? {};
    value = style[name] ?? cursor.properties[name];
    cursor = cursor.parent;
  } while (cursor && !value);
  return value ?? fallback;
}

function strokeOffsets(radius) {
  let offsets = [];
  for (let x = -radius; x <= radius; x++) {
    for (let y = -radius; y <= radius; y++) {
      if (Math.hypot(x, y) <= radius) {
        offsets.push([x, y]);
      }
    }
  }
  return offsets;
}

const kDirectionVertical = 1;
const kDirectionHorizontal = 2;

const kAlignStart = 1;
const kAlignCenter = 2;
const kAlignEnd = 3;
const kAlignStretch = 4;

const kAnchorTopLeft = 1;
const kAnchorTopCenter = 2;
const kAnchorTopRight = 3;
const kAnchorCenterLeft = 4;
const kAnchorCenter = 5;
const kAnchorCenterRight = 6;
const kAnchorBottomLeft = 7;
const kAnchorBottomCenter = 8;
const kAnchorBottomRight = 9;

const defaultBoxProperties = {
  minWidth: 1,
  minHeight: 1,
  maxWidth: Infinity,
  maxHeight: Infinity,
  width: null,
  height: null,
  scroll: false,
  direction: kDirectionVertical,
  padding: 0,
  paddingTop: null,
  paddingLeft: null,
  paddingRight: null,
  paddingBottom: null,
  backgroundColor: null,
  backgroundAlpha: null,
  nineSlice: null,
  hAlign: kAlignCenter,
  vAlign: kAlignCenter,
  selfAlign: null,
  border: 0,
  borderTop: null,
  borderLeft: null,
  borderRight: null,
  borderBottom: null,
  borderColor: "#000",
  borderRadius: 0,
  spacing: 0,
  font: null,
  fontFamily: null,
  flex: null,
  shadow: null,
  shadowAlpha: 0,
};

const defaultDrawContext = {
  maxWidth: Infinity,
  maxHeight: Infinity,
};

// flexboxy-thing
class box {
  constructor(properties = {}, children = []) {
    Object.assign(this, {
      properties: { ...defaultBoxProperties, ...properties },
      children,
      childRects: null,
      parents: null,
      scrollPos: 0,
      style: properties.style ?? null,
    });
  }

  appendChild(child) {
    this.children.append(child);
    child.parent = self;
  }

  insertChild(position, child) {
    this.children.splice(position, 0, child);
    child.parent = self;
  }

  layout(context = {}) {
    context = { ...defaultDrawContext, ...context };

    const props = this.properties;
    const constrainedWidth = Math.min(
      context.maxWidth,
      props.width ?? props.maxWidth,
    );
    const constrainedHeight = Math.min(
      context.maxHeight,
      props.height ?? props.maxHeight,
    );

    console.log(
      "box layout",
      context,
      props,
      constrainedWidth,
      constrainedHeight,
    );

    const isVertical = props.direction == kDirectionVertical;
    const children = this.children;

    if (props.scroll) {
      if (isVertical) {
        constrainedHeight = Infinity;
      } else {
        constrainedWidth = Infinity;
      }
    }

    // compute padding from shorthands
    const paddingTop = props.paddingTop ?? props.padding;
    const paddingLeft = props.paddingLeft ?? props.padding;
    const paddingRight =
      props.paddingRight ?? props.paddingLeft ?? props.padding;
    const paddingBottom =
      props.paddingBottom ?? props.paddingTop ?? props.padding;
    const shadow = props.shadow ?? 0;

    const availableWidth = constrainedWidth - paddingLeft - paddingRight;
    const availableHeight =
      constrainedHeight - paddingTop - paddingBottom - shadow;

    let childRects = [];
    this.childRects = childRects;
    let child;
    let childFlex;
    let remainingHeight = availableHeight;
    let remainingWidth = availableWidth;
    let intrinsicWidth = 0;
    let intrinsicHeight = 0;
    let totalFlex = 0;

    // calculate intrinsic size
    for (let i = 0; i < children.length; i++) {
      if (i > 0) {
        if (isVertical) {
          remainingHeight -= props.spacing;
          intrinsicHeight += props.spacing;
        } else {
          remainingWidth -= props.spacing;
          intrinsicWidth += props.spacing;
        }
      }
      childFlex = null;
      child = children[i];
      // determine intrinsic size of child node
      let childRect = child.layout({
        maxWidth: remainingWidth,
        maxHeight: remainingHeight,
        path: context.path + "." + (child.properties.id ?? i),
      });
      // accumulate flex if specified
      childFlex = child.properties.flex;
      childRects[i] = childRect;
      if (childFlex) {
        totalFlex += child.properties.flex;
      }
      if (isVertical) {
        // if (!childFlex) {
        remainingHeight -= childRect.height;
        // }
        intrinsicHeight += childRect.height;
        intrinsicWidth = Math.max(intrinsicWidth, childRect.width);
      } else {
        // if (!childFlex) {
        remainingWidth -= childRect.width;
        // }
        intrinsicWidth += childRect.width;
        intrinsicHeight = Math.max(intrinsicHeight, childRect.height);
      }
    }

    let actualWidth = constrainedWidth;
    let actualHeight = constrainedHeight;
    if (!props.width) {
      if (!isVertical && totalFlex > 0) {
        actualWidth = constrainedWidth;
      } else {
        actualWidth = Math.max(
          props.minWidth,
          Math.min(intrinsicWidth + paddingLeft + paddingRight, props.maxWidth),
        );
        remainingWidth = 0;
      }
    }
    if (!props.height) {
      if (isVertical && totalFlex > 0) {
        actualHeight = constrainedHeight;
      } else {
        actualHeight = Math.max(
          props.minHeight,
          Math.min(
            intrinsicHeight + paddingTop + paddingBottom + shadow,
            props.maxHeight,
          ),
        );
        remainingHeight = 0;
      }
    }

    let rect = new Rect(
      0,
      0,
      Math.floor(actualWidth),
      Math.floor(actualHeight),
    );
    let innerWidth = actualWidth - paddingLeft - paddingRight;
    let innerHeight = actualHeight - paddingTop - paddingBottom - shadow;

    console.log("rect is", {
      actualWidth,
      actualHeight,
      innerWidth,
      innerHeight,
    });

    console.log("align", props.hAlign, props.vAlign);

    let x, y, childProps, align, flexRatio;

    // set initial layout position
    if (isVertical) {
      y = paddingTop;
      if (totalFlex == 0) {
        if (props.vAlign == kAlignCenter)
          y = y + Math.floor(remainingHeight / 2);
        if (props.vAlign == kAlignEnd) y = y + remainingHeight;
      }
    } else {
      x = paddingLeft;
      if (totalFlex == 0) {
        if (props.hAlign == kAlignCenter)
          x = x + Math.floor(remainingWidth / 2);
        if (props.hAlign == kAlignEnd) x = x + remainingWidth;
      }
    }

    console.log("cr", childRects);

    let remainingFlex = totalFlex;

    for (let i = 0; i < childRects.length; i++) {
      child = childRects[i];
      childProps = children[i].properties ?? {};
      childFlex = childProps.flex;

      let align;

      if (isVertical) {
        x = paddingLeft;
        align = childProps.selfAlign ?? props.hAlign;
        if (align == kAlignCenter)
          x = x + Math.floor(innerWidth - child.width) / 2;
        if (align == kAlignEnd) x = x + innerWidth - child.width;
      } else {
        y = paddingTop;
        align = childProps.selfAlign ?? props.vAlign;
        if (align == kAlignCenter)
          y = y + Math.floor(innerHeight - child.height) / 2;
        if (align == kAlignEnd) y = y + innerHeight - child.height;
      }

      console.log("child layout position", x, y);

      // generate final layout rect for child node
      if (childFlex) {
        remainingFlex -= childFlex;
        flexRatio = childFlex / totalFlex;
        if (isVertical) {
          if (align == kAlignStretch) {
            childRects[i] = new Rect(
              x,
              y,
              innerWidth,
              Math.floor(flexRatio * remainingHeight),
            );
          } else {
            childRects[i] = new Rect(
              x,
              y,
              child.width,
              Math.floor(flexRatio * remainingHeight),
            );
          }
        } else {
          if (align == kAlignStretch) {
            childRects[i] = new Rect(
              x,
              y,
              Math.floor(flexRatio * remainingWidth),
              innerHeight,
            );
          } else {
            childRects[i] = new Rect(
              x,
              y,
              Math.floor(flexRatio * remainingWidth),
              child.height,
            );
          }
        }
        child = childRects[i];
      } else {
        if (align == kAlignStretch) {
          if (isVertical) {
            child.width = innerWidth;
          } else {
            child.height = innerHeight;
          }
        }
        child.offset(Math.floor(x), Math.floor(y));
      }

      // move positioning cursor to next position
      if (isVertical) {
        y = y + child.height + props.spacing;
      } else {
        x = x + child.width + props.spacing;
      }
    }

    return rect;
  }

  draw(ctx, rect) {
    let props = this.properties;
    if (this.style) {
      props = { ...props, ...this.style };
    }
    let border = props.border ?? 0;
    let borderTop = props.borderTop ?? border;
    let borderBottom = props.borderBottom ?? borderTop;
    let borderLeft = props.borderLeft ?? border;
    let borderRight = props.borderRight ?? borderLeft;

    console.log("bt", props.borderTop);
    console.log("borders", borderTop, borderRight, borderBottom, borderLeft);

    this.rect = rect;

    if (border > 0) {
      if (props.borderRadius) {
        rect.fillRounded(ctx, props.borderRadius, props.borderColor);
      } else {
        rect.fill(ctx, props.borderColor);
      }
    }

    if (props.backgroundColor) {
      const fillRect = border
        ? rect.insetBy(borderLeft, borderTop, borderTop, borderBottom)
        : rect;
      console.log("filling bg", props.backgroundColor, fillRect);
      if (props.borderRadius) {
        fillRect.fillRounded(ctx, props.borderRadius, props.backgroundColor);
      } else {
        fillRect.fill(ctx, props.backgroundColor);
      }
    }

    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i];
      const drawRect = this.childRects[i].offsetBy(rect.x, rect.y);
      child.draw(ctx, drawRect);
    }
  }
}

class image {
  constructor(img, properties = {}) {
    Object.assign(this, {
      img,
      properties,
      parent: null,
      width: img.width,
      height: img.height,
    });
  }

  layout(context) {
    return new Rect(0, 0, this.width, this.height);
  }

  draw(ctx, rect) {
    this.rect = rect;
    ctx.drawImage(this.img, rect.x, rect.y);
  }
}

class tree {
  constructor(options) {
    Object.assign(this, {
      root: options.root ?? new box(),
      rect: null,
      canvas: options.canvas ?? null,
      tabIndex: null,
    });
    if (options.useCache) {
      options.cache = {};
    }

    const walk = (node) => {
      if (node.children) {
        for (const child of node.children) {
          child.parent = node;
          walk(child);
        }
      }
    };

    walk(this.root);
  }

  layout({ maxWidth = Infinity, maxHeight = Infinity } = {}) {
    this.rect = this.root.layout({
      maxWidth,
      maxHeight,
      tree: this,
      path: "root",
    });
  }

  draw() {
    if (!this.rect) {
      this.layout();
    }
    const rect = this.rect;
    if (this.canvas) {
      if (this.canvas.width !== rect.width) {
        this.canvas.width = rect.width;
      }
      if (this.canvas.height !== rect.height) {
        this.canvas.height = rect.height;
      }
    } else {
      this.canvas = createCanvas(rect.width, rect.height);
    }
    const ctx = this.canvas.getContext("2d");
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.save();
    this.root.draw(ctx, rect);
    ctx.restore();
    return this.canvas;
  }

  static build(builder, options) {
    return new tree({
      ...options,
      root: builder({
        box: (...args) => new box(...args),
        image: (...args) => new image(...args),
      }),
    });
  }
}

function getRectAnchor(r, anchor) {
  const p = (x, y) => ({
    x,
    y,
  });
  const cx = r.x + r.width / 2;
  const cy = r.y + r.height / 2;

  if (anchor == kAnchorTopLeft) return p(r.left, r.top);
  if (anchor == kAnchorTopCenter) return p(cx, r.top);
  if (anchor == kAnchorTopRight) return p(r.right, r.top);
  if (anchor == kAnchorCenterLeft) return p(r.left, cy);
  if (anchor == kAnchorCenter) return p(cx, cy);
  if (anchor == kAnchorCenterRight) return p(r.right, cy);
  if (anchor == kAnchorBottomLeft) return p(r.left, r.bottom);
  if (anchor == kAnchorBottomCenter) return p(cx, r.bottom);
  if (anchor == kAnchorBottomRight) return p(r.right, r.bottom);
  return p(cx, cy);
}

export {
  box,
  image,
  tree,
  kDirectionHorizontal,
  kDirectionVertical,
  kAlignStart,
  kAlignCenter,
  kAlignEnd,
  kAlignStretch,
  getRectAnchor,
  kAnchorTopLeft,
  kAnchorTopCenter,
  kAnchorTopRight,
  kAnchorCenterLeft,
  kAnchorCenter,
  kAnchorCenterRight,
  kAnchorBottomLeft,
  kAnchorBottomCenter,
  kAnchorBottomRight,
};
