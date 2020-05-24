import * as Q from "q";
import * as React from "react";

import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import { SourceProviderUtils } from "CIWorkflow/Scripts/Scenarios/Definition/SourceProvider";
import { RepositoryListState } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/VersionControlActions";
import { VersionControlActionsCreator } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/VersionControlActionsCreator";
import { IRepository } from "CIWorkflow/Scripts/Scenarios/Definition/Sources/VersionControlInterfaces";
import { VersionControlStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/VersionControlStore";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import * as DTCResources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { StringInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/StringInputComponent";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

import { DefaultButton } from "OfficeFabric/Button";
import { Dialog, DialogFooter } from "OfficeFabric/Dialog";
import { SelectionMode } from "OfficeFabric/Selection";
import { KeyCodes } from "OfficeFabric/Utilities";

import { PickList, IPickListAction, IPickListItem, IPickListSelection } from "VSSUI/PickList";
import { VssIconType } from "VSSUI/VssIcon";
import * as Utils_String from "VSS/Utils/String";
import * as Url_Utils from "VSS/Utils/Url";

import "VSS/LoaderPlugins/Css!CIWorkflow/Scripts/Scenarios/Definition/Components/GitRepositoryBrowser";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Styles/FabricStyleOverrides";

export interface IProps extends Base.IProps {
    onCloseDialog?: () => void;
    onSave: (repository: string) => void;
    showDialog: boolean;
}

export interface IGitRepositoryBrowseState extends Base.IState {
    selectedItem: string;
    items?: IPickListItem[];
    showAllLoadedLabel: boolean;
}

// This control supports browsing Git repositories used by VersionControlStore, which is currently
// GitHub, GitHub Enterprise, & BitBucket (External Git doesn't support browing repositories)
export class Component extends Base.Component<IProps, IGitRepositoryBrowseState> {
    private _versionControlStore: VersionControlStore;
    private _versionControlActionsCreator: VersionControlActionsCreator;
    private _loadRepositoriesPromise: Q.Deferred<string[]>;

    public constructor(props: IProps) {
        super(props);
        this._versionControlStore = StoreManager.GetStore<VersionControlStore>(VersionControlStore);
        this._versionControlActionsCreator = ActionCreatorManager.GetActionCreator<VersionControlActionsCreator>(VersionControlActionsCreator);
    }

    public componentWillMount(): void {
        this._versionControlStore.addChangedListener(this._onChange);
    }

    public componentWillUnmount(): void {
        this._versionControlStore.removeChangedListener(this._onChange);
    }

    public render(): JSX.Element {
        return (!this.props.showDialog ? null :
            <Dialog
                hidden={!this.props.showDialog}
                title={Resources.SelectRepository}
                onDismiss={this._onCloseDialog}
                modalProps={{ className: "bowtie-fabric", containerClassName: "git-repo-browser-dialog" }}>
                <i> {this.state.showAllLoadedLabel ? Resources.AllRepositories : Resources.YourRepositories} </i>
                <div onDoubleClick={this._onOkClick}>
                    <PickList
                        className="git-repo-browser-picklist"
                        getActions={this._getActions}
                        items={ this._getRepositories() }
                        isSearchable={true}
                        minItemsForSearchBox={0 /* Always show the filter bar */}
                        noItemsText={Resources.NoRepositoriesFound}
                        onSelectionChanged={this._onSelectionChanged}
                        searchTextPlaceholder={Resources.FilterRepositories}
                        selectionMode={SelectionMode.single}
                        searchNoResultsText={Resources.NoMatchingRepository}
                        selectedItems={ [this.state.selectedItem] }
                    />
                </div>
                <DialogFooter className="bowtie">
                    <DefaultButton
                        className="btn-cta"
                        onClick={this._onOkClick}>
                        {DTCResources.SelectTitle}
                    </DefaultButton>
                    <DefaultButton
                        onClick={this._onCloseDialog}
                        disabled={false}>
                        {DTCResources.CancelButtonText}
                    </DefaultButton>
                </DialogFooter>
            </Dialog>
        );
    }

    private _getRepositories(): string[] | Promise<string[]> {
        const state = this._versionControlStore.getState();
        if (state.repositoryListState === RepositoryListState.AllRepositories ||
            state.repositoryListState === RepositoryListState.TopRepositories) {
            return state.repositories.map(r => r.name);
        }
        this._loadRepositoriesPromise = Q.defer<string[]>();
        return Promise.resolve(this._loadRepositoriesPromise.promise);
    }

    private _getActions = (items: IPickListItem[]): IPickListAction[] => {
        const actions: IPickListAction[] = [];
        const icon: string = SourceProviderUtils.getIconClass(this._versionControlStore.getSelectedRepositoryType());
        if (!this.state.showAllLoadedLabel) {
            actions.push({
                name: Resources.LoadAllRepositories,
                iconProps: {
                    iconType: VssIconType.fabric,
                    iconName: icon
                },
                onClick: () => {
                    this._versionControlActionsCreator.requestAllRepositories(this._versionControlStore.getSelectedRepositoryType());
                }
            });
        }
        const link: string = SourceProviderUtils.getManageRepositoriesLink(this._versionControlStore.getSelectedRepositoryType());
        const uri: Url_Utils.Uri = link && Url_Utils.Uri.parse(link);
        if (link && uri) {
            actions.push({
                name: Utils_String.localeFormat(Resources.VisitSite, uri.host),
                iconProps: {
                    iconType: VssIconType.fabric,
                    iconName: icon
                },
                onClick: () => {
                    window.open(link);
                }
            });
        }
        return actions;
    }

    private _onChange = (): void => {
        this._updateState();
    }

    private _updateState() {
        const state = this._versionControlStore.getState();

        const items: IPickListItem[] = state.repositories.map(repo => {
            return {
                name: repo.name,
                key: repo.name
            };
        });

        if (this._loadRepositoriesPromise &&
            (state.repositoryListState === RepositoryListState.AllRepositories ||
            state.repositoryListState === RepositoryListState.TopRepositories)) {
            this._loadRepositoriesPromise.resolve(state.repositories.map(r => r.name));
            this._loadRepositoriesPromise = null;
        }

        this.setState({
            items: items,
            showAllLoadedLabel:
                state.repositoryListState === RepositoryListState.AllRepositories ||
                state.repositoryListState === RepositoryListState.FetchingAllRepositories ||
                !state.sourceProvider.canQueryTopRepositories()
        });
    }

    private _onOkClick = () => {
        if (this.props.onSave && this.state.selectedItem) {
            this.props.onSave(this.state.selectedItem);
        }
    }

    private _onCloseDialog = () => {
        this.props.onCloseDialog();
    }

    private _onSelectionChanged = (selection: IPickListSelection) => {
        const selectedItem: string = selection && selection.selectedItems && selection.selectedItems.length > 0 && selection.selectedItems[0];
        if (selectedItem && this.state.items) {
            this.setState({ selectedItem: selectedItem });
        }
    }
}
