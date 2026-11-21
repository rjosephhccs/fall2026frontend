import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiProduct, ProductApiService, ProductCreatePayload } from './product-api.service';
import { AuthService } from './auth.service';
import { ApiUser, UserApiService } from './user-api.service';

type Role = 'Product Manager' | 'Inventory Manager' | 'Super User';
type Page = 'dashboard' | 'inventory' | 'orders' | 'users';
type Product = {id:number;name:string;description:string;barcode:string;price:number;stock:number;reorderLevel:number};
type Order = {id:number;createdBy:string;date:string;items:string;total:number;status:'Completed'|'Pending'};
type Employee = {id:number;username:string;role:Role;apiRole:string;status:'Active'|'Inactive';firstName:string;lastName:string;email:string};

@Component({selector:'app-root',standalone:true,imports:[CommonModule,FormsModule],templateUrl:'./app.component.html',styleUrl:'./app.component.css'})
export class AppComponent implements OnInit {
  private readonly productApi = inject(ProductApiService);
  private readonly auth = inject(AuthService);
  private readonly userApi = inject(UserApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  loadingProducts = false;
  savingProduct = false;
  productError = '';
  loadingUsers = false;
  savingUser = false;
  userError = '';
  loggedIn=false; loggingIn=false; showPassword=false; loginUsername=''; loginPassword=''; authenticatedRole=''; loginError='';
  activePage:Page='dashboard'; searchTerm=''; toast=''; modal:'product'|'order'|'user'|null=null;
  editingProductId:number|null=null; editingUserId:number|null=null;
  roles:Role[]=['Product Manager','Inventory Manager','Super User'];
  productForm={name:'',description:'',barcode:'',price:0,stock:0,reorderLevel:5};
  userForm:{username:string;password:string;role:Role;status:'Active'|'Inactive';firstName:string;lastName:string;email:string}={username:'',password:'',role:'Product Manager',status:'Active',firstName:'',lastName:'',email:''};
  orderProductId=1001; orderQuantity=1;
  products:Product[]=[];
  orders:Order[]=[];
  employees:Employee[]=[];
  get currentRole():string {
    if (this.authenticatedRole.includes('SUPER_USER') || this.authenticatedRole.includes('ADMIN')) return 'Super User';
    if (this.authenticatedRole.includes('INVENTORY_MANAGER')) return 'Inventory Manager';
    if (this.authenticatedRole.includes('PRODUCT_MANAGER')) return 'Product Manager';
    return this.authenticatedRole || 'Unknown role';
  }
  get currentUsername():string{return this.auth.session?.username || this.loginUsername.trim()}
  get pageTitle():string{return ({dashboard:'Dashboard',inventory:'Inventory',orders:'Product Orders',users:'User Management'} as Record<Page,string>)[this.activePage]}
  get canManageInventory():boolean{return this.hasRole('SUPER_USER','INVENTORY_MANAGER')}
  get canCreateOrders():boolean{return this.hasRole('SUPER_USER','PRODUCT_MANAGER')}
  get canManageUsers():boolean{return this.hasRole('SUPER_USER')}
  private hasRole(...roles:string[]):boolean{return roles.some(role=>this.authenticatedRole===role||this.authenticatedRole===`ROLE_${role}`)}
  ngOnInit():void {
    const session = this.auth.session;
    if(session){this.loggedIn=true;this.activePage='inventory';this.loginUsername=session.username;this.authenticatedRole=session.role;this.refreshProducts();}
  }
  private fromApi(p:ApiProduct):Product {
    return {id:p.product_id,name:p.name??p.product_name??'',description:p.description??'',barcode:p.sku,
      price:Number(p.price??p.unit_price??0),stock:Number(p.quantity??p.stock_quantity??p.stock??0),reorderLevel:p.reorder_level};
  }
  private toApi(p:Product | typeof this.productForm):ProductCreatePayload {
    return {name:p.name.trim(),description:p.description.trim()||null,sku:p.barcode.trim(),
      price:Number(Number(p.price).toFixed(2)),reorder_level:Number(p.reorderLevel)};
  }
  private fromUserApi(user:ApiUser):Employee {
    const role:Role = user.role==='SUPER_USER' || user.role==='ROLE_SUPER_USER' ? 'Super User'
      : user.role==='INVENTORY_OPERATOR' || user.role==='ROLE_INVENTORY_OPERATOR' || user.role==='INVENTORY_MANAGER' ? 'Inventory Manager'
      : 'Product Manager';
    return {id:user.userId,username:user.username,role,apiRole:user.role,status:user.isActive?'Active':'Inactive',
      firstName:user.firstName??'',lastName:user.lastName??'',email:user.email??''};
  }
  private roleForApi(role:Role):string {
    return role==='Super User' ? 'SUPER_USER' : role==='Inventory Manager' ? 'INVENTORY_MANAGER' : 'PRODUCT_MANAGER';
  }
  refreshUsers():void {
    if(!this.canManageUsers || !this.ensureSession())return;
    this.loadingUsers=true;this.userError='';
    this.userApi.list().subscribe({
      next:users=>{this.employees=users.map(user=>this.fromUserApi(user));this.loadingUsers=false;this.cdr.markForCheck();},
      error:err=>{this.userError=this.apiError(err);this.loadingUsers=false;this.cdr.markForCheck();}
    });
  }
  refreshProducts():void {
    if (!this.ensureSession()) return;
    this.loadingProducts=true; this.productError='';
    this.productApi.list().subscribe({
      next: rows=>{this.products=rows.map(p=>this.fromApi(p));this.loadingProducts=false;this.cdr.markForCheck();},
      error: err=>{this.productError=this.apiError(err);this.loadingProducts=false;this.cdr.markForCheck();}
    });
  }
  private apiError(err:HttpErrorResponse):string {
    // A product API 401 does NOT mean the Spring Boot login failed. Stay in
    // inventory so the operator can see the backend's actual error and retry.
    if(err.status===401){
      return 'FastAPI rejected this JWT (HTTP 401). Verify that the Render API uses the same JWT signing key and algorithm as Spring Boot. If your token expired, sign out and log in again.';
    }
    if(err.status===403)return 'Your account does not have permission for this operation (HTTP 403).';
    if(typeof err.error?.detail==='string')return err.error.detail;
    if(Array.isArray(err.error?.detail))return err.error.detail.map((x:{msg:string})=>x.msg).join('; ');
    return `API request failed (HTTP ${err.status||'network error'}). Check the backend services and Angular proxy settings.`;
  }
  get lowStockProducts():Product[]{return this.products.filter(p=>p.stock<=p.reorderLevel)}
  get totalStockUnits():number{return this.products.reduce((n,p)=>n+p.stock,0)}
  get inventoryValue():number{return this.products.reduce((n,p)=>n+p.stock*p.price,0)}
  get ordersTotal():number{return this.orders.reduce((n,o)=>n+o.total,0)}
  get completedOrders():number{return this.orders.filter(o=>o.status==='Completed').length}
  get activeEmployees():number{return this.employees.filter(e=>e.status==='Active').length}
  get productManagerCount():number{return this.employees.filter(e=>e.role==='Product Manager').length}
  get inventoryManagerCount():number{return this.employees.filter(e=>e.role==='Inventory Manager').length}
  get filteredProducts():Product[]{const t=this.searchTerm.trim().toLowerCase();return !t?this.products:this.products.filter(p=>[String(p.id),p.name,p.barcode,p.description].some(v=>v.toLowerCase().includes(t)))}
  get filteredOrders():Order[]{const t=this.searchTerm.trim().toLowerCase();return !t?this.orders:this.orders.filter(o=>[String(o.id),o.createdBy,o.items,o.status].some(v=>v.toLowerCase().includes(t)))}
  get filteredEmployees():Employee[]{const t=this.searchTerm.trim().toLowerCase();return !t?this.employees:this.employees.filter(e=>[String(e.id),e.username,e.role,e.status].some(v=>v.toLowerCase().includes(t)))}
  get selectedOrderProduct():Product|undefined{return this.products.find(p=>p.id===Number(this.orderProductId))}
  get orderTotal():number{return (this.selectedOrderProduct?.price??0)*Number(this.orderQuantity||0)}
  login():void {
    if(this.loggingIn)return;
    this.loginError='';
    if(!this.loginUsername.trim()||!this.loginPassword){this.loginError='Enter your username and password.';return;}
    this.loggingIn=true;
    this.auth.login(this.loginUsername.trim(),this.loginPassword).subscribe({
      next:session=>{
        this.loggingIn=false;this.loggedIn=true;this.authenticatedRole=session.role;
        this.loginUsername=session.username;this.loginPassword='';this.activePage='inventory';this.searchTerm='';
        this.showToast(`Welcome, ${session.username}. Signed in with Spring Boot.`);
        this.refreshProducts();this.cdr.markForCheck();
      },
      error:err=>{
        this.loggingIn=false;
        this.loginError=err instanceof HttpErrorResponse
          ? (err.status===401||err.status===403 ? 'Invalid username or password, or your account is not authorized.' : `Login failed (HTTP ${err.status||'network error'}). Check the local Spring Boot server.`)
          : (err?.message||'Login failed.');
        this.cdr.markForCheck();
      }
    });
  }
  logout():void{this.auth.logout();this.loggedIn=false;this.authenticatedRole='';this.products=[];this.employees=[];this.productError='';this.userError='';this.loginPassword='';this.loginError='';this.modal=null;this.searchTerm=''}
  private ensureSession():boolean {
    if(this.auth.session)return true;
    this.logout();this.loginError='Your session has expired. Please sign in again.';return false;
  }
  navigate(page:Page):void{if(page==='orders'&&!this.canCreateOrders){this.showToast('Order creation is available to Product Managers and Super Users.');return}if(page==='users'&&!this.canManageUsers){this.showToast('User management is available to Super Users.');return}this.activePage=page;this.searchTerm='';this.modal=null;if(page==='users')this.refreshUsers();if(page==='inventory')this.refreshProducts();}
  showToast(message:string):void{this.toast=message}
  clearToast():void{this.toast=''}
  openNewProduct():void{this.editingProductId=null;this.productForm={name:'',description:'',barcode:'',price:0,stock:0,reorderLevel:5};this.modal='product'}
  openEditProduct(p:Product):void{this.editingProductId=p.id;this.productForm={name:p.name,description:p.description,barcode:p.barcode,price:p.price,stock:p.stock,reorderLevel:p.reorderLevel};this.modal='product'}
  saveProduct():void {
    if(!this.ensureSession()||!this.canManageInventory){this.showToast('Inventory editing requires an authorized operator.');return;}
    const f=this.productForm;
    if(this.savingProduct)return;
    if(!f.name.trim()||!f.barcode.trim()||!Number.isFinite(Number(f.price))||Number(f.price)<0||
       !Number.isInteger(Number(f.stock))||Number(f.stock)<0||
       !Number.isInteger(Number(f.reorderLevel))||Number(f.reorderLevel)<0||
       Number(f.price)>9999999999.99){this.showToast('Enter a name, SKU, non-negative price, and whole-number stock/reorder levels.');return;}
    const isNew=this.editingProductId===null;
    const targetStock=Number(f.stock);
    const original=this.products.find(p=>p.id===this.editingProductId);
    const stockChanged=isNew ? targetStock!==0 : targetStock!==original?.stock;
    this.savingProduct=true;
    const payload=this.toApi(f);
    const request=isNew?this.productApi.create(payload):this.productApi.update(this.editingProductId!,{
      name:payload.name,description:payload.description,price:payload.price,reorder_level:payload.reorder_level
    });
    request.subscribe({
      next:response=>{
        const id:number|null=isNew ? Number((response as {product_id?:number}).product_id) : this.editingProductId;
        if(stockChanged && id!==null && Number.isInteger(id) && id>0){
          this.productApi.adjustStock(id,targetStock).subscribe({
            next:()=>this.finishProductSave(isNew),
            error:err=>{
              this.savingProduct=false;this.modal=null;
              this.showToast(`Product ${isNew?'created':'updated'}, but stock adjustment failed: ${this.apiError(err)}`);
              this.refreshProducts();this.cdr.markForCheck();
            }
          });
        } else if(stockChanged){
          this.savingProduct=false;this.modal=null;
          this.showToast('Product saved, but the API did not return a product_id for the stock transaction.');
          this.refreshProducts();this.cdr.markForCheck();
        } else this.finishProductSave(isNew);
      },
      error:err=>{this.savingProduct=false;this.showToast(this.apiError(err));this.cdr.markForCheck();}
    });
  }
  private finishProductSave(created:boolean):void {
    this.savingProduct=false;this.modal=null;
    this.showToast(created?'Product created in PostgreSQL.':'Product updated in PostgreSQL.');
    this.refreshProducts();this.cdr.markForCheck();
  }
  deleteProduct(p:Product):void {
    this.showToast(`Product deletion is not available: the updated FastAPI has no DELETE /api/products/${p.id} endpoint.`);
  }
  openNewOrder():void{if(!this.products.length){this.showToast('Add a product before creating an order.');return}this.orderProductId=this.products[0].id;this.orderQuantity=1;this.modal='order'}
  saveOrder():void{const p=this.selectedOrderProduct;const q=Number(this.orderQuantity);if(!p||!Number.isInteger(q)||q<1){this.showToast('Choose a product and quantity of at least 1.');return}if(q>p.stock){this.showToast(`Not enough stock. Only ${p.stock} unit(s) available.`);return}const id=Math.max(5000,...this.orders.map(o=>o.id))+1;this.orders.unshift({id,createdBy:this.currentUsername,date:new Date().toISOString().slice(0,10),items:`${p.name} × ${q}`,total:p.price*q,status:'Pending'});this.modal=null;this.showToast(`Demo order #${id} added locally only. Cloud stock was NOT changed.`)}
  openNewUser():void{if(!this.canManageUsers)return;this.editingUserId=null;this.userForm={username:'',password:'',role:'Product Manager',status:'Active',firstName:'',lastName:'',email:''};this.modal='user'}
  openEditUser(e:Employee):void{if(!this.canManageUsers)return;this.editingUserId=e.id;this.userForm={username:e.username,password:'',role:e.role,status:e.status,firstName:e.firstName,lastName:e.lastName,email:e.email};this.modal='user'}
  saveUser():void {
    if(!this.canManageUsers||!this.ensureSession()||this.savingUser)return;
    const f=this.userForm;
    if(!f.username.trim()||!f.email.trim()||(this.editingUserId===null&&!f.password)){
      this.showToast('Username, email and (for new users) password are required.');return;
    }
    const existing=this.employees.find(e=>e.id===this.editingUserId);
    const role=(existing&&existing.role===f.role) ? existing.apiRole : this.roleForApi(f.role);
    const payload={role,firstName:f.firstName.trim(),lastName:f.lastName.trim(),email:f.email.trim(),isActive:f.status==='Active'};
    const creating=this.editingUserId===null;
    const request=creating
      ?this.userApi.create({...payload,username:f.username.trim(),password:f.password})
      :this.userApi.update(this.editingUserId!,payload);
    this.savingUser=true;
    request.subscribe({
      next:()=>{this.savingUser=false;this.modal=null;this.showToast(creating?'User created in Spring Boot.':'User updated in Spring Boot.');this.refreshUsers();this.cdr.markForCheck();},
      error:err=>{this.savingUser=false;this.showToast(this.apiError(err));this.cdr.markForCheck();}
    });
  }
  deleteUser(e:Employee):void {
    if(!this.canManageUsers||!this.ensureSession()||e.status==='Inactive')return;
    if(e.username===this.currentUsername){this.showToast('You cannot deactivate your own signed-in account here.');return;}
    if(!confirm(`Deactivate "${e.username}"? Spring Boot will retain the record but mark it inactive.`))return;
    this.userApi.disable(e.id).subscribe({
      next:()=>{this.showToast('User deactivated in Spring Boot.');this.refreshUsers();this.cdr.markForCheck();},
      error:err=>{this.showToast(this.apiError(err));this.cdr.markForCheck();}
    });
  }
}
