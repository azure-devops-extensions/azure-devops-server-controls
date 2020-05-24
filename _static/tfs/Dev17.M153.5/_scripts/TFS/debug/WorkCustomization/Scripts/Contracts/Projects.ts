export interface IMigrateProjectProcessPayload {
    migratingProjects: IMigratingProjectDetails[];
}

export interface IMigratingProjectDetails {
    newProcessTypeId: string;
    projectId: string;
}