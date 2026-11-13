import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InventoryService, ApiProduct, ProductWrite } from './services/inventory.service';

type Page = 'dashboard' | 'inventory' | 'orders' | 'users';
type Product = {
  id: number; name: string; description: string; barcode: string;
  price: number; stock: number; category: string; reorderLevel: number;
};

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  activePage: Page = 'dashboard';
  products: Product[] = [];
  searchTerm = '';
  loading = false;
  saving = false;
  apiError = '';
  toast = '';
  modal = false;
  editingProductId: number | null = null;
  productForm = { name: '', description: '', barcode: '', price: 0, stock: 0, category: 'General', reorderLevel: 10 };

  constructor(private readonly inventoryService: InventoryService) {}

  ngOnInit(): void { this.loadProducts(); }

  get pageTitle(): string {
    return ({ dashboard: 'Dashboard', inventory: 'Inventory', orders: 'Product Orders', users: 'User Management' } as Record<Page, string>)[this.activePage];
  }
  get lowStockProducts(): Product[] { return this.products.filter(p => p.stock <= p.reorderLevel); }
  get totalStockUnits(): number { return this.products.reduce((sum, p) => sum + p.stock, 0); }
  get inventoryValue(): number { return this.products.reduce((sum, p) => sum + p.stock * p.price, 0); }
  get filteredProducts(): Product[] {
    const term = this.searchTerm.trim().toLowerCase();
    return term ? this.products.filter(p => [String(p.id), p.name, p.barcode, p.category].some(v => v.toLowerCase().includes(term))) : this.products;
  }

  navigate(page: Page): void {
    this.activePage = page;
    this.searchTerm = '';
    if (page === 'inventory' || page === 'dashboard') this.loadProducts();
  }

  loadProducts(): void {
    this.loading = true;
    this.apiError = '';
    this.inventoryService.getProducts().subscribe({
      next: rows => {
        this.products = (rows || []).map(row => this.fromApi(row));
        this.loading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.loading = false;
        this.products = [];
        this.apiError = this.describeApiError(error);
      }
    });
  }

  private fromApi(row: ApiProduct): Product {
    return {
      id: Number(row.id),
      name: row.name,
      description: row.description ?? '',
      barcode: row.sku ?? '',
      price: Number(row.price ?? 0),
      stock: Number(row.quantity ?? row.stock ?? 0),
      category: row.category ?? 'General',
      reorderLevel: Number(row.reorder_level ?? 10)
    };
  }

  openNewProduct(): void {
    this.editingProductId = null;
    this.productForm = { name: '', description: '', barcode: '', price: 0, stock: 0, category: 'General', reorderLevel: 10 };
    this.modal = true;
  }

  openEditProduct(product: Product): void {
    this.editingProductId = product.id;
    this.productForm = {
      name: product.name, description: product.description, barcode: product.barcode,
      price: product.price, stock: product.stock, category: product.category, reorderLevel: product.reorderLevel
    };
    this.modal = true;
  }

  saveProduct(): void {
    const form = this.productForm;
    if (!form.name.trim() || !form.barcode.trim() || form.price < 0 || form.reorderLevel < 0) {
      this.showToast('Enter a product name, SKU, valid price, and reorder level.');
      return;
    }
    // The supplied classroom API accepts SKU, description, price and reorder_level.
    // It does not currently accept category or an opening stock quantity.
    const payload: ProductWrite = {
      name: form.name.trim(),
      sku: form.barcode.trim(),
      description: form.description.trim() || null,
      price: Number(form.price),
      reorder_level: Number(form.reorderLevel)
    };
    this.saving = true;
    const request = this.editingProductId === null
      ? this.inventoryService.createProduct(payload)
      : this.inventoryService.updateProduct(this.editingProductId, {
          name: payload.name, description: payload.description, price: payload.price, reorder_level: payload.reorder_level
        });

    request.subscribe({
      next: () => {
        this.saving = false;
        this.modal = false;
        this.showToast(this.editingProductId === null ? 'Product created in the API.' : 'Product updated in the API.');
        this.loadProducts();
      },
      error: (error: HttpErrorResponse) => {
        this.saving = false;
        this.showToast(this.describeApiError(error));
      }
    });
  }

  deleteProduct(_product: Product): void {
    this.showToast('The classroom REST API does not currently provide a product DELETE endpoint.');
  }

  refresh(): void { this.loadProducts(); }
  showToast(message: string): void { this.toast = message; }
  clearToast(): void { this.toast = ''; }

  private describeApiError(error: HttpErrorResponse): string {
    if (error.status === 0) return 'Cannot reach the REST API. Check that FastAPI is running and the API URL/CORS settings are correct.';
    if (error.status === 404) return 'The API route was not found. The classroom backend must add GET /api/products to return inventory records.';
    const detail = typeof error.error?.detail === 'string' ? error.error.detail : '';
    return detail || `REST API request failed (${error.status}). Check the backend response.`;
  }
}
