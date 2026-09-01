import nextVitals from 'eslint-config-next/core-web-vitals';

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      ".next-e2e/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  ...nextVitals,
];

export default eslintConfig;
