import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface ApiUser {
  userId: number;
  username: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CreateUserPayload {
  username: string;
  password: string;
  role: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
}

export type UpdateUserPayload = Omit<CreateUserPayload, 'username' | 'password'>;

@Injectable({ providedIn: 'root' })
export class UserApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/users';

  list(): Observable<ApiUser[]> { return this.http.get<ApiUser[]>(this.baseUrl); }
  create(user: CreateUserPayload): Observable<ApiUser> { return this.http.post<ApiUser>(this.baseUrl, user); }
  update(id: number, user: UpdateUserPayload): Observable<ApiUser> {
    return this.http.put<ApiUser>(`${this.baseUrl}/${id}`, user);
  }
  // Spring Boot implements DELETE as a soft deletion: isActive becomes false.
  disable(id: number): Observable<void> { return this.http.delete<void>(`${this.baseUrl}/${id}`); }
}
