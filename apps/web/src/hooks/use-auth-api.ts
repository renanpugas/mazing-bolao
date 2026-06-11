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

  const signInWithEmail = async (input: { email: string; password: string; callbackURL?: string }) => {
    const { data, error } = await authClient.signIn.email({
      email: input.email,
      password: input.password,
      callbackURL: resolveCallbackUrl(input.callbackURL ?? "/"),
    });

    if (error) {
      throw new Error(error.message || "Não foi possível entrar.");
    }

    return data;
  };

  const signUpWithEmail = async (input: { name: string; email: string; password: string; callbackURL?: string }) => {
    const { data, error } = await authClient.signUp.email({
      name: input.name,
      email: input.email,
      password: input.password,
      callbackURL: resolveCallbackUrl(input.callbackURL ?? "/"),
    });

    if (error) {
      throw new Error(error.message || "Não foi possível criar a conta.");
    }

    return data;
  };

  const signOut = (onSuccess?: () => Promise<void> | void, onError?: (error: any) => void) => {
    return authClient.signOut({
      fetchOptions: {
        onSuccess,
        onError,
      },
    });
  };

  return { signInWithGoogle, signInWithEmail, signUpWithEmail, signOut, useSession: authClient.useSession };
};
