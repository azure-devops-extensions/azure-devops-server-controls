import * as Q from "q";

import * as Navigation_Services from "VSS/Navigation/Services";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";
import { IdentityRef, ResourceRef } from "VSS/WebApi/Contracts";

import { traceError } from "VersionControl/Scenarios/Shared/Trace";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";

import { GitPullRequest, GitRepository, GitRef } from "TFS/VersionControl/Contracts";

import * as TFSTagService from "Presentation/Scripts/TFS/FeatureRef/TFS.TagService";
import * as ServerConstants from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { TfsContext, IContextIdentity } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as TFSOMCommon from "Presentation/Scripts/TFS/TFS.OM.Common";
import { WebApiTagDefinition } from "TFS/Core/Contracts";
import { ActionsHub } from "VersionControl/Scenarios/PullRequestCreate/Actions/ActionsHub";
import * as Constants from "VersionControl/Scenarios/PullRequestCreate/Constants";
import { TitleDescriptionHelper } from "VersionControl/Scenarios/PullRequestCreate/Helpers";
import { ICreateSource } from "VersionControl/Scenarios/PullRequestCreate/Sources/CreateSource";
import { BranchInfo } from "VersionControl/Scenarios/PullRequestCreate/Stores/BranchesStore";
import { LinkedWorkItemInfo, PullRequestProperties } from "VersionControl/Scenarios/PullRequestCreate/Stores/PullRequestPropertiesStore";
import { StoresHub } from "VersionControl/Scenarios/PullRequestCreate/Stores/StoresHub";
import { pullRequestLabelsKindId } from "VersionControl/Scenarios/Shared/Constants";
import { NotificationType } from "VersionControl/Scenarios/Shared/Notifications/NotificationStore";
import { FeatureAvailabilitySource } from "VersionControl/Scenarios/Shared/Sources/FeatureAvailabilitySource";
import * as VCCommentParser from "VersionControl/Scripts/CommentParser";
import * as VCPullRequestsControls from "VersionControl/Scripts/Controls/PullRequest";
import * as VCLegacyContracts from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import * as GitRefUtility from "VersionControl/Scripts/GitRefUtility";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as VCSpecs from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";

import { CodeHubContributionIds } from "VersionControl/Scripts/CodeHubContributionIds";
import { onNavigationHandler } from "VersionControl/Scripts/Utils/XhrNavigationUtils";
import * as Telemetry from "VSS/Telemetry/Services";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";

export namespace NotificationSpecialType {
    export const existingPullRequest = "existingPullRequest";
}

export interface IQueryParameters {
    sourceRef: string;
    targetRef: string;
    sourceRepositoryId: string;
    targetRepositoryId: string;
}

export class PullRequestCreateActionCreator {
    private _repositoryContext: GitRepositoryContext;
    private _templateFeatureFlagOn: boolean;

    constructor(
        private _actionsHub: ActionsHub,
        private _storesHub: StoresHub,
        private _createSource: ICreateSource,
        private _featureAvailabilitySource: FeatureAvailabilitySource) {
    }

    public initializeBranches = (
        uriSource: string,
        uriTarget: string,
        uriSourceRepositoryId: string,
        uriTargetRepositoryId: string,
        defaultGitBranch: string): void => {

        this._templateFeatureFlagOn = FeatureAvailabilityService.isFeatureEnabled(
            ServerConstants.FeatureAvailabilityFlags.WebAccessVersionControlPullRequestsTemplates, false
        );
        this._createSource.getRepositoryForkData(uriSourceRepositoryId, this._repositoryContext)
            .then(data => {
                this._actionsHub.forkParentUpdated.invoke({ repositoryId: data.parentRepositoryId});
                this._actionsHub.repositoriesRegistered.invoke({ repositories: data.repositories });

                const cachedSourceRef: string = this._createSource.getCachedSourceRef();
                const cachedTargetRef: string = this._createSource.getCachedTargetRef();

                const repo: RepositoryContext = this._storesHub.contextStore.getRepositoryContext();
                const defaultTargetBranch = GitRefUtility.getRefFriendlyName(repo.getRepository().defaultBranch);

                // (1) URI, (2) cached suggestion from data island, (3) default git branch (if it is not already the target)
                let sourceBranchName: string = uriSource;
                if (!sourceBranchName) {
                    sourceBranchName = cachedSourceRef;
                    if (!sourceBranchName) {
                        if (!defaultTargetBranch || defaultGitBranch !== defaultTargetBranch) {
                            sourceBranchName = defaultGitBranch;
                        }
                    }
                }

                // (1) URI, (2) cached suggestion, (3) default target
                let targetBranchName: string = uriTarget;
                if (!targetBranchName) {
                    targetBranchName = cachedTargetRef;
                    if (!targetBranchName) {
                        targetBranchName = defaultTargetBranch;
                    }
                }

                // (1) URI, (2) current repository context
                let sourceRepository: GitRepository = repo.getRepository();
                if (uriSourceRepositoryId) {
                    const foundSourceRepo: GitRepository = this._storesHub.branchesStore.getAvailableRepositories().filter(r => r.id === uriSourceRepositoryId)[0];
                    if (foundSourceRepo) {
                        sourceRepository = foundSourceRepo;
                    }
                }

                // (1) URI, (2) fork repository context, (3) current repository context
                let targetRepository: GitRepository = this._storesHub.branchesStore.getParentFork() || repo.getRepository();
                if (uriTargetRepositoryId) {
                    const foundTargetRepo: GitRepository = this._storesHub.branchesStore.getAvailableRepositories().filter(r => r.id === uriTargetRepositoryId)[0];
                    if (foundTargetRepo) {
                        targetRepository = foundTargetRepo;
                    }
                }

                this._actionsHub.sourceBranchUpdated.invoke({
                    repository: sourceRepository,
                    branchName: sourceBranchName
                });

                this._actionsHub.targetBranchUpdated.invoke({
                    repository: targetRepository,
                    branchName: targetBranchName
                });

                this._actionsHub.templateUpdated.invoke(data.template);
                this._actionsHub.templateListUpdated.invoke(data.templateList);
                this._actionsHub.defaultTemplatePathUpdated.invoke(data.defaultTemplatePath);
                this.validateBranches();
            }, this.addError);
    }

    public initialize(tfsContext: TfsContext, repoContext: RepositoryContext): void {
        this._repositoryContext = repoContext as GitRepositoryContext;
        this._actionsHub.contextUpdated.invoke({
            repoContext,
            tfsContext
        });
    }

    public onSourceBranchUpdated(repository: GitRepository, branchName: string): void {
        this._createSource.getRepositoryForkData(repository.id, this._repositoryContext).then(data => {
            this._actionsHub.forkParentUpdated.invoke({ repositoryId: data.parentRepositoryId });
            this._actionsHub.repositoriesRegistered.invoke({ repositories: data.repositories });
            this._actionsHub.sourceBranchUpdated.invoke({repository, branchName});
            this._actionsHub.templateUpdated.invoke(data.template);
            this._actionsHub.templateListUpdated.invoke(data.templateList);
            this._actionsHub.defaultTemplatePathUpdated.invoke(data.defaultTemplatePath);
            this.validateBranches();
        }, this.addError);
    }

    public onTargetBranchUpdated(repository: GitRepository, branchName: string): void {
        this._actionsHub.targetBranchUpdated.invoke({repository, branchName});
        this._actionsHub.templateUpdated.invoke(null);
        this.validateBranches();
        this._createSource.getRepositoryForkData(this._storesHub.branchesStore.getSourceRepository().id, this._repositoryContext).then(data => {
            this._actionsHub.templateUpdated.invoke(data.template);
            this._actionsHub.templateListUpdated.invoke(data.templateList);
            this._actionsHub.defaultTemplatePathUpdated.invoke(data.defaultTemplatePath);
            const props = this._storesHub.propertiesStore.state;
            if(this._templateFeatureFlagOn && !props.isDirty && data.template) {
                let description = this._storesHub.propertiesStore.state.description;
                let descriptionVal = description && this._isCherryPick(description)
                        ? this.truncateDescription(concatParagraphs(
                            this._storesHub.templateStore.template,
                            description))
                        : this.truncateDescription(this._storesHub.templateStore.template);
                this._actionsHub.defaultPullRequestPropertiesUpdated.invoke({
                    description: descriptionVal,
                    canPasteCommitMessages: true
                } as PullRequestProperties);
            }
        }, this.addError);
    }

    public switchBranches(): void {
        this._actionsHub.branchesSwitched.invoke(null);
        this._actionsHub.templateUpdated.invoke(null);
        this.validateBranches();
        this._createSource.getRepositoryForkData(this._storesHub.branchesStore.getSourceRepository().id, this._repositoryContext).then(data => {
            this._actionsHub.forkParentUpdated.invoke({ repositoryId: data.parentRepositoryId });
            this._actionsHub.repositoriesRegistered.invoke({ repositories: data.repositories });
            this._actionsHub.templateUpdated.invoke(data.template);
            this._actionsHub.templateListUpdated.invoke(data.templateList);
            this._actionsHub.defaultTemplatePathUpdated.invoke(data.defaultTemplatePath);
            const props = this._storesHub.propertiesStore.state;
            if(this._templateFeatureFlagOn && !props.isDirty && data.template) {
                let description = this._storesHub.propertiesStore.state.description;
                let descriptionVal = description && this._isCherryPick(description)
                        ? this.truncateDescription(concatParagraphs(
                            this._storesHub.templateStore.template,
                            description))
                        : this.truncateDescription(this._storesHub.templateStore.template);
                this._actionsHub.defaultPullRequestPropertiesUpdated.invoke({
                    description: descriptionVal,
                    canPasteCommitMessages: true
                } as PullRequestProperties);
            }
        }, this.addError);
    }

    public updatePullRequestProperties(props: PullRequestProperties): void {
        this._actionsHub.pullRequestPropertiesUpdated.invoke(props);
    }

    public pasteCommitMessages = (): void => {
        Promise.all(
            this._storesHub.commitsStore.getTruncatedCommits()
                .map(this.fetchFullComment)
        ).then(
            () => this._actionsHub.pullRequestPropertiesUpdated.invoke({
                description: this.truncateDescription(concatParagraphs(
                    this._storesHub.propertiesStore.state.description,
                    this._storesHub.commitsStore.getCommitMessagesMarkdown())),
            } as PullRequestProperties),
            this.addError);
    }

    public pasteTemplate = (path: string): void => {
        Telemetry.publishEvent(
            new Telemetry.TelemetryEventData(
                CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
                CustomerIntelligenceConstants.PULL_REQUEST_TEMPLATE_SELECTION_FEATURE,
                {
                    TemplateName: path.substring(path.lastIndexOf('/') + 1),
                }),
            true);
        const targetRepositoryId = this._storesHub.branchesStore.getTargetBranch().repository.id;
        this._createSource.getTemplateContent(this._repositoryContext, targetRepositoryId, path).then(
            template => {
                this._actionsHub.templateUpdated.invoke(template);
                this._actionsHub.defaultPullRequestPropertiesUpdated.invoke({
                    description: this.truncateDescription(concatParagraphs(
                        this._storesHub.propertiesStore.state.description,
                        this._storesHub.templateStore.template)),
                } as PullRequestProperties);
            }
        );
    }

    private fetchFullComment = (commit: VCLegacyContracts.HistoryEntry): IPromise<VCLegacyContracts.ChangeList> => {
        const sourceRepositoryContext = this._storesHub.branchesStore.getSourceRepositoryContext();
        return this._createSource.getChangeList(sourceRepositoryContext, commit.changeList.version, 0)
            .then(changeList => {
                this._actionsHub.commitsHistoryFullCommentRetrieved.invoke(changeList);
                return changeList;
            });
    }

    public setDefaultWorkItems(workItems: LinkedWorkItemInfo[]): void {
        const props = this._storesHub.propertiesStore.state;
        if (!props.workItemIds || !props.workItemIds.length) {
            props.workItemIds = workItems;
            this._actionsHub.defaultPullRequestPropertiesUpdated.invoke(props);
        } else {
            // Link the new defaults, but also keep any WIs that were manually linked
            const manuallyLinkedWIs = props.workItemIds.filter(wi => !wi.autoLinked);
            props.workItemIds = [...workItems, ...manuallyLinkedWIs];
            this._actionsHub.defaultPullRequestPropertiesUpdated.invoke(props);
        }
    }

    public queryFeatureFlags(): void {
        this._featureAvailabilitySource.getFeatureFlags({
            [ServerConstants.FeatureAvailabilityFlags.WebAccessVersionControlPullRequestsLabels]: false,
            [ServerConstants.FeatureAvailabilityFlags.WebAccessVersionControlPullRequestsNoDefaultTitle]: false,
            [ServerConstants.FeatureAvailabilityFlags.SourceControlGitPullRequestsDraft]: false,
        }).then(features => {
                // fire feature toggle action
                this._actionsHub.setFeatureFlags.invoke({
                    features: features
                });
            });
    }

    public setDefaultReviewers(): void {
        if (this._featureAvailabilitySource.isVerticalNavigation()) {
            // The concept of a current team is gone with the new verticals.
            return;
        }

        const tfsContext = this._storesHub.contextStore.getTfsContext();
        if (tfsContext && tfsContext.currentTeam) {
            const contextTeam: IContextIdentity = tfsContext.currentTeam.identity;
            const props = this._storesHub.propertiesStore.state;

            if (this._storesHub.branchesStore.getTargetBranch().repository.project.id !== tfsContext.contextData.project.id) {
                // If the target repo is not in the current project context, don't add the team context as a default reviewer and remove it if it's present
                if (props.reviewers && props.reviewers.length) {
                    const teamIndex = Utils_Array.findIndex(props.reviewers, item => item.id === contextTeam.id);

                    if (teamIndex > -1) {
                        props.reviewers.splice(teamIndex, 1);
                        this._actionsHub.defaultPullRequestPropertiesUpdated.invoke(props);
                    }
                }
            } else if (!props.reviewers || !props.reviewers.length) {
                // Otherwise, apply the traditional logic and add the team if appropriate
                const defReviewers: IdentityRef[] = [<IdentityRef>{
                    displayName: contextTeam.displayName,
                    id: contextTeam.id,
                    imageUrl: null,
                    inactive: !contextTeam.isActive,
                    isAadIdentity: false,
                    isContainer: contextTeam.isContainer,
                    profileUrl: null,
                    uniqueName: contextTeam.uniqueName,
                    url: null,
                    directoryAlias: null
                }];

                if (!props.reviewers || !props.reviewers.length) {
                    props.reviewers = defReviewers;
                    this._actionsHub.defaultPullRequestPropertiesUpdated.invoke(props);
                }
            }
        }
    }

    public setDefaultTitleAndDescription(title?: string, description?: string, canPasteCommitMessages?: boolean): void {
        const props = this._storesHub.propertiesStore.state;
        let updated = false;

        if (title && (!props.title || !props.title.length)) {
            props.title = title;
            updated = true;
        }

        if (description && (!props.description || !props.description.length)) {
            props.description = description;
            updated = true;
        }

        if (canPasteCommitMessages !== undefined) {
            props.canPasteCommitMessages = canPasteCommitMessages;
            updated = true;
        }

        if (updated) {
            this._actionsHub.defaultPullRequestPropertiesUpdated.invoke(props);
        }
    }

    public validateBranches = (): void => {
        const currentRepo = this._storesHub.contextStore.getRepositoryContext() as GitRepositoryContext;

        const targetBranch = this._storesHub.branchesStore.getTargetBranch();
        const sourceBranch = this._storesHub.branchesStore.getSourceBranch();
        const source = sourceBranch ? sourceBranch.branchVersionSpec : null;
        const target = targetBranch ? targetBranch.branchVersionSpec : null;
        const templateName = this._createSource.getCachedTemplateQueryString();

        this._updateUrl(source, target, sourceBranch.repository.id, targetBranch.repository.id, templateName);

        if (!source || !target) {
            return;
        }

        // look up commit ids for source and target and search for a PR
        Q.all([
            this._lookupForkRef(sourceBranch.repository, source),
            this._lookupForkRef(targetBranch.repository, target),
            this._lookForExistingPullRequest(sourceBranch, targetBranch)
        ])
        .spread((sourceRef: GitRef, targetRef: GitRef, prId: number) => {
            if (prId > 0) {
                // a pull request already exists for this source and target so return null
                this.addWarning(
                    null,
                    {
                        pullRequestId: prId,
                        repository: this._storesHub.branchesStore.getTargetRepository(),
                        tfsContext: this._storesHub.contextStore.getTfsContext()
                    },
                    NotificationSpecialType.existingPullRequest);

                return Promise.resolve(null);

            }
            else if (prId !== Constants.NO_PULL_REQUEST_FOUND) {
                // check for the unexpected scenario where prId is a negative number other than -1
                return Promise.reject(new Error(VCResources.PullRequestCreate_FailedToCheckForExistingPullRequest));
            }

            if (this._storesHub.branchesStore.isFork()) {

                if(!sourceRef || !targetRef) {
                    return Promise.reject(new Error(VCResources.PullRequestCreate_FailedToFindRefData));
                }

                // if target and source are in different repositories (i.e. a fork relationship exists between the repositories)
                // look up the mergebase via API and add it to the compareInfo object
                return this._createSource.getMergeBase(
                    this._storesHub.branchesStore.getTargetRepository().id,
                    targetRef.objectId,
                    this._storesHub.branchesStore.getSourceRepository().id,
                    sourceRef.objectId);
            }

            return Promise.resolve(null);
        })
        .then(
            mergeBase => {
                this._actionsHub.mergeBaseUpdated.invoke({gitCommitVersionSpec: mergeBase});
                if (!this._storesHub.branchesStore.hasExistingPullRequest()) {
                    this.getCommits();
                    this.getDiffCommit();
                }
            },
            this.addError)
        .done();
    }

    private _lookForExistingPullRequest(sourceBranch: BranchInfo, targetBranch: BranchInfo): IPromise<Number>{
        
        if (!sourceBranch || !targetBranch || !sourceBranch.branchVersionSpec || !targetBranch.branchVersionSpec) {
            return Promise.reject(new Error(VCResources.PullRequestCreate_FailedToCheckForExistingPullRequest));
        }

        return this._createSource.getExistingPullRequestId(
            targetBranch.repository.id,
            sourceBranch.repository.id,
            sourceBranch.branchVersionSpec.toDisplayText(),
            targetBranch.branchVersionSpec.toDisplayText())
            .then(
                (prID) => {
                    this._actionsHub.existingPullRequestIdUpdated.invoke({pullRequestId: prID});
                    return prID;
                });
    }

    private _lookupForkRef(repository: GitRepository, gitBranchVersionSpec: VCSpecs.GitBranchVersionSpec): Q.Promise<GitRef> {
        const branchName = gitBranchVersionSpec.toFullName();
        if (!this._storesHub.branchesStore.isFork() || !repository || !branchName) {
            // we don't want ref info if we aren't in a fork
            // or we have bad data
            return Q<GitRef>(null);
        }

        return this._createSource.getRef(repository, branchName)
            .then((ref: GitRef) => {
                if (ref) {
                    this._actionsHub.refInfoUpdated.invoke({
                        repositoryId: repository.id,
                        ref: ref
                    });
                }
                return ref;
            });
    }

    public getCommits(): void {
        const repo = this._storesHub.branchesStore.getSourceRepositoryContext();
        const targetBranch = this._storesHub.branchesStore.getTargetBranch();
        const sourceBranch = this._storesHub.branchesStore.getSourceBranch();
        const sourceSpec = this._storesHub.branchesStore.getSourceSpec();
        const targetSpec = this._storesHub.branchesStore.getTargetSpec();

        if (!targetSpec) {
            this.addWarning(VCResources.PullRequest_TargetBranchDoesNotExist);
            return;
        } else if (!sourceSpec) {
            this.addWarning(VCResources.PullRequest_SourceBranchDoesNotExist);
            return;
        }

        this._actionsHub.commitsHistoryStarted.invoke({
            sourceVersionString: sourceBranch.branchVersionSpec.toFriendlyName(),
            targetVersionString: targetBranch.branchVersionSpec.toFriendlyName()
        });

        this._createSource.getHistory(
            repo,
            sourceSpec,
            targetSpec,
            Constants.DEFAULT_MAX_HISTORY_ITEMS_COUNT + 1)
            .then(history => {
                const currentTargetBranch = this._storesHub.branchesStore.getTargetBranch();
                const currentSourceBranch = this._storesHub.branchesStore.getSourceBranch();

                // check that these branches are still selected
                if (currentSourceBranch === sourceBranch && currentTargetBranch === targetBranch) {
                    // set moreResultsAvailable to false to avoid showing LoadMore in HistoryList
                    history.moreResultsAvailable = false;

                    this._actionsHub.commitsHistoryUpdated.invoke({
                        sourceVersionString: sourceBranch.branchVersionSpec.toFriendlyName(),
                        targetVersionString: targetBranch.branchVersionSpec.toFriendlyName(),
                        history: history
                    });

                    if (!history.results.length) {
                        this._showNoChangesToMergeNotification(history);
                        return;
                    }

                    // do not set default property values when user has updated some properties
                    // to make sure we do not override user's changes
                    const { isDirty } = this._storesHub.propertiesStore.state;
                    if (!isDirty) {
                        this._computeDefaultTitleAndDescription(sourceBranch, targetBranch, history);
                        this.setDefaultReviewers();
                    } else {
                        this._actionsHub.defaultPullRequestPropertiesUpdated.invoke({
                            canPasteCommitMessages: this.getCanPasteCommitMessages(history),
                        } as PullRequestProperties);
                    }

                    // Reset default work items regardless of dirty state. Manually linked work
                    // items will be retained but auto-linked ones will be updated.
                    this.getAssociatedWorkItem(history);
                    this._actionsHub.validationSucceed.invoke(null);
                }
            }, this.addError);
    }

    public getDiffCommit(): void {
        const repo = this._storesHub.branchesStore.getSourceRepositoryContext();
        const source = this._storesHub.branchesStore.getSourceBranch();
        const target = this._storesHub.branchesStore.getTargetBranch();

        if (!source || !target) {
            return;
        }

        const sourceSpec = this._storesHub.branchesStore.getSourceSpec();
        const targetSpec = this._storesHub.branchesStore.getTargetSpec();

        this._actionsHub.diffCommitStarted.invoke({
            sourceVersionString: sourceSpec,
            targetVersionString: targetSpec
        });

        this._createSource.getCommitDiff(
            repo,
            sourceSpec,
            targetSpec)
            .then(commit => {
                this._actionsHub.diffCommitUpdated.invoke({
                    sourceVersionString: sourceSpec,
                    targetVersionString: targetSpec,
                    commit: commit
                });
            }, this.addError);
    }

    public getAssociatedWorkItem(history: VCLegacyContracts.GitHistoryQueryResults): void {
        const repo = this._storesHub.branchesStore.getSourceRepositoryContext();
        const source = this._storesHub.branchesStore.getSourceBranch().branchVersionSpec;
        const target = this._storesHub.branchesStore.getTargetBranch().branchVersionSpec;

        const versionList: VCSpecs.VersionSpec[] = history.results.map(x => new VCSpecs.GitCommitVersionSpec((x.changeList as VCLegacyContracts.GitCommit).commitId.full));
        versionList.unshift(new VCSpecs.GitBranchVersionSpec(source.toDisplayText()));

        const workItems = this._createSource.getAssociatedWorkItems(repo, versionList.map(v => v.toVersionString()))
            .then(workItems => {
                this.setDefaultWorkItems(workItems.map(wi => ({ id: wi.id, autoLinked: true })));
            },
            this.addError);
    }

    public beginGetSuggestedLabels(projectGuid: string, callback: (tagNames: string[]) => void): void {
        const tagService = TFSOMCommon.ProjectCollection.getConnection().getService(TFSTagService.TagService) as TFSTagService.TagService;

        tagService.beginQueryTagNames(
            [pullRequestLabelsKindId], // label artifact kind, move to resources?
            projectGuid,
            callback);
    }

    public createPullRequest(event: React.SyntheticEvent<any>, isDraft?: boolean): void {
        this._actionsHub.createPullRequestStarted.invoke(null);

        const properties = this._storesHub.propertiesStore.state;
        const targetBranch = this._storesHub.branchesStore.getTargetBranch();
        const sourceBranch = this._storesHub.branchesStore.getSourceBranch();
        const workItems = properties.workItemIds.slice(0, Constants.DEFAULT_MAX_NUM_WORK_ITEMS_TO_LINK);
        const workItemResourceRefs = workItems.map(item => <ResourceRef>{ id: item.id.toString(), url: null });
        const labels = properties.labels.slice(0, 255).map(label => ({ name: label } as WebApiTagDefinition)); // should we put a limit on labels?

        event.persist(); // react events cannot be used asynchronously unless persist is called

        this._createSource.createPullRequest(
            sourceBranch.repository,
            targetBranch.repository,
            sourceBranch.branchVersionSpec.toDisplayText(),
            targetBranch.branchVersionSpec.toDisplayText(),
            properties.title,
            properties.description,
            properties.reviewers,
            workItemResourceRefs,
            labels,
            isDraft)
            .then(pr => {
                this._navigateToPullRequest(event, pr, GitRepositoryContext.create(targetBranch.repository, this._storesHub.contextStore.getTfsContext()));
            }, (error) => {
                this.addError(error);
                this._actionsHub.createPullRequestFailed.invoke(null);
            });
    }

    public addError = (error: any, specialContent?: any, specialType?: string): void => {
        const message =
            typeof error === "string"
                ? error
                : error.message;

        this._actionsHub.clearNotifications.invoke(null);
        this._actionsHub.addNotification.invoke({
            type: NotificationType.error,
            specialContent: specialContent,
            specialType: specialType,
            message: message,
            isDismissable: false,
        });
    }

    public addWarning(message: string, specialContent?: any, specialType?: string): void {
        this._actionsHub.clearNotifications.invoke(null);
        this._actionsHub.addNotification.invoke({
            type: NotificationType.info,
            specialContent: specialContent,
            specialType: specialType,
            message: message,
            isDismissable: false,
        });
    }

    public traceError(error: Error, component: string) {
        if (error) {
            traceError(
                CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
                CustomerIntelligenceConstants.PULL_REQUEST_CREATE_FEATURE,
                component,
                error
            );
        }
    }

    private _computeDefaultTitleAndDescription(source: BranchInfo, target: BranchInfo, history: VCLegacyContracts.HistoryQueryResults): void {
        let { title, description } =
            TitleDescriptionHelper.getInputTitleAndDescription(source.branchVersionSpec.toDisplayText(), target.branchVersionSpec.toDisplayText());

        if (history && !title && history.results.length === 1) {
            title = VCCommentParser.Parser.getShortComment(history.results[0].changeList.comment);
        } else if (!title && !this._storesHub.featureAvailabilityStore.getNoDefaultTitleIsEnabled()) {
            const srcBranchText = source.branchVersionSpec.toDisplayText();
            const targetBranchText = target.branchVersionSpec.toDisplayText();

            title = this._storesHub.branchesStore.isFork()
                ? Utils_String.format(VCResources.PullRequest_Fork_DefaultPullRequestTitle, srcBranchText, source.repository.name, targetBranchText)
                : Utils_String.format(VCResources.PullRequest_DefaultPullRequestTitle, srcBranchText, targetBranchText);
        }

        if (history && !description) {
            if (history.results.length === 1) {
                const [entry] = history.results;
                const { changeList } = entry;
                if (changeList.commentTruncated) {
                    this.fetchFullComment(entry)
                        .then(fullChangeList =>
                            this.setDefaultTitleAndDescription(null, this.truncateDescription(fullChangeList.comment)));
                } else {
                    description = changeList.comment;
                }
            }
        }

        description =  this._templateFeatureFlagOn && this._storesHub.templateStore.template
                        ? description && this._isCherryPick(description)
                            ? this.truncateDescription(concatParagraphs(
                                this._storesHub.templateStore.template,
                                description))
                            : this.truncateDescription(this._storesHub.templateStore.template)
                        : description;

        this.setDefaultTitleAndDescription(title, description, this.getCanPasteCommitMessages(history));
    }

    private truncateDescription(description: string): string {
        return description.substr(0, Constants.MAX_DESCRIPTION_LENGTH);
    }

    private getCanPasteCommitMessages(history: VCLegacyContracts.HistoryQueryResults) {
        return history &&
            (history.results.length > 1 && this._storesHub.featureAvailabilityStore.getNoDefaultTitleIsEnabled() ||
            Boolean(this._templateFeatureFlagOn && this._storesHub.templateStore.template));
    }

    private _showNoChangesToMergeNotification(history: VCLegacyContracts.GitHistoryQueryResults): void {
        const isHistoryUncalculated = history.unpopulatedCount > 0 || history.unprocessedCount > 0;
        if (isHistoryUncalculated) {
            this.addWarning(VCResources.PullRequest_NoCommitsToMergeDueToUnCalculatedHistoryNotification);
        }
        else {
            this.addWarning(VCResources.PullRequest_NoCommitsToMergeNotification);
        }
    }

    private _navigateToPullRequest(event: React.SyntheticEvent<HTMLButtonElement>, pullRequest: GitPullRequest, repoContext: GitRepositoryContext): void {
        const url = VersionControlUrls.getPullRequestUrl(repoContext, pullRequest.pullRequestId, null, null, null);
        const navigationFailed = onNavigationHandler(event, CodeHubContributionIds.pullRequestHub, url);
        if (navigationFailed) {
            window.location.href = url;
        }
    }

    private _updateUrl(source: VCSpecs.VersionSpec, target: VCSpecs.VersionSpec, sourceRepositoryId: string, targetRepositoryId: string, templateName: string) {
        const data: IQueryParameters = {
            sourceRef: source && encodeURIComponent(source.toDisplayText()) || null,
            targetRef: target && encodeURIComponent(target.toDisplayText()) || null,
            sourceRepositoryId: sourceRepositoryId && encodeURIComponent(sourceRepositoryId) || null,
            targetRepositoryId: targetRepositoryId && encodeURIComponent(targetRepositoryId) || null,
            template: templateName && encodeURIComponent(templateName) || null,
        } as IQueryParameters;

        Navigation_Services.getHistoryService().replaceHistoryPoint(null, data, null, true);
    }

    private _isCherryPick(description: string) {
        return description.indexOf(Utils_String.format(VCResources.CherryPick_PullRequestDescriptionAppendMentionFormat, "")) >= 0 
            || description.indexOf(Utils_String.format(VCResources.Revert_PullRequestDescriptionAppendMentionFormat,"") ) >= 0
            || description.indexOf(Utils_String.format(VCResources.CherryPick_CommitDescriptionAppendFormat, "")) >= 0;
    }
}

function concatParagraphs(text: string, addendum: string) {
    if (!addendum) {
        return text;
    }

    if (!text) {
        return addendum;
    }

    return `${text}\n\n${addendum}`;
}
