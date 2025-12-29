import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RandomPage } from './random-page';

describe('RandomPage', () => {
  let component: RandomPage;
  let fixture: ComponentFixture<RandomPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RandomPage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RandomPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
