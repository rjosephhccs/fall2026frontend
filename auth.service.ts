import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, tap } from 'rxjs';

interface LoginResponse {
  token?: string;
  accessToken?: string;
  access_token?: string;
  jwt?: string;
}

export interface AuthSession {
  token: string;
  username: string;
  role: string;
  expiresAt: number;
}

const SESSION_KEY = 'inventory-auth-session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  login(username: string, password: string): Observable<AuthSession> {
    return this.http.post<LoginResponse>('/auth/login', { username, password }).pipe(
      map(response => {
        const token = response.token ?? response.accessToken ?? response.access_token ?? response.jwt;
        if (!token) throw new Error('Login response did not contain a JWT token. Check your Spring Boot response field.');
        const payload = this.readClaims(token);
        const expiresAt = Number(payload['exp']);
        if (!Number.isFinite(expiresAt) || expiresAt * 1000 <= Date.now()) {
          throw new Error('The login token has no valid expiration or is already expired.');
        }
        const roleClaim = payload['role'] ?? payload['roles'] ?? payload['authorities'];
        const role = Array.isArray(roleClaim) ? String(roleClaim[0] ?? '') : String(roleClaim ?? '');
        return { token, username: String(payload['sub'] ?? username), role, expiresAt };
      }),
      tap(session => sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)))
    );
  }

  get session(): AuthSession | null {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw) as AuthSession;
      if (!session.token || !Number.isFinite(session.expiresAt) || session.expiresAt * 1000 <= Date.now()) {
        this.logout();
        return null;
      }
      return session;
    } catch {
      this.logout();
      return null;
    }
  }

  logout(): void { sessionStorage.removeItem(SESSION_KEY); }

  // This is for UI display only. FastAPI must validate the signature, issuer,
  // expiry and role independently on every protected request.
  private readClaims(token: string): Record<string, unknown> {
    const part = token.split('.')[1];
    if (!part) throw new Error('Spring Boot returned an invalid JWT.');
    try {
      const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')));
    } catch {
      throw new Error('Could not read the JWT claims returned by Spring Boot.');
    }
  }
}
