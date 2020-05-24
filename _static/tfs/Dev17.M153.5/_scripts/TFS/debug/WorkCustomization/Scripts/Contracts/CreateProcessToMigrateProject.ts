export interface CreateProcessToMigrateProjectRequestPayload {
    /** projectId for the project */
    projectId: string;

    /** work item type to open after migration */
    workItemTypeId: string;
}