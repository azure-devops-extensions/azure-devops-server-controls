import * as React from "react";
import { ActionCreator } from "VersionControl/Scenarios/Explorer/ActionCreator";
import { BadgesRowContainer } from "VersionControl/Scenarios/Explorer/Components/BadgesRow";
import { CodeHubActionsContainer } from "VersionControl/Scenarios/Explorer/Components/CodeHubActions";
import * as VCContainer from "VersionControl/Scenarios/Explorer/Components/Container";
import { FullScreenCommandBarContainer } from "VersionControl/Scenarios/Explorer/Components/FullScreenCommandBar";
import { PathExplorerContainer } from "VersionControl/Scenarios/Explorer/Components/PathExplorer";
import { StatusTextIconContainer } from "VersionControl/Scenarios/Explorer/Components/StatusBadge";
import { VersionContainer } from "VersionControl/Scenarios/Explorer/Components/Version";
import { StoresHub } from "VersionControl/Scenarios/Explorer/Stores/StoresHub";

export interface HeaderProps {
    actionCreator: ActionCreator;
    storesHub: StoresHub;
}

/**
 * Container for the Explorer header, containing branch selector, path explorer, banners, and repo stats.
 */
export const Header = VCContainer.create(
    ["context"],
    ({ isGit }, props) =>
        <div className="vc-header">
            <div className="vc-header-first">
                <VersionContainer {...props} />
                <div className="vc-page-path-explorer">
                    <PathExplorerContainer {...props} />
                </div>
                <StatusTextIconContainer {...props} />
                <CodeHubActionsContainer />
                <FullScreenCommandBarContainer {...props} />
            </div>
            <BadgesRowContainer {...props} />
        </div>);
