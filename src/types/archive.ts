import { Tome } from "./tome";  

export interface Archive {
    id: string;
    name: string;
    tomes: Tome[];
}