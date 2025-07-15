module.exports = api => {
  api.cache(true);

  const presets = [
    [
      '@babel/preset-env',
      {
        useBuiltIns: 'usage',
        corejs: 3,
        modules: false
      }
    ]
  ];
  const plugins = [
    [
      "@babel/plugin-transform-runtime",
      {
        corejs: 3
      }
    ],
    "@babel/plugin-proposal-class-properties"
  ];

  return {
    sourceType: 'unambiguous',
    presets,
    plugins,
  };
};
