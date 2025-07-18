export interface Requirement {
    title: string;
    description: string;
    acceptanceCriteria: string[];
    nonFunctionalRequirements: string[];
    constraints: string[];
    dependencies: string[];
    risks: string[];
    assumptions: string[];
    chunkId: string;
    start_offset: number;
    end_offset: number;
} 