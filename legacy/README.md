# border-bezier Legacy

The Legacy build is the original zero-tool version of border-bezier. It uses
plain CSS and classic JavaScript, exposes `window.BorderBezier`, and works when
opened directly through `file://`.

```html
<link rel="stylesheet" href="./border-bezier.css" />
<script defer src="./border-bezier.js"></script>

<div class="border-bezier">Smooth corner</div>
```

No server, Node.js, npm, bundler, or build step is required. Copy
`border-bezier.css` and `border-bezier.js` into any project. Open
`demo/index.html` with a double click to test it.

Both `.border-bezier` and `[data-border-bezier]` are supported. Configure the
shape with `--border-bezier` and `--border-bezier-smoothing`.

The classic global exposes the same mount, refresh, unmount, path, and dynamic
observer functions as the Modern build. It remains a single standalone script;
TypeScript and Node.js are not required.
