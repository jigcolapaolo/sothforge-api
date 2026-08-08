export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  //   database: {
  //     url: process.env.DATABASE_URL,
  //   },
  //   jwt: {
  //     secret: process.env.JWT_SECRET,
  //   },
});
