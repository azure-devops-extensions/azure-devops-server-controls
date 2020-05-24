import * as React from "react";

import { HubError } from "Agile/Scripts/Common/Components/AgileHubError";
import { LoadingComponent } from "Presentation/Scripts/TFS/Components/LoadingComponent";
import { IPivotItemContentProps, PivotItemContent } from "Agile/Scripts/Common/Components/PivotItemContent";
import { IDirectoryActionsCreator } from "Agile/Scripts/Common/Directory/ActionsCreator/DirectoryActionsCreator";
import { FavoriteState, IFavoriteData } from "Agile/Scripts/Common/Directory/DirectoryContracts";
import { IDirectoryFilterStore } from "Agile/Scripts/Common/Directory/Store/DirectoryFilterStore";
import { IDirectoryStore } from "Agile/Scripts/Common/Directory/Store/DirectoryStore";
import { DirectoryPivotType } from "Agile/Scripts/Common/DirectoryPivot";
import { PerformanceTelemetryHelper } from "Presentation/Scripts/TFS/PerformanceTelemetryHelper";
import { SprintsHubConstants } from "Agile/Scripts/Generated/HubConstants";
import * as SprintDirectoryResources from "Agile/Scripts/Resources/TFS.Resources.SprintsHub.Directory";
import { ISprintsDirectoryActionsCreator } from "Agile/Scripts/SprintsHub/Directory/ActionsCreator/SprintsDirectoryActionsCreator";
import { SprintsDirectoryGrid } from "Agile/Scripts/SprintsHub/Directory/Components/SprintsDirectoryGrid";
import { getMySprintsData, IMySprintsState } from "Agile/Scripts/SprintsHub/Directory/Selectors/SprintsContentSelectors";
import { SprintsDirectoryPerformanceTelemetryConstants } from "Agile/Scripts/SprintsHub/Directory/SprintsHubDirectoryConstants";
import { ISprintsDirectoryStore } from "Agile/Scripts/SprintsHub/Directory/Store/SprintsDirectoryStore";
import { GenericFilterZeroData } from "Presentation/Scripts/TFS/Components/GenericFilterZeroData";
import { FILTER_CHANGE_EVENT, IFilter } from "VSSUI/Utilities/Filter";

export interface IMySprintsComponentProps extends IPivotItemContentProps {
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
}

export class MySprintsComponent extends PivotItemContent<IMySprintsComponentProps, IMySprintsState> {
    private _gridShouldAcquireFocus = true;

    constructor(props: IMySprintsComponentProps, context: any) {
        super(props, context, SprintsHubConstants.HUB_NAME, DirectoryPivotType.mine as string);

        this.state = getMySprintsData(props.directoryStore, props.directoryFilterStore, props.sprintDirectoryStore);
    }

    public componentWillMount(): void {
        const telemetryHelper = PerformanceTelemetryHelper.getInstance(SprintsHubConstants.HUB_NAME);
        if (!telemetryHelper.isActive()) {
            telemetryHelper.startScenario(SprintsDirectoryPerformanceTelemetryConstants.ACTIONSCREATOR_DIRECTORY_PIVOT_CHANGED);
            telemetryHelper.addData({
                pivot: DirectoryPivotType.mine
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
        filter.subscribe(this._onFilterChanged, FILTER_CHANGE_EVENT);

        if (!isInitialized) {
            directoryActionsCreator.initializeMyData();
        }
    }

    public componentWillUnmount(): void {
        const {
            directoryStore,
            directoryFilterStore,
            filter,
            sprintDirectoryStore
        } = this.props;

        super.componentWillUnmount();

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
            isFilterActive,
            isInitialized,
            rowGroups,
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
        } else if (zeroFilterData) {
            this._gridShouldAcquireFocus = false;
            return (
                <div className="sprints-zero-data">
                    <GenericFilterZeroData artifactName={SprintDirectoryResources.Sprints} />
                </div>
            );
        } else {
            const shouldAcquireFocus = this._gridShouldAcquireFocus;
            this._gridShouldAcquireFocus = false;
            return (
                <SprintsDirectoryGrid
                    directoryActionsCreator={directoryActionsCreator}
                    sprintDirectoryActionsCreator={sprintDirectoryActionsCreator}
                    rowGroups={rowGroups}
                    hostPivot={DirectoryPivotType.mine}
                    isGrouped={!isFilterActive}
                    getFavoriteData={this._getFavoriteData}
                    getFavoriteState={this._getFavoriteState}
                    takeFocusOnMount={shouldAcquireFocus}
                />
            );
        }
    }

    public isDataReady(): boolean {
        return this.state.isInitialized;
    }

    private _onFilterChanged = (): void => {
        const {
            directoryActionsCreator,
            directoryFilterStore,
            filter
        } = this.props;

        const newFilterState = filter.getState();
        if (directoryFilterStore.shouldUpdateFilter(newFilterState, DirectoryPivotType.mine)) {
            directoryActionsCreator.filterChanged(newFilterState, DirectoryPivotType.mine);
        }
    }

    private _onStoreChanged = (): void => {
        const {
            directoryStore,
            directoryFilterStore,
            sprintDirectoryStore
        } = this.props;

        this.setState(getMySprintsData(directoryStore, directoryFilterStore, sprintDirectoryStore));
    }

    private _getFavoriteData = (teamId: string): IFavoriteData => {
        return this.props.directoryStore.getFavorite(teamId);
    }

    private _getFavoriteState = (teamId: string): FavoriteState => {
        return this.props.directoryStore.getFavoriteState(teamId);
    }
}