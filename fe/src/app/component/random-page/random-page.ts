import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DoctorService } from '../../service/doctor-service';
import { Doctor } from '../../model/doctor';
import { stringify } from 'querystring';

const STORAGE_DAY = 'curday';
const STORAGE_RESCASE1 = 'curRes1';
const STORAGE_RESCASE2 = 'curRes2';
const STORAGE_RESDONE = 'curResDone';
const STORAGE_RESFAIL = 'curResFail';
const STORAGE_CURCASE = 'curCase'
class PairDoc {
  docA!: Doctor;
  docB: Doctor | null = null;
}

class PairIdx {
  num!: number;
  idx!: number;
}
class PairDocC2 {
  docA!: Doctor;
  docB: Doctor[] = [];
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

  groupA: (Doctor & { selected?: boolean })[] = [];
  groupB: (Doctor & { selected?: boolean })[] = [];
  curCase?: string;
  haveRandomed = false;
  resCase2: PairDocC2[] = [];
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

  // confirm popup
  showConfirm = false;
  confirmTitle = '';
  confirmMessage = '';
  confirmType: string = 'primary';
  confirmAction: (() => void) | null = null;

  // warning popup
  openWarning: boolean = false;

  mulberry32(seed: number): () => number {
    return function (): number {
      seed |= 0;
      seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  ngOnInit() {
    this.reloadGroups();

    const todayISO = this.getTodayISO();
    const savedDay = localStorage.getItem(STORAGE_DAY);
    const curCase = localStorage.getItem(STORAGE_CURCASE);
    console.log('CASE ' + curCase);
    this.curCase = String(curCase);
    if (savedDay === todayISO) {
      this.haveRandomed = true;

      if (curCase === '1') {
        let json = localStorage.getItem(STORAGE_RESCASE1);
        if (json) this.res = JSON.parse(json) as PairDoc[];


        json = localStorage.getItem(STORAGE_RESDONE);
        if (json) this.resOfMatchingDone = JSON.parse(json) as PairDoc[];
        console.log(this.resOfMatchingDone);
        json = localStorage.getItem(STORAGE_RESFAIL);
        if (json) this.resOfMatchingFail = JSON.parse(json) as PairDoc[];
      }
      if(curCase === '2') {
        let json = localStorage.getItem(STORAGE_RESCASE2);
        if (json) this.resCase2 = JSON.parse(json) as PairDocC2[];
      }

    } else {
      this.haveRandomed = false;
    }
  }

  reloadGroups() {
    this.groupA = (this.docService.load('gra') || []).map(d => ({ ...d, selected: (d as any).selected ?? false }));
    this.groupB = (this.docService.load('grb') || []).map(d => ({ ...d, selected: (d as any).selected ?? false }));
  }

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

    const names = this.bulkText
      .split('\n')
      .map(x => x.trim())
      .filter(x => x.length > 0);

    this.openConfirm(
      'Thêm nhiều bác sĩ',
      `Bạn có chắc muốn thêm ${names.length} bác sĩ vào ${this.currentGroup === 'gra' ? 'Group A' : 'Group B'}?`,
      'primary',
      () => {
        names.forEach(name => this.docService.add(name, this.currentGroup));
        this.reloadGroups();
        this.closePopup();
      }
    );
  }

  private getList(group: 'gra' | 'grb') {
    return group === 'gra' ? this.groupA : this.groupB;
  }

  toggleAll(event: any, group: 'gra' | 'grb') {
    const checked = !!event.target.checked;
    const list = this.getList(group);
    list.forEach(d => (d.selected = checked));
  }

  isAllChecked(group: 'gra' | 'grb'): boolean {
    const list = this.getList(group);
    return list.length > 0 && list.every(d => !!d.selected);
  }

  confirmDeleteSelected(group: 'gra' | 'grb') {
    const list = this.getList(group);
    const selected = list.filter(d => !!d.selected);

    if (selected.length === 0) {
      this.openWarning = true;
      this.confirmType = 'warning';
      return;
    }

    this.openConfirm(
      'Xóa đã chọn',
      `Bạn có chắc muốn xóa ${selected.length} bác sĩ đã chọn khỏi ${group === 'gra' ? 'Group A' : 'Group B'}?`,
      'danger',
      () => {
        selected.forEach(d => this.docService.del(d.doctorId, group));
        this.reloadGroups();
      }
    );
  }

  confirmDeleteAll(group: 'gra' | 'grb') {
    const list = this.getList(group);
    if (list.length === 0) {
      this.openWarning = true;
      this.confirmType = 'warning';
      return;
    }

    this.openConfirm(
      'Xóa tất cả',
      `Bạn có chắc muốn xóa toàn bộ danh sách ${group === 'gra' ? 'Group A' : 'Group B'}?`,
      'danger',
      () => {
        this.docService.delAll(group);
        this.reloadGroups();
      }
    );
  }

  random() {
    this.res = [];
    this.resOfMatchingDone = [];
    this.resOfMatchingFail = [];

    const sizeOfA = this.groupA.length;
    const sizeOfB = this.groupB.length;
    const rand = this.mulberry32(performance.now());
    if (sizeOfA >= sizeOfB) {

      let randArray: PairIdx[] = [];
      let binary: number[] = new Array(sizeOfA).fill(0);

      for (let i = 0; i < sizeOfA; i++) {
        randArray.push({ num: rand(), idx: i });
      }

      randArray = randArray.sort((a, b) => b.num - a.num);

      for (let i = 0; i < sizeOfB && i < sizeOfA; i++) {
        binary[randArray[i].idx] = 1;
      }

      let shuffledB = [...this.groupB];
      for (let i = sizeOfB - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        const tmp = shuffledB[j];
        shuffledB[j] = shuffledB[i];
        shuffledB[i] = tmp;
      }

      let j = sizeOfB - 1;

      for (let i = sizeOfA - 1; i >= 0; i--) {
        if (binary[i] === 1) {
          if (this.groupA[i].haveMatched !== shuffledB[j].doctorId || this.groupA[i].haveMatched === 0) {
            this.groupA[i].haveMatched = shuffledB[j].doctorId;
          } else {
            const idx = Math.floor(rand() * (j + 1));

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

      this.resOfMatchingDone = this.resOfMatchingDone.reverse();
      this.resOfMatchingFail = this.resOfMatchingFail.reverse();
      this.res = this.res.reverse();
      this.curCase = '1';
      localStorage.setItem('gra', JSON.stringify(this.groupA.map(d => ({ ...d, selected: undefined }))));
      localStorage.setItem('grb', JSON.stringify(this.groupB.map(d => ({ ...d, selected: undefined }))));
      localStorage.setItem(STORAGE_CURCASE, this.curCase);
      localStorage.setItem(STORAGE_RESCASE1, JSON.stringify(this.res));
      localStorage.setItem(STORAGE_RESDONE, JSON.stringify(this.resOfMatchingDone));
      localStorage.setItem(STORAGE_RESFAIL, JSON.stringify(this.resOfMatchingFail));
    } else {
      let indexArray: number[] = [];
      for (let i = 1; i <= sizeOfB / sizeOfA; i++) {
        for (let j = 0; j < sizeOfA; j++) indexArray.push(this.groupA[j].doctorId);
      }

      let randArray: PairIdx[] = [];

      for (let i = 0; i < sizeOfA; i++) {
        randArray.push({ num: rand(), idx: this.groupA[i].doctorId });
      }

      randArray = randArray.sort((a, b) => b.num - a.num);

      for (let i = 0; i <= sizeOfB % sizeOfA; i++) {
        indexArray.push(randArray[i].idx);
      }

      let shuffledB = [...indexArray];
      for (let i = sizeOfB - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        const tmp = shuffledB[j];
        shuffledB[j] = shuffledB[i];
        shuffledB[i] = tmp;
      }

      for (let i = sizeOfB - 1; i > 0; i--) {
        if (this.groupB[i].haveMatched === shuffledB[i]) {
          const j = Math.floor(rand() * (i + 1));
          const tmp = shuffledB[j];
          shuffledB[j] = shuffledB[i];
          shuffledB[i] = tmp;
        }
        this.groupB[i].haveMatched = shuffledB[i];
      }
      console.log(shuffledB);
      
      this.curCase = '2';
      localStorage.setItem('gra', JSON.stringify(this.groupA.map(d => ({ ...d, selected: undefined }))));
      localStorage.setItem('grb', JSON.stringify(this.groupB.map(d => ({ ...d, selected: undefined }))));
      localStorage.setItem(STORAGE_CURCASE, this.curCase);
      for (let i=0;i<sizeOfA;i++)
      {
        let newPair:PairDocC2 = {docA: this.groupA[i], docB:[]};
        for (let j=0;j<sizeOfB;j++)
          if (shuffledB[j]===newPair.docA.doctorId) newPair.docB.push(this.groupB[j]);
        this.resCase2.push(newPair);
      }
      console.log(this.resCase2);
      localStorage.setItem(STORAGE_RESCASE2,JSON.stringify(this.resCase2));
    }
    this.haveRandomed = true;
    const now = new Date();
      localStorage.setItem(
        STORAGE_DAY,
        new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString()
      );
  }

  closeResult() {
    this.haveRandomed = false;
    this.resOfMatchingDone = [];
    this.resOfMatchingFail = [];
    this.resCase2 = [];
    localStorage.setItem(STORAGE_CURCASE,'0');
    localStorage.setItem(STORAGE_RESCASE2, JSON.stringify(this.resCase2));
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

  closeWarning() {
    this.openWarning = false;
  }

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
    if (mode === 'cur') this.cancelEdit();
  }

  confirmAdd(inputEl: HTMLInputElement, group: string) {
    const name = inputEl.value.trim();
    if (!name) {
      this.confirmType = 'warning';
      this.openWarning = true;
      return;
    }

    this.openConfirm(
      'Thêm bác sĩ',
      `Bạn có chắc muốn thêm "${name}" vào ${group === 'gra' ? 'Group A' : 'Group B'}?`,
      'primary',
      () => {
        this.addDocNow(name, group);
        inputEl.value = '';
      }
    );
  }

  confirmDelete(item: Doctor, group: string) {
    this.openConfirm(
      'Xóa bác sĩ',
      `Bạn có chắc muốn xóa "${item.doctorName}" khỏi ${group === 'gra' ? 'Group A' : 'Group B'}?`,
      'danger',
      () => this.delDocNow(item.doctorId, group)
    );
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
      this.openConfirm('Vui lòng hoàn thành thay đổi', `Bạn có chắc muốn đổi tên thành "${name}"?`, 'primary', () =>
        this.saveEditNow(mode)
      );
    else
      this.openConfirm('Cập nhật tên bác sĩ', `Bạn có chắc muốn đổi tên thành "${name}"?`, 'primary', () =>
        this.saveEditNow(mode)
      );
  }
}
