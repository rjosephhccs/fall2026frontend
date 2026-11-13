import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ApiProduct {
  id: number;
  name: string;
  sku: string;
  description?: string | null;
  price: number;
  quantity?: number;
  stock?: number;
  reorder_level?: number;
  category?: string;
}

export interface ProductWrite {
  name: string;
  sku: string;
  description: string | null;
  price: number;
  reorder_level: number;
}

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private readonly productsUrl = `${environment.apiBaseUrl}/api/products`;

  constructor(private readonly http: HttpClient) {}

  // The classroom FastAPI starter currently needs GET /api/products added
  // before this request can return the inventory list.
  getProducts(): Observable<ApiProduct[]> {
    return this.http.get<ApiProduct[]>(this.productsUrl);
  }

  createProduct(product: ProductWrite): Observable<unknown> {
    return this.http.post(this.productsUrl, product);
  }

  updateProduct(id: number, product: Omit<ProductWrite, 'sku'>): Observable<unknown> {
    return this.http.put(`${this.productsUrl}/${id}`, product);
  }
}
