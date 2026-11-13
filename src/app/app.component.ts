import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InventoryService, ApiProduct, ProductWrite } from './services/inventory.service';

type Page = 'dashboard'|'inventory'|'orders'|'users';
type Product = { id:number; name:string; description:string; barcode:string; price:number; stock:number; category:string; reorderLevel:number; };
@Component({selector:'app-root',standalone:true,imports:[CommonModule,FormsModule],templateUrl:'./app.component.html',styleUrl:'./app.component.css'})
export class AppComponent implements OnInit {
 activePage:Page='dashboard'; products:Product[]=[]; searchTerm=''; loading=false; saving=false; apiError=''; toast=''; modal=false; editingProductId:number|null=null;
 productForm={name:'',description:'',barcode:'',price:0,stock:0,category:'General',reorderLevel:10};
 orderForm={productId:0,quantity:1,notes:''}; orderBusy=false; lastOrderMessage='';
 constructor(private readonly inventoryService:InventoryService){}
 ngOnInit():void{this.loadProducts();}
 get pageTitle():string{return ({dashboard:'Dashboard',inventory:'Inventory',orders:'Product Orders',users:'User Management'} as Record<Page,string>)[this.activePage];}
 get lowStockProducts():Product[]{return this.products.filter(p=>p.stock<=p.reorderLevel);}
 get totalStockUnits():number{return this.products.reduce((s,p)=>s+p.stock,0);}
 get inventoryValue():number{return this.products.reduce((s,p)=>s+p.stock*p.price,0);}
 get filteredProducts():Product[]{const q=this.searchTerm.trim().toLowerCase();return q?this.products.filter(p=>[String(p.id),p.name,p.barcode,p.category].some(v=>v.toLowerCase().includes(q))):this.products;}
 navigate(page:Page):void{this.activePage=page;this.searchTerm='';if(page==='inventory'||page==='dashboard')this.loadProducts();}
 loadProducts():void{this.loading=true;this.apiError='';this.inventoryService.getProducts().subscribe({next:rows=>{this.products=(rows||[]).map(r=>this.fromApi(r));this.loading=false;if(this.orderForm.productId===0&&this.products.length)this.orderForm.productId=this.products[0].id;},error:e=>{this.loading=false;this.products=[];this.apiError=this.describeApiError(e);}});}
 private fromApi(r:ApiProduct):Product{return{id:Number(r.id),name:r.name,description:r.description??'',barcode:r.sku??'',price:Number(r.price??0),stock:Number(r.quantity??r.stock??0),category:r.category??'General',reorderLevel:Number(r.reorder_level??10)};}
 openNewProduct():void{this.editingProductId=null;this.productForm={name:'',description:'',barcode:'',price:0,stock:0,category:'General',reorderLevel:10};this.modal=true;}
 openEditProduct(p:Product):void{this.editingProductId=p.id;this.productForm={name:p.name,description:p.description,barcode:p.barcode,price:p.price,stock:p.stock,category:p.category,reorderLevel:p.reorderLevel};this.modal=true;}
 saveProduct():void{const f=this.productForm;if(!f.name.trim()||!f.barcode.trim()||f.price<0||f.reorderLevel<0){this.showToast('Enter a product name, SKU, valid price and reorder level.');return;}
 const payload:ProductWrite={name:f.name.trim(),sku:f.barcode.trim(),description:f.description.trim()||null,price:Number(f.price),reorder_level:Number(f.reorderLevel)};
 this.saving=true;const req=this.editingProductId===null?this.inventoryService.createProduct(payload):this.inventoryService.updateProduct(this.editingProductId,{name:payload.name,description:payload.description,price:payload.price,reorder_level:payload.reorder_level});
 req.subscribe({next:()=>{this.saving=false;this.modal=false;this.showToast('Product saved.');this.loadProducts();},error:e=>{this.saving=false;this.showToast(this.describeApiError(e));}});
 }
 createOrder():void{
  if(!this.products.length){this.showToast('Load products before creating an order.');return;}
  if(!this.orderForm.productId||this.orderForm.quantity<1||!Number.isInteger(Number(this.orderForm.quantity))){this.showToast('Choose a product and enter a quantity greater than zero.');return;}
  this.orderBusy=true;this.lastOrderMessage='';
  this.inventoryService.createOrder({notes:this.orderForm.notes.trim()||null}).subscribe({next:created=>{
   this.inventoryService.addOrderItem(created.order_id,{product_id:Number(this.orderForm.productId),quantity:Number(this.orderForm.quantity)}).subscribe({next:()=>{
    this.inventoryService.completeOrder(created.order_id).subscribe({next:done=>{this.orderBusy=false;this.lastOrderMessage=`Order #${created.order_id} completed. Total: ${done.total_amount===undefined?'confirmed':Number(done.total_amount).toLocaleString(undefined,{style:'currency',currency:'USD'})}.`;this.showToast(this.lastOrderMessage);},error:e=>{this.orderBusy=false;this.showToast(`Order #${created.order_id} was created and item added, but completion failed: ${this.describeApiError(e)}`);}});
   },error:e=>{this.orderBusy=false;this.showToast(`Order #${created.order_id} was created, but adding its item failed: ${this.describeApiError(e)}`);}});
  },error:e=>{this.orderBusy=false;this.showToast(this.describeApiError(e));}});
 }
 deleteProduct():void{this.showToast('Product deletion is not available in the current backend API.');}
 refresh():void{this.loadProducts();} showToast(m:string):void{this.toast=m;} clearToast():void{this.toast='';}
 private describeApiError(e:HttpErrorResponse):string{if(e.status===0)return'We could not connect to the server. Check that the inventory service is running.';if(e.status===404)return'The server does not have this endpoint yet. Ask the backend team to add it.';const d=typeof e.error?.detail==='string'?e.error.detail:'';return d||`The request could not be completed (${e.status}).`;}
}
