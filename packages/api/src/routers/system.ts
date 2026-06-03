import { publicProcedure } from "../index";

export const systemRouter = {
  healthCheck: publicProcedure.handler(() => {
    return "OK";
  }),
};
