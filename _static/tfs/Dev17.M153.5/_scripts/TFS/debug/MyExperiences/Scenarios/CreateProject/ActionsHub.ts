import { Action } from "VSS/Flux/Action";
import {
    StatusValueType,
    IProjectCreationMetadata,
    IUrlParameters
} from "MyExperiences/Scenarios/CreateProject/Contracts";

export interface IProjectCreationMetadataLoadedPayload {
    projectCreationMetadata: IProjectCreationMetadata;
    urlParameters: IUrlParameters;
    status: IStatusPayload;
}

export interface IProjectCreationStatusPayload {
    projectName: string;
    projectUrl: string;
    projectCreationJobId?: string;
    status: IStatusPayload;
}

export interface IProjectNameValidationStatusPayload {
    projectName: string;
    meetsRequirements: boolean;
    status: IStatusPayload;
}

export interface IStatusPayload {
    value: StatusValueType;
    message: string;
    detailedMessage?: string;
}

/**
 * A container for the current instances of the actions that can be triggered from the create project control
 */
export class ActionsHub {
    public projectCreationMetadataLoadStarted = new Action<IProjectCreationMetadataLoadedPayload>();
    public projectCreationMetadataLoadSucceeded = new Action<IProjectCreationMetadataLoadedPayload>();
    public projectCreationMetadataLoadFailed = new Action<IProjectCreationMetadataLoadedPayload>();

    // Project creation actions
    public projectCreationStarted = new Action<IProjectCreationStatusPayload>();
    public projectCreationSucceeded = new Action<IProjectCreationStatusPayload>();
    public projectCreationFailed = new Action<IProjectCreationStatusPayload>();

    // Project name validation actions
    public projectNameValidationSucceeded = new Action<IProjectNameValidationStatusPayload>();
    public projectNameValidationFailed = new Action<IProjectNameValidationStatusPayload>();
    public projectNameValidationReset = new Action<IProjectNameValidationStatusPayload>();

    // Project params changed actions
    public projectDescriptionChanged = new Action<string>();
    public versionControlChanged = new Action<number>();
    public projectVisibilityChanged = new Action<number>();
    public processTemplateChanged = new Action<string>();

    // Status dismissed action
    public statusDismissed = new Action<void>();
}