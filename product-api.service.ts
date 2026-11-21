import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface ApiProduct {
  product_id: number;
  name?: string;
  product_name?: string;
  description: string | null;
  sku: string;
  quantity?: number;
  stock_quantity?: number;
  stock?: number;
  price?: string | number;
  unit_price?: string | number;
  reorder_level: number;
}

export interface ProductCreatePayload {
  name: string;
  description: string | null;
  sku: string;
  price: number;
  reorder_level: number;
}
export type ProductUpdatePayload = Omit<ProductCreatePayload, 'sku'>;

@Injectable({ providedIn: 'root' })
export class ProductApiService {
  private readonly http = inject(HttpClient);
  // The Angular development proxy forwards this path to your Render FastAPI URL.
  private readonly url = '/api/products';

  list(): Observable<ApiProduct[]> { return this.http.get<ApiProduct[]>(this.url); }
  get(id: number): Observable<ApiProduct> { return this.http.get<ApiProduct>(`${this.url}/${id}`); }
  create(product: ProductCreatePayload): Observable<{ message: string; product_id: number }> {
    return this.http.post<{ message: string; product_id: number }>(this.url, product);
  }
  update(id: number, product: ProductUpdatePayload): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.url}/${id}`, product);
  }
  adjustStock(id: number, quantity: number): Observable<{ message: string; transaction_id: number }> {
    return this.http.post<{ message: string; transaction_id: number }>('/api/stock-transactions', {
      product_id: id, transaction_type: 'ADJUSTMENT', quantity, notes: 'Stock set from Angular inventory form'
    });
  }
}
