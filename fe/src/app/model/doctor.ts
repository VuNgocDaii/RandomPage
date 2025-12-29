export class Doctor {
    doctorId:number;
    doctorName: string;
    haveMatched: number = -1;
    constructor(id: number, name: string) {
        this.doctorId = id;
        this.doctorName = name;
    }
}
