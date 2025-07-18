export interface Entry {
    id: string;
    tome_id: string;
    name: string;
    content: string;
    entry_type: 'generic' | 'requirement' | 'specification' | 'meeting' | 'design' | 'implementation' | 'test' | 'other';
    created_at: string;
    updated_at: string;
}