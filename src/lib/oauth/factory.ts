import { IOAuthProvider } from "./types";
import { GoogleOAuthProvider } from "./providers/google.provider";
import { GithubOAuthProvider } from "./providers/github.provider";
import { MicrosoftOAuthProvider } from "./providers/microsoft.provider";

export class OAuthProviderFactory {
  static getProvider(providerName: string): IOAuthProvider {
    switch (providerName.toLowerCase()) {
      case "google":
      case "google_drive":
        return new GoogleOAuthProvider();
      case "github":
        return new GithubOAuthProvider();
      case "microsoft":
      case "onedrive":
        return new MicrosoftOAuthProvider();
      default:
        throw new Error(`Unsupported OAuth provider: ${providerName}`);
    }
  }
}
