import type { AppRouterClient } from "@mazing-bolao/api/routers/index";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";

import { serverUrl } from "@/lib/config";

const rpcLink = new RPCLink({
  url: `${serverUrl}/rpc`,
  fetch(url, options) {
    return fetch(url, {
      ...options,
      credentials: "include",
    });
  },
});

const client: AppRouterClient = createORPCClient(rpcLink);

export const orpc = createTanstackQueryUtils(client);
