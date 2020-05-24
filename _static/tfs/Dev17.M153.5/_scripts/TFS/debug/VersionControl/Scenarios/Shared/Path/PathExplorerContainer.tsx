import * as React from "react";
import * as ReactDOM from "react-dom";
import { announce } from "VSS/Utils/Accessibility";
import { format, equals } from "VSS/Utils/String";

import { KeyboardAccesibleComponent } from "Presentation/Scripts/TFS/Components/KeyboardAccessible";
import { PathSearchResultsType, PathSearchItemIdentifier } from "VersionControl/Scenarios/Shared/Path/IPathSearchItemIdentifier";
import { PathExplorer } from "VersionControl/Scenarios/Shared/Path/PathExplorer";
import { DropdownData, DropdownSection, DropdownRow, DropdownItemPosition } from "VersionControl/Scenarios/Shared/Path/PathSearchDropdown";
import { PathSearchStateMapper } from "VersionControl/Scenarios/Shared/Path/PathSearchStateMapper";
import { PathSearchStore, PathSearchState } from "VersionControl/Scenarios/Shared/Path/PathSearchStore";
import { PathStore, PathState } from "VersionControl/Scenarios/Shared/Path/PathStore";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

export function renderInto(container: HTMLElement, props: PathExplorerContainerProps): void {
    ReactDOM.render(
        <PathExplorerContainer {...props} />,
        container);
}

export interface PathExplorerContainerHandlers {
    onPathChange(path: string, version?: string, source?: string): void;
    onEditingStart(): void;
    onEditingCancel(): void;
    onInputTextEdit(newText: string): void;
    onSearchItemSelection?(itemIdentifier: PathSearchItemIdentifier, newInputText?: string): void;
}

export interface PathExplorerContainerProps extends PathExplorerContainerHandlers {
    pathStore: PathStore;
    pathSearchStore?: PathSearchStore;
}

export interface PathExplorerContainerState {
    pathState: PathState;
    pathSearchState?: PathSearchState;
}

/**
 * A component that displays the path browser listening to changes on the stores.
 */
export class PathExplorerContainer extends React.Component<PathExplorerContainerProps, PathExplorerContainerState> {
    constructor(props: PathExplorerContainerProps, context?: any) {
        super(props, context);

        this.state = this._getStateFromStores();
    }

    public componentDidMount() {
        this.props.pathStore.addChangedListener(this.onStoreChanged);

        if (this.props.pathSearchStore) {
            this.props.pathSearchStore.addChangedListener(this.onStoreChanged);
        }
    }

    public componentWillUnmount() {
        this.props.pathStore.removeChangedListener(this.onStoreChanged);

        if (this.props.pathSearchStore) {
            this.props.pathSearchStore.removeChangedListener(this.onStoreChanged);
        }
    }

    public render(): JSX.Element {
        return (
            <StateMappedPathExplorer
                {...this.props}
                pathState={this.state.pathState}
                pathSearchState={this.state.pathSearchState}
            />);
    }

    private onStoreChanged = (): void => {
        this.setState(this._getStateFromStores());
    }

    private _getStateFromStores(): PathExplorerContainerState {
        return {
            pathState: this.props.pathStore.state,
            pathSearchState: this.props.pathSearchStore ? this.props.pathSearchStore.getState() : null,
        };
    }
}

export interface StateMappedPathExplorerProps extends PathExplorerContainerHandlers {
    pathState: PathState;
    pathSearchState?: PathSearchState;
}

/**
 * A wrapper for the PathExplorer that receives the state of the stores.
 */
export class StateMappedPathExplorer extends React.Component<StateMappedPathExplorerProps, {}> {
    private searchAnnouncer = new PathExplorerSearchAnnouncer();

    constructor(props: StateMappedPathExplorerProps) {
        super(props);

        this.updateAnnounce(props);
    }

    public componentWillReceiveProps(nextProps: StateMappedPathExplorerProps) {
        this.updateAnnounce(nextProps);
    }

    public render(): JSX.Element {
        const { pathState, pathSearchState } = this.props;
        return (
            <div className="path-explorer-container">
                <div className="table">
                    <div className="table-row">
                        <KeyboardAccesibleComponent
                            className="repo-name"
                            onClick={() => this.props.onPathChange(this.getRootPath())}>
                            {this.props.pathState.repositoryName}
                        </KeyboardAccesibleComponent>
                        <span className="separator">/</span>
                        <PathExplorer
                            fullPath={pathState.path}
                            folders={pathState.folders}
                            itemName={pathState.itemName}
                            isDirty={pathState.isDirty}
                            isEditing={pathState.isEditing}
                            isRoot={pathState.isRoot}
                            isPathSearchEnabled={Boolean(pathSearchState)}
                            inputText={pathState.inputText}
                            ariaLabel={pathState.isGit ? VCResources.PathExplorer_FindFileAriaLabel : VCResources.PathExplorerChangesetsAriaLabel}
                            onEditingStart={this.props.onEditingStart}
                            onEditingCancel={this.props.onEditingCancel}
                            onPathSelected={this.onPathSelected}
                            onInputTextEdit={this.props.onInputTextEdit}
                            searchText={pathSearchState ? pathSearchState.searchText : null}
                            pathSearchDropdownData={pathSearchState ? PathSearchStateMapper.toDropdownData(pathSearchState) : null}
                            onSearchItemSelection={this._onSearchItemSelection}
                        />
                    </div>
                </div>
            </div>
        );
    }

    private getRootPath = (): string => {
        return this.props.pathState.isGit ? "/" : this.props.pathState.repositoryName;
    }

    private onPathSelected = (text: string, source?: string): void => {
        const { path, version } = parseInputText(text, this.props.pathState.isGit);
        this.props.onPathChange(path, version, source);
    }

    private _onSearchItemSelection = (itemPosition: DropdownItemPosition, newInputText?: string): void => {
        if (this.props.onSearchItemSelection) {
            this.props.onSearchItemSelection(PathSearchStateMapper.toSearchItemIdentifier(itemPosition), newInputText);
        }
    }

    private updateAnnounce(props: StateMappedPathExplorerProps): void {
        if (props.pathSearchState) {
            this.searchAnnouncer.annouceSearchUpdate(props.pathSearchState);
        }
    }
}

/**
 * Announcer for path search results updates
 */
class PathExplorerSearchAnnouncer {
    private _lastSearchText;

    public annouceSearchUpdate(searchState: PathSearchState): void {
        let message: string;

        if (searchState.errorMessage) {
            message = searchState.errorMessage;
        }
        else if (searchState.areAllResultsSet) {
            message = PathSearchStateMapper.getFooterMessage(searchState);
        }

        if (message && !equals(searchState.searchText, this._lastSearchText)) {
            announce(message, true);
            this._lastSearchText = searchState.searchText;
        }
    }
}

export function parseInputText(text: string, isGit: boolean): { path: string, version: string } {
    let version: string;
    let path = text;
    if (!isGit) {
        const versionSeparator = ";";
        const separatorPosition = text.lastIndexOf(versionSeparator);

        if (separatorPosition > 0) {
            version = text.substring(separatorPosition + 1);
            path = text.substring(0, separatorPosition);
        }

        if (path[path.length - 1] === "/" && path !== "$/") {
            path = path.substring(0, path.length - 1);
        }
    }

    return { version, path };
}