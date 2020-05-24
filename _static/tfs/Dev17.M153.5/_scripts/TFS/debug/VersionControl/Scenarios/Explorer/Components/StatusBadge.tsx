/// <reference types="react" />
/// <reference types="react-dom" />
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as VCContainer from "VersionControl/Scenarios/Explorer/Components/Container";
import { StatusTextIcon } from "VersionControl/Scenarios/Shared/StatusBadge";

export function renderStatusTextIconInto(container: HTMLElement, props: VCContainer.ContainerProps): void {
    ReactDOM.render(
        <StatusTextIconContainer {...props} />,
        container);
}

/**
 * Displays the build/CI and release/CD statuses using an icon and a text.
 */
export const StatusTextIconContainer = VCContainer.create(
    ["statuses", "path", "pivotTabs", "permissions"],
    ({ statusesState, pathState, pivotTabsState, permissionsState }, { actionCreator }) => {
        if (!pathState.isGit ||
            !pathState.isRoot ||
            pivotTabsState.isFullScreen) {
            return null;
        }

        if (!(statusesState.statuses && statusesState.statuses.length) &&
            !(statusesState.isSetupExperienceVisible || statusesState.isSetupReleaseExperienceVisible)) {
            return null;
        }

        return (
            <StatusTextIcon
                className="bowtie"
                statuses={statusesState.statuses}
                isSetupExperienceVisible={statusesState.isSetupExperienceVisible && permissionsState.setUpBuild}
                isSetupReleaseExperienceVisible={statusesState.isSetupReleaseExperienceVisible && !!statusesState.createReleaseDefinitionUrl}
                onSetupNowClick={actionCreator.showSetupBuildDialog}
                onSetupReleaseClick={() => actionCreator.navigateToReleaseHub(statusesState.createReleaseDefinitionUrl)}
            />
        );
    });
