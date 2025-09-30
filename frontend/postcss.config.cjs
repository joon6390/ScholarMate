const tailwindcss = require("tailwindcss");
const autoprefixer = require("autoprefixer");
const postcssNesting = require("postcss-nesting");

module.exports = {
  plugins: [
    postcssNesting,   // ✅ 반드시 tailwindcss보다 먼저!
    tailwindcss,
    autoprefixer,
  ],
};
