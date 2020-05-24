import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { DiscussionAdapter } from "VersionControl/Scripts/Stores/PullRequestReview/DiscussionManagerStore";

import { ActionsHub } from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";
import { StoresHub } from "VersionControl/Scripts/Stores/PullRequestReview/StoresHub";
import { SourcesHub } from "VersionControl/Scripts/Sources/SourcesHub";

// sources
import { GitRepositorySource } from "VersionControl/Scripts/Sources/GitRepositorySource";
import { PullRequestDetailSource } from "VersionControl/Scripts/Sources/PullRequestDetailSource";
import { PullRequestChangesSource } from "VersionControl/Scripts/Sources/PullRequestChangesSource";
import { DiscussionSource } from "VersionControl/Scripts/Sources/DiscussionSource";
import { AttachmentSource } from "VersionControl/Scripts/Sources/AttachmentSource";
import { NavigationSource } from "VersionControl/Scripts/Sources/NavigationSource";
import { PolicyEvaluationSource } from "VersionControl/Scripts/Sources/PolicyEvaluationSource";
import { BuildSource } from "VersionControl/Scripts/Sources/BuildSource";
import { ReviewerSource } from "VersionControl/Scripts/Sources/ReviewerSource";
import { UserPreferenceSource } from "VersionControl/Scripts/Sources/UserPreferenceSource";
import { RelatedWorkItemSource } from "VersionControl/Scripts/Sources/RelatedWorkItemSource";
import { FeatureAvailabilitySource } from "VersionControl/Scenarios/Shared/Sources/FeatureAvailabilitySource";
import { ConflictSource } from "VersionControl/Scripts/Sources/ConflictSource";
import { DataProviderSource } from "VersionControl/Scripts/Sources/DataProviderSource";

import { FavoritesPermissionsSource } from "VersionControl/Scenarios/Shared/Permissions/FavoritesPermissionsSource";
import { GitPermissionsSource } from "VersionControl/Scenarios/Shared/Permissions/GitPermissionsSource";
import { SettingsPermissionsSource } from "VersionControl/Scenarios/Shared/Permissions/SettingsPermissionsSource";

import { ClientPolicyEvaluationSource } from "VersionControl/Scenarios/PullRequestDetail/Sources/ClientPolicyEvaluationSource";
import { PullRequestAutoCompleteSource } from "VersionControl/Scenarios/PullRequestDetail/Sources/PullRequestAutoCompleteSource";
import { PullRequestLabelsSource } from "VersionControl/Scenarios/PullRequestDetail/Sources/PullRequestLabelsSource";
import { PullRequestStatusSource } from "VersionControl/Scenarios/PullRequestDetail/Sources/PullRequestStatusSource";
import { RefFavoriteSource } from "VersionControl/Scenarios/PullRequestDetail/Sources/RefFavoriteSource";

import { PullRequestReviewActionCreator } from "VersionControl/Scripts/Actions/PullRequestReview/PullRequestReviewActionCreator";
import { DiscussionFluxWiring } from "VersionControl/Scenarios/PullRequestDetail/View/DiscussionFluxWiring";
import { ServiceRegistry } from "VersionControl/Scenarios/Shared/ServiceRegistry";

import { IDiscussionsStore } from "VersionControl/Scripts/Stores/PullRequestReview/IDiscussionsStore";
import { IDiscussionActionCreator } from "VersionControl/Scripts/Actions/PullRequestReview/IDiscussionActionCreator";
import { IDiscussionSource } from "VersionControl/Scripts/Sources/IDiscussionSource";
import { IAttachmentActionCreator } from "VersionControl/Scripts/Actions/PullRequestReview/IAttachmentActionCreator";
import { IAttachmentSource } from "VersionControl/Scripts/Sources/IAttachmentSource";
import { IAttachmentsStore } from "VersionControl/Scripts/Stores/PullRequestReview/IAttachmentsStore";
import { IAutoCompleteActionCreator } from "VersionControl/Scenarios/PullRequestDetail/Actions/PullRequestAutoCompleteActionCreator";
import { IPolicyActionCreator } from "VersionControl/Scripts/Actions/PullRequestReview/IPolicyActionCreator";
import { INavigationActionCreator } from "VersionControl/Scripts/Actions/PullRequestReview/INavigationActionCreator";
import { IDiscussionManagerStore } from "VersionControl/Scripts/Stores/PullRequestReview/IDiscussionManagerStore";
import { IDiscussionRepaintStore } from "VersionControl/Scripts/Stores/PullRequestReview/IDiscussionRepaintStore";
import { ICodeExplorerStore } from "VersionControl/Scripts/Stores/PullRequestReview/ICodeExplorerStore";
import { IDiscussionPermissionsStore } from "VersionControl/Scenarios/Shared/Permissions/DiscussionPermissionsStore";

export class Flux {
    public actionsHub: ActionsHub;
    public storesHub: StoresHub;
    public actionCreator: PullRequestReviewActionCreator;
    public sourcesHub: SourcesHub;

    protected constructor(tfsContext: TfsContext, repositoryContext: GitRepositoryContext, pullRequestId: number) {
        const projectId = repositoryContext.getRepository().project.id;
        const repositoryId = repositoryContext.getRepositoryId();

        // initialize actions and stores
        this.actionsHub = new ActionsHub();
        this.storesHub = new StoresHub(this.actionsHub, this._createDiscussionAdapter);

        // initializing all sources used by ActionCreators
        this.sourcesHub = {
            gitRepositorySource: new GitRepositorySource(projectId, repositoryId, repositoryContext),
            pullRequestDetailSource: new PullRequestDetailSource(projectId, repositoryId),
            pullRequestChangesSource: new PullRequestChangesSource(projectId, repositoryId, pullRequestId),
            attachmentSource: new AttachmentSource(projectId, repositoryId, tfsContext, pullRequestId),
            discussionSource: new DiscussionSource(tfsContext, projectId, repositoryId, pullRequestId),
            navigationSource: new NavigationSource(repositoryContext, pullRequestId),
            policyEvaluationSource: new PolicyEvaluationSource(tfsContext),
            buildSource: new BuildSource(tfsContext),
            reviewerSource: new ReviewerSource(repositoryContext),
            userPreferenceSource: new UserPreferenceSource(repositoryContext),
            relatedWorkItemSource: new RelatedWorkItemSource(projectId, repositoryId),
            featureAvailabilitySource: new FeatureAvailabilitySource(),
            conflictSource: new ConflictSource(projectId, repositoryId),
            dataProviderSource: new DataProviderSource(),
            pullRequestStatusSource: new PullRequestStatusSource(projectId, repositoryId),
            pullRequestLabelsSource: new PullRequestLabelsSource(projectId, repositoryId),
            pullRequestAutoCompleteSource: new PullRequestAutoCompleteSource(pullRequestId),
            refFavorite: new RefFavoriteSource(repositoryContext),
            gitPermissionsSource: new GitPermissionsSource(projectId, repositoryId),
            settingsPermissionsSource: new SettingsPermissionsSource(),
            favoritesPermissionsSource: new FavoritesPermissionsSource(),
            clientPolicyEvaluationSource: new ClientPolicyEvaluationSource(repositoryContext),
        };

        // now we are ready to create our action creator
        this.actionCreator = new PullRequestReviewActionCreator(
            tfsContext,
            repositoryContext,
            pullRequestId,
            this.storesHub,
            this.actionsHub,
            this.sourcesHub);

        ServiceRegistry.initialize();
        ServiceRegistry.registerService(this.storesHub.discussionsStore, IDiscussionsStore);
        ServiceRegistry.registerService(this.storesHub.attachmentStore, IAttachmentsStore);
        ServiceRegistry.registerService(this.storesHub.permissionsStore, IDiscussionPermissionsStore);
        ServiceRegistry.registerService(this.storesHub.discussionManagerStore, IDiscussionManagerStore);
        ServiceRegistry.registerService(this.storesHub.discussionRepaintStore, IDiscussionRepaintStore);
        ServiceRegistry.registerService(this.storesHub.codeExplorerStore, ICodeExplorerStore);

        ServiceRegistry.registerService(this.actionCreator.discussionActionCreator, IDiscussionActionCreator);
        ServiceRegistry.registerService(this.actionCreator.attachmentActionCreator, IAttachmentActionCreator);
        ServiceRegistry.registerService(this.actionCreator.clientPoliciesActionCreator, IPolicyActionCreator);
        ServiceRegistry.registerService(this.actionCreator.navigationActionCreator, INavigationActionCreator);
        ServiceRegistry.registerService(this.actionCreator.autoCompleteActionCreator, IAutoCompleteActionCreator);

        ServiceRegistry.registerService(this.sourcesHub.discussionSource, IDiscussionSource);
        ServiceRegistry.registerService(this.sourcesHub.attachmentSource, IAttachmentSource);
        DiscussionFluxWiring.initialize(this.actionsHub);

        // fire a context update event now that we have context
        this.actionsHub.contextUpdated.invoke({
            tfsContext: tfsContext,
            repositoryContext: repositoryContext
        });
    }

    /// creates the discussion adapter shim for this page
    private _createDiscussionAdapter = (): DiscussionAdapter => {
        return new DiscussionAdapter(
            this.storesHub.discussionsStore,
            this.actionCreator.discussionActionCreator,
            this.actionsHub);
    }

    // shim instance methods provided for legacy support
    // -- WE SHOULD REMOVE THIS PATTERN!

    private static _instance: Flux;

    public static instance(): Flux {
        return this._instance;
    }

    public static initialize(tfsContext: TfsContext, repositoryContext: GitRepositoryContext, pullRequestId: number): void {
        this._instance = new Flux(tfsContext, repositoryContext, pullRequestId);
    }

    public static dispose(): void {
        if (this._instance) {
            if (this._instance.actionCreator) {
                this._instance.actionCreator = null;
            }

            if (this._instance.storesHub) {
                this._instance.storesHub.dispose();
                this._instance.storesHub = null;
            }

            ServiceRegistry.dispose();
            this._instance = null;
        }
    }
}
