import { Component, OnInit, HostBinding, Input, OnDestroy, Optional, Self, ElementRef } from '@angular/core';
import { FormBuilder, Validators, ControlValueAccessor, NgControl } from '@angular/forms';
import { MatFormFieldControl } from '@angular/material';
import { Subject } from 'rxjs';
import { FocusMonitor } from '@angular/cdk/a11y';
import { coerceBooleanProperty } from '@angular/cdk/coercion';

class Author {
  constructor(
    public name: string,
    public profileUrl: string,
    public email: string
  ) { }}

@Component({
  selector: 'tanam-author',
  templateUrl: './author.component.html',
  styleUrls: ['./author.component.scss'],
  providers: [{provide: MatFormFieldControl, useExisting: AuthorComponent}],
})
export class AuthorComponent implements  MatFormFieldControl<Author>,  OnInit, OnDestroy {
  private static _nextId = 0;

  authorForm = this.formBuilder.group({
    name: [null, Validators.required],
    profileUrl: [null],
    email: [null, Validators.email],
  });

  @HostBinding('attr.aria-describedby') describedBy = '';
  @HostBinding() id = `author-${AuthorComponent._nextId++}`;

  stateChanges = new Subject<void>();
  private _placeholder: string;
  private _onTouchedCallback: () => void;
  private _onChangeCallback: (value: string) => void;
  private _focused = false;
  private _required = false;
  private _disabled = false;
  shouldLabelFloat = false;
  errorState: boolean;
  controlType = 'author';
  autofilled?: boolean;

  @Input() title: string;

  @Input()
  get value(): Author | null {
    const form = this.authorForm.value;
    return new Author(form.name, form.profileUrl, form.email);
  }
  set value(v: Author) {
    v = v || new Author('', '', '');
    this.authorForm.setValue({name: v.name, profileUrl: v.profileUrl, email: v.email});
    this.stateChanges.next();
  }

  @Input()
  get placeholder() {
    return this._placeholder;
  }
  set placeholder(plh) {
    this._placeholder = plh;
    this.stateChanges.next();
  }

  get focused() {
    return this._focused;
  }

  set focused(flag: boolean) {
    this._focused = coerceBooleanProperty(flag);
    this._onTouchedCallback();
  }

  get empty() {
    const n = this.authorForm.value;
    return !n.name && !n.profileUrl && !n.email;
  }

  @Input()
  get required() {
    return this._required;
  }
  set required(req) {
    this._required = coerceBooleanProperty(req);
    this.stateChanges.next();
  }

  @Input()
  get disabled() {
    return this._disabled;
  }
  set disabled(dis) {
    this._disabled = coerceBooleanProperty(dis);
    this.stateChanges.next();
}

  ngOnDestroy() {
    this.fm.stopMonitoring(this.elRef.nativeElement);
    this.stateChanges.complete();
  }

  writeValue(obj: any): void {
    this.authorForm.setValue(obj);
  }
  registerOnChange(callback: (val: any) => void): void {
    this._onChangeCallback = callback;
  }
  registerOnTouched(callback: () => void): void {
    this._onTouchedCallback = callback;
  }
  setDisabledState?(isDisabled: boolean): void {
    throw new Error('Method not implemented.');
  }

  setDescribedByIds(ids: string[]) {
    this.describedBy = ids.join(' ');
  }
  onContainerClick(event: MouseEvent): void {
    this._onTouchedCallback();
  }

  constructor(
    private readonly formBuilder: FormBuilder,
    @Optional() @Self() public ngControl: NgControl,
    private fm: FocusMonitor,
    private elRef: ElementRef<HTMLElement>,
  ) {
    if (this.ngControl !== null) {
      this.ngControl.valueAccessor = this;
    }

    fm.monitor(elRef.nativeElement, true).subscribe(origin => {
      this.focused = !!origin;
      this.stateChanges.next();
    });
  }

  ngOnInit() {
    this.authorForm.valueChanges.subscribe(val => {
      this._onChangeCallback(val);
      this.stateChanges.next();
    });
  }

}
