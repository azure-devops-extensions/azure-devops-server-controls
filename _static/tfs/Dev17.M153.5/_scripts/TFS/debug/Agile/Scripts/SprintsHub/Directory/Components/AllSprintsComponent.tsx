import * as React from "react";

import { HubError } from "Agile/Scripts/Common/Components/AgileHubError";
import { LoadingComponent } from "Presentation/Scripts/TFS/Components/LoadingComponent";
import { IPivotItemContentProps, PivotItemContent } from "Agile/Scripts/Common/Components/PivotItemContent";
import { IDirectoryActionsCreator } from "Agile/Scripts/Common/Directory/ActionsCreator/DirectoryActionsCreator";
import { FavoriteState, IFavoriteData } from "Agile/Scripts/Common/Directory/DirectoryContracts";
import { IDirectoryFilterStore } from "Agile/Scripts/Common/Directory/Store/DirectoryFilterStore";
import { IDirectoryStore } from "Agile/Scripts/Common/Directory/Store/DirectoryStore";
import { DirectoryPivotType } from "Agile/Scripts/Common/DirectoryPivot";
import { SprintsHubTelemetryHelper } from "Agile/Scripts/Common/HubTelemetryHelper";
import { PerformanceTelemetryHelper } from "Presentation/Scripts/TFS/PerformanceTelemetryHelper";
import { SprintsHubConstants } from "Agile/Scripts/Generated/HubConstants";
import * as SprintDirectoryResources from "Agile/Scripts/Resources/TFS.Resources.SprintsHub.Directory";
import { ISprintsDirectoryActionsCreator } from "Agile/Scripts/SprintsHub/Directory/ActionsCreator/SprintsDirectoryActionsCreator";
import { SprintsDirectoryGrid } from "Agile/Scripts/SprintsHub/Directory/Components/SprintsDirectoryGrid";
import { getAllSprintsData, IAllSprintsState } from "Agile/Scripts/SprintsHub/Directory/Selectors/SprintsContentSelectors";
import {
    SprintsDirectoryPerformanceTelemetryConstants,
    SprintsDirectoryUsageTelemetryConstants
} from "Agile/Scripts/SprintsHub/Directory/SprintsHubDirectoryConstants";
import { ISprintsDirectoryStore } from "Agile/Scripts/SprintsHub/Directory/Store/SprintsDirectoryStore";
import { Link } from "OfficeFabric/Link";
import { GenericFilterZeroData } from "Presentation/Scripts/TFS/Components/GenericFilterZeroData";
import { WorkZeroDataIllustrationPaths } from "Presentation/Scripts/TFS/TFS.IllustrationUrlUtils";
import { urlHelper } from "VSS/Locations";
import { FormatComponent } from "VSSPreview/Flux/Components/Format";
import { FILTER_CHANGE_EVENT, IFilter, IFilterState } from "VSSUI/Utilities/Filter";
import { ZeroData, ZeroDataActionType } from "VSSUI/ZeroData";

export interface IAllSprintsListComponentProps extends IPivotItemContentProps {
    /** The common directory actions creator */
    directoryActionsCreator: IDirectoryActionsCreator;
    /** The common directory store */
    directoryStore: IDirectoryStore;
    /** The common directory filter store */
    directoryFilterStore: IDirectoryFilterStore;
    /** The actions creator containing specfic sprint operations */
    sprintDirectoryActionsCreator: ISprintsDirectoryActionsCreator;
    /** The store containing sprint specific information */
    sprintDirectoryStore: ISprintsDirectoryStore;
    /** The hub view filter */
    filter: IFilter;
    onNewSprint: () => void;
}

export class AllSprintsComponent extends PivotItemContent<IAllSprintsListComponentProps, IAllSprintsState> {
    private _gridShouldAcquireFocus = true;
    constructor(props: IAllSprintsListComponentProps, context: any) {
        super(props, context, SprintsHubConstants.HUB_NAME, DirectoryPivotType.all as string);

        this.state = getAllSprintsData(props.directoryStore, props.directoryFilterStore, props.sprintDirectoryStore);
    }

    public componentWillMount(): void {
        const telemetryHelper = PerformanceTelemetryHelper.getInstance(SprintsHubConstants.HUB_NAME);
        if (!telemetryHelper.isActive()) {
            telemetryHelper.startScenario(SprintsDirectoryPerformanceTelemetryConstants.ACTIONSCREATOR_DIRECTORY_PIVOT_CHANGED);
            telemetryHelper.addData({
                pivot: DirectoryPivotType.all
            });
        }
    }

    public componentDidMount(): void {
        const {
            directoryActionsCreator,
            directoryStore,
            directoryFilterStore,
            filter,
            sprintDirectoryStore
        } = this.props;

        const {
            isInitialized
        } = this.state;

        super.componentDidMount();

        directoryStore.addChangedListener(this._onStoreChanged);
        directoryFilterStore.addChangedListener(this._onStoreChanged);
        sprintDirectoryStore.addChangedListener(this._onStoreChanged);

        if (!isInitialized) {
            directoryActionsCreator.initializeAllData();
        }

        filter.subscribe(this._onFilterChanged, FILTER_CHANGE_EVENT);

        if (this.state.helpText) {
            SprintsHubTelemetryHelper.publishTelemetry(SprintsDirectoryUsageTelemetryConstants.SPRINTSDIRECTORY_EXCEEDPAGESIZE, { exceedPageSize: true, helpText: this.state.helpText });
        }
    }

    public componentDidUpdate(prevProps: IAllSprintsListComponentProps, prevState: IAllSprintsState): void {
        super.componentDidUpdate(prevProps, prevState);

        if (!prevState.helpText && this.state.helpText) {
            SprintsHubTelemetryHelper.publishTelemetry(SprintsDirectoryUsageTelemetryConstants.SPRINTSDIRECTORY_EXCEEDPAGESIZE, { exceedPageSize: true, helpText: this.state.helpText });
        }
    }

    public componentWillUnmount(): void {
        const {
            directoryStore,
            directoryFilterStore,
            filter,
            sprintDirectoryStore
        } = this.props;

        directoryStore.removeChangedListener(this._onStoreChanged);
        directoryFilterStore.removeChangedListener(this._onStoreChanged);
        sprintDirectoryStore.removeChangedListener(this._onStoreChanged);

        filter.unsubscribe(this._onFilterChanged, FILTER_CHANGE_EVENT);
    }

    public render(): JSX.Element {
        const {
            directoryActionsCreator,
            sprintDirectoryActionsCreator
        } = this.props;

        const {
            exceptionInfo,
            helpText,
            isInitialized,
            rowGroups,
            zeroData,
            zeroFilterData
        } = this.state;

        if (!isInitialized) {
            return (
                <LoadingComponent />
            );
        } else if (exceptionInfo) {
            return (
                <HubError
                    exceptionsInfo={[exceptionInfo]}
                />
            );
        } else if (zeroData || zeroFilterData) {
            return this._renderZeroData();
        } else {
            const shouldAcquireFocus = this._gridShouldAcquireFocus;
            this._gridShouldAcquireFocus = false;
            return (
                <div>
                    <SprintsDirectoryGrid
                        directoryActionsCreator={directoryActionsCreator}
                        sprintDirectoryActionsCreator={sprintDirectoryActionsCreator}
                        rowGroups={rowGroups}
                        isGrouped={false}
                        hostPivot={DirectoryPivotType.all}
                        getFavoriteData={this._getFavoriteData}
                        getFavoriteState={this._getFavoriteState}
                        takeFocusOnMount={shouldAcquireFocus}
                    />
                    {helpText && (
                        <div className={"helper-text-container"} >
                            {helpText}
                        </div>
                    )}
                </div>
            );
        }
    }

    public isDataReady(): boolean {
        return this.state.isInitialized;
    }

    private _renderZeroData(): JSX.Element {
        const {
            zeroFilterData
        } = this.state;
        let zeroDataContent: JSX.Element;

        if (zeroFilterData) {
            zeroDataContent = (
                <GenericFilterZeroData artifactName={SprintDirectoryResources.Sprints} />
            );
            this._gridShouldAcquireFocus = false;
        } else {
            zeroDataContent = (
                <ZeroData
                    imagePath={urlHelper.getVersionedContentUrl(WorkZeroDataIllustrationPaths.GetStartedWithSprints)}
                    imageAltText={SprintDirectoryResources.ZeroData_Title}
                    primaryText={SprintDirectoryResources.ZeroData_Title}
                    secondaryText={(
                        <FormatComponent format={SprintDirectoryResources.ZeroData_Subtitle}>
                            <Link href="https://go.microsoft.com/fwlink/?linkid=861699">
                                {SprintDirectoryResources.ZeroData_IterationPath}
                            </Link>
                        </FormatComponent>
                    )}
                    actionType={ZeroDataActionType.ctaButton}
                    actionText={SprintDirectoryResources.ZeroData_Action}
                    onActionClick={this.props.onNewSprint}
                />
            );
        }

        return (
            <div className="sprints-zero-data">
                {zeroDataContent}
            </div>
        );
    }

    private _onFilterChanged = (filterStateChange: IFilterState): void => {
        const {
            directoryActionsCreator,
            directoryStore,
            directoryFilterStore,
            filter,
            sprintDirectoryActionsCreator,
            sprintDirectoryStore
        } = this.props;

        const newFilterState = filter.getState();
        if (directoryFilterStore.shouldUpdateFilter(newFilterState, DirectoryPivotType.all)) {
            directoryActionsCreator.filterChanged(newFilterState, DirectoryPivotType.all);
            sprintDirectoryActionsCreator.pageTeams(filterStateChange, sprintDirectoryStore.pagedTeamIds, directoryStore.allTeams)
        }
    }

    private _onStoreChanged = (): void => {
        const {
            directoryStore,
            directoryFilterStore,
            sprintDirectoryStore
        } = this.props;

        this.setState(getAllSprintsData(directoryStore, directoryFilterStore, sprintDirectoryStore));
    }

    private _getFavoriteData = (teamId: string): IFavoriteData => {
        return this.props.directoryStore.getFavorite(teamId);
    }

    private _getFavoriteState = (teamId: string): FavoriteState => {
        return this.props.directoryStore.getFavoriteState(teamId);
    }
}