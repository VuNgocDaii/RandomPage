import { Component, OnInit } from '@angular/core';
import { DoctorService } from '../../service/doctor-service';
import { Doctor } from '../../model/doctor';
import { FormsModule } from '@angular/forms';
const STORAGE_DAY = 'curday';
const STORAGE_RES = 'curRes';

class PairDoc {
  docA!: Doctor;
  docB: Doctor | null = null;
}

@Component({
  selector: 'app-random-page',
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
  currentGroup: 'gra' | 'grb' = 'gra';

  ngOnInit() {
    this.reloadGroups();

    const todayISO = this.getTodayISO();
    const savedDay = localStorage.getItem(STORAGE_DAY);

    if (savedDay === todayISO) {
      this.haveRandomed = true;

      const json = localStorage.getItem(STORAGE_RES);
      if (json) {
        this.res = JSON.parse(json) as PairDoc[];
      }
    } else {
      this.haveRandomed = false;
    }
  }

  addDoc(name: string, group: string) {
    if (!name.trim()) return;

    this.docService.add(name, group);
    this.reloadGroups();
  }

  delDoc(id: number, group: string) {
    this.docService.del(id, group);
    this.reloadGroups();
  }

  reloadGroups() {
    this.groupA = this.docService.load('gra');
    this.groupB = this.docService.load('grb');
  }

  openPopup(group: 'gra' | 'grb') {
    this.currentGroup = group;
    this.bulkText = '';
    this.showPopup = true;
  }

  closePopup() {
    this.showPopup = false;
  }

  confirmBulkAdd() {
    if (!this.bulkText.trim()) return;

    const names = this.bulkText
      .split('\n')
      .map(x => x.trim())
      .filter(x => x.length > 0);

    names.forEach(name => {
      this.docService.add(name, this.currentGroup);
    });

    this.reloadGroups();
    this.closePopup();
  }

  random() {
    this.res = [];

    const n = this.groupA.length;
    const m = this.groupB.length;

    if (m > n || n === 0) return;
    // fill n length array with value = 0
    const binary: number[] = new Array(n).fill(0);

    // random m  numbers 1 in n length array
    let count = 0;
    while (count < m) {
      const index = Math.floor(Math.random() * n);
      if (binary[index] === 0) {
        binary[index] = 1;
        count++;
      }
    }

    // shuffle group B
    let shuffledB = [...this.groupB];
    for (let i = m - 1; i > 0; i--) {
      let j = Math.floor(Math.random() * (i + 1));
      let tmp = shuffledB[j];
      shuffledB[j] = shuffledB[i];
      shuffledB[i] = tmp;
    }

    let j = 0;
    console.log(shuffledB);
    // match result
    for (let i = 0; i < n; i++) {
      if (binary[i] === 1) {
        console.log(j, shuffledB[j].doctorName);
        if (this.groupA[i].haveMatched !== shuffledB[j].doctorId)
          this.groupA[i].haveMatched = shuffledB[j].doctorId;
        else {
          const index = Math.floor(Math.random() * (j + 1));
          let tmp = shuffledB[j];
          shuffledB[j] = shuffledB[index];
          shuffledB[index] = tmp;
          this.groupA[i].haveMatched = shuffledB[j].doctorId;
        }
      }
      if (binary[i] === 0) {
        this.groupA[i].haveMatched = -1;
      }
      this.res.push({
        docA: this.groupA[i],
        docB: binary[i] === 1 ? shuffledB[j++] : null,
      });
      if (binary[i] === 0) {
        this.resOfMatchingDone.push({
          docA: this.groupA[i],
          docB: binary[i] === 1 ? shuffledB[j++] : null,
        });
      } else {
        this.resOfMatchingFail.push({
        docA: this.groupA[i],
        docB: binary[i] === 1 ? shuffledB[j++] : null,
      });
      }
    }

    // console.log('Binary:', binary);
    console.log(this.res);
    let now = new Date();
    localStorage.setItem(STORAGE_DAY, new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString());
    localStorage.setItem(STORAGE_RES, JSON.stringify(this.res));
    // console.log(localStorage.getItem(STORAGE_DAY),new Date().toISOString());
    this.haveRandomed = true;
  }



  getTodayISO(): string {
    const now = new Date();
    return new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0, 0, 0, 0
    ).toISOString();
  }
}
