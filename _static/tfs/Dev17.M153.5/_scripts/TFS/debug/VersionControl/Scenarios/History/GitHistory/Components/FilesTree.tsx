import { Fabric } from "OfficeFabric/Fabric";
import * as React from "react";
import * as ReactDOM from "react-dom";

import { ActionCreator } from "VersionControl/Scenarios/History/GitHistory/Actions/ActionCreator";
import { VersionStore } from "VersionControl/Scenarios/History/GitHistory/Stores/VersionStore";
import { PathStore } from "VersionControl/Scenarios/Shared/Path/PathStore";
import { FilesTree } from "VersionControl/Scenarios/Shared/FilesTree";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { VersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";

export function renderInto(holder: HTMLElement, props: FilesTreeContainerProps): void {
    ReactDOM.render(
        <Fabric>
            <FilesTreeContainer {...props} />
        </Fabric>,
        holder);
}

export interface FilesTreeContainerProps {
    repositoryContext: RepositoryContext;
    pathStore: PathStore;
    versionStore: VersionStore;
    actionCreator: ActionCreator;
}

export interface FilesTreeContainerState {
    path: string;
    versionSpec: VersionSpec;
}

export class FilesTreeContainer extends React.PureComponent<FilesTreeContainerProps, FilesTreeContainerState> {
    constructor(props: FilesTreeContainerProps) {
        super(props);

        this.state = this.getStateFromStores(props);
    }

    public componentDidMount() {
        this.props.pathStore.addChangedListener(this.onStoreChanged);
        this.props.versionStore.addChangedListener(this.onStoreChanged);
    }

    public componentWillUnmount() {
        this.props.pathStore.removeChangedListener(this.onStoreChanged);
        this.props.versionStore.removeChangedListener(this.onStoreChanged);
    }

    public render(): JSX.Element {
        return <FilesTree
            repositoryContext={this.props.repositoryContext}
            selectedFullPath={this.state.path}
            versionSpec={this.state.versionSpec}
            onItemSelected={path => this.props.actionCreator.changePath(path, undefined, CustomerIntelligenceConstants.PATHCHANGESOURCE_SOURCE_EXPLORER_TREE)}
            onError={(error: Error) => { }}
            />;
    }

    private onStoreChanged = (): void => {
        this.setState(this.getStateFromStores(this.props));
    }

    private getStateFromStores(props: FilesTreeContainerProps): FilesTreeContainerState {
        return {
            path: props.pathStore.state.path,
            versionSpec: props.versionStore.state.versionSpec,
        };
    }
}
