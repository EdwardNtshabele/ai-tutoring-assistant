import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environment';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  avatar?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {

  private apiUrl = environment.apiUrl;

  // BehaviorSubject so any component can subscribe to the current user
  private userSubject = new BehaviorSubject<AuthUser | null>(this.loadFromStorage());
  user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {}

  // ── Getters ──────────────────────────────────────────────────────

  get currentUser(): AuthUser | null {
    return this.userSubject.value;
  }

  get userId(): number {
    return this.userSubject.value?.id ?? 1;
  }

  get isLoggedIn(): boolean {
    return this.userSubject.value !== null;
  }

  // ── Username / Password login ────────────────────────────────────

  login(username: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/login.php`, { username, password });
  }

  // ── Register ─────────────────────────────────────────────────────

  register(name: string, email: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/register.php`, { name, email, password });
  }

  // ── Google OAuth ─────────────────────────────────────────────────

  getGoogleAuthUrl(): Observable<{ url: string }> {
    return this.http.get<{ url: string }>(`${this.apiUrl}/auth/google-auth.php`);
  }

  // Called after Google redirects back with user params in URL
  handleGoogleCallback(params: { user_id: string; name: string; email: string; avatar: string }) {
    const user: AuthUser = {
      id:     parseInt(params.user_id),
      name:   params.name,
      email:  params.email,
      avatar: params.avatar || undefined,
    };
    this.setUser(user);
  }
  setUser(user: AuthUser) {
    localStorage.setItem('auth_user', JSON.stringify(user));
    this.userSubject.next(user);
  }

  logout() {
    localStorage.removeItem('auth_user');
    this.userSubject.next(null);
    this.router.navigate(['/login']);
  }

  private loadFromStorage(): AuthUser | null {
    try {
      const stored = localStorage.getItem('auth_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }
}