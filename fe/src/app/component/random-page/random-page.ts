import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DoctorService } from '../../service/doctor-service';
import { Doctor } from '../../model/doctor';

const STORAGE_DAY = 'curday';
const STORAGE_RES = 'curRes';
const STORAGE_RESDONE = 'curResDone';
const STORAGE_RESFAIL = 'curResFail';

class PairDoc {
  docA!: Doctor;
  docB: Doctor | null = null;
}

@Component({
  selector: 'app-random-page',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './random-page.html',
  styleUrl: './random-page.scss',
})
export class RandomPage implements OnInit {
  constructor(private docService: DoctorService) { }

  groupA: Doctor[] = [];
  groupB: Doctor[] = [];

  haveRandomed = false;
  res: PairDoc[] = [];
  resOfMatchingDone: PairDoc[] = [];
  resOfMatchingFail: PairDoc[] = [];

  showPopup = false;
  bulkText = '';
  currentGroup: string = 'gra';

  // inline edit
  editingGroup: string | null = null;
  editingId: number | null = null;
  editingName = '';

  //conform popup
  showConfirm = false;
  confirmTitle = '';
  confirmMessage = '';
  confirmType: string = 'primary';
  confirmAction: (() => void) | null = null;

  ngOnInit() {
    this.reloadGroups();

    const todayISO = this.getTodayISO();
    const savedDay = localStorage.getItem(STORAGE_DAY);

    if (savedDay === todayISO) {
      this.haveRandomed = true;

      let json = localStorage.getItem(STORAGE_RES);
      if (json) this.res = JSON.parse(json) as PairDoc[];

      json = localStorage.getItem(STORAGE_RESDONE);
      if (json) this.resOfMatchingDone = JSON.parse(json) as PairDoc[];

      json = localStorage.getItem(STORAGE_RESFAIL);
      if (json) this.resOfMatchingFail = JSON.parse(json) as PairDoc[];
    } else {
      this.haveRandomed = false;
    }
  }

  reloadGroups() {
    this.groupA = this.docService.load('gra');
    this.groupB = this.docService.load('grb');
  }

  // add many popup
  openPopup(group: string) {
    this.currentGroup = group;
    this.bulkText = '';
    this.showPopup = true;
  }

  closePopup() {
    this.showPopup = false;
  }

  confirmBulkAdd() {
    if (!this.bulkText.trim()) {
      this.openWarning = true;
      this.confirmType = 'warning';
      return;
    }

    const names = this.bulkText.split('\n').map(x => x.trim()).filter(x => x.length > 0);

    this.openConfirm('Thêm nhiều bác sĩ', `Bạn có chắc muốn thêm ${names.length} bác sĩ vào ${this.currentGroup === 'gra' ? 'Group A' : 'Group B'}?`, 'primary',
      () => {
        names.forEach(name => this.docService.add(name, this.currentGroup));
        this.reloadGroups();
        this.closePopup();
      }
    );
  }

  // Random 
  random() {
    this.res = [];
    this.resOfMatchingDone = [];
    this.resOfMatchingFail = [];

    const n = this.groupA.length;
    const m = this.groupB.length;

    // if (m > n || n === 0) return;

    let binary: number[] = new Array(n).fill(0);
    if (n > m) {
      let count = 0;
      while (count < m) {
        const index = Math.floor(Math.random() * n);
        if (binary[index] === 0) {
          binary[index] = 1;
          count++;
        }
      }
    } else {
      binary = new Array(n).fill(1);
    }
    
    let shuffledB = [...this.groupB];
    for (let i = m - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = shuffledB[j];
      shuffledB[j] = shuffledB[i];
      shuffledB[i] = tmp;
    }
    console.log(binary,this.groupA,shuffledB);
    let j = m-1;

    for (let i = n-1; i >= 0; i--) {
      if (binary[i] === 1) {

        if (this.groupA[i].haveMatched !== shuffledB[j].doctorId) {
          this.groupA[i].haveMatched = shuffledB[j].doctorId;
        } else {
          const idx = Math.floor(Math.random() * (j + 1));

          const tmp = shuffledB[j];
          shuffledB[j] = shuffledB[idx];
          shuffledB[idx] = tmp;
          
          this.groupA[i].haveMatched = shuffledB[j].doctorId;
        }
      }

      if (binary[i] === 0) {
        this.groupA[i].haveMatched = 0;
        this.resOfMatchingFail.push({ docA: this.groupA[i], docB: null });
      } else {
        this.resOfMatchingDone.push({ docA: this.groupA[i], docB: shuffledB[j] });
      }

      this.res.push({
        docA: this.groupA[i],
        docB: binary[i] === 1 ? shuffledB[j--] : null,
      });
    }

    const now = new Date();
    localStorage.setItem(
      STORAGE_DAY,
      new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString()
    );
    this.resOfMatchingDone = this.resOfMatchingDone.reverse();
    this.resOfMatchingFail = this.resOfMatchingFail.reverse();
    this.res = this.res.reverse();
    localStorage.setItem('gra',JSON.stringify(this.groupA));
    localStorage.setItem('grb',JSON.stringify(this.groupB));
    localStorage.setItem(STORAGE_RES, JSON.stringify(this.res));
    localStorage.setItem(STORAGE_RESDONE, JSON.stringify(this.resOfMatchingDone));
    localStorage.setItem(STORAGE_RESFAIL, JSON.stringify(this.resOfMatchingFail));

    this.haveRandomed = true;
  }

  // Reset result 
  closeResult() {
    this.haveRandomed = false;
    this.resOfMatchingDone = [];
    this.resOfMatchingFail = [];

    localStorage.setItem(STORAGE_RESDONE, JSON.stringify(this.resOfMatchingDone));
    localStorage.setItem(STORAGE_RESFAIL, JSON.stringify(this.resOfMatchingFail));
    localStorage.setItem(STORAGE_DAY, '');
  }

  getTodayISO(): string {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString();
  }

  isEditing(item: Doctor, group: string) {
    return this.editingGroup === group && this.editingId === item.doctorId;
  }

  startEdit(item: Doctor, group: string) {
    if (this.editingGroup !== null) {
      this.confirmSaveEdit(`change`);
    }
    this.editingGroup = group;
    this.editingId = item.doctorId;
    this.editingName = item.doctorName;
  }

  cancelEdit() {
    this.editingGroup = null;
    this.editingId = null;
    this.editingName = '';
  }

  // 
  openConfirm(title: string, message: string, type: string, action: () => void) {
    this.confirmTitle = title;
    this.confirmMessage = message;
    this.confirmType = type;
    this.confirmAction = action;
    this.showConfirm = true;
  }

  onConfirmYes() {
    this.confirmAction?.();
    this.closeConfirm();
  }

  closeConfirm() {
    this.showConfirm = false;
    this.confirmAction = null;
  }

  // 
  private addDocNow(name: string, group: string) {
    if (!name.trim()) return;
    this.docService.add(name.trim(), group);
    this.reloadGroups();
  }

  private delDocNow(id: number, group: string) {
    this.docService.del(id, group);
    this.reloadGroups();
  }

  private saveEditNow(mode: string) {
    if (!this.editingGroup || this.editingId == null) return;
    const name = this.editingName.trim();
    if (!name) return this.cancelEdit();

    this.docService.edit(this.editingId, name, this.editingGroup);
    this.reloadGroups();
    if (mode === 'cur')
      this.cancelEdit();
  }
  openWarning: boolean = false;
  confirmAdd(inputEl: HTMLInputElement, group: string) {
    const name = inputEl.value.trim();
    if (!name) {
      this.confirmType = 'warning';
      this.openWarning = true;
      return;
    }

    this.openConfirm('Thêm bác sĩ', `Bạn có chắc muốn thêm "${name}" vào ${group === 'gra' ? 'Group A' : 'Group B'}?`, 'primary', () => {
      this.addDocNow(name, group);
      inputEl.value = '';
    }
    );
  }
  closeWarning() {
    this.openWarning = false;
  }
  confirmDelete(item: Doctor, group: string) {
    this.openConfirm('Xóa bác sĩ', `Bạn có chắc muốn xóa "${item.doctorName}" khỏi ${group === 'gra' ? 'Group A' : 'Group B'}?`, 'danger', () => this.delDocNow(item.doctorId, group));
  }

  confirmReset() {
    this.openConfirm('Reset kết quả', 'Bạn có chắc muốn reset kết quả ghép?', 'warning', () => this.closeResult());
  }

  confirmSaveEdit(mode: string) {
    if (!this.editingGroup || this.editingId == null) return;
    const name = this.editingName.trim();
    if (!name) {
      this.openWarning = true;
      this.confirmType = 'warning';
      return this.cancelEdit();
    }
    if (mode === 'change')
      this.openConfirm('Vui lòng hoàn thành thay đổi', `Bạn có chắc muốn đổi tên thành "${name}"?`, 'primary', () => this.saveEditNow(mode));
    else
      this.openConfirm('Cập nhật tên bác sĩ', `Bạn có chắc muốn đổi tên thành "${name}"?`, 'primary', () => this.saveEditNow(mode));
  }
}
