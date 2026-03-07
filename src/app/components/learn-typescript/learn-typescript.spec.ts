import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LearnTypescript } from './learn-typescript';

describe('LearnTypescript', () => {
  let component: LearnTypescript;
  let fixture: ComponentFixture<LearnTypescript>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LearnTypescript],
    }).compileComponents();

    fixture = TestBed.createComponent(LearnTypescript);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
