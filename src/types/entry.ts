export interface Entry {
    id: string;
    tome_id: string;
    title: string;
    content: string;
    created_at: string;
    updated_at: string;
    name?: string; // For backwards compatibility
}