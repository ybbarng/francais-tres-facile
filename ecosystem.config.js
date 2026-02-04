module.exports = {
  apps: [
    {
      name: "francais-tres-facile",
      script: "npm",
      args: "start",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
        PORT: 3101,
      },
    },
  ],
};
