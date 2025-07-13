import { Entry } from "./entry";

export interface Tome {
    id: string;
    archive_id: string;
    name: string;
    description?: string;
    created_at: string;
    updated_at: string;
}