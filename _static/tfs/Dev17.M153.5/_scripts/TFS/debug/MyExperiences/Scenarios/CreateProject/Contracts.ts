export interface IProjectCreationMetadata {
    collectionName: string;
    collectionId: string;
    canUserCreateProject: boolean;
    existingProjectNames: string[];
    versionControlMetadata: IProjectCreationMetadataItemDescriptor[];
    projectVisibilityMetadata: IProjectCreationMetadataItemDescriptor[];
    processTemplatesMetadata: IProcessTemplateDescriptor[];
    isReportingConfigured: boolean;
}

export interface INewProjectParameters {
    collectionId: string;
    projectName: string;
    projectDescription: string;
    processTemplateId: string;
    processTemplateTypeId: string;
    versionControlOption: string;
    projectVisibilityOption?: string;
    source?: string;
}

export interface IUrlParameters {
    source?: string;
    processTemplate?: string;
    versionControl?: string;
}

export interface IProjectCreationMetadataItemDescriptor {
    id: string;
    name: string;
    description: string;
    isDefault: boolean;
    isDisabled: boolean;
}

export interface IProcessTemplateDescriptor {
    id: string;
    name: string;
    description: string;
    isDefault: boolean;
    typeId: string;
    inherits: string;
    isSystemTemplate: boolean;
}

// Needed for combo box source
export interface IParentComboItem {
    text: string;
    children?: IChildComboItem[]
}

// Needed for combo box source
export interface IChildComboItem {

    text: string;
}

export enum StatusValueType {
    NoStatus,
    Success,
    Failure,
    InProgress,
    Warning
}

export enum StatusType {
    PageStatus,
    CreationStatus,
    InputValidationStatus
}

export var TypeInfo = {
    IProjectCreationMetadataItemDescriptor: <any>{
    },
    IProcessTemplateDescriptor: <any>{
    }
}