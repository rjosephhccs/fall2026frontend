import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { productAuthInterceptor } from './app/auth.interceptor';
bootstrapApplication(AppComponent, { providers: [provideHttpClient(withInterceptors([productAuthInterceptor]))] }).catch((error) => console.error(error));
