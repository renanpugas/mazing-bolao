import { publicProcedure } from "../index";

export const sessionRouter = {
  get: publicProcedure.handler(({ context }) => {
    return context.session;
  }),
};
