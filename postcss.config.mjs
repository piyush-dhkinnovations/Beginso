const config = {
  plugins: {
    "@tailwindcss/postcss": {},
    // Text size (Settings > Appearance): the source stays in plain pixels (--space-1: 4px, min-h-[44px]); this step turns them into rem in the
    // built CSS (1rem = 16px, the browser's own default), so the root font size (html[data-text]) scales the whole signed-in app. At the Default size
    // 1rem is 16px and nothing changes. It must run after Tailwind so its arbitrary values and the design CSS are both converted. 1px hairlines are
    // left alone (minPixelValue 2) and so are media queries (the page's own breakpoints stay in real pixels).
    "postcss-pxtorem": {
      rootValue: 16,
      unitPrecision: 5,
      propList: ["*"],
      minPixelValue: 2,
      mediaQuery: false,
    },
  },
};

export default config;
