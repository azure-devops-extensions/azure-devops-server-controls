import * as React from "react";
import { NotificationSpecialType } from  "VersionControl/Scenarios/Explorer/Stores/NotificationStore";
import { VersionStore } from "VersionControl/Scenarios/Explorer/Stores/VersionStore";
import * as VCContainer from "VersionControl/Scenarios/Explorer/Components/Container";
import { SaveInfoBanner } from "VersionControl/Scenarios/Explorer/Components/SaveInfoBanner";
import { CreatePullRequestSuggestionBanner } from "VersionControl/Scenarios/Shared/Notifications/CreatePullRequestSuggestionBanner";
import { NotificationArea } from "VersionControl/Scenarios/Shared/Notifications/NotificationArea";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { VersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";

/**
 * A container to display notifications in Explorer scenario.
 */
export const NotificationAreaContainer = VCContainer.create(
    ["notification", "context", "permissions", "version"],
    ({ notificationState, repositoryContext, permissionsState, versionSpec }, { actionCreator }) =>
        <NotificationArea
            notifications={notificationState.notifications}
            renderers={getMapToRenderer(repositoryContext as GitRepositoryContext, versionSpec, permissionsState.createPullRequest)}
            onDismiss={actionCreator.dismissNotification}
            />);

function getMapToRenderer(
    repositoryContext: GitRepositoryContext,
    versionSpec: VersionSpec,
    canCreatePullRequest: boolean,
): IDictionaryStringTo<(specialContent: any) => JSX.Element> {
    return {
        [NotificationSpecialType.createPullRequestSuggestion]: specialContent =>
            <CreatePullRequestSuggestionBanner suggestion={specialContent} />,
        [NotificationSpecialType.commit]: specialContent =>
            <SaveInfoBanner
                saveInfo={specialContent}
                versionSpec={versionSpec}
                repositoryContext={repositoryContext}
                canCreatePullRequest={canCreatePullRequest}
            />,
    };
}
