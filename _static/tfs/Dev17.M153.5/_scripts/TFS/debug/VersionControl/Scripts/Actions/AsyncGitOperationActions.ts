import TFS_React = require("Presentation/Scripts/TFS/TFS.React");

import VCContracts = require("TFS/VersionControl/Contracts");
import VCSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");

/**
 * A Git operation is being started (e.g. cherry-pick or revert).
 */
export let asyncRefOperationStarted = new TFS_React.Action<IAsyncRefOperationStartedPayload>();
export interface IAsyncRefOperationStartedPayload {
    asyncRefOperation: any;
}

/**
 * The creation state of an async ref operation is being changed.
 */
export let asyncRefOperationCreationStateChanged = new TFS_React.Action<ICreationStatePayload>();
export enum AsyncRefOperationCreationState {
    NotDesigning,
    Designing,
    Starting,
    Started
}
export enum AsyncRefOperationType {
    CherryPick,
    Revert
}
export interface ICreationStatePayload {
    state: AsyncRefOperationCreationState;
    operationType?: AsyncRefOperationType;
    ontoRef?: VCSpecs.IGitRefVersionSpec;
    generatedRef?: VCSpecs.IGitRefVersionSpec;
    sourceName?: string;
    errorMessage?: string;
    title?: string;
    subtitle?: string;
    simplifiedMode?: boolean;
}

/**
 * The onto ref for an async ref operation is changing.
 */
export let asyncRefOperationOntoRefChanged = new TFS_React.Action<IAsyncRefOperationRefChangedPayload>();
/**
 * The generated ref for an async ref operation is changing.
 */
export let asyncRefOperationGeneratedRefChanged = new TFS_React.Action<IAsyncRefOperationRefChangedPayload>();
export interface IAsyncRefOperationRefChangedPayload {
    ref: VCSpecs.IGitRefVersionSpec;
}

/**
 * The progress for an async git operation is updated.
 */
export let asyncGitOperationProgressUpdated = new TFS_React.Action<IAsyncGitOperationProgressUpdatedPayload>()
export interface IAsyncGitOperationProgressUpdatedPayload {
    operationId: number;
    progress: number;
    message: string;
}

/**
 * An async git operation completed.
 */
export let asyncGitOperationCompleted = new TFS_React.Action<IAsyncGitOperationProgressMessagePayload>();

/**
 * An async git operation encountered an error and failed.
 */
export let asyncGitOperationHadError = new TFS_React.Action<IAsyncGitOperationProgressMessagePayload>();
export interface IAsyncGitOperationProgressMessagePayload {
    operationId: number;
    message: string;
    newRefName?: string;
    newRefUrl?: string;
}

/**
 * A notification was received from SignalR for an async git operation.
 */
export let asyncGitOperationRealtimeNotificationReceived = new TFS_React.Action<IRealtimeNotificationReceivedPayload>();
export interface IRealtimeNotificationReceivedPayload {
    operationId: number;
}

export let loadedBranchNames = new TFS_React.Action<ILoadedBranchNamesPayload>();
export interface ILoadedBranchNamesPayload {
    branchNames: string[];
}