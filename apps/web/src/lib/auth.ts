import { createAuthClient } from "better-auth/react";

import { serverUrl } from "@/lib/config";

export const authClient = createAuthClient({
  baseURL: serverUrl,
});
