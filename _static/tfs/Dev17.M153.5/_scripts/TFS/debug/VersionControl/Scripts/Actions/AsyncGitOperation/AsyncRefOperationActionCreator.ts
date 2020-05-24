import * as VCContracts from "TFS/VersionControl/Contracts";
import * as AsyncGitOperationActions from "VersionControl/Scripts/Actions/AsyncGitOperationActions";
import { AsyncRefOperationEvents, AsyncGitOperationHub } from "VersionControl/Scripts/Components/AsyncGitOperation/AsyncGitOperationHub";
import * as GitRefUtils from "VersionControl/Scripts/GitRefUtility";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as GitRefService from "VersionControl/Scripts/Services/GitRefService";
import { AsyncRefOperationServerSource } from "VersionControl/Scripts/Sources/AsyncRefOperationServerSource";
import { AsyncRefDesignStoreInstance } from "VersionControl/Scripts/Stores/AsyncGitOperation/AsyncRefDesignStore";
import * as VCSpecs from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import * as VSS_Events from "VSS/Events/Services";
import * as Utils_String from "VSS/Utils/String";

interface IOperationMessages {
    progressMessageTemplate: string;
    conflictMessageTemplate: string;
    completedMessageTemplate: string;
    timeoutMessage: string;
    failureMessage: string;
    failureMessageTemplate: string;
    pollingFailedMessage: string;
}

class OperationMessageMap {
    private static messages: { [operationType: number]: IOperationMessages } = {
        [AsyncGitOperationActions.AsyncRefOperationType.CherryPick]: {
            progressMessageTemplate: VCResources.CherryPick_ProgressMessage,
            conflictMessageTemplate: VCResources.CherryPick_Conflict,
            completedMessageTemplate: VCResources.CherryPick_Completed,
            timeoutMessage: VCResources.CherryPick_Timeout,
            failureMessage: VCResources.CherryPick_FailureMessage,
            failureMessageTemplate: VCResources.CherryPick_FailureMessageTemplate,
            pollingFailedMessage: VCResources.CherryPick_Dialog_PollingFailed,
        },
        [AsyncGitOperationActions.AsyncRefOperationType.Revert]: {
            progressMessageTemplate: VCResources.Revert_ProgressMessage,
            conflictMessageTemplate: VCResources.Revert_Conflict,
            completedMessageTemplate: VCResources.Revert_Completed,
            timeoutMessage: VCResources.Revert_Timeout,
            failureMessage: VCResources.Revert_FailureMessage,
            failureMessageTemplate: VCResources.Revert_FailureMessageTemplate,
            pollingFailedMessage: VCResources.Revert_Dialog_PollingFailed,
        },
    };

    private operationTypeMap: { [operationId: number]: AsyncGitOperationActions.AsyncRefOperationType } = {};

    public registerOperationType(operationId: number, asyncRefOperationType: AsyncGitOperationActions.AsyncRefOperationType) {
        this.operationTypeMap[operationId] = asyncRefOperationType;
    }

    public getMessagesForOperation(operationId: number) {
        if (OperationMessageMap.messages.hasOwnProperty(this.operationTypeMap[operationId].toString())) {
            return OperationMessageMap.messages[this.operationTypeMap[operationId]];
        } else {
            return null;
        }
    }

    public getOperationType(operationId: number): AsyncGitOperationActions.AsyncRefOperationType {
        return this.operationTypeMap[operationId];
    }
}

// tslint:disable-next-line:max-classes-per-file
export class AsyncRefOperationActionCreator {
    private static POLLING_DELAY_MS = 3000;
    private _messagesMap: OperationMessageMap = new OperationMessageMap();
    private _backendSource: AsyncRefOperationServerSource;
    private _repositoryContext: GitRepositoryContext = null;
    private _asyncGitOperationHub: AsyncGitOperationHub;
    private _gitRefService: GitRefService.IGitRefService;

    constructor(backendSource: AsyncRefOperationServerSource, asyncGitOperationHub?: AsyncGitOperationHub, gitRefService?: GitRefService.IGitRefService) {
        this._bindEvents();
        this._backendSource = backendSource;

        // optional parameters used for testing
        if (asyncGitOperationHub) {
            this._asyncGitOperationHub = asyncGitOperationHub;
        }
        if (gitRefService) {
            this._gitRefService = gitRefService;
        }
    }

    /**
     * Start a cherry-pick on the server.
     * @param repository The repository the cherry-pick is in
     * @param ontoRef The ref to cherry-pick the source onto
     * @param generatedRef The branch name for the cherry-pick
     * @param source The source of the cherry-pick (PR or commit SHA)
     * @param sourceName The name of the source of the cherry-pick
     */
    public startOperation(
        repositoryContext: GitRepositoryContext,
        ontoRef: VCSpecs.IGitRefVersionSpec,
        generatedRef: VCSpecs.IGitRefVersionSpec,
        source: VCContracts.GitAsyncRefOperationSource,
        sourceName: string,
        operationType: AsyncGitOperationActions.AsyncRefOperationType,
    ): void {

        if (!ontoRef) {
            this._showAsyncRefOperationError(VCResources.BranchNameCannotBeEmpty, ontoRef, generatedRef, sourceName, AsyncGitOperationActions.AsyncRefOperationType.CherryPick);
            return;
        }

        this._repositoryContext = repositoryContext;
        AsyncGitOperationActions.asyncRefOperationCreationStateChanged.invoke({ state: AsyncGitOperationActions.AsyncRefOperationCreationState.Starting });
        const repository = repositoryContext.getRepository();
        const parameters: VCContracts.GitAsyncRefOperationParameters = {
            ontoRefName: ontoRef.toFullName(),
            generatedRefName: generatedRef ? generatedRef.toFullName() : null,
            repository,
            source,
        };
        const repositoryId: string = repository.id;
        const projectId: string = repository.project.id;

        if (operationType === AsyncGitOperationActions.AsyncRefOperationType.CherryPick) {
            this._backendSource.createCherryPick(projectId, repositoryId, parameters).then(
                cherryPick => {
                    this._messagesMap.registerOperationType(cherryPick.cherryPickId, AsyncGitOperationActions.AsyncRefOperationType.CherryPick);
                    this._subscribeToProgress(cherryPick.cherryPickId);
                    this._startPolling(repositoryContext, cherryPick.cherryPickId, AsyncGitOperationActions.AsyncRefOperationType.CherryPick);
                    AsyncGitOperationActions.asyncRefOperationStarted.invoke({
                        asyncRefOperation: cherryPick,
                    });
                },
                (error: any) => {
                    this._showAsyncRefOperationError(this._getServerError(error), ontoRef, generatedRef, sourceName, AsyncGitOperationActions.AsyncRefOperationType.CherryPick);
                });
        }
        else if (operationType === AsyncGitOperationActions.AsyncRefOperationType.Revert) {
            this._backendSource.createRevert(projectId, repositoryId, parameters).then(
                revert => {
                    this._messagesMap.registerOperationType(revert.revertId, AsyncGitOperationActions.AsyncRefOperationType.Revert);
                    this._subscribeToProgress(revert.revertId);
                    this._startPolling(repositoryContext, revert.revertId, AsyncGitOperationActions.AsyncRefOperationType.Revert);
                    AsyncGitOperationActions.asyncRefOperationStarted.invoke({
                        asyncRefOperation: revert,
                    });
                },
                (error: any) => {
                    this._showAsyncRefOperationError(this._getServerError(error), ontoRef, generatedRef, sourceName, AsyncGitOperationActions.AsyncRefOperationType.Revert);
                });
        }
    }

    /**
     * Initialize the async ref operation stores for designing an async ref operation.
     * @param sourceName The name of the source of the operation.
     * @param simplifiedMode If true performs operation on ontoRef without creating new branch
     */
    public startDesigningAsyncRefOperation(
        repositoryContext: GitRepositoryContext,
        sourceName: string,
        title: string,
        operationType: AsyncGitOperationActions.AsyncRefOperationType,
        ontoRef?: VCSpecs.IGitRefVersionSpec,
        subtitle?: string,
        simplifiedMode?: boolean) {

        AsyncGitOperationActions.asyncRefOperationCreationStateChanged.invoke({
            state: AsyncGitOperationActions.AsyncRefOperationCreationState.Designing,
            operationType,
            title,
            subtitle,
            ontoRef,
            sourceName,
            simplifiedMode,
        });

        if (!simplifiedMode) {
            const refService = this._gitRefService ? this._gitRefService : GitRefService.getGitRefService(repositoryContext);
            refService.getBranchNames().then(branchNames => {
                AsyncGitOperationActions.loadedBranchNames.invoke({
                    branchNames,
                });
            });
        }
    }

    /**
     * Set the onto ref for the current async ref operation being designed.
     * @param ref The new onto ref.
     */
    public setAsyncRefOperationOntoRef(ref: VCSpecs.IGitRefVersionSpec) {
        AsyncGitOperationActions.asyncRefOperationOntoRefChanged.invoke({ ref });
    }

    /**
     * Set the generated ref for the current async ref operation being designed.
     * @param ref The new generated ref.
     */
    public setAsyncRefOperationGeneratedRef(ref: VCSpecs.IGitRefVersionSpec) {
        AsyncGitOperationActions.asyncRefOperationGeneratedRefChanged.invoke({ ref });
    }

    /**
     * Updates the stores to end the current async ref operation design experience.
     * @param operationId The current operation id if the operation has been started.
     */
    public closeAsyncRefOperationExperience(operationId?: number) {
        if (operationId) {
            this._unsubscribeFromProgress(operationId);
        }
        AsyncGitOperationActions.asyncRefOperationCreationStateChanged.invoke({
            state: AsyncGitOperationActions.AsyncRefOperationCreationState.NotDesigning,
        });
    }

    /**
     * Navigates to New Pull request page
     */
    public createNewPullRequest(
        repositoryContext: GitRepositoryContext,
        generatedRefName: string,
        ontoRefName: string,
        pullRequestTitle: string,
        pullRequestDescription: string) {

        this._setSessionItem("TFS-PR-GENREF", generatedRefName);
        this._setSessionItem("TFS-PR-ONTOREF", ontoRefName);
        this._setSessionItem("TFS-PR-TITLE", pullRequestTitle);
        this._setSessionItem("TFS-PR-DESC", pullRequestDescription);

        window.location.href = VersionControlUrls.getCreatePullRequestUrl(
            repositoryContext,
            generatedRefName,
            ontoRefName,
            null,
            null,
            null,
            repositoryContext.getRepositoryId(),  // force create from/into repos to be the same as the context repo
            repositoryContext.getRepositoryId()); // this prevents funny business where we try to "smartly" decide the repo defaults
    }

    private _setSessionItem(key: string, value: string): void {
        if (value || value === "") {
            sessionStorage.setItem(key, value);
        }
        else {
            // use remove item because setItem(key, null) will lead to "null" instead of an actual null
            sessionStorage.removeItem(key);
        }
    }

    private _showAsyncRefOperationError(
        errorMessage: string,
        ontoRef: VCSpecs.IGitRefVersionSpec,
        generatedRef: VCSpecs.IGitRefVersionSpec,
        sourceName: string,
        operationType: AsyncGitOperationActions.AsyncRefOperationType) {
        AsyncGitOperationActions.asyncRefOperationCreationStateChanged.invoke({
            state: AsyncGitOperationActions.AsyncRefOperationCreationState.Designing,
            operationType,
            ontoRef,
            generatedRef,
            sourceName,
            errorMessage,
        });
    }

    private _getOperationAsync(repositoryContext: GitRepositoryContext, operationId: number, operationType: AsyncGitOperationActions.AsyncRefOperationType): IPromise<VCContracts.GitAsyncRefOperation> {
        let operationPromise: IPromise<VCContracts.GitAsyncRefOperation>;
        const repository = repositoryContext.getRepository();
        switch (operationType) {
            case AsyncGitOperationActions.AsyncRefOperationType.CherryPick:
                operationPromise = this._backendSource.getCherryPickById(repository.project.id, repository.id, operationId);
                break;
            case AsyncGitOperationActions.AsyncRefOperationType.Revert:
                operationPromise = this._backendSource.getRevertById(repository.project.id, repository.id, operationId);
                break;
            default:
                throw new Error("Unsupported operationType or operationType was not specified");
        }
        return operationPromise;
    }

    private _startPolling(repositoryContext: GitRepositoryContext, operationId: number, operationType: AsyncGitOperationActions.AsyncRefOperationType) {
        let timeoutId: number = null;

        const poll = () => {
            const operationPromise = this._getOperationAsync(repositoryContext, operationId, operationType);
            operationPromise.then(
                operation => {
                    let repoll = false;
                    switch (operation.status) {
                        case VCContracts.GitAsyncOperationStatus.Completed:
                            this._repositoryContext = repositoryContext;
                            this._setCompleted(this, {
                                operationId,
                                newRefName: GitRefUtils.getRefFriendlyName(operation.parameters.generatedRefName),
                            } as VCContracts.AsyncRefOperationCompletedNotification);
                            break;

                        case VCContracts.GitAsyncOperationStatus.Failed:
                            if (operation.detailedStatus && operation.detailedStatus.conflict) {
                                AsyncGitOperationActions.asyncGitOperationHadError.invoke({
                                    operationId: operationId,
                                    message: Utils_String.format(this._messagesMap.getMessagesForOperation(operationId).conflictMessageTemplate, operation.detailedStatus.currentCommitId),
                                });
                            }
                            else {
                                this._setFailedMessage(operation, operationId);
                            }
                            break;

                        case VCContracts.GitAsyncOperationStatus.InProgress:
                            if (operation.detailedStatus) {
                                this._updateProgress(this, {
                                    operationId,
                                    progress: operation.detailedStatus.progress,
                                    commitId: operation.detailedStatus.currentCommitId,
                                } as VCContracts.AsyncRefOperationProgressNotification);
                            }
                            repoll = true;
                            break;

                        case VCContracts.GitAsyncOperationStatus.Queued:
                            repoll = true;
                            break;

                        default:
                            throw new Error("Unsupported operation status or operation status was not specified");
                    }
                    if (repoll) {
                        timeoutId = setTimeout(poll, AsyncRefOperationActionCreator.POLLING_DELAY_MS);
                    }
                },
                () => timeoutId = setTimeout(poll, AsyncRefOperationActionCreator.POLLING_DELAY_MS));
        };

        timeoutId = setTimeout(poll, AsyncRefOperationActionCreator.POLLING_DELAY_MS);
        AsyncGitOperationActions.asyncGitOperationRealtimeNotificationReceived.addListener(payload => {
            if (payload.operationId === operationId) {
                clearTimeout(timeoutId);
            }
        });
    }

    /**
     * Subscribe to progress notifications for a given async git operation.
     * @param operationId The id for the operation.
     */
    private _subscribeToProgress(operationId: number) {
        this._asyncGitOperationHub ? this._asyncGitOperationHub.subscribe(operationId) : AsyncGitOperationHub.getHub().subscribe(operationId);
    }

    /**
     * Unsubscribe from progress notifications for a given async git operation.
     * @param operationId The id for the operation.
     */
    private _unsubscribeFromProgress(operationId: number) {
        this._asyncGitOperationHub ? this._asyncGitOperationHub.unsubscribe(operationId) : AsyncGitOperationHub.getHub().unsubscribe(operationId);
    }

    private _bindEvents(): void {
        VSS_Events.getService().attachEvent(AsyncRefOperationEvents.PROGRESS, this._updateProgress);
        VSS_Events.getService().attachEvent(AsyncRefOperationEvents.FAILURE, this._setError);
        VSS_Events.getService().attachEvent(AsyncRefOperationEvents.COMPLETION, this._setCompleted);
        VSS_Events.getService().attachEvent(AsyncRefOperationEvents.TIMEOUT, this._setTimeout);
    }

    private _updateProgress = (sender: any, notification: VCContracts.AsyncGitOperationNotification) => {
        if (isAsyncRefProgressNotification(notification)) {
            AsyncGitOperationActions.asyncGitOperationRealtimeNotificationReceived.invoke({
                operationId: notification.operationId,
            });
            AsyncGitOperationActions.asyncGitOperationProgressUpdated.invoke({
                operationId: notification.operationId,
                progress: notification.progress,
                message: Utils_String.format(this._messagesMap.getMessagesForOperation(notification.operationId).progressMessageTemplate, notification.commitId),
            });
        }
    }

    private _setError = (sender: any, notification: VCContracts.AsyncGitOperationNotification) => {
        AsyncGitOperationActions.asyncGitOperationRealtimeNotificationReceived.invoke({
            operationId: notification.operationId,
        });

        if (isAsyncRefConflictNotification(notification)) {
            AsyncGitOperationActions.asyncGitOperationHadError.invoke({
                operationId: notification.operationId,
                message: Utils_String.format(this._messagesMap.getMessagesForOperation(notification.operationId).conflictMessageTemplate, notification.commitId),
            });
        }
        else {
            const operationType = this._messagesMap.getOperationType(notification.operationId);
            this._getOperationAsync(this._repositoryContext, notification.operationId, operationType).then(
                operation => {
                    this._setFailedMessage(operation, notification.operationId);
                }
            );
        }
    }

    private _setFailedMessage(operation: VCContracts.GitAsyncRefOperation, operationId: number) {
        if (operation.status === VCContracts.GitAsyncOperationStatus.Failed) {
            const message = this._getDetailedFailureMessage(operation, operationId);

            if (operation.detailedStatus) {
                switch (operation.detailedStatus.status) {
                    case VCContracts.GitAsyncRefOperationFailureStatus.CreateBranchPermissionRequired:
                    case VCContracts.GitAsyncRefOperationFailureStatus.WritePermissionRequired:
                    case VCContracts.GitAsyncRefOperationFailureStatus.InvalidRefName:
                    case VCContracts.GitAsyncRefOperationFailureStatus.RefNameConflict: {
                        // get back to designing view and show branch validation error
                        AsyncGitOperationActions.asyncRefOperationCreationStateChanged.invoke({
                            state: AsyncGitOperationActions.AsyncRefOperationCreationState.Designing,
                            errorMessage: message,
                        });
                    }

                    default: {
                        AsyncGitOperationActions.asyncGitOperationHadError.invoke({
                            operationId: operationId,
                            message: this._getDetailedFailureMessage(operation, operationId),
                        });
                    }
                }
            }
        }
    }

    private _getDetailedFailureMessage(operation: VCContracts.GitAsyncRefOperation, operationId: number): string {

        if (operation.detailedStatus && operation.detailedStatus.status) {
            const generatedRef = AsyncRefDesignStoreInstance.getGeneratedRef();
            const ontoRef = AsyncRefDesignStoreInstance.getOntoRef();
            switch (operation.detailedStatus.status) {
                case VCContracts.GitAsyncRefOperationFailureStatus.CreateBranchPermissionRequired:
                case VCContracts.GitAsyncRefOperationFailureStatus.WritePermissionRequired:
                    return Utils_String.format(VCResources.GitAsyncOperation_PermissionRequired, generatedRef.toDisplayText(), operation.detailedStatus.failureMessage);

                case VCContracts.GitAsyncRefOperationFailureStatus.InvalidRefName:
                    return Utils_String.format(VCResources.GitAsyncOperation_InvalidRefName, generatedRef.toDisplayText());

                case VCContracts.GitAsyncRefOperationFailureStatus.RefNameConflict:
                    return Utils_String.format(VCResources.GitAsyncOperation_RefNameConflict, generatedRef.toDisplayText());

                case VCContracts.GitAsyncRefOperationFailureStatus.TargetBranchDeleted:
                    return Utils_String.format(VCResources.GitAsyncOperation_TargetBranchDeleted, ontoRef.toDisplayText());

                case VCContracts.GitAsyncRefOperationFailureStatus.EmptyCommitterSignature:
                    return VCResources.GitAsyncOperation_EmptyNameOrEmail;

                default: {
                    const operationMessages = this._messagesMap.getMessagesForOperation(operationId);
                    if (operation.detailedStatus && operation.detailedStatus.failureMessage) {
                        return Utils_String.format(operationMessages.failureMessageTemplate, operation.detailedStatus.failureMessage);
                    }
                    return operationMessages.failureMessage;
                }
            }
        }
        return this._messagesMap.getMessagesForOperation(operationId).failureMessage;
    }

    private _setTimeout = (sender: any, notification: VCContracts.AsyncGitOperationNotification) => {
        AsyncGitOperationActions.asyncGitOperationRealtimeNotificationReceived.invoke({
            operationId: notification.operationId,
        });
        AsyncGitOperationActions.asyncGitOperationHadError.invoke({
            operationId: notification.operationId,
            message: Utils_String.format(this._messagesMap.getMessagesForOperation(notification.operationId).timeoutMessage),
        });
    }

    private _setCompleted = (sender: any, notification: VCContracts.AsyncGitOperationNotification) => {
        AsyncGitOperationActions.asyncGitOperationRealtimeNotificationReceived.invoke({
            operationId: notification.operationId,
        });
        if (isAsyncRefCompletedNotification(notification)) {
            AsyncGitOperationActions.asyncGitOperationCompleted.invoke({
                operationId: notification.operationId,
                newRefName: notification.newRefName,
                newRefUrl: VersionControlUrls.getBranchExplorerUrl(this._repositoryContext, notification.newRefName),
                message: this._messagesMap.getMessagesForOperation(notification.operationId).completedMessageTemplate,
            });
        }
    }

    private _getServerError = (error: any) => {
        return error.serverError &&
            error.serverError.innerException &&
            error.serverError.innerException.message ? error.serverError.innerException.message : error.message;
    }
}

function isAsyncRefProgressNotification(notification: VCContracts.AsyncGitOperationNotification): notification is VCContracts.AsyncRefOperationProgressNotification {
    return (<VCContracts.AsyncRefOperationProgressNotification>notification).commitId !== undefined
        && (<VCContracts.AsyncRefOperationProgressNotification>notification).progress !== undefined;
}

function isAsyncRefConflictNotification(notification: VCContracts.AsyncGitOperationNotification): notification is VCContracts.AsyncRefOperationConflictNotification {
    return (<VCContracts.AsyncRefOperationConflictNotification>notification).commitId !== undefined;
}

function isAsyncRefCompletedNotification(notification: VCContracts.AsyncGitOperationNotification): notification is VCContracts.AsyncRefOperationCompletedNotification {
    return (<VCContracts.AsyncRefOperationCompletedNotification>notification).newRefName !== undefined;
}

export let ActionCreator = new AsyncRefOperationActionCreator(new AsyncRefOperationServerSource());
