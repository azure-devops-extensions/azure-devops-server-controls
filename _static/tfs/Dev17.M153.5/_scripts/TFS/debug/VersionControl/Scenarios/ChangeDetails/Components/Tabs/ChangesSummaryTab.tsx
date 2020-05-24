import * as React from "react";
import * as ReactDOM from "react-dom";

import * as Performance from "VSS/Performance";
import { IMenuItemSpec } from "VSS/Controls/Menus";

import { DiscussionManager } from "Presentation/Scripts/TFS/TFS.Discussion.OM";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { ExitFullScreenMode, EnterFullScreenModeTooltip } from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { IChangeDetailsPropsBase } from "VersionControl/Scenarios/ChangeDetails/IChangeDetailsPropsBase";
import { ChangeDetailsPerfSplitScenarios } from "VersionControl/Scenarios/ChangeDetails/ChangeDetailsTelemetry";
import { ChangeListSummary, IChangeListSummaryProps } from "VersionControl/Scenarios/ChangeDetails/Components/ChangeListSummary";
import { FilterableDiffSummary} from "VersionControl/Scenarios/ChangeDetails/Components/FilterableDiffSummary";
import { StoresHub } from  "VersionControl/Scenarios/ChangeDetails/Stores/StoresHub";

import { Filter } from "VersionControl/Scripts/Controls/ChangeListSummaryControlFilter";
import { CustomerIntelligenceData } from "VersionControl/Scripts/CustomerIntelligenceData";
import { ChangeList, TfsChangeList} from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { ChangeExplorerGridDisplayMode } from "VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { LatestVersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";

export function renderTab(element: HTMLElement, props: IChangesSummaryTabProps): void {
    ReactDOM.render(
        <ChangesSummaryTab {...props}/>,
        element);
}

export interface IChangesSummaryTabProps extends IChangeDetailsPropsBase {
    performanceScenario?: Performance.IScenarioDescriptor;
    storesHub: StoresHub;
    fullScreenModeChangedCallBack(customerIntelligenceData?: CustomerIntelligenceData): void;
}

export interface IChangesSummaryTabState {
    tfsContext: TfsContext;
    repositoryContext: RepositoryContext;
    discussionManager: DiscussionManager;
    isFullScreen: boolean;
    isLoading: boolean;
    isVisible: boolean;
    changeList: TfsChangeList;
    originalChangeList: ChangeList;
    versionSpec: LatestVersionSpec;
    summaryFilter: Filter;
    displayMode: ChangeExplorerGridDisplayMode;
    resetSummaryView: boolean;
    maxDiffsToShow: number;
    hideArtifactLevelDiscussion: boolean;
}

/**
 * Controller view component for the ChangesSummary tab
 */
export class ChangesSummaryTab extends React.Component<IChangesSummaryTabProps, IChangesSummaryTabState> {

    constructor(props: IChangesSummaryTabProps) {
        super(props);

        this.state = this._getStateFromStores();
    }

    public render(): JSX.Element {
        const componentProps: IChangeListSummaryProps = {
            ...this.state,
            customerIntelligenceData: this.props.customerIntelligenceData,
            additionalMenuItems: this._getAdditionalActionMenuItems(),
            allowHideCommentsMenuItem: false,
        } as IChangeListSummaryProps;

        return(
            <FilterableDiffSummary
                diffProps={componentProps}
                componentType={ChangeListSummary}
                />
        );
    }

    public componentDidMount(): void {
        this.props.storesHub.contextStore.addChangedListener(this._onChange);
        this.props.storesHub.changeListStore.addChangedListener(this._onChange);
        this.props.storesHub.urlParametersStore.addChangedListener(this._onChange);
        this.props.storesHub.userPreferencesStore.addChangedListener(this._onChange);
        this.props.storesHub.discussionManagerStore.addChangedListener(this._onChange);
        this.props.storesHub.permissionsStore.addChangedListener(this._onChange);

        this._endPerformanceScenario();
    }

    public componentWillUnmount(): void {
        this.props.storesHub.contextStore.removeChangedListener(this._onChange);
        this.props.storesHub.changeListStore.removeChangedListener(this._onChange);
        this.props.storesHub.urlParametersStore.removeChangedListener(this._onChange);
        this.props.storesHub.userPreferencesStore.removeChangedListener(this._onChange);
        this.props.storesHub.discussionManagerStore.removeChangedListener(this._onChange);
        this.props.storesHub.permissionsStore.removeChangedListener(this._onChange);
    }

    public shouldComponentUpdate(nextProps: IChangesSummaryTabProps, nextState: IChangesSummaryTabState): boolean {
        if ((nextState.isLoading && this.state.isLoading) ||
            (!nextState.isVisible && !this.state.isVisible)) {
            return false;
        }

        return true;
    }

    private _endPerformanceScenario(): void {
        if (this.props.performanceScenario && this.props.performanceScenario.isActive()) {
            this.props.performanceScenario.addSplitTiming(ChangeDetailsPerfSplitScenarios.ChangesSummaryTabLoadComplete);
            this.props.performanceScenario.end();
        }
    }

    private _onChange = (): void => {
        this.setState(this._getStateFromStores());
    }

    private _getAdditionalActionMenuItems = (): IMenuItemSpec[] => {
        const menuItems: IMenuItemSpec[] = [];
        const isFullScreen = this.state.isFullScreen;

        menuItems.push({
            id: "fullscreen-toggle-button",
            showText: false,
            icon: isFullScreen ? "bowtie-icon bowtie-view-full-screen-exit" : "bowtie-icon bowtie-view-full-screen",
            title: isFullScreen ? ExitFullScreenMode : EnterFullScreenModeTooltip,
            action: () => { this.props.fullScreenModeChangedCallBack(this.props.customerIntelligenceData ? this.props.customerIntelligenceData.clone() : null); },
        });

        return menuItems;
    }

    private _getStateFromStores(): IChangesSummaryTabState {
        const isLoading = this.props.storesHub.contextStore.isLoading() ||
            this.props.storesHub.changeListStore.isLoading() ||
            this.props.storesHub.userPreferencesStore.isLoading();

        let summaryFilter = null;
        if (this.props.storesHub.urlParametersStore.path) {
            summaryFilter = {
                path: this.props.storesHub.urlParametersStore.path,
                recursive: this.props.storesHub.userPreferencesStore.isChangeExplorerGridDisplayModeFullTree,
            } as Filter;
        }

        return {
            tfsContext: this.props.storesHub.contextStore.getTfsContext(),
            repositoryContext: this.props.storesHub.contextStore.getRepositoryContext(),
            discussionManager: this.props.storesHub.discussionManagerStore.discussionManager,
            isFullScreen: this.props.storesHub.urlParametersStore.isFullScreen,
            isLoading: isLoading,
            isVisible: this.props.storesHub.urlParametersStore.isSummaryAction,
            originalChangeList: this.props.storesHub.changeListStore.originalChangeList,
            changeList: this.props.storesHub.changeListStore.currentChangeList as TfsChangeList,
            versionSpec: this.props.storesHub.changeListStore.versionSpec,
            summaryFilter: summaryFilter,
            displayMode: this.props.storesHub.userPreferencesStore.changeExplorerGridDisplayMode,
            maxDiffsToShow: this.props.storesHub.changeListStore.maxDiffsToShow,
            resetSummaryView: this.props.storesHub.changeListStore.resetSummaryView,
            hideArtifactLevelDiscussion: !this.props.storesHub.permissionsStore.getPermissions().addEditComment,
        };
    }
}
