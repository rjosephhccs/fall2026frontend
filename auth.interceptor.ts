import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const productAuthInterceptor: HttpInterceptorFn = (request, next) => {
  // Limit token attachment to product API calls, never to arbitrary URLs.
  if (!/^\/api\/(products|stock-transactions|users)(?:\/|$|\?)/.test(request.url)) return next(request);
  const token = inject(AuthService).session?.token;
  if (!token) return next(request);
  return next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
