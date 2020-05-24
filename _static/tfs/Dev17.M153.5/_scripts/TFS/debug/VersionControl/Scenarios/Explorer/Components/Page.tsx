import { Fabric } from "OfficeFabric/Fabric";
import * as React from "react";
import * as ReactDOM from "react-dom";

import { StatefulSplitter } from "Presentation/Scripts/TFS/Components/StatefulSplitter";
import { DropForbiddenTarget } from "Presentation/Scripts/TFS/Components/Tree/DropTarget";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { ActionCreator } from  "VersionControl/Scenarios/Explorer/ActionCreator";
import * as VCContainer from "VersionControl/Scenarios/Explorer/Components/Container";
import { Header } from "VersionControl/Scenarios/Explorer/Components/Header";
import { TreeContainer } from "VersionControl/Scenarios/Explorer/Components/Tree";
import { NotificationAreaContainer } from  "VersionControl/Scenarios/Explorer/Components/NotificationArea";
import { PivotTabsContainer } from "VersionControl/Scenarios/Explorer/Components/PivotTabs";
import { EditDisabledDialogContainer } from "VersionControl/Scenarios/Explorer/Components/EditDisabledDialogContainer";
import { LoseChangesDialogContainer } from "VersionControl/Scenarios/Explorer/Components/LoseChangesDialogContainer";
import { CommitDialogContainer } from "VersionControl/Scenarios/Explorer/Components/CommitDialogContainer";
import { AddNewFileDialogContainer } from "VersionControl/Scenarios/Explorer/Components/AddNewFileDialogContainer";
import { ItemContentContainer } from "VersionControl/Scenarios/Explorer/Components/ItemContent";
import { StoresHub } from "VersionControl/Scenarios/Explorer/Stores/StoresHub";

import "VSS/LoaderPlugins/Css!fabric";

export function renderInto(container: HTMLElement, props: PageProps): void {
    ReactDOM.render(
        <Page {...props} />,
        container);
}

export interface PageProps {
    actionCreator: ActionCreator;
    storesHub: StoresHub;
}

/**
 * Container for the Explorer header, containing the path explorer and the repo stats row.
 */
const Page = (props: PageProps) =>
    <DropForbiddenTarget className="absolute-full">
        <Fabric
            className={"vc-page absolute-full " + (props.storesHub.getAggregateState().isGit ? "git" : "tfvc")}
            ref={(page) => { props.actionCreator.focusManager.setPage(page) }}
        >
            <Header {...props} />
            <ContentHubContainer {...props} />
            <EditDisabledDialogContainer {...props} />
            <LoseChangesDialogContainer {...props} />
            <CommitDialogContainer {...props} />
            <AddNewFileDialogContainer {...props} />
        </Fabric>
    </DropForbiddenTarget>;

const ContentHubContainer = VCContainer.create(
    ["pivotTabs"],
    ({ pivotTabsState }, props) =>
        <StatefulSplitter
            className="vc-splitter"
            statefulSettingsPath="Git.Explorer.LeftHubSplitter"
            left={<TreeContainer {...props} />}
            leftClassName="vc-files-tree absolute-full"
            right={<RightPane {...props} />}
            isFixedPaneVisible={!pivotTabsState.isFullScreen}
            enableToggleButton={true}
            collapsedLabel={VCResources.CodeExplorer}
            toggleButtonExpandedTooltip={VCResources.CollapseCodeExplorer}
            toggleButtonCollapsedTooltip={VCResources.ExpandCodeExplorer}
        />);

const RightPane = (props: PageProps) =>
    <div className="right-pane-holder absolute-full">
        <NotificationAreaContainer {...props} />
        <PivotTabsContainer {...props} />
        <ItemContentContainer {...props} />
    </div>;
