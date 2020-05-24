import * as React from "react";
import * as ReactDOM from "react-dom";

import * as Performance from "VSS/Performance";
import { IMenuItemSpec } from "VSS/Controls/Menus";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { ExitFullScreenMode, EnterFullScreenModeTooltip } from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { ChangeDetailsPerfSplitScenarios } from "VersionControl/Scenarios/ChangeDetails/ChangeDetailsTelemetry";
import { IChangeDetailsPropsBase } from "VersionControl/Scenarios/ChangeDetails/IChangeDetailsPropsBase";
import { StoresHub } from  "VersionControl/Scenarios/ChangeDetails/GitCommit/StoresHub";
import { CommitDiffSummary, ICommitDiffSummaryProps} from "VersionControl/Scenarios/ChangeDetails/Components/CommitDiffSummary";
import { FilterableDiffSummary} from "VersionControl/Scenarios/ChangeDetails/Components/FilterableDiffSummary";
import { Filter } from "VersionControl/Scripts/Controls/ChangeListSummaryControlFilter";
import { CustomerIntelligenceData } from "VersionControl/Scripts/CustomerIntelligenceData";
import { ChangeList, GitCommit } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { ChangeExplorerGridDisplayMode } from "VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { LatestVersionSpec, VersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";

export function renderTab(element: HTMLElement, props: ICommitDiffSummaryTabProps): void {
    ReactDOM.render(
        <CommitDiffSummaryTab {...props}/>,
        element);
}

export interface ICommitDiffSummaryTabProps extends IChangeDetailsPropsBase {
    performanceScenario?: Performance.IScenarioDescriptor;
    storesHub: StoresHub;
    currentAction: string;
    fullScreenModeChangedCallBack(customerIntelligenceData?: CustomerIntelligenceData): void;
}

export interface ICommitDiffSummaryTabState {
    tfsContext: TfsContext;
    repositoryContext: RepositoryContext;
    isFullScreen: boolean;
    isLoading: boolean;
    isVisible: boolean;
    changeList: GitCommit;
    originalChangeList: ChangeList;
    versionSpec: LatestVersionSpec;
    compareToVersionSpec: VersionSpec;
    summaryFilter: Filter;
    displayMode: ChangeExplorerGridDisplayMode;
    maxDiffsToShow: number;
    resetSummaryView: boolean;
    hideArtifactLevelDiscussion: boolean;
}

/**
 * Controller view component for the CommitDiffSummary tab
 */
export class CommitDiffSummaryTab extends React.Component<ICommitDiffSummaryTabProps, ICommitDiffSummaryTabState> {

    constructor(props: ICommitDiffSummaryTabProps) {
        super(props);

        this.state = this._getStateFromStores();
    }

    public render(): JSX.Element {
        const componentProps: ICommitDiffSummaryProps = {
            ...this.state,
            customerIntelligenceData: this.props.customerIntelligenceData,
            additionalMenuItems: this._getAdditionalActionMenuItems(),
        } as ICommitDiffSummaryProps;

        return (
            <FilterableDiffSummary
                componentType={CommitDiffSummary}
                diffProps={componentProps}
                />
        );
    }

    public componentDidMount(): void {
        this.props.storesHub.contextStore.addChangedListener(this._onChange);
        this.props.storesHub.changeListStore.addChangedListener(this._onChange);
        this.props.storesHub.urlParametersStore.addChangedListener(this._onChange);
        this.props.storesHub.userPreferencesStore.addChangedListener(this._onChange);
        this.props.storesHub.permissionsStore.addChangedListener(this._onChange);

        this._endPerformanceScenario();
    }

    public componentWillUnmount(): void {
        this.props.storesHub.contextStore.removeChangedListener(this._onChange);
        this.props.storesHub.changeListStore.removeChangedListener(this._onChange);
        this.props.storesHub.urlParametersStore.removeChangedListener(this._onChange);
        this.props.storesHub.userPreferencesStore.removeChangedListener(this._onChange);
        this.props.storesHub.permissionsStore.removeChangedListener(this._onChange);
    }

    public shouldComponentUpdate(nextProps: ICommitDiffSummaryTabProps, nextState: ICommitDiffSummaryTabState): boolean {
        if ((nextState.isLoading && this.state.isLoading) ||
            (!nextState.isVisible && !this.state.isVisible)) {
            return false;
        }
        
        return true;
    }

    private _endPerformanceScenario(): void {
        if (this.props.performanceScenario && this.props.performanceScenario.isActive()) {
            this.props.performanceScenario.addSplitTiming(ChangeDetailsPerfSplitScenarios.CommitDiffSummaryTabLoadComplete);
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

    private _isVisible(): boolean {
        return this.props.storesHub.urlParametersStore.isDiffParentAction
            && this.props.currentAction === this.props.storesHub.urlParametersStore.currentAction;
    }

    private _getStateFromStores(): ICommitDiffSummaryTabState {
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
            isFullScreen: this.props.storesHub.urlParametersStore.isFullScreen,
            isLoading: isLoading,
            isVisible: this._isVisible(),
            originalChangeList: this.props.storesHub.changeListStore.originalChangeList,
            changeList: this.props.storesHub.changeListStore.currentChangeList as GitCommit,
            versionSpec: this.props.storesHub.changeListStore.versionSpec,
            compareToVersionSpec: this.props.storesHub.changeListStore.compareToVersionSpec,
            summaryFilter: summaryFilter,
            displayMode: this.props.storesHub.userPreferencesStore.changeExplorerGridDisplayMode,
            resetSummaryView: this.props.storesHub.changeListStore.resetSummaryView,
            maxDiffsToShow: this.props.storesHub.changeListStore.maxDiffsToShow,
            hideArtifactLevelDiscussion: !this.props.storesHub.permissionsStore.getPermissions().addEditComment,
        };
    }
}
