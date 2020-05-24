import * as React from "react";

import "VSS/LoaderPlugins/Css!Agile/Scripts/Common/Directory/Components/DirectoryView";
import { AgileHubShortcutGroup } from "Agile/Scripts/Common/Controls";
import { DirectoryActions } from "Agile/Scripts/Common/Directory/ActionsCreator/DirectoryActions";
import { IDirectoryActionsCreator } from "Agile/Scripts/Common/Directory/ActionsCreator/DirectoryActionsCreator";
import { AllDirectoryComponent } from "Agile/Scripts/Common/Directory/Components/AllDirectoryComponent";
import { DirectoryFilterBar } from "Agile/Scripts/Common/Directory/Components/DirectoryFilterBar";
import { DirectoryViewState } from "Agile/Scripts/Common/Directory/Components/DirectoryViewState";
import { MyDirectoryComponent } from "Agile/Scripts/Common/Directory/Components/MyDirectoryComponent";
import { DirectoryUsageTelemetryConstants } from "Agile/Scripts/Common/Directory/DirectoryConstants";
import { DirectoryFilterStore } from "Agile/Scripts/Common/Directory/Store/DirectoryFilterStore";
import { IDirectoryStore } from "Agile/Scripts/Common/Directory/Store/DirectoryStore";
import { DirectoryPivotType, IDirectoryPivot } from "Agile/Scripts/Common/DirectoryPivot";
import { HubDirectoryFilterShortcutGroup, IHubDirectoryFilterShortcutActions } from "Agile/Scripts/Common/HubShortcuts";
import { HubTelemetryHelper } from "Agile/Scripts/Common/HubTelemetryHelper";
import * as HubServerConstants from "Agile/Scripts/Generated/HubConstants";
import { Team } from "Agile/Scripts/Models/Team";
import * as KeyboardShortcuts from "VSS/Controls/KeyboardShortcuts";
import { IObservableViewStateUrl } from "VSSPreview/Utilities/ViewStateNavigation";
import { Hub } from "VSSUI/Components/Hub/Hub";
import { HubHeader } from "VSSUI/Components/HubHeader/HubHeader";
import { PivotBarItem } from "VSSUI/PivotBar";
import { HubViewOptionKeys } from "VSSUI/Utilities/HubViewState";
import { IVssIconProps } from "VSSUI/VssIcon";

export interface IDirectoryViewProps {
    actions: DirectoryActions;
    actionsCreator: IDirectoryActionsCreator;
    store: IDirectoryStore;
    selectedPivot: DirectoryPivotType;
    pivots: IDirectoryPivot[];

    artifactIconProps: IVssIconProps;
    artifactNameSingular: string;
    artifactNamePlural: string;
    getArtifactUrl: (team: Team) => string;
    hubName: string;
    navigateToUrl: (url: string) => void;
    telemetryHelper: HubTelemetryHelper;
}

export class DirectoryView extends React.Component<IDirectoryViewProps, {}>{
    private _hubViewState: DirectoryViewState;
    private _allPivotUrl: IObservableViewStateUrl;
    private _minePivotUrl: IObservableViewStateUrl;
    private _shortcuts: HubDirectoryFilterShortcutGroup;

    private _filterStore: DirectoryFilterStore;

    constructor(props: IDirectoryViewProps) {
        super(props);
        this._hubViewState = new DirectoryViewState(props.selectedPivot);
        new AgileHubShortcutGroup(this._hubViewState.viewOptions);

        this._filterStore = new DirectoryFilterStore(props.actions, this._hubViewState.filter, this._hubViewState.viewOptions, props.selectedPivot);
    }

    public componentDidMount(): void {
        this._allPivotUrl = this._hubViewState.createObservableUrl({
            [HubServerConstants.AgileRouteParameters.Pivot]: DirectoryPivotType.all
        });
        this._minePivotUrl = this._hubViewState.createObservableUrl({
            [HubServerConstants.AgileRouteParameters.Pivot]: DirectoryPivotType.mine
        });

        this._hubViewState.selectedPivot.subscribe(this._onPivotChanged);

        this._initializeShortcuts();
        this._publishViewInitializedTelemetry();
    }

    public render(): JSX.Element {
        return (
            <div className="directory-content">
                <Hub
                    hubViewState={this._hubViewState}
                    onRenderFilterBar={this._renderFilterBar}
                >
                    <HubHeader
                        title={this.props.artifactNamePlural}
                    />
                    {this.props.pivots.map(p => this._renderPivot(p))}
                </Hub>
            </div>
        );
    }

    public componentWillUnmount(): void {
        this._hubViewState.selectedPivot.unsubscribe(this._onPivotChanged);
        this._hubViewState.dispose();
        this._hubViewState = null;
        this._shortcuts.dispose();
    }

    private _renderPivot(pivot: IDirectoryPivot): JSX.Element {
        const {
            actionsCreator,
            store,
            artifactIconProps,
            artifactNameSingular,
            artifactNamePlural,
            getArtifactUrl,
            hubName,
            navigateToUrl,
            telemetryHelper
        } = this.props;

        return (
            <PivotBarItem
                key={`pivotBarItem.${pivot.name}`}
                className={"directory-pivotBarItem"}
                name={pivot.name}
                url={pivot.type === DirectoryPivotType.all ? this._allPivotUrl : this._minePivotUrl}
                itemKey={pivot.type}
            >
                {
                    (pivot.type === DirectoryPivotType.all) ?
                        <AllDirectoryComponent
                            actionsCreator={actionsCreator}
                            directoryFilterStore={this._filterStore}
                            directoryStore={store}
                            filter={this._hubViewState.filter}
                            artifactIconProps={artifactIconProps}
                            artifactNamePlural={artifactNamePlural}
                            getArtifactUrl={getArtifactUrl}
                            hubName={hubName}
                            navigateToUrl={navigateToUrl}
                            telemetryHelper={telemetryHelper}

                        /> :
                        <MyDirectoryComponent
                            actionsCreator={actionsCreator}
                            directoryFilterStore={this._filterStore}
                            directoryStore={store}
                            filter={this._hubViewState.filter}
                            artifactIconProps={artifactIconProps}
                            artifactNameSingular={artifactNameSingular}
                            artifactNamePlural={artifactNamePlural}
                            getArtifactUrl={getArtifactUrl}
                            hubName={hubName}
                            navigateToUrl={navigateToUrl}
                            telemetryHelper={telemetryHelper}
                        />
                }
            </PivotBarItem>
        );
    }

    private _renderFilterBar = (): JSX.Element => {
        return (
            <DirectoryFilterBar
                activePivot={this._hubViewState.selectedPivot.value as DirectoryPivotType}
                directoryStore={this.props.store}
                filter={this._hubViewState.filter}
                className={"directory-filterbar"}
            />
        );
    }

    private _onPivotChanged = (newPivotKey: string) => {
        this.props.actionsCreator.pivotChanged(newPivotKey as DirectoryPivotType);
        this.props.telemetryHelper.publishTelemetryValue(DirectoryUsageTelemetryConstants.DIRECTORY_PIVOT_SWITCHED, DirectoryUsageTelemetryConstants.PIVOT, newPivotKey);
    }

    private _publishViewInitializedTelemetry() {
        const feature: string = DirectoryUsageTelemetryConstants.DIRECTORY_VIEW_INITIALIZED;
        const properties: IDictionaryStringTo<any> = {
            [DirectoryUsageTelemetryConstants.PIVOT]: this._hubViewState.selectedPivot.value
        };

        this.props.telemetryHelper.publishTelemetry(feature, properties);
    }

    private _initializeShortcuts() {
        const actions: IHubDirectoryFilterShortcutActions = {
            filterResultsAction: this._showFilterBarShortcutAction
        };

        this._shortcuts = new HubDirectoryFilterShortcutGroup(actions);
    }

    private _showFilterBarShortcutAction = (e: KeyboardShortcuts.IEKeyboardEvent, combo: string) => {
        this._hubViewState.viewOptions.setViewOption(HubViewOptionKeys.showFilterBar, true);
    }
}