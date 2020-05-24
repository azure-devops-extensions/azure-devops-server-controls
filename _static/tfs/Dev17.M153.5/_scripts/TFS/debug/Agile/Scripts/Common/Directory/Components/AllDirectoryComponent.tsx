import * as React from "react";

import { HubError } from "Agile/Scripts/Common/Components/AgileHubError";
import { LoadingComponent } from "Presentation/Scripts/TFS/Components/LoadingComponent";
import { IPivotItemContentProps, PivotItemContent } from "Agile/Scripts/Common/Components/PivotItemContent";
import { IDirectoryActionsCreator } from "Agile/Scripts/Common/Directory/ActionsCreator/DirectoryActionsCreator";
import { DEFAULT_NAME_COLUMN, DEFAULT_TEAM_COLUMN, DirectoryGrid, IDirectoryRow } from "Agile/Scripts/Common/Directory/Components/DirectoryGrid";
import { DirectoryPerformanceTelemetryConstants, DirectoryUsageTelemetryConstants } from "Agile/Scripts/Common/Directory/DirectoryConstants";
import { getAllDirectoryData, IAllDirectoryState } from "Agile/Scripts/Common/Directory/Selectors/ContentSelectors";
import { IDirectoryFilterStore } from "Agile/Scripts/Common/Directory/Store/DirectoryFilterStore";
import { IDirectoryStore } from "Agile/Scripts/Common/Directory/Store/DirectoryStore";
import { DirectoryPivotType } from "Agile/Scripts/Common/DirectoryPivot";
import { HubTelemetryHelper } from "Agile/Scripts/Common/HubTelemetryHelper";
import { PerformanceTelemetryHelper } from "Presentation/Scripts/TFS/PerformanceTelemetryHelper";
import { Team } from "Agile/Scripts/Models/Team";
import { GenericFilterZeroData } from "Presentation/Scripts/TFS/Components/GenericFilterZeroData";
import { getDefaultWebContext } from "VSS/Context";
import { delay } from "VSS/Utils/Core";
import { FILTER_CHANGE_EVENT, IFilter } from "VSSUI/Utilities/Filter";
import { IVssIconProps } from "VSSUI/VssIcon";

export interface IAllDirectoryComponentProps extends IPivotItemContentProps {
    /** The actions creator */
    actionsCreator: IDirectoryActionsCreator;
    /** The store */
    directoryStore: IDirectoryStore;
    /** The filter store */
    directoryFilterStore: IDirectoryFilterStore;
    /** The hub view filter */
    filter: IFilter;

    artifactIconProps: IVssIconProps;
    artifactNamePlural: string;
    getArtifactUrl: (team: Team) => string;
    hubName: string;
    navigateToUrl: (url: string) => void;
    telemetryHelper: HubTelemetryHelper;
}

export class AllDirectoryComponent extends PivotItemContent<IAllDirectoryComponentProps, IAllDirectoryState> {
    private _gridShouldAcquireFocus = true;
    constructor(props: IAllDirectoryComponentProps, context: any) {
        super(props, context, props.hubName, DirectoryPivotType.all);
        this.state = getAllDirectoryData(
            props.artifactNamePlural,
            props.directoryStore,
            props.directoryFilterStore,
            props.getArtifactUrl
        );
    }

    public componentWillMount(): void {
        const telemetryHelper = PerformanceTelemetryHelper.getInstance(this.props.hubName);
        if (!telemetryHelper.isActive()) {
            telemetryHelper.startScenario(DirectoryPerformanceTelemetryConstants.DIRECTORY_PIVOT_MOUNTED);
            telemetryHelper.addData({
                pivot: DirectoryPivotType.all
            });
        }
    }

    public componentDidMount(): void {
        const {
            actionsCreator,
            directoryFilterStore,
            directoryStore,
            filter
        } = this.props;

        const {
            isInitialized
        } = this.state;

        super.componentDidMount();

        directoryFilterStore.addChangedListener(this._onStoreChanged);
        directoryStore.addChangedListener(this._onStoreChanged);

        filter.subscribe(this._onFilterChanged, FILTER_CHANGE_EVENT);

        if (!isInitialized) {
            actionsCreator.initializeAllData();
        }
    }

    public render(): JSX.Element {
        const {
            artifactIconProps,
            artifactNamePlural
        } = this.props;

        const {
            exceptionInfo,
            rowGroups,
            zeroFilterData
        } = this.state;

        if (!this.isDataReady()) {
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
                <div className="boards-zero-data">
                    <GenericFilterZeroData artifactName={artifactNamePlural} />
                </div>
            );
        } else {
            const shouldAcquireFocus = this._gridShouldAcquireFocus;
            this._gridShouldAcquireFocus = false;
            return (
                <DirectoryGrid
                    artifactIconProps={artifactIconProps}
                    columns={[
                        DEFAULT_NAME_COLUMN,
                        DEFAULT_TEAM_COLUMN
                    ]}
                    project={getDefaultWebContext().project}
                    isGrouped={false}
                    items={rowGroups}
                    takeFocusOnMount={shouldAcquireFocus}
                    onFavoriteToggled={this._onFavoriteToggled}
                    onItemClicked={this._onItemClicked}
                />
            );
        }
    }

    public componentWillUnmount(): void {
        const {
            directoryFilterStore,
            directoryStore,
            filter
        } = this.props;

        directoryFilterStore.removeChangedListener(this._onStoreChanged);
        directoryStore.removeChangedListener(this._onStoreChanged);
        filter.unsubscribe(this._onFilterChanged, FILTER_CHANGE_EVENT);
    }

    public isDataReady(): boolean {
        return this.state.isInitialized;
    }

    private _onFavoriteToggled = (row: IDirectoryRow<Team>): void => {
        const {
            actionsCreator,
            directoryStore
        } = this.props;

        actionsCreator.toggleFavorite(row.data, directoryStore.getFavoriteState(row.data.id), directoryStore.getFavorite(row.data.id));
    }

    private _onFilterChanged = (): void => {
        const {
            actionsCreator,
            directoryFilterStore,
            filter
        } = this.props;

        const newFilterState = filter.getState();

        if (directoryFilterStore.shouldUpdateFilter(newFilterState, DirectoryPivotType.all)) {
            actionsCreator.filterChanged(newFilterState, DirectoryPivotType.all);
        }
    }

    private _onItemClicked = (row: IDirectoryRow<Team>, ev: Event): void => {
        const {
            navigateToUrl,
            telemetryHelper
        } = this.props;

        telemetryHelper.publishTelemetry(DirectoryUsageTelemetryConstants.DIRECTORY_ARTIFACT_NAVIGATE, {
            targetTeamId: row.data.id,
            url: row.url
        });

        // Do XHR nav when updating team isn't necessary
        if (!getDefaultWebContext().team) {
            delay(this, 0, () => navigateToUrl(row.url));
            // Prevent full page refresh
            ev.preventDefault();
            ev.stopPropagation();
        }
    }

    private _onStoreChanged = (): void => {
        const {
            artifactNamePlural,
            directoryStore,
            directoryFilterStore,
            getArtifactUrl
        } = this.props;

        this.setState(
            getAllDirectoryData(
                artifactNamePlural,
                directoryStore,
                directoryFilterStore,
                getArtifactUrl
            )
        );
    }
}