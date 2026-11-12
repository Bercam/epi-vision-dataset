import { Routes } from '@angular/router';
import { DatasetPage } from './features/dataset/pages/dataset-page';

export const routes: Routes = [
  { path: '', component: DatasetPage },
  { path: '**', redirectTo: '' },
];
