import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ApiProduct { id:number; name:string; sku:string; description?:string|null; price:number; quantity?:number; stock?:number; reorder_level?:number; category?:string; }
export interface ProductWrite { name:string; sku:string; description:string|null; price:number; reorder_level:number; }
export interface OrderCreate { notes?:string|null; }
export interface OrderItemAdd { product_id:number; quantity:number; }

@Injectable({providedIn:'root'})
export class InventoryService {
  private readonly productsUrl = `${environment.apiBaseUrl}/api/products`;
  private readonly ordersUrl = `${environment.apiBaseUrl}/api/orders`;
  constructor(private readonly http:HttpClient) {}
  getProducts():Observable<ApiProduct[]> { return this.http.get<ApiProduct[]>(this.productsUrl); }
  createProduct(product:ProductWrite):Observable<unknown> { return this.http.post(this.productsUrl,product); }
  updateProduct(id:number,product:Omit<ProductWrite,'sku'>):Observable<unknown> { return this.http.put(`${this.productsUrl}/${id}`,product); }
  createOrder(order:OrderCreate):Observable<{order_id:number;message?:string}> { return this.http.post<{order_id:number;message?:string}>(this.ordersUrl,order); }
  addOrderItem(orderId:number,item:OrderItemAdd):Observable<unknown> { return this.http.post(`${this.ordersUrl}/${orderId}/items`,item); }
  completeOrder(orderId:number):Observable<{total_amount?:number;message?:string}> { return this.http.post<{total_amount?:number;message?:string}>(`${this.ordersUrl}/${orderId}/complete`,{}); }
}
