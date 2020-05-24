/// <reference types="react" />
/// <reference types="react-dom" />

// React
import * as React from "react";
import * as ReactDOM from "react-dom";

// Office Fabric
import { Fabric } from "OfficeFabric/Fabric";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { Spinner } from "OfficeFabric/Spinner";
import * as VSS from "VSS/VSS";

import { EmptyResultPage } from "VersionControl/Scenarios/Shared/EmptyResultPage";
import { ActionCreator } from "VersionControl/Scenarios/Tags/TagsPage/Actions/ActionCreator";
import { IEnhancedTagRef } from "VersionControl/Scenarios/Tags/TagsPage/Actions/ActionsHub";
import { DeleteTagDialog } from "VersionControl/Scenarios/Tags/TagsPage/Components/DeleteTagsDialog";
import { TagsDetailsList } from "VersionControl/Scenarios/Tags/TagsPage/Components/TagsDetailsList";
import { TagsPageToolbar } from "VersionControl/Scenarios/Tags/TagsPage/Components/TagsPageToolbar";
import { ZeroDayTagsPage } from "VersionControl/Scenarios/Tags/TagsPage/Components/ZeroDayExperience";
import { StoresHub, AggregatedState } from "VersionControl/Scenarios/Tags/TagsPage/Stores/StoresHub";
import { CustomerIntelligenceData } from "VersionControl/Scripts/CustomerIntelligenceData";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

import "VSS/LoaderPlugins/Css!VersionControl/TagsPage";

export function renderInto(container: HTMLElement, props: TagsPageProps): void {
    ReactDOM.render(
        <TagsPage {...props} />,
        container);
}

export function unmountFrom(container: Element): void {
    ReactDOM.unmountComponentAtNode(container);
}

export interface TagsPageProps {
    actionCreator: ActionCreator;
    storesHub: StoresHub;
    customerIntelligenceData?: CustomerIntelligenceData;
}

export class TagsPage extends React.Component<TagsPageProps, AggregatedState> {
    constructor(props: TagsPageProps) {
        super(props);
        this.state = this.props.storesHub.getAggregatedState();
    }

    public componentDidMount(): void {
        this.props.storesHub.stores.treeStore.addChangedListener(this._onChanged);
        this.props.storesHub.stores.contextStore.addChangedListener(this._onChanged);
        this.props.storesHub.stores.filterStore.addChangedListener(this._onChanged);
        this.props.storesHub.stores.tagDeletionStore.addChangedListener(this._onChanged);
        this.props.storesHub.stores.notificationStore.addChangedListener(this._onChanged);
        this.props.storesHub.stores.permissionStore.addChangedListener(this._onChanged);
    }

    public componentWillMount(): void {
        this.props.actionCreator.loadTags();
    }

    public componentWillUnmount(): void {
        if (!this.props.storesHub) {
            return;
        }

        if (this.props.storesHub.stores.treeStore) {
            this.props.storesHub.stores.treeStore.removeChangedListener(this._onChanged);
            this.props.storesHub.stores.contextStore.removeChangedListener(this._onChanged);
            this.props.storesHub.stores.filterStore.removeChangedListener(this._onChanged);
            this.props.storesHub.stores.tagDeletionStore.removeChangedListener(this._onChanged);
            this.props.storesHub.stores.notificationStore.removeChangedListener(this._onChanged);
            this.props.storesHub.stores.permissionStore.removeChangedListener(this._onChanged);
        }
    }

    public render(): JSX.Element {

        const isFiltering: boolean = this.state.filterState.filterText !== "";
        const tags: IEnhancedTagRef[] = this.state.treeState.tags;
        const isLoading: boolean = this.props.storesHub.getAggregatedState().treeState.isLoading;
        const showTagsList: boolean = tags.length > 0 && !isLoading;
        if (!showTagsList) {
            this.props.actionCreator.notifyTagsPageListLoadComplete();
        }

        let gitRepoPermission = this.state.permissionState.gitPermission.repository;
        let settingPermission = this.state.permissionState.settingsPermissions;
        return (<div className="absolute-full">
            <Fabric className="vc-page absolute-full">
                {
                    this.state.tagDeletionState.isDeleting &&
                    <DeleteTagDialog
                        name={this.state.tagDeletionState.tagNameToDelete}
                        onDialogClose={this.props.actionCreator.deleteTagDialogClose}
                        onDeleteTag={this.props.actionCreator.deleteTag} />
                }
                <div className="vc-tags-header">
                    <TagsPageToolbar
                        onSearchValue={this.props.actionCreator.searchFilterEnter}
                        onChangeValue={this.props.actionCreator.searchFilterChange}
                        onCreateTag={this._onCreateTag}
                        isCreateTagVisible={gitRepoPermission.CreateTag} />
                </div>
                {
                    this.state.notificationState.message && showTagsList &&
                    <MessageBar
                        className={"vc-tags-message-bar"}
                        messageBarType={this.state.notificationState.messageType}
                        onDismiss={this.state.notificationState.isDismissable ? this.props.actionCreator.notificationcleared : undefined}>
                        {this.state.notificationState.message}
                    </MessageBar>
                }
                <div className="vc-tags-content-container-relative">
                    {showTagsList
                        ? <TagsDetailsList
                            repositoryContext={this.state.contextStoreState.getRepositoryContext()}
                            visibleTags={this.state.treeState.tags}
                            onFolderExpanded={this.props.actionCreator.folderExpanded}
                            onFolderCollapsed={this.props.actionCreator.folderCollapsed}
                            highlightText={this.props.storesHub.getAggregatedState().filterState.filterText}
                            compareTagBase={this.state.treeState.compareTagBase}
                            onXhrNavigateToHub={this.props.actionCreator.xhrNavigateToHub}
                            onContentFirstRendered={this.props.actionCreator.notifyTagsPageListLoadComplete}
                            onTagDeleteMenuInvoked={this.props.actionCreator.onTagDeleteInitiated}
                            onSetAsCompareTagInvoked={this.props.actionCreator.setComapreTagBase}
                            isCreateBranchAllowed={gitRepoPermission.CreateBranch}
                            isForcePushAllowed={gitRepoPermission.ForcePush}
                            isSettingWriteAllowed={settingPermission.Write}
                        />
                        : isLoading
                            ? <Spinner key={"Spinner"} className={"vc-history-spinner"} label={VCResources.FetchingResultsText} />
                            : isFiltering
                                ? <EmptyResultPage
                                    key={"TagsEmptyResultPage"}
                                    title={VCResources.EmptyTagsResultTitle}
                                    message={VCResources.EmptyTagsResultMessage} />
                                : <ZeroDayTagsPage onCreateTag={this._onCreateTag}
                                    canCreateTag={gitRepoPermission.CreateTag} />

                    }
                </div>
            </Fabric>
        </div>
        );
    }

    private _onCreateTag = (): void => {
        this.props.actionCreator.openCreateTagDialog(
            this.props.storesHub.getAggregatedState().contextStoreState.getRepositoryContext() as GitRepositoryContext,
            this.props.customerIntelligenceData.getView()
        );
    }

    private _onChanged = (): void => {
        this.setState(this.props.storesHub.getAggregatedState());
    }
}
