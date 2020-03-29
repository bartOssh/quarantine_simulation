import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { PostprocessorComponent } from './postprocessor/postprocessor.component';
import { SolverComponent } from './solver/solver.component'; 




export const routes: Routes = [
  {
    path: '',
    component: SolverComponent,

  },
  {
    path: 'solver',
    component: SolverComponent,
  },
  {
    path: 'postprocessor',
    component: PostprocessorComponent,
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { 
  constructor() {
  }
}
