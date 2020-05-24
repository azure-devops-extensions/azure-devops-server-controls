/**
   Interface to return if task group references are being contributed
*/
export interface ITaskGroupReferencesProvider {
    /**
    Method that will be called when references of a task group are required
    @param taskGroupId task group's id
    */
    fetchTaskGroupReferences(taskGroupId: string): IPromise<ITaskGroupReferenceGroup>;
}

/**
  Defines each reference
*/
export interface ITaskGroupReference {
    displayName: string;
    url?: string;
    childReferenceTypeDisplayName?: string;
    childReferences?: ITaskGroupReference[];
}

/**
  Defines the reference type along with the references
*/
export interface ITaskGroupReferenceGroup {
    displayName: string;
    referenceIcon: string;
    references: ITaskGroupReference[];
}