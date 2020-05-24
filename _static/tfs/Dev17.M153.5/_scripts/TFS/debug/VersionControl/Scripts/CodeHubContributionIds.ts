import { CommitsHubRoutes, PushesHubRoutes } from "VersionControl/Scenarios/History/HistoryPushesRoutes";

export namespace CodeHubContributionIds {
    export const branchesHub = "ms.vss-code-web.branches-hub";
    export const tagsHub = "ms.vss-code-web.tags-hub";
    export const pushesHub = PushesHubRoutes.contributionId;
    export const changesetsHub = "ms.vss-code-web.changesets-hub";
    export const collectionChangesetsHub = "ms.vss-code-web.collection-changesets-hub";
    export const collectionShelvesetsHub = "ms.vss-code-web.collection-shelvesets-hub";
    export const gitFilesHub = "ms.vss-code-web.files-hub-git";
    export const tfvcFilesHub = "ms.vss-code-web.files-hub-tfvc";
    export const collectionTfvcFilesHub = "ms.vss-code-web.collection-files-hub-tfvc";
    export const historyHub = CommitsHubRoutes.contributionId;
    export const pullRequestHub = "ms.vss-code-web.pull-request-hub";
    export const shelvesetsHub = "ms.vss-code-web.shelvesets-hub";
    export const newBuildEditorContributionId = "ms.vss-ciworkflow.build-ci-hub";
    export const oldReleaseDefinitionEditorContributionId = "ms.vss-releaseManagement-web.hub-explorer";
    export const newReleaseDefinitionEditorContributionId = "ms.vss-releaseManagement-web.cd-workflow-hub";
    export const releaseProgressHub = "ms.vss-releaseManagement-web.cd-release-progress";
}
