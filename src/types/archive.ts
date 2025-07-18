import { Tome } from "./tome";  

export interface Archive {
    id: string;
    name: string;
    description?: string;
    created_at: string;
    updated_at: string;
}