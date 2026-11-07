import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

type Role = 'Product Manager' | 'Inventory Manager' | 'Super User';
type Page = 'dashboard' | 'inventory' | 'orders' | 'users';
type Product = {id:number;name:string;description:string;barcode:string;price:number;stock:number;category:string};
type Order = {id:number;createdBy:string;date:string;items:string;total:number;status:'Completed'|'Pending'};
type Employee = {id:number;username:string;role:Role;status:'Active'|'Inactive'};

@Component({selector:'app-root',standalone:true,imports:[CommonModule,FormsModule],templateUrl:'./app.component.html',styleUrl:'./app.component.css'})
export class AppComponent {
  loggedIn=false; showPassword=false; loginUsername=''; loginPassword=''; loginRole:Role='Inventory Manager'; loginError='';
  activePage:Page='dashboard'; searchTerm=''; toast=''; modal:'product'|'order'|'user'|null=null;
  editingProductId:number|null=null; editingUserId:number|null=null;
  roles:Role[]=['Product Manager','Inventory Manager','Super User'];
  productForm={name:'',description:'',barcode:'',price:0,stock:0,category:'Accessories'};
  userForm:{username:string;password:string;role:Role;status:'Active'|'Inactive'}={username:'',password:'',role:'Product Manager',status:'Active'};
  orderProductId=1001; orderQuantity=1;
  products:Product[]=[
    {id:1001,name:'Wireless Mouse',description:'Wireless optical mouse',barcode:'810000100001',price:24.99,stock:48,category:'Accessories'},
    {id:1002,name:'Mechanical Keyboard',description:'RGB mechanical keyboard',barcode:'810000100002',price:79.99,stock:16,category:'Accessories'},
    {id:1003,name:'USB-C Hub',description:'7-in-1 USB-C hub',barcode:'810000100003',price:39.5,stock:7,category:'Adapters'},
    {id:1004,name:'27-inch Monitor',description:'QHD computer monitor',barcode:'810000100004',price:249.99,stock:12,category:'Displays'},
    {id:1005,name:'Webcam HD',description:'1080p USB webcam',barcode:'810000100005',price:54.99,stock:4,category:'Accessories'},
    {id:1006,name:'External SSD 1TB',description:'Portable solid-state drive',barcode:'810000100006',price:99.99,stock:22,category:'Storage'}
  ];
  orders:Order[]=[
    {id:5001,createdBy:'j.smith',date:'2026-10-21',items:'Wireless Mouse × 2',total:49.98,status:'Completed'},
    {id:5002,createdBy:'m.jones',date:'2026-10-22',items:'USB-C Hub × 1',total:39.5,status:'Completed'},
    {id:5003,createdBy:'j.smith',date:'2026-10-23',items:'External SSD 1TB × 1',total:99.99,status:'Pending'}
  ];
  employees:Employee[]=[
    {id:1,username:'j.smith',role:'Product Manager',status:'Active'},
    {id:2,username:'m.jones',role:'Inventory Manager',status:'Active'},
    {id:3,username:'admin.demo',role:'Super User',status:'Active'}
  ];
  get currentRole():Role{return this.loginRole}
  get currentUsername():string{return this.loginUsername.trim()||'demo.user'}
  get pageTitle():string{return ({dashboard:'Dashboard',inventory:'Inventory',orders:'Product Orders',users:'User Management'} as Record<Page,string>)[this.activePage]}
  get canManageInventory():boolean{return this.currentRole==='Inventory Manager'||this.currentRole==='Super User'}
  get canCreateOrders():boolean{return this.currentRole==='Product Manager'||this.currentRole==='Super User'}
  get canManageUsers():boolean{return this.currentRole==='Super User'}
  get lowStockProducts():Product[]{return this.products.filter(p=>p.stock<=7)}
  get totalStockUnits():number{return this.products.reduce((n,p)=>n+p.stock,0)}
  get inventoryValue():number{return this.products.reduce((n,p)=>n+p.stock*p.price,0)}
  get ordersTotal():number{return this.orders.reduce((n,o)=>n+o.total,0)}
  get completedOrders():number{return this.orders.filter(o=>o.status==='Completed').length}
  get activeEmployees():number{return this.employees.filter(e=>e.status==='Active').length}
  get productManagerCount():number{return this.employees.filter(e=>e.role==='Product Manager').length}
  get inventoryManagerCount():number{return this.employees.filter(e=>e.role==='Inventory Manager').length}
  get filteredProducts():Product[]{const t=this.searchTerm.trim().toLowerCase();return !t?this.products:this.products.filter(p=>[String(p.id),p.name,p.barcode,p.category].some(v=>v.toLowerCase().includes(t)))}
  get filteredOrders():Order[]{const t=this.searchTerm.trim().toLowerCase();return !t?this.orders:this.orders.filter(o=>[String(o.id),o.createdBy,o.items,o.status].some(v=>v.toLowerCase().includes(t)))}
  get filteredEmployees():Employee[]{const t=this.searchTerm.trim().toLowerCase();return !t?this.employees:this.employees.filter(e=>[String(e.id),e.username,e.role,e.status].some(v=>v.toLowerCase().includes(t)))}
  get selectedOrderProduct():Product|undefined{return this.products.find(p=>p.id===Number(this.orderProductId))}
  get orderTotal():number{return (this.selectedOrderProduct?.price??0)*Number(this.orderQuantity||0)}
  login():void{this.loginError='';if(!this.loginUsername.trim()||!this.loginPassword){this.loginError='Enter your username and password.';return}if(this.loginPassword.length<8){this.loginError='For this demo, password must be at least 8 characters.';return}this.loggedIn=true;this.activePage='dashboard';this.searchTerm='';this.showToast(`Welcome, ${this.currentUsername}. Demo mode is active.`)}
  logout():void{this.loggedIn=false;this.loginPassword='';this.loginError='';this.modal=null;this.searchTerm=''}
  navigate(page:Page):void{if(page==='orders'&&!this.canCreateOrders){this.showToast('Order creation is available to Product Managers and Super Users.');return}if(page==='users'&&!this.canManageUsers){this.showToast('User management is available to Super Users.');return}this.activePage=page;this.searchTerm='';this.modal=null}
  showToast(message:string):void{this.toast=message}
  clearToast():void{this.toast=''}
  openNewProduct():void{this.editingProductId=null;this.productForm={name:'',description:'',barcode:'',price:0,stock:0,category:'Accessories'};this.modal='product'}
  openEditProduct(p:Product):void{this.editingProductId=p.id;this.productForm={name:p.name,description:p.description,barcode:p.barcode,price:p.price,stock:p.stock,category:p.category};this.modal='product'}
  saveProduct():void{if(!this.productForm.name.trim()||!this.productForm.barcode.trim()||this.productForm.price<0||this.productForm.stock<0||!Number.isInteger(Number(this.productForm.stock))){this.showToast('Enter product name, barcode, valid price, and whole-number stock.');return}if(this.editingProductId!==null){const p=this.products.find(x=>x.id===this.editingProductId);if(p)Object.assign(p,this.productForm);this.showToast('Product updated in demo data.')}else{const id=Math.max(1000,...this.products.map(p=>p.id))+1;this.products.unshift({id,...this.productForm});this.showToast('Product added to demo data.')}this.modal=null}
  deleteProduct(p:Product):void{if(!confirm(`Delete "${p.name}" from this demo list?`))return;this.products=this.products.filter(x=>x.id!==p.id);this.showToast('Product removed from demo data.')}
  openNewOrder():void{if(!this.products.length){this.showToast('Add a product before creating an order.');return}this.orderProductId=this.products[0].id;this.orderQuantity=1;this.modal='order'}
  saveOrder():void{const p=this.selectedOrderProduct;const q=Number(this.orderQuantity);if(!p||!Number.isInteger(q)||q<1){this.showToast('Choose a product and quantity of at least 1.');return}if(q>p.stock){this.showToast(`Not enough stock. Only ${p.stock} unit(s) available.`);return}p.stock-=q;const id=Math.max(5000,...this.orders.map(o=>o.id))+1;this.orders.unshift({id,createdBy:this.currentUsername,date:new Date().toISOString().slice(0,10),items:`${p.name} × ${q}`,total:p.price*q,status:'Completed'});this.modal=null;this.showToast(`Demo order #${id} created; stock updated in browser memory.`)}
  openNewUser():void{this.editingUserId=null;this.userForm={username:'',password:'',role:'Product Manager',status:'Active'};this.modal='user'}
  openEditUser(e:Employee):void{this.editingUserId=e.id;this.userForm={username:e.username,password:'',role:e.role,status:e.status};this.modal='user'}
  saveUser():void{if(!this.userForm.username.trim()){this.showToast('Enter a username.');return}if(this.editingUserId!==null){const e=this.employees.find(x=>x.id===this.editingUserId);if(e){e.username=this.userForm.username.trim();e.role=this.userForm.role;e.status=this.userForm.status}this.showToast('Employee updated in demo data.')}else{const id=Math.max(0,...this.employees.map(e=>e.id))+1;this.employees.unshift({id,username:this.userForm.username.trim(),role:this.userForm.role,status:this.userForm.status});this.showToast('Employee added. Password is not saved by this UI.')}this.modal=null}
  deleteUser(e:Employee):void{if(!confirm(`Delete account "${e.username}" from this demo list?`))return;this.employees=this.employees.filter(x=>x.id!==e.id);this.showToast('Employee removed from demo data.')}
}