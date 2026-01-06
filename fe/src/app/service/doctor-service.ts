import { Injectable } from '@angular/core';
import { Doctor } from '../model/doctor';

@Injectable({
  providedIn: 'root',
})
export class DoctorService {
  genNewId(group: string): number {
    const raw = localStorage.getItem(group + 'id');
    let newId = raw ? Number(raw) : 1;
    if (!Number.isFinite(newId) || newId < 0) newId = 0;
    localStorage.setItem(group + 'id', String(newId + 1));
    return newId;
  }

  add(name: string, group: string) {
    if (!name || !name.trim()) return;
    const raw = localStorage.getItem(group);
    const docs: Doctor[] = raw ? JSON.parse(raw) : [];
    const doc = new Doctor(this.genNewId(group), name.trim());
    docs.push(doc);
    localStorage.setItem(group, JSON.stringify(docs));
  }

  load(group: string): Doctor[] {
    const data = localStorage.getItem(group);
    if (!data) return [];
    try {
      return JSON.parse(data) as Doctor[];
    } catch {
      return [];
    }
  }

  del(id: number, group: string) {
    const raw = localStorage.getItem(group);
    let docs: Doctor[] = raw ? JSON.parse(raw) : [];
    const filteredDocs = docs.filter(doc => doc.doctorId !== id);
    localStorage.setItem(group, JSON.stringify(filteredDocs));
  }

  delAll(group: string) {
    localStorage.setItem(group, JSON.stringify([]));
  }

  edit(id: number, name: string, group: string) {
    let docs = this.load(group);
    const index = docs.findIndex(t => t.doctorId === id);

    if (index > -1) {
      docs[index].doctorName = name;
      localStorage.setItem(group, JSON.stringify(docs));
    }
  }
}
