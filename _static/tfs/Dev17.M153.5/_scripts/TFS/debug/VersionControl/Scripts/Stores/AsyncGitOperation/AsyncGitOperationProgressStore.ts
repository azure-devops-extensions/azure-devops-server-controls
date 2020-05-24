import * as TFS_React from "Presentation/Scripts/TFS/TFS.React";
import * as AsyncGitOperationActions from "VersionControl/Scripts/Actions/AsyncGitOperationActions";

/**
 * The current progress of an async operation.
 */
export interface IAsyncGitOperationProgressState {
    /**
     * The progress as a percent between 0 and 100.
     */
    progressPercent: number;
    /**
     * The current progress message for the operation.
     */
    message: string;
    /**
     * Did the operation encounter an error and failed to complete?
     */
    isError: boolean;
    /**
     * Did the operation complete successfully?
     */
    isComplete: boolean;
    /**
     * new Topic Branch Ref name and URL that is generated when operation completes
     */
    newRefName?: string;
    newRefUrl?: string;
}

/**
 * Stores progress information about an asynchronous git operation.
 */
export class AsyncGitOperationProgressStore extends TFS_React.Store {
    private _progressData: { [operationId: number]: IAsyncGitOperationProgressState } = {};

    /**
     * Creates a progress store for an operation with a given id. This should only be called by the factory that creates progress stores.
     * @param operationId The operation id to track the progress for.
     */
    constructor() {
        super("AsyncGitOperationProgressChanged");
        AsyncGitOperationActions.asyncGitOperationCompleted.addListener(this._onOperationCompleted);
        AsyncGitOperationActions.asyncGitOperationHadError.addListener(this._onOperationError);
        AsyncGitOperationActions.asyncGitOperationProgressUpdated.addListener(this._progressUpdated);
    }

    private _progressUpdated = (payload: AsyncGitOperationActions.IAsyncGitOperationProgressUpdatedPayload) => {
        const previousData = this._progressData[payload.operationId];
        this._progressData[payload.operationId] = {
            progressPercent: payload.progress ? payload.progress : 0,
            message: payload.message,
            isComplete: previousData != null ? previousData.isComplete : false,
            isError: previousData != null ? previousData.isError : false,
        };
        this.emitChanged();
    }

    private _onOperationCompleted = (payload: AsyncGitOperationActions.IAsyncGitOperationProgressMessagePayload) => {
        const previousData = this._progressData[payload.operationId];
        this._progressData[payload.operationId] = {
            progressPercent: 1.00,
            message: payload.message,
            isComplete: true,
            isError: previousData != null ? previousData.isError : false,
            newRefName: payload.newRefName,
            newRefUrl: payload.newRefUrl, 
        };
        this.emitChanged();
    }

    private _onOperationError = (payload: AsyncGitOperationActions.IAsyncGitOperationProgressMessagePayload) => {
        const previousData = this._progressData[payload.operationId];
        this._progressData[payload.operationId] = {
            progressPercent: previousData != null ? previousData.progressPercent : 0,
            message: payload.message,
            isComplete: previousData != null ? previousData.isComplete : false,
            isError: true,
        };
        this.emitChanged();
    }

    /**
     * Get the progress information for an operation, if it is currently being tracked.
     * @param operationId The id of the operation.
     */
    public getProgressForOperation(operationId: number) {
        return this._progressData[operationId];
    }
}

export let Progress = new AsyncGitOperationProgressStore();