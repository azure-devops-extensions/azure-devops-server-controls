import * as React from "react";
import * as ReactDOM from "react-dom";
import { autobind } from "OfficeFabric/Utilities";
import * as Utils_Accessibility from "VSS/Utils/Accessibility";
import * as Utils_String from "VSS/Utils/String";

import { Change } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { SparseFilesTree, SparseFilesTreeProps } from "VersionControl/Scenarios/Shared/SparseFilesTree";
import { SearchBox } from "VersionControl/Scenarios/Shared/Trees/SearchBox";

import "VSS/LoaderPlugins/Css!VersionControl/Shared/Trees/SearchableSparseFilesTree";

export interface SearchableSparseFilesTreeProps extends SparseFilesTreeProps {
    allChangesIncluded: boolean;
    onChangesFiltered?(filteredChanges: Change[]): void;
    onContentPrefetch?(): void;
    onContentPrefetchCancelled?(): void;
    isLoadingMore?: boolean;
}

export interface SearchableSparseFilesTreeState {
    filteredChanges: Change[];
    searchText: string;
}

/**
 * Rendering SearchableSparseFilesTree in given container element
 */
export function renderSearchableSparseFilesTree(element: HTMLElement, props: SearchableSparseFilesTreeProps): void {
    ReactDOM.render(
        <SearchableSparseFilesTree {...props} />,
        element);
}

/**
 * Tree that displays changes from a Commit or ChangeList with filtering feature.
 */
export class SearchableSparseFilesTree extends React.Component<SearchableSparseFilesTreeProps, SearchableSparseFilesTreeState>{
    constructor(props: SearchableSparseFilesTreeProps) {
        super(props);

        this.state = {
            filteredChanges: props.changes,
            searchText: "",
        };
    }

    public componentWillReceiveProps(nextProps: SearchableSparseFilesTreeProps): void {
        if (this.props.changes !== nextProps.changes || this.props.version !== nextProps.version) {
            this._applyFilter(this.state.searchText, nextProps.changes);
        }
    }

    public render(): JSX.Element {
        const renderFileTree: boolean = this.props.isLoadingMore
            || !this.state.searchText
            || (this.state.filteredChanges && this.state.filteredChanges.length > 0);
        return <div className={"vc-searchable-files-tree"}>
            <SearchBox
                onChangeValue={this._onChangesFiltered}
                placeholder={VCResources.FindFileOrFolderMessage}
                className={"vc-file-tree-searchbox"}
            />
            {renderFileTree
                ? <SparseFilesTree
                    {...this.props}
                    changes={this.state.filteredChanges}
                    searchText={this.state.searchText}
                    isLoading={this.props.isLoadingMore}
                    />
                : <div className="no-search-results-message">
                    {this.props.allChangesIncluded
                        ? VCResources.NoResultsFound
                        : VCResources.NoResultsFoundInLoadedItems
                    }
                </div>
            }
        </div>;
    }

    @autobind
    private _onChangesFiltered(newValue: string): void {

        // Prefetch content for complete search as user starts typing
        // In case search is cancelled, stop prefetching as well
        if (!this.state.searchText && newValue && this.props.onContentPrefetch && !this.props.allChangesIncluded) {
            this.props.onContentPrefetch();
        }
        else if (this.state.searchText && !newValue && this.props.onContentPrefetchCancelled && !this.props.allChangesIncluded) {
            this.props.onContentPrefetchCancelled();
        }

        const changes: Change[] = this._applyFilter(newValue, this.props.changes);
        this.props.onChangesFiltered && this.props.onChangesFiltered(changes);
    }

    private _applyFilter(newValue: string, changes: Change[]): Change[] {
        if (newValue) {
            changes = getFilteredChanges(newValue, changes);
            if (changes && changes.length > 0) {
                Utils_Accessibility.announce(changes.length === 1
                    ? VCResources.FileTreeSearchResult
                    : Utils_String.format(VCResources.FileTreeSearchResults, changes.length));
            } else {
                Utils_Accessibility.announce(this.props.allChangesIncluded
                    ? VCResources.NoResultsFound
                    : VCResources.NoResultsFoundInLoadedItems);
            } 
        }

        this.setState({
            filteredChanges: changes,
            searchText: newValue,
        });

        return changes;
    }
}

function localeCaseInsensitiveContains(str: string, subStr: string): boolean {
    return Boolean(str && subStr && str.toLocaleLowerCase().indexOf(subStr.toLocaleLowerCase()) >= 0);
}

export function getFilteredChanges(searchText: string, changes: Change[]): Change[] {
    return changes && changes.filter(change =>
        change.item && change.item.serverItem && localeCaseInsensitiveContains(change.item.serverItem, searchText));
}
