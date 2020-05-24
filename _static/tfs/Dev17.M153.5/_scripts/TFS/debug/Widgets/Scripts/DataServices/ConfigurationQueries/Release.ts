export interface Release{
    ReleaseSK: number;
    ReleaseId: number;
    ReleaseDefinitionId: number;

    //SPECULATIVE - Everything below here is based on op-store payload, which is not yet supported from Analytics
    Name: string;
}
