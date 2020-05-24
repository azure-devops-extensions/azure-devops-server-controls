import VSS = require("VSS/VSS");
import React = require("react");
import * as TFS_React from "Presentation/Scripts/TFS/TFS.React";
import { IHostArtifact } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Contracts";
import { LinkChange, IFieldChange, ILinkChanges, IAttachmentChanges } from "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/Interfaces";

export interface ITestStepHistoryProps extends TFS_React.IProps {
    fieldChange: IFieldChange;
    attachmentChanges?: IAttachmentChanges;
    linkChanges?: ILinkChanges;
    hostArtifact?: IHostArtifact;
}

export interface ITestStepAttachments {
    added: JSX.Element[];
    deleted: JSX.Element[];
}

export interface ITestStepMetaData {
    id: number;
    action: any;
    expectedResult: any;
    attachments?: ITestStepAttachments;
    type: string;
    stepNumber: number;
}

export enum ITestStepChangeType {
    Added,
    Deleted,
    Edited
}

export interface ITestStepChange {
    type: ITestStepChangeType;
    newValue?: ITestStepMetaData;
    oldValue?: ITestStepMetaData;
}

export interface IRelationLinks {
    added: JSX.Element[];
    deleted: JSX.Element[];
}

export class TestStepActionType {
    public static SharedSteps: string = "SharedSteps";
    public static Step: string = "Step";
}

export class TestStepChangeType {
    public static AddedStep: string = "Added step";
    public static DeletedStep: string = "Deleted step";
    public static UpdatedStep: string = "Updated step";
    public static PreviousStep: string = "Previous step";
}

// TFS plug-in model requires this call for each TFS module.
VSS.tfsModuleLoaded("TFS.TestManagement.TestStepHistoryModel", exports);