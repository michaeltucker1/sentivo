import http from 'http';
import keytar from 'keytar';
import crypto from 'crypto';
import { shell, app } from 'electron';
import { generateCodeVerifier, generateCodeChallenge } from "../../utils/auth.js";
import { GoogleDriveIndexer } from './googleDriveIndexer.js';

type Tokens = {
  access_token: string;
  refresh_token?: string;
  expires_at?: number; 
  token_type?: string;
};

const KEYTAR_SERVICE = "Sentivo";
const KEYTAR_ACCOUNT = "google-oauth";

export class GoogleAuth {
  private clientId: string;
  private clientSecret: string;
  private tokens: Tokens | null = null;
  private codeVerifier = "";

  constructor(clientId: string, clientSecret: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  /** Public: start the sign in flow — opens system browser and completes automatically */
  public async signIn(): Promise<void> {
    // Create PKCE + state
    this.codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(this.codeVerifier);
    const state = crypto.randomBytes(16).toString("hex");

    // Start a HTTP server
    const authCode = await this.startLoopbackAndGetCode({ codeChallenge, state });

    // Exchange the code for tokens
    await this.exchangeCodeForTokens(authCode.code, authCode.redirectUri);

    const indexer = new GoogleDriveIndexer();
  
    indexer.startIndexing().then(() => indexer.pollIncrementalChanges())
    
    indexer.on("progress", (p) => {
      console.log("Indexed files:", p.indexed, "Page token:", p.lastPageToken);
    });
  
  }

  /** Return a valid access token (refreshes automatically if expired) */
  public async getAccessToken(): Promise<string | null> {
    try {
      if (!this.tokens) {
        await this.loadTokens();
      }
      
      if (!this.tokens) {
        console.log('No tokens available, user needs to sign in');
        return null;
      }

      const now = Date.now();
      const isExpired = !this.tokens.expires_at || now >= this.tokens.expires_at - 30_000; // 30s buffer
      
      if (isExpired && this.tokens.refresh_token) {
        console.log('Access token expired, attempting to refresh...');
        try {
          await this.refreshAccessToken();
          await this.loadTokens(); // Reload tokens after refresh
        } catch (error) {
          console.error('Failed to refresh token:', error);
          // Clear invalid tokens
          this.tokens = null;
          await keytar.deletePassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT);
          return null;
        }
      }
      
      if (!this.tokens?.access_token) {
        console.error('No valid access token available');
        return null;
      }
      
      console.log('Returning valid access token');
      return this.tokens.access_token;
    } catch (error) {
      console.error('Error in getAccessToken:', error);
      return null;
    }
  }

  public async signOut(): Promise<void> {
    if (!this.tokens) await this.loadTokens();
    if (this.tokens?.refresh_token) {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${this.tokens.refresh_token}`, {
        method: "POST",
      });
    }
    await keytar.deletePassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT);
    this.tokens = null;
  }

  /* -------------------------- internal helpers ------------------------- */

  private startLoopbackAndGetCode(opts: { codeChallenge: string; state: string; }): Promise<{ code: string; redirectUri: string }> {
    const { codeChallenge, state } = opts;

    return new Promise((resolve, reject) => {
      const server = http.createServer();
      let redirectUri = "";

      // safety timeout
      const timeoutMs = 2 * 60_000; // 2 minutes
      const timeout = setTimeout(() => {
        try { server.close(); } catch {}
        reject(new Error("Timeout waiting for OAuth callback"));
      }, timeoutMs);

      server.on("request", (req: http.IncomingMessage, res: http.ServerResponse) => {
        try {
          const reqUrl = new URL(req.url ?? "", `http://127.0.0.1`);
          // handle only expected path
          if (reqUrl.pathname !== "/callback") {
            res.writeHead(404);
            res.end();
            return;
          }

          const code = reqUrl.searchParams.get("code");
          const incomingState = reqUrl.searchParams.get("state");
          const error = reqUrl.searchParams.get("error");

          // send a small HTML response the user sees in browser
          res.writeHead(200, { "Content-Type": "text/html" });
          if (code && incomingState === state) {
            res.end(`<html><body><h2>Authentication complete</h2><p>You can close this window and return to the app.</p></body></html>`);
            clearTimeout(timeout);
            server.close();
            if (code) resolve({ code, redirectUri });
            else reject(new Error("No code in callback"));
          } else {
            res.end(`<html><body><h2>Authentication failed</h2><p>${error ?? "Invalid state or missing code"}</p></body></html>`);
            clearTimeout(timeout);
            server.close();
            reject(new Error(error ?? "Invalid state or missing code"));
          }
        } catch (err) {
          clearTimeout(timeout);
          server.close();
          reject(err);
        }
      });

      // listen on 127.0.0.1 on ephemeral port (0 -> OS chooses free port)
      server.listen(0, "127.0.0.1", () => {
        const address = server.address();
        if (!address || typeof address === "string") {
          clearTimeout(timeout);
          server.close();
          return reject(new Error("Failed to get server address"));
        }
        const port = address.port;
        redirectUri = `http://127.0.0.1:${port}/callback`;

        // build auth url with PKCE & state & offline access for refresh token
        const params = new URLSearchParams({
          client_id: this.clientId,
          redirect_uri: redirectUri,
          response_type: "code",
          scope: [
            'https://www.googleapis.com/auth/drive.metadata.readonly',
          ].join(' '),
          access_type: "offline", // ask for refresh token
          prompt: "consent",      // force showing consent to obtain refresh token reliably
          code_challenge: codeChallenge,
          code_challenge_method: "S256",
          state,
        });

        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

        // open system browser
        shell.openExternal(authUrl);
      });
    });
  }

  private async exchangeCodeForTokens(code: string, redirectUri: string): Promise<void> {
    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code,
      code_verifier: this.codeVerifier,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });

    const resp = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    const data = await resp.json();
    if (data.error) throw new Error(`Token exchange failed: ${JSON.stringify(data)}`);

    this.tokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + (data.expires_in ? data.expires_in * 1000 : 0),
      token_type: data.token_type,
    };

    await keytar.setPassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT, JSON.stringify(this.tokens));
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.tokens?.refresh_token) throw new Error("No refresh token available");
    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: "refresh_token",
      refresh_token: this.tokens.refresh_token,
    });

    const resp = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    const data = await resp.json();
    if (data.error) {
      // If refresh fails with invalid_grant — the refresh token was revoked; clear state and require sign in again
      if (data.error === "invalid_grant") {
        await keytar.deletePassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT);
        this.tokens = null;
      }
      throw new Error(`Refresh failed: ${JSON.stringify(data)}`);
    }

    this.tokens = {
      ...this.tokens!,
      access_token: data.access_token,
      expires_at: Date.now() + (data.expires_in ? data.expires_in * 1000 : 0),
    };
    await keytar.setPassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT, JSON.stringify(this.tokens));
  }

  private async loadTokens(): Promise<void> {
    const saved = await keytar.getPassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT);
    if (!saved) return;
    try {
      this.tokens = JSON.parse(saved) as Tokens;
    } catch {
      this.tokens = null;
    }
  }
}
