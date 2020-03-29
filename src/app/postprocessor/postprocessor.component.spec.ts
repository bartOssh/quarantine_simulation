import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PostprocessorComponent } from './postprocessor.component';

describe('PostprocessorComponent', () => {
  let component: PostprocessorComponent;
  let fixture: ComponentFixture<PostprocessorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PostprocessorComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PostprocessorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
