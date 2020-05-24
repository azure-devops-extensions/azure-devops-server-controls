export interface IProcess {
    templateTypeId: string;
    name: string;
    referenceName: string;
    description: string;
    isEnabled: boolean;
    isDefault: boolean;
    isSystemTemplate: boolean;
    isInheritedTemplate: boolean;
    editPermission: boolean;
    deletePermission: boolean;
    createPermission: boolean;
    allProjectsCount: number;
    projects: IProjectData[];
    parentTemplateTypeId: string;
}

export interface IProjectData {
    name: string;
    description: string;
}


export interface ICreateProcessRequestPayload {
    name: string;
    description: string;
    parentTypeId: string;
    referenceName?: string;
    navigate?: boolean;
}

export interface ICloneProcessRequestPayload {
    name: string;
    description: string;
    parentTypeId: string;
    processTypeId: string;
    processes: IProcess[];
    isEnabled: boolean;
}

export interface IUpdateProcessRequestPayload {
    templateTypeId: string;
    name: string;
    description: string;
}

export interface IDeleteProcessRequestPayload {
    templateTypeId: string;
}

export interface ISetEnableProcessPayload {
    templateTypeId: string;
    isEnabled: boolean;
}

export interface ISetDefaultProcessPayload {
    templateTypeId: string;
}

export interface ICreateInheritedProcessRequestPayload {
    projectId: string;
    workItemType: string;
    processName: string;
    parentProcessTypeId: string;
}

export interface IMigrateInheritedProcessRequestPayload {
    projectId: string;
    process: IProcess;
    workItemType: string;
}
