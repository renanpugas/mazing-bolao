export const useAuthApi = () => {
  const { $authClient } = useNuxtApp();

  const resolveCallbackUrl = (callbackURL: string) => {
    if (!callbackURL.startsWith("/")) return callbackURL;
    if (import.meta.client) {
      return new URL(callbackURL, window.location.origin).toString();
    }
    return callbackURL;
  };

  const signInWithGoogle = (callbackURL = "/dashboard", onError?: (error: any) => void) => {
    return $authClient.signIn.social(
      {
        provider: "google",
        callbackURL: resolveCallbackUrl(callbackURL),
      },
      {
        onError,
      },
    );
  };

  const signOut = (onSuccess?: () => Promise<void> | void, onError?: (error: any) => void) => {
    return $authClient.signOut({
      fetchOptions: {
        onSuccess,
        onError,
      },
    });
  };

  const useSession = () => $authClient.useSession();

  return {
    signInWithGoogle,
    signOut,
    useSession,
  };
};
