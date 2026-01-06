import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path:'',
        loadComponent:()=>import('../app/component/random-page/random-page').then(c=>c.RandomPage)
    },
    { path: '**', redirectTo: '' }
];
