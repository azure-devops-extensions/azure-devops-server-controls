import * as React from "react";
import "VSS/LoaderPlugins/Css!Agile/Scripts/Common/Components/SprintMarker/SprintMarker";
import "VSS/LoaderPlugins/Css!Agile/Scripts/Common/Components/SprintMarker/SprintPickerCallout";
import { IPickList, PickList, IPickListSelection, IPickListItem, IPickListIndicator, IPickListAction } from "VSSUI/PickList";
import { Callout } from "OfficeFabric/Callout";
import { IItemIndicatorProps } from "VSSUI/ItemIndicator";
import { IterationTimeframe } from "Agile/Scripts/Models/Iteration/IterationTimeFrame";
import * as SprintMarkerHelper from "Agile/Scripts/Common/Components/SprintMarker/SprintMarkerHelper";
import { Iteration } from "Agile/Scripts/Models/Iteration";
import * as SprintsHubResources from "Agile/Scripts/Resources/TFS.Resources.SprintsHub";
import { ITeamIterations } from "Agile/Scripts/SprintsHub/SprintView/SprintContentViewContracts";
import { VssIconType } from "VSSUI/VssIcon";
import { Colors } from "Agile/Scripts/Common/Colors";
import { areAdvancedBacklogFeaturesEnabled } from "Agile/Scripts/Common/Agile";
import { SprintsHubTelemetryHelper } from "Agile/Scripts/Common/HubTelemetryHelper";
import { SprintViewUsageTelemetryConstants } from "Agile/Scripts/SprintsHub/SprintView/SprintContentViewTelemetryConstants";

export interface ISprintPickerCalloutProps {
    teamIterations: ITeamIterations;
    selectedIteration: Iteration;

    calloutTarget: HTMLElement;
    onIterationChanged: (iteration: Iteration) => void;
    onNewSprint: () => void;
    onDismiss: () => void;
}

export class SprintPickerCallout extends React.Component<ISprintPickerCalloutProps, {}> {
    private _pickList: IPickList;
    private _searchTelemetryPublished: boolean;

    public render() {
        const {
            teamIterations,
            calloutTarget,
            selectedIteration
        } = this.props;

        const {
            currentIteration,
            pastIterations,
            futureIterations
        } = teamIterations;

        const items = [...pastIterations, currentIteration, ...futureIterations];
        const indicators: IPickListIndicator[] = [
            {
                getItemIndicator: this._getIterationIndicator
            }
        ];

        let calloutContents = <div>{SprintsHubResources.SprintPicker_NoSprintsAvailable}</div>;
        if (items && items.length > 0) {
            calloutContents = (
                <PickList
                    className={"sprint-pick-list"}
                    indicators={indicators}
                    componentRef={this._setPickList}
                    isSearchable={true}
                    items={items}
                    selectedItems={[selectedIteration]}
                    getListItem={this._getIterationItem}
                    onSearch={this._onSearch}
                    onSelectionChanged={this._onSelectionChanged}
                    searchTextPlaceholder={SprintsHubResources.SprintPicker_SearchPlaceholder}
                    minItemsForSearchBox={5}
                    getActions={this._getActions}
                    searchNoResultsText={SprintsHubResources.SprintPicker_NoSprintsAvailable}
                />
            );
        }

        return (
            <Callout
                onDismiss={this._onDismiss}
                onPositioned={this._focusPickList}
                target={calloutTarget}
                isBeakVisible={false}
            >
                {calloutContents}
            </Callout>
        );
    }

    private _getActions = (): IPickListAction[] => {

        if (!areAdvancedBacklogFeaturesEnabled()) {
            return [];
        }

        const {
            onNewSprint
        } = this.props;

        return [{
            name: SprintsHubResources.NewSprint,
            iconProps: { iconType: VssIconType.fabric, iconName: "Add" },
            onClick: onNewSprint,
            ariaLabel: SprintsHubResources.NewSprint_AriaLabel
        }];
    }

    private _focusPickList = () => {
        if (this._pickList) {
            this._pickList.focus();
            this._pickList.scrollToSelected();
        }
    }

    private _setPickList = (pickList: IPickList) => {
        this._pickList = pickList;
    }

    private _onDismiss = () => {
        this.props.onDismiss();
    }

    private _onSearch = (): undefined => {
        if (!this._searchTelemetryPublished) {
            SprintsHubTelemetryHelper.publishTelemetry(SprintViewUsageTelemetryConstants.SEARCH_SPRINT, {});
            this._searchTelemetryPublished = true;
        }
        return;
    }

    private _onSelectionChanged = (selection: IPickListSelection) => {
        const iteration = selection.selectedItems[0] as Iteration;
        this.props.onIterationChanged(iteration);
    }

    private _getIterationItem = (iteration: Iteration): IPickListItem => {
        const markerData = this._getIterationMarkerData(iteration);
        return {
            key: iteration.id,
            name: iteration.name,
            iconProps: {
                iconName: "sprint",
                iconType: VssIconType.fabric,
                styles: { root: { color: Colors.BLACK } }
            },
            ariaLabel: `${iteration.name} ${markerData.text}`
        };
    }

    private _getIterationIndicator = (item: Iteration): IItemIndicatorProps => {

        const markerData = this._getIterationMarkerData(item);

        return {
            title: markerData.text,
            className: markerData.cssClass
        };
    }

    private _getIterationMarkerData(iteration: Iteration) {
        const {
            teamIterations
        } = this.props;

        const {
            currentIteration,
            futureIterations
        } = teamIterations;

        let timeFrame: IterationTimeframe = IterationTimeframe.Current;
        if (currentIteration.id === iteration.id) {
            timeFrame = IterationTimeframe.Current;
        } else if (futureIterations.some(i => i.id === iteration.id)) {
            timeFrame = IterationTimeframe.Future;
        } else {
            timeFrame = IterationTimeframe.Past;
        }

        return SprintMarkerHelper.mapToMarkerData(timeFrame);
    }
}