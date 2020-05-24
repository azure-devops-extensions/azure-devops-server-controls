import { BranchesStore } from "VersionControl/Scenarios/PullRequestCreate/Stores/BranchesStore";
import { ActionsHub } from "VersionControl/Scenarios/PullRequestCreate/Actions/ActionsHub";
import { ContextStore } from "VersionControl/Scenarios/Shared/Stores/ContextStore";
import { PullRequestPropertiesStore } from "VersionControl/Scenarios/PullRequestCreate/Stores/PullRequestPropertiesStore";
import { PageStateStore } from "VersionControl/Scenarios/PullRequestCreate/Stores/PageStateStore";
import { CommitsStore } from "VersionControl/Scenarios/PullRequestCreate/Stores/CommitsStore";
import { NotificationStore, NotificationType } from "VersionControl/Scenarios/Shared/Notifications/NotificationStore";
import { FeatureAvailabilityStore } from "VersionControl/Scenarios/Shared/Stores/FeatureAvailabilityStore";
import { TemplateStore } from "VersionControl/Scenarios/PullRequestCreate/Stores/TemplateStore";

export class StoresHub {
    public branchesStore: BranchesStore;
    public contextStore: ContextStore;
    public propertiesStore: PullRequestPropertiesStore;
    public pageStateStore: PageStateStore;
    public commitsStore: CommitsStore;
    public notificationStore: NotificationStore;
    public featureAvailabilityStore: FeatureAvailabilityStore;
    public templateStore: TemplateStore;

    constructor(actionsHub: ActionsHub) {
        this.branchesStore = new BranchesStore();
        actionsHub.sourceBranchUpdated.addListener(payload => this.branchesStore.updateSourceBranch(
            payload.repository,
            payload.branchName));
        actionsHub.targetBranchUpdated.addListener(payload => this.branchesStore.updateTargetBranch(
            payload.repository,
            payload.branchName));
        actionsHub.contextUpdated.addListener(payload => this.branchesStore.onContextUpdated(payload.repoContext.getRepository(), payload.tfsContext));
        actionsHub.repositoriesRegistered.addListener(payload => this.branchesStore.registerRepositoryList(payload.repositories));
        actionsHub.branchesSwitched.addListener(payload => this.branchesStore.switchBranches());
        actionsHub.refInfoUpdated.addListener(payload => this.branchesStore.onRefInfoUpdated(payload.repositoryId, payload.ref));
        actionsHub.mergeBaseUpdated.addListener(payload => this.branchesStore.onMergeBaseUpdated(payload.gitCommitVersionSpec));
        actionsHub.existingPullRequestIdUpdated.addListener(payload => this.branchesStore.onExistingPullRequestIdUpdated(payload.pullRequestId));
        actionsHub.forkParentUpdated.addListener(payload => this.branchesStore.updateForkParent(payload.repositoryId));

        this.contextStore = new ContextStore();
        actionsHub.contextUpdated.addListener(payload => this.contextStore.onContextUpdated({tfsContext: payload.tfsContext, repositoryContext: payload.repoContext}));

        this.propertiesStore = new PullRequestPropertiesStore();
        actionsHub.pullRequestPropertiesUpdated.addListener((payload) => this.propertiesStore.updatePullRequestProps(payload));
        actionsHub.defaultPullRequestPropertiesUpdated.addListener((payload) => this.propertiesStore.updateDefaultPullRequestProps(payload));
        actionsHub.sourceBranchUpdated.addListener(() => this.propertiesStore.onValidationStarted());
        actionsHub.targetBranchUpdated.addListener(() => this.propertiesStore.onValidationStarted());
        actionsHub.branchesSwitched.addListener(() => this.propertiesStore.onValidationStarted());
        actionsHub.onNavigateToNewTargetRepo.addListener(() => this.propertiesStore.resetIsDirty());

        this.pageStateStore = new PageStateStore();
        actionsHub.sourceBranchUpdated.addListener(() => this.pageStateStore.updateValidationStatus(true));
        actionsHub.targetBranchUpdated.addListener(() => this.pageStateStore.updateValidationStatus(true));
        actionsHub.branchesSwitched.addListener(() => this.pageStateStore.updateValidationStatus(true));
        actionsHub.validationSucceed.addListener(() => this.pageStateStore.updateValidationStatus(false));
        actionsHub.createPullRequestStarted.addListener(payload => this.pageStateStore.updateIsCreationPending(true));
        actionsHub.createPullRequestFailed.addListener(payload => this.pageStateStore.updateIsCreationPending(false));

        this.commitsStore = new CommitsStore();
        actionsHub.commitsHistoryStarted.addListener(payload => this.commitsStore.updateCommitsHistoryStarted(
            payload.sourceVersionString,
            payload.targetVersionString
        ));
        actionsHub.commitsHistoryUpdated.addListener(payload => this.commitsStore.updateCommitsHistory({
            sourceBranchVersionString: payload.sourceVersionString,
            targetBranchVersionString: payload.targetVersionString,
            history: payload.history
        }));
        actionsHub.commitsHistoryFullCommentRetrieved.addListener(this.commitsStore.updateFullComment);
        actionsHub.diffCommitStarted.addListener(payload => this.commitsStore.updateDiffCommitStarted(
            payload.sourceVersionString,
            payload.targetVersionString
        ));
        actionsHub.diffCommitUpdated.addListener(payload => this.commitsStore.updateDiffCommit({
            sourceBranchVersionString: payload.sourceVersionString,
            targetBranchVersionString: payload.targetVersionString,
            commit: payload.commit
        }));

        this.notificationStore = new NotificationStore();
        actionsHub.addNotification.addListener(payload => this.notificationStore.add(payload));
        actionsHub.clearNotifications.addListener(payload => this.notificationStore.clearAll());
        actionsHub.sourceBranchUpdated.addListener(() => this.notificationStore.clearAll());
        actionsHub.targetBranchUpdated.addListener(() => this.notificationStore.clearAll());
        actionsHub.branchesSwitched.addListener(() => this.notificationStore.clearAll());

        this.featureAvailabilityStore = new FeatureAvailabilityStore();
        actionsHub.setFeatureFlags.addListener(this.featureAvailabilityStore.onFeatureFlagEnabledUpdated);

        this.templateStore = new TemplateStore();
        actionsHub.templateUpdated.addListener(payload => this.templateStore.updateTemplate(payload));
        actionsHub.templateListUpdated.addListener(payload => this.templateStore.updateTemplateList(payload));
        actionsHub.defaultTemplatePathUpdated.addListener(payload => this.templateStore.updateDefaultTemplatePath(payload));
    }
}