export interface IClassificationFieldsMru {
    projectId: string;
    areaPathMru: number[];
    iterationPathMru: number[];
}

export interface IAreaPathMruData {
    projectId: string;
    values: number[];
}

export interface IIterationPathMruData {
    projectId: string;
    values: number[];
}