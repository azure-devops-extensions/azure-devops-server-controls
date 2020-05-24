import { Fabric } from "OfficeFabric/Fabric";
import * as React from "react";
import * as ReactDOM from "react-dom";

import { StatefulSplitter } from "Presentation/Scripts/TFS/Components/StatefulSplitter";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { LatestVersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";

import { FilesTree } from "VersionControl/Scenarios/Shared/FilesTree";
import { PathExplorerContainer } from "VersionControl/Scenarios/Shared/Path/PathExplorerContainer";
import { PathStore } from "VersionControl/Scenarios/Shared/Path/PathStore";
import { ContextStore } from "VersionControl/Scenarios/Shared/Stores/ContextStore";

import { ChangesHistoryListContainer } from "VersionControl/Scenarios/History/ChangesHistoryListContainer";
import { TfvcHistoryActionCreator } from "VersionControl/Scenarios/History/TfvcHistory/Actions/TfvcHistoryActionCreator";
import { ChangesetsFilterContainer } from "VersionControl/Scenarios/History/TfvcHistory/Components/ChangeSetsFilterContainer";
import { Container } from "VersionControl/Scenarios/History/TfvcHistory/Components/Container";
import { TfvcChangeSetsStoresHub } from "VersionControl/Scenarios/History/TfvcHistory/Stores/TfvcChangeSetsStoresHub";

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!VersionControl/ChangeSetsPage";

export function renderInto(container: HTMLElement, props: ChangeSetsPageProps): void {
    ReactDOM.render(
        <ChangeSetsPage {...props} />,
        container);
}

export interface ChangeSetsPageProps {
    actionCreator: TfvcHistoryActionCreator;
    storesHub: TfvcChangeSetsStoresHub;
}

/**
 * Container for the Tfvc Changesets page, containing the path explorer, filter component, source tree explorer and the changes history list.
 */
export const ChangeSetsPage = (props: ChangeSetsPageProps): JSX.Element =>
    <Fabric className="changesets-page absolute-full">
        <div className="vc-header">
            <div className="vc-page-path-explorer">
                <PathExplorerContainer
                    onEditingStart={props.actionCreator.startPathEditing}
                    onInputTextEdit={props.actionCreator.editPathText}
                    onPathChange={props.actionCreator.changePath}
                    onEditingCancel={props.actionCreator.cancelPathEditing}
                    pathStore={props.storesHub.pathStore}
                />
            </div>
            <div className="versioncontrol-changes-search-box">
                <div className="vc-search-adapter-changesets search-box bowtie" />
            </div>
        </div>
        <StatefulSplitter
            className="vc-splitter"
            statefulSettingsPath="Changesets.LeftHubSplitter"
            vertical={false}
            left={
                <LeftPane pathStore={props.storesHub.pathStore} contextStore={props.storesHub.contextStore} {...props} />}
            leftClassName="vc-files-tree absolute-full"
            right={<RightPane {...props} />}
            enableToggleButton={true}
            collapsedLabel={VCResources.SourceExplorerText}
        />
    </Fabric>;

export interface LeftPaneContainerState {
    path: string;
    repositoryContext: RepositoryContext;
}

export interface LeftPaneContainerProps {
    actionCreator: TfvcHistoryActionCreator;
    pathStore: PathStore;
    contextStore: ContextStore;
}

export class LeftPane extends Container<LeftPaneContainerProps, LeftPaneContainerState> {
    private readonly _latestversionSpec: LatestVersionSpec = new LatestVersionSpec();

    public render(): JSX.Element {
        return <FilesTree
                    repositoryContext={this.state.repositoryContext}
                    selectedFullPath={this.state.path}
                    versionSpec={this._latestversionSpec}
                    onItemSelected={this.props.actionCreator.changePath}
                    onError={this.props.actionCreator.raiseError} />;
    }

    public getStateFromStores({pathStore, contextStore}: LeftPaneContainerProps): LeftPaneContainerState {
        return {
            path: pathStore.state.path,
            repositoryContext: contextStore.getRepositoryContext(),
        };
    }
}

/**
 *  Right Pane contains filter control, changeset search box and the changes history list component.
 */
const RightPane = ({actionCreator, storesHub}: ChangeSetsPageProps): JSX.Element =>
    <div className="right-pane-holder absolute-full">
        <div className="versioncontrol-changes-content-header">
            <div className="versioncontrol-changes-filter-container">
                <ChangesetsFilterContainer
                    actionCreator={actionCreator}
                    filterStore={storesHub.filterStore} />
            </div>
        </div>
        <ChangesHistoryListContainer
            actionCreator={actionCreator}
            changeSetsStore={storesHub.tfvcChangeSetsStore}
            repositoryContext={storesHub.getChangeSetsPageState().repositoryContext}
            onScenarioComplete={actionCreator.notifyContentRendered} />
    </div>;
