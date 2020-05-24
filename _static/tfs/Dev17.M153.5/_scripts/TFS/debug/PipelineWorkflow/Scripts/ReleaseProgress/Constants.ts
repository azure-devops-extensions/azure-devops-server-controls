export namespace CommonConstants {
    export const FeatureArea = "ReleaseView";

    export const ReleaseSummaryProgressIndicatorInstanceId = "RELEASE_SUMMARY_PROGRESS_INDICATOR";

    export const ParallelismTag: string = "ParallelismTag";
}

export namespace DeploymentAttemptKey {
    export const DeploymentAttemptStore: string = "DeploymentAttempt_Store";
    export const DeploymentAttemptActionsCreator: string = "DeploymentAttempt_ActionsCreator";
    export const DeploymentAttemptActions: string = "DeploymentAttempt_Actions";
}

export namespace LogsTabKeys {
    export const LogsTabViewStore: string = "LogsTab_LogsTabViewStore";
    export const DeploymentGroupLogsStore: string = "LogsTab_DeploymentGroupLogsStore";
    export const LogsTabActionsCreator: string = "LogsTab_LogsTabActionsCreator";
    export const DeploymentGroupLogsTabActionCreator: string = "DeploymentGroupLogsTab_LogsTabActionCreator";
    export const LogsTabActions: string = "LogsTab_LogsTabActions";
    export const DeploymentGroupLogsTabActions: string = "DeploymentGroupLogsTab_LogsTabActions";
}

export namespace HistoryTabKeys {
    export const HistoryTabViewStore: string = "HistoryTab_ViewStore";
    export const HistoryTabActionsCreator: string = "HistoryTab_ActionsCreator";
    export const HistoryTabActions: string = "HistoryTab_Actions";
}

export namespace PerfScenarios {
    export const SignalrReleaseUpdate = "VSO.ReleaseView.SignalrReleaseUpdate";
    export const LoadRelease = "VSO.ReleaseView.LoadRelease";
}

export namespace ReleaseProgressStoreKeys {
    export const Release: string = "ReleaseProgressStore_Release";
    export const ReleaseEnvironmentList: string = "ReleaseProgressStore_ReleaseEnvironmentList";
    export const ReleaseEnvironment: string = "ReleaseProgressStore_ReleaseEnvironment";
    export const ReleaseEnvironmentsCanvas: string = "ReleaseProgressStore_ReleaseEnvironmentsCanvas";
    export const ReleaseEnvironmentNodeViewStore: string = "ReleaseProgressStore_ReleaseEnvironmentNodeViewStore";
    export const ReleaseEnvironmentPreDeployApprovalsViewStore: string = "ReleaseProgressStore_ReleaseEnvironmentPreDeployApprovalsViewStore";
    export const ReleaseEnvironmentPostDeployApprovalsViewStore: string = "ReleaseProgressStore_ReleaseEnvironmentPostDeployApprovalsViewStore";
    export const ArtifactComparison: string = "ReleaseProgressStore_ReleaseArtifactComparison";
    export const ReleaseSummaryViewStore: string = "ReleaseProgressStore_ReleaseSummaryViewStore";
    export const ReleaseDetailsViewStore: string = "ReleaseProgressStore_ReleaseDetailsViewStore";
    export const ReleaseEnvironmentActionsStore: string = "ReleaseProgressStore_ReleaseEnvironmentActionsStore";
    export const ReleaseEnvironmentPostDeploymentViewStore: string = "ReleaseProgressStore_ReleaseEnvironmentPostDeploymentViewStore";
    export const ReleaseEnvironmentPreDeploymentViewStore: string = "ReleaseProgressStore_ReleaseEnvironmentPreDeploymentViewStore";
    export const ReleasePostDeploymentApproverStore: string = "ReleaseProgressStore_ReleasePostDeploymentApproverStore";
    export const ReleasePreDeploymentApproverStore: string = "ReleaseProgressStore_ReleasePreDeploymentApproverStore";
    export const ReleasePostDeploymentApproversViewStore: string = "ReleaseProgressStore_ReleasePostDeploymentApproversViewStore";
    export const ReleasePreDeploymentApproversViewStore: string = "ReleaseProgressStore_ReleasePreDeploymentApproversViewStore";
    export const DeploymentCancelDetailsViewStore: string = "ReleaseProgressStore_DeploymentCancelDetailsViewStore";
    export const EnvironmentDeployPanelViewStore: string = "ReleaseProgressStore_EnvironmentDeployPanelViewStore";
    export const DeployEnvironmentsPanelViewStore: string = "ReleaseProgressStore_DeployEnvironmentsPanelViewStore";
    export const ApprovalMultipleEnvironmentsPanelViewStore: string = "ReleaseProgressStore_ApprovalMultipleEnvironmentsPanelViewStore";
    export const DeployMultipleEnvironmentsListViewStore: string = "ReleaseProgressStore_DeployMultipleEnvironmentsListViewStore";
    export const ReleasePreDeployConditionDetailsViewStore: string = "ReleaseProgressStore_ReleasePreDeployConditionDetailsViewStore";
    export const ReleasePostDeployConditionDetailsViewStore: string = "ReleaseProgressStore_ReleasePostDeployConditionDetailsViewStore";
    export const ReleaseEnvironmentPreDeployGatesViewStore: string = "ReleaseProgressStore_ReleaseEnvironmentPreDeployGatesViewStore";
    export const ReleaseEnvironmentPostDeployGatesViewStore: string = "ReleaseProgressStore_ReleaseEnvironmentPostDeployGatesViewStore";
    export const ProgressHubViewStore: string = "ReleaseProgressStore_ProgressHubViewStore";
    export const ReleaseEnvironmentPropertiesContributionsStore: string = "ReleaseProgressStore_ReleaseEnvironmentPropertiesContributionsStore";
    export const ReleaseManualInterventionDetailsViewStore: string = "ReleaseProgressStore_ReleaseManualInterventionDetailsViewStore";
    export const TaskTabViewStore: string = "ReleaseProgressStore_TaskTabViewStore";
    export const ReleaseTaskAttachmentViewStore: string = "ReleaseProgressStore_ReleaseTaskAttachmentViewStore";
    export const ReleaseProgressCanvasTabStore: string = "ReleaseProgressStore_ReleaseProgressCanvasTabStore";
    export const JobRequestsStore: string = "ReleaseProgressStore_JobRequestsStore";
}

export namespace ReleaseProgressActionKeys {
    export const Release: string = "ReleaseProgressActions_Release";
    export const ReleaseEnvironmentList: string = "ReleaseProgressActions_ReleaseEnvironmentList";
    export const ReleaseEnvironment: string = "ReleaseProgressActions_ReleaseEnvironment";
    export const ArtifactComparison: string = "ReleaseProgressActions_ReleaseArtifactComparison";
    export const ReleaseApprovals: string = "ReleaseProgressActions_ReleaseApprovals";
    export const ReleaseEnvironmentNodeActions: string = "ReleaseProgressActions_ReleaseEnvironmentNodeActions";
    export const DeploymentCancel: string = "ReleaseProgressActions_DeploymentCancel";
    export const EnvironmentDeployPanel: string = "ReleaseProgressActions_EnvironmentDeployPanel";
    export const DeployEnvironmentsPanel: string = "ReleaseProgressActions_DeployEnvironmentsPanel";
    export const ApprovalMultipleEnvironmentsPanel: string = "ReleaseProgressActions_ApprovalMultipleEnvironmentsPanel";
    export const ReleaseEnvironmentPropertiesContributions: string = "ReleaseProgressActions_ReleaseEnvironmentPropertiesContributions";
    export const ReleaseManualIntervention: string = "ReleaseProgressActions_ReleaseManualIntervention";
    export const ReleaseGates: string = "ReleaseProgressActions_ReleaseGates";
    export const ReleaseTaskAttachmentActions: string = "ReleaseProgressActions_ReleaseTaskAttachmentActions";
    export const ReleaseProgressCanvasTabActions: string = "ReleaseProgressActions_ReleaseProgressCanvasTabActions";
    export const JobRequestsActions: string = "ReleaseProgressActions_JobRequestsActions";
}


export namespace ReleaseProgressActionCreatorKeys {
    export const Release: string = "ReleaseProgressActionCreator_Release";
    export const ReleaseEnvironmentList: string = "ReleaseProgressActionCreator_ReleaseEnvironmentList";
    export const ReleaseEnvironment: string = "ReleaseProgressActionCreator_ReleaseEnvironment";
    export const ArtifactComparison: string = "ReleaseProgressActionCreator_ReleaseArtifactComparison";
    export const ReleaseApprovals: string = "ReleaseProgressActionCreator_ReleaseApprovals";
    export const ReleaseEnvironmentNodeActions: string = "ReleaseProgressActionCreator_ReleaseEnvironmentNodeActions";
    export const DeploymentCancel: string = "ReleaseProgressActionCreator_DeploymentCancel";
    export const EnvironmentDeployPanel: string = "ReleaseProgressActionCreator_EnvironmentDeployPanel";
    export const DeployEnvironmentsPanel: string = "ReleaseProgressActionCreator_DeployEnvironmentsPanel";
    export const ApprovalMultipleEnvironmentsPanel: string = "ReleaseProgressActionCreator_ApprovalMultipleEnvironmentsPanel";
    export const ReleaseEnvironmentPropertiesContributions: string = "ReleaseProgressActionCreator_ReleaseEnvironmentPropertiesContributions";
    export const ReleaseManualIntervention: string = "ReleaseProgressActionCreator_ReleaseManualIntervention";
    export const ReleaseGates: string = "ReleaseProgressActionCreator_ReleaseGates";
    export const ReleaseTaskAttachmentActionCreator: string = "ReleaseProgressActionCreator_ReleaseTaskAttachmentActionCreator";
    export const ReleaseProgressCanvasTabActionCreator: string = "ReleaseProgressActions_ReleaseProgressCanvasTabActionCreator";
    export const JobRequestsActionCreator: string = "ReleaseProgressActionCreator_JobRequestsActionCreator";
}

export namespace ReleaseProgressSourceKeys {
    export const ReleaseTaskAttachmentSource: string = "ReleaseProgressSource_ReleaseTaskAttachmentSource";
}

export namespace ReleaseProgressNavigateStateActions {
    export const ReleasePipelineProgress = "release-pipeline-progress";
    export const ReleaseHistory = "release-history";
    export const ReleaseVariables = "release-variables";
    export const ReleaseEnvironmentProgress = "release-environment-progress";
    export const ReleaseEnvironmentExtension = "release-environment-extension";
    export const ReleaseEnvironmentLogs = "release-environment-logs";
    export const ReleaseEnvironmentVariables = "release-environment-variables";
    export const ReleaseTaskEditor = "release-task-editor";
    export const ReleaseEnvironmentDeploymentGroupLogs = "release-environment-deployment-group-logs";
}

export namespace OldReleaseViewNavigateStateActions {
    export const ReleaseSummary = "release-summary";
    export const ReleaseEnvironments = "release-environments-editor";
    export const ReleaseArtifacts = "release-artifacts-editor";
    export const ReleaseCommits = "release-commits";
    export const ReleaseWorkitems = "release-workitems";
    export const ReleaseLogs = "release-logs";
    export const ReleaseTests = "release-contribution-tab-ms.vss-test-web.test-result-in-release-management";
    export const ReleaseGeneralSettings = "release-general-settings-editor";
    export const ReleaseVariables = "release-configurations-editor";
}

export namespace CanvasSelectorConstants {
    export const ReleaseCanvasSelectorInstance = "CanvasSelector_ReleaseCanvasSelector";
}

export namespace BreadcrumbItem {
    export const releasePicker = "releasePicker";
    export const environmentPicker = "environmentPicker";
    export const releaseDefinition = "releaseDefinition";
    export const release = "release";
    export const environment = "environment";
}

export namespace ReleaseSummaryPanelActions {
    export const autoSaveDescription: string = "autoSaveDescription";
    export const autoSaveTags: string = "autoSaveTags";
}

export namespace ReleaseSummaryPivotItemKeys {
    export const c_pipelinePivotItemKey = "pipeline";
    export const c_historyPivotItemKey = "history";
    export const c_variablePivotItemKey = "variable";
}

export namespace ReleaseSummaryEnvironmentTabsPivotItemKeys {
    export const c_logsPivotItemKey = "logs";
    export const c_taskPivotItemKey = "task";
    export const c_variablePivotItemKey = "variable";
    export const c_pipeLineItemKey = "pipeline";
}

export namespace ReleaseProgressContentKeys {
    export const RefreshReleaseActionKey: string = "refreshRelease";
    export const OpenOldReleaseViewActionKey: string = "openOldReleaseView";
    export const EditReleaseActionKey: string = "editRelease";
    export const SaveReleaseActionKey: string = "saveRelease";
    export const DiscardReleaseActionKey: string = "discardReleaseChanges";
}

export enum ReleaseHelpDialogTabKeys {
    LearnNew = "ReleaseProgressHelpLearnNew",
    Pipeline = "ReleaseProgressHelpPipeline",
    Approvals = "ReleaseProgressHelpApprovals",
    CommitsWorkitems = "ReleaseProgressHelpCommits",
    InprogressLogs = "ReleaseProgressHelpLogs",
    Contributions = "ReleaseProgressHelpContributions"
}

export namespace ReleaseSettingsConstants {
    export const PathPrefix = "releases/progressview/";
    export const IsFRECompletedKey = "isfrecompleted";
    export const IsEditReleaseInfoBarDismissedKey = "IsEditReleaseInfoBarDismissed";
}

export namespace ReleaseEnvironmentPanelPivotItemKeys {
    export const c_commitsPivotItemKey = "commits";
    export const c_workitemsPivotItemKey = "workitems";
}