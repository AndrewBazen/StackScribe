import { Entry } from "./entry";

export interface Tome {
    id: string;
    name: string;
    entries: Entry[];
}