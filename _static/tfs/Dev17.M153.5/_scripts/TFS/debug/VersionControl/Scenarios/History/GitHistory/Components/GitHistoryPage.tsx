import { Fabric } from "OfficeFabric/Fabric";
import { autobind } from 'OfficeFabric/Utilities';
import * as React from "react";
import * as ReactDOM from "react-dom";

import { StatefulSplitter } from "Presentation/Scripts/TFS/Components/StatefulSplitter";
import * as Utils_String from "VSS/Utils/String";

import { ActionCreator } from "VersionControl/Scenarios/History/GitHistory/Actions/ActionCreator";
import { HistoryTabActionCreator } from "VersionControl/Scenarios/History/GitHistory/Actions/HistoryTabActionCreator";
import { HistoryTabActionsHub } from "VersionControl/Scenarios/History/GitHistory/Actions/HistoryTabActionsHub";
import { FilesTreeContainer } from "VersionControl/Scenarios/History/GitHistory/Components/FilesTree";
import * as VCHistoryTab from "VersionControl/Scenarios/History/GitHistory/Components/Tabs/HistoryTab";
import { HistoryCommitsSource } from "VersionControl/Scenarios/History/GitHistory/Sources/HistoryCommitsSource";
import { HistorySourcesHub } from "VersionControl/Scenarios/History/GitHistory/Sources/HistorySourcesHub";
import { HistoryTabStoresHub } from "VersionControl/Scenarios/History/GitHistory/Stores/HistoryTabStoresHub";
import { StoresHub, AggregatedState } from "VersionControl/Scenarios/History/GitHistory/Stores/StoresHub";
import { GitRefDropdownSwitch } from "VersionControl/Scenarios/Shared/GitRefDropdownSwitch";
import { NotificationArea } from "VersionControl/Scenarios/Shared/Notifications/NotificationArea";
import { Notification, NotificationType } from "VersionControl/Scenarios/Shared/Notifications/NotificationStore";
import { PathExplorerContainer } from "VersionControl/Scenarios/Shared/Path/PathExplorerContainer";
import { GitPermissionsSource } from "VersionControl/Scenarios/Shared/Permissions/GitPermissionsSource";
import { CustomerIntelligenceData } from "VersionControl/Scripts/CustomerIntelligenceData";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { VersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!VersionControl/GitHistoryPage";

export interface PageProps {
    actionCreator: ActionCreator;
    storesHub: StoresHub;
    customerIntelligenceData?: CustomerIntelligenceData;
}

export function renderInto(container: HTMLElement, props: PageProps): void {
    ReactDOM.render(
        <Page {...props} />,
        container);
}

// Structural Component
const Page = (props: PageProps): JSX.Element =>
        <Fabric className="vc-page absolute-full">
            <Header {...props} />
            <ContentHubContainer {...props} />
        </Fabric>;

// Stateless Components
const ContentHubContainer = (props: PageProps): JSX.Element =>
    <StatefulSplitter
        className="vc-splitter"
        statefulSettingsPath="Git.GitHistory.LeftHubSplitter"
        vertical={false}
        left={<LeftPane {...props} />}
        leftClassName="vc-files-tree absolute-full"
        right={<RightPane {...props} />}
        enableToggleButton={true}
        collapsedLabel={VCResources.SourceExplorerText}
        isFixedPaneVisibleByDefault={false} />;

/* These filters have standard class names
 * actual components are added into this div using search by classname
 */
const TitleFilters = (): JSX.Element =>
    <div className="vc-history-title-filters">
        <div className="vc-history-pivot-filters"/>
        <div className="vc-history-graph-toggle"/>
        <div className="vc-history-search-box">
            <div className="vc-search-adapter-commits search-box bowtie noDrop"/>
         </div>
    </div>;

const LeftPane = (props: PageProps): JSX.Element =>
        <FilesTreeContainer
            repositoryContext={props.storesHub.contextStore.getRepositoryContext()}
            pathStore={props.storesHub.pathStore}
            versionStore={props.storesHub.versionStore}
            actionCreator={props.actionCreator} />;

// State-full components
export class Header extends React.Component<PageProps, AggregatedState> {
    public render(): JSX.Element {
        const historyListPermissions = this.props.storesHub.historyListPermissionsStore.getPermissions();
        return <div className="vc-git-history-hub-header">
            <div className="vc-header-first">
                {
                    historyListPermissions && historyListPermissions.isPermissionLoaded
                    && <GitRefDropdownSwitch
                        repositoryContext={this.props.storesHub.contextStore.getRepositoryContext() as GitRepositoryContext}
                        versionSpec={this.props.storesHub.versionStore.state.versionSpec}
                        onSelectionChanged={this.props.actionCreator.onBranchChanged}
                        className={"vc-branches-container"}
                        viewMyBranches={historyListPermissions.hasCreateBranchPermission}
                    />
                }
                <div className="vc-page-path-explorer">
                    <PathExplorerContainer
                        onPathChange={this.props.actionCreator.changePath}
                        onEditingStart={this.props.actionCreator.startPathEditing}
                        onInputTextEdit={this.props.actionCreator.editPathText}
                        onEditingCancel={this.props.actionCreator.cancelPathEditing}
                        onSearchItemSelection={this.props.actionCreator.selectPathSearchItem}
                        pathStore={this.props.storesHub.pathStore}
                        pathSearchStore={this.props.storesHub.pathSearchStore} />
                </div>
                <TitleFilters />
            </div>
        </div>;
    }

    public componentDidMount(): void {
        this.props.storesHub.pathStore.addChangedListener(this._onChanged);
        this.props.storesHub.versionStore.addChangedListener(this._onChanged);
        this.props.storesHub.pathSearchStore.addChangedListener(this._onChanged);
        this.props.storesHub.contextStore.addChangedListener(this._onChanged);
        this.props.storesHub.historyListPermissionsStore.addChangedListener(this._onChanged);
    }

    public componentWillUnmount(): void {
        this.props.storesHub.pathStore.removeChangedListener(this._onChanged);
        this.props.storesHub.versionStore.removeChangedListener(this._onChanged);
        this.props.storesHub.pathSearchStore.removeChangedListener(this._onChanged);
        this.props.storesHub.contextStore.removeChangedListener(this._onChanged);
        this.props.storesHub.historyListPermissionsStore.removeChangedListener(this._onChanged);
    }

    @autobind
    private _onChanged (): void {
        this.setState(this.props.storesHub.getState());
    }
}

export const RightPane = (props: PageProps): JSX.Element => {
    return <div className="absolute-full">
        <Notifications {...props} />
        <ContentPane {...props} />
    </div>; 
}

export class ContentPane extends React.Component<PageProps, AggregatedState> {
    public render (): JSX.Element {
        const props = this.props;
        return <HistoryTabContainer {...props} />;
    }

    public componentDidMount (): void {
        this.props.storesHub.searchCriteriaStore.addChangedListener(this._onChanged);
    }

    public componentWillUnmount (): void {
        this.props.storesHub.searchCriteriaStore.removeChangedListener(this._onChanged);
    }

    @autobind
    private _onChanged (): void {
        this.setState(this.props.storesHub.getState());
    }
}

// Wrapper Component to History Tab
export class HistoryTabContainer extends React.Component<PageProps, {}> {
    private _storesHub: HistoryTabStoresHub;
    private _actionCreator: HistoryTabActionCreator;
    private _historyTabOptions: VCHistoryTab.IHistoryTabOptions = null;

    constructor(props: PageProps) {
        super(props);
        this._initializeFlux();
    }

    private _initializeFlux = (): void => {
        const actionsHub = new HistoryTabActionsHub();
        this._storesHub = new HistoryTabStoresHub(actionsHub);
        const repoContext = this.props.storesHub.contextStore.getRepositoryContext() as GitRepositoryContext;
        const sourcesHub: HistorySourcesHub = {
            historyCommitsSource: new HistoryCommitsSource(repoContext),
            permissionsSource: new GitPermissionsSource(repoContext.getRepository().project.id, repoContext.getRepositoryId())
        };

        this._actionCreator = new HistoryTabActionCreator(
            actionsHub,
            sourcesHub,
            this._storesHub.getAggregatedState);
        
        this._historyTabOptions = {
            onFilterUpdated: this.props.actionCreator.onFilterUpdated,
            scenarioComplete: this.props.actionCreator.scenarioComplete,
        };
    }

    public render(): JSX.Element {
        const searchState = this.props.storesHub.searchCriteriaStore.state;
        const historySearchProps = {
            historySearchCriteria: searchState.searchCriteria,
            itemPath: searchState.searchCriteria.itemPath,
            itemVersion: searchState.searchCriteria.itemVersion,
            repositoryContext: this.props.storesHub.contextStore.getRepositoryContext(),
        } as VCHistoryTab.IHistoryTabSearchProps;

        return <VCHistoryTab.HistoryTab
            actionCreator={this._actionCreator}
            storesHub= {this._storesHub}
            historySearchProps={historySearchProps}
            tabOptions={this._historyTabOptions}
            customerIntelligenceData= {this.props.customerIntelligenceData ? this.props.customerIntelligenceData.clone() : null} />;
    }
}

export class Notifications extends React.Component<PageProps, AggregatedState> {
    public render(): JSX.Element {

        const notifications: Notification = getDeletedBranchNotification(
            this.props.storesHub.versionStore.state.versionSpec,
            this.props.storesHub.versionStore.state.deletedBranchName);
        return notifications ? <div className="notification-area-container">
            <NotificationArea
                notifications={[notifications]}
                onDismiss={this.props.actionCreator.dismissNotification} />
        </div> : null;
    }

    public componentDidMount(): void {
        this.props.storesHub.versionStore.addChangedListener(this._onChanged);
    }

    public componentWillUnmount(): void {
        this.props.storesHub.versionStore.removeChangedListener(this._onChanged);
    }

    @autobind
    private _onChanged (): void {
        this.setState(this.props.storesHub.getState());
    }
}

export function getDeletedBranchNotification(currentVersionSpec: VersionSpec, deleledBranchName: string): Notification {
    if (!!deleledBranchName &&
        currentVersionSpec) {
        const notificationMessage: string = Utils_String.format(
            VCResources.UserDefaultBranchDeletedErrorMessage_WithoutVersionInUrl,
            deleledBranchName,
            currentVersionSpec.toDisplayText());

        return {
            message: notificationMessage,
            type: NotificationType.warning,
            isDismissable: true,
            key: deleledBranchName,
        };
    }
}
