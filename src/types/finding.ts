export interface Finding {
    id?: string;
    chunkId: string;
    phrase: string;
    start_offset: number;
    end_offset: number;
    kind: string;
    suggestedRewrite: string;
    clarifyingQuestion: string;
    severity: number;
}