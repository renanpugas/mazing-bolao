import { authClient } from "@/lib/auth";

const resolveCallbackUrl = (callbackURL: string) => {
  if (!callbackURL.startsWith("/")) return callbackURL;
  return new URL(callbackURL, window.location.origin).toString();
};

export const useAuthApi = () => {
  const signInWithGoogle = (callbackURL = "/", onError?: (error: any) => void) => {
    return authClient.signIn.social(
      {
        provider: "google",
        callbackURL: resolveCallbackUrl(callbackURL),
      },
      { onError },
    );
  };

  const signOut = (onSuccess?: () => Promise<void> | void, onError?: (error: any) => void) => {
    return authClient.signOut({
      fetchOptions: {
        onSuccess,
        onError,
      },
    });
  };

  return { signInWithGoogle, signOut, useSession: authClient.useSession };
};
