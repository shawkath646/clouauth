import { IOAuthProvider } from "./types";
import { GoogleOAuthProvider } from "./providers/google.provider";
import { GithubOAuthProvider } from "./providers/github.provider";
import { MicrosoftOAuthProvider } from "./providers/microsoft.provider";
import { DropboxOAuthProvider } from "./providers/dropbox.provider";

export class OAuthProviderFactory {
  static getProvider(providerName: string): IOAuthProvider {
    switch (providerName.toLowerCase()) {
      case "google":
        return new GoogleOAuthProvider(false);
      case "google_drive":
        return new GoogleOAuthProvider(true);
      case "github":
        return new GithubOAuthProvider();
      case "microsoft":
        return new MicrosoftOAuthProvider(false);
      case "onedrive":
        return new MicrosoftOAuthProvider(true);
      case "dropbox":
        return new DropboxOAuthProvider();
      default:
        throw new Error(`Unsupported OAuth provider: ${providerName}`);
    }
  }
}
