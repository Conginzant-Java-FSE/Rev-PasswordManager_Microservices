import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, inject, ViewEncapsulation, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { VaultEntryRequest } from '../../../core/api/model/vaultEntryRequest';
import { VaultEntryDetailResponse } from '../../../core/api/model/vaultEntryDetailResponse';
import { CategoryDTO } from '../../../core/api/model/categoryDTO';
import { CategoryControllerService } from '../../../core/api/api/categoryController.service';
import { FolderDTO } from '../../../core/api/model/folderDTO';
import { FolderControllerService } from '../../../core/api/api/folderController.service';
import { PasswordGeneratorWidgetComponent } from '../password-generator-widget/password-generator-widget.component';
import { CustomSelectComponent, SelectOption } from '../../../shared/custom-select/custom-select.component';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-vault-entry-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, PasswordGeneratorWidgetComponent, LucideAngularModule, CustomSelectComponent],
  templateUrl: './vault-entry-modal.component.html',
  styleUrl: './vault-entry-modal.component.css',
  encapsulation: ViewEncapsulation.None
})
export class VaultEntryModalComponent implements OnInit, OnChanges {
  private fb = inject(FormBuilder);
  private categoryService = inject(CategoryControllerService);
  private folderService = inject(FolderControllerService);
  private el = inject(ElementRef);

  @Input() entryToEdit: VaultEntryDetailResponse | null = null;

  /**
   * When the parent successfully decrypts the sensitive entry via MasterPasswordModalComponent,
   * it passes the full decrypted VaultEntryDetailResponse here. This allows the form to be
   * patched with real values without the modal needing to re-implement unlock logic.
   */
  @Input() unlockedEntry: VaultEntryDetailResponse | null = null;

  @Output() save = new EventEmitter<VaultEntryRequest>();
  @Output() cancel = new EventEmitter<void>();

  /**
   * Emitted when the user clicks "Unlock" on a locked sensitive entry.
   * The parent listens for this to open the MasterPasswordModalComponent.
   */
  @Output() sensitiveUnlockRequested = new EventEmitter<number>();

  /**
   * Emitted when the user clicks "Share" to create a secure share for this entry.
   */
  @Output() shareRequested = new EventEmitter<number>();

  entryForm!: FormGroup;
  categories: CategoryDTO[] = [];
  folders: FolderDTO[] = [];
  isLoadingCategories = false;
  isLoadingFolders = false;
  isSubmitting = false;
  showGenerator = false;
  showPassword = false;
  activeDropdowns = 0;

  /** True while we're waiting for the parent to provide the decrypted entry. */
  isLocked = false;

  get categoryOptions(): SelectOption[] {
    return this.categories.map(c => ({ value: c.id!, label: c.name! }));
  }

  get folderOptions(): SelectOption[] {
    return this.folders.map(f => ({ value: f.id!, label: f.name! }));
  }

  onDropdownOpenChange(isOpen: boolean) {
    this.activeDropdowns += isOpen ? 1 : -1;
    if (this.activeDropdowns < 0) this.activeDropdowns = 0;
  }

  ngOnInit() {
    if (this.entryToEdit?.requiresSensitiveAuth) {
      this.isLocked = true;
    }
    this.initForm();
    this.loadCategories();
    this.loadFolders();
  }

  ngOnChanges(changes: SimpleChanges) {
    // When the user clicks a different entry on the left, we need to update the form
    if (changes['entryToEdit'] && !changes['entryToEdit'].firstChange) {
      if (this.entryToEdit?.requiresSensitiveAuth) {
        this.isLocked = true;
      } else {
        this.isLocked = false;
      }
      this.initForm();
    }

    // When the parent passes the decrypted entry back after unlock, patch the form
    if (changes['unlockedEntry'] && this.unlockedEntry) {
      this.entryForm?.patchValue({
        username: this.unlockedEntry.username || '',
        password: this.unlockedEntry.password || '',
        notes: this.unlockedEntry.notes || ''
      });
      this.isLocked = false;
    }
  }

  private initForm() {
    this.entryForm = this.fb.group({
      title: [this.entryToEdit?.title || '', [Validators.required]],
      username: [this.entryToEdit?.username || ''],
      password: [this.entryToEdit?.password || ''],
      websiteUrl: [this.entryToEdit?.websiteUrl || ''],
      notes: [this.entryToEdit?.notes || ''],
      categoryId: [this.entryToEdit?.categoryId || ''],
      folderId: [(this.entryToEdit as any)?.folderId || ''],
      isFavorite: [this.entryToEdit?.isFavorite || false],
      isHighlySensitive: [this.entryToEdit?.isHighlySensitive || false]
    });
  }

  private loadCategories() {
    this.isLoadingCategories = true;
    this.categoryService.getAllCategories().subscribe({
      next: (data: CategoryDTO[]) => {
        this.categories = data;
        this.isLoadingCategories = false;
      },
      error: () => {
        this.isLoadingCategories = false;
      }
    });
  }

  private loadFolders() {
    this.isLoadingFolders = true;
    this.folderService.getFolders().subscribe({
      next: (data: FolderDTO[]) => {
        this.folders = data;
        this.isLoadingFolders = false;
      },
      error: () => {
        this.isLoadingFolders = false;
      }
    });
  }

  toggleGenerator(event?: MouseEvent) {
    this.showGenerator = !this.showGenerator;

    if (this.showGenerator && event) {
      // Calculate position for the fixed dropdown to open to the LEFT
      const button = event.currentTarget as HTMLElement;
      const rect = button.getBoundingClientRect();

      // Align vertically with the button's center, offset upward by half the approximate dropdown height
      const dropdownTop = Math.max(20, rect.top - 150);

      // Position to the left of the button, with a 12px gap
      const dropdownRight = window.innerWidth - rect.left + 12;

      // Set CSS custom properties for positioning
      document.documentElement.style.setProperty('--dropdown-top', `${dropdownTop}px`);
      document.documentElement.style.setProperty('--dropdown-right', `${dropdownRight}px`);
    }
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  onPasswordGenerated(password: string) {
    this.entryForm.patchValue({ password });
    this.showGenerator = false;
  }

  /** Delegate unlock to the parent, which will show MasterPasswordModalComponent. */
  onRequestUnlock() {
    if (this.entryToEdit?.id) {
      this.sensitiveUnlockRequested.emit(this.entryToEdit.id);
    }
  }

  onSubmit() {
    if (this.entryForm.invalid) return;

    this.isSubmitting = true;
    setTimeout(() => {
      this.isSubmitting = false;
    }, 2000);

    const request: VaultEntryRequest = {
      title: this.entryForm.value.title,
      username: this.entryForm.value.username || undefined,
      password: this.entryForm.value.password || undefined,
      websiteUrl: this.entryForm.value.websiteUrl || undefined,
      notes: this.entryForm.value.notes || undefined,
      categoryId: this.entryForm.value.categoryId ? Number(this.entryForm.value.categoryId) : undefined,
      folderId: this.entryForm.value.folderId ? Number(this.entryForm.value.folderId) : undefined,
      isFavorite: this.entryForm.value.isFavorite,
      isHighlySensitive: this.entryForm.value.isHighlySensitive
    } as VaultEntryRequest;

    this.save.emit(request);
  }

  onCancel() {
    this.cancel.emit();
  }

  onShare(): void {
    if (this.entryToEdit?.id) {
      this.shareRequested.emit(this.entryToEdit.id);
    }
  }
}
