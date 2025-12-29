export class Doctor {
    doctorId:number;
    doctorName: string;
    haveMatched: number = 0;
    constructor(id: number, name: string) {
        this.doctorId = id;
        this.doctorName = name;
    }
}
