import "VSS/LoaderPlugins/Css!WorkItemsHub/Scripts/Components/WorkItemsHubView";

import * as React from "react";
import * as Resources from "WorkItemsHub/Scripts/Resources/TFS.Resources.WorkItemsHub";
import { autobind } from "OfficeFabric/Utilities";
import { ContributablePivotItemProvider } from "VSSPreview/Providers/ContributablePivotItemProvider";
import { IVssHubViewState } from "VSSPreview/Utilities/VssHubViewState";
import { Hub } from "VSSUI/Components/Hub/Hub";
import { HubHeader } from "VSSUI/Components/HubHeader/HubHeader";
import {
    IPivotBarAction,
    IPivotBarViewAction,
    PivotRenderingMode,
    IPivotRenderingModeOptions
} from "VSSUI/PivotBar";
import { HubViewOptionKeys } from "VSSUI/Utilities/HubViewState";
import { ObservableArray } from "VSS/Core/Observable";
import { ActionsCreator } from "WorkItemsHub/Scripts/Actions/ActionsCreator";
import { WorkItemsTabFilter } from "WorkItemsHub/Scripts/Components/WorkItemsTabFilter";
import { WorkItemsHubStore } from "WorkItemsHub/Scripts/Stores/WorkItemsHubStore";
import { WorkItemsHubTabGroupContributionId } from "WorkItemsHub/Scripts/Constants";

export interface IWorkItemsHubViewProp {
    store: WorkItemsHubStore;
    actionsCreator: ActionsCreator;
    projectInfo: ContextIdentifier;
    hubViewState: IVssHubViewState;
    commands: IPivotBarAction[] | ObservableArray<IPivotBarAction>;
    viewActions: IPivotBarViewAction[] | ObservableArray<IPivotBarViewAction>;
}

export class WorkItemsHubView extends React.Component<IWorkItemsHubViewProp, {}> {
    private _pivotProvider: ContributablePivotItemProvider<void>;
    private _workItemsTabFilter: WorkItemsTabFilter;
    private _focusFilterBarOnMount: boolean;

    constructor(props: IWorkItemsHubViewProp) {
        super(props);
        this._pivotProvider = new ContributablePivotItemProvider([WorkItemsHubTabGroupContributionId], null);
    }

    public render(): JSX.Element {
        const { hubViewState, viewActions, commands, store, projectInfo, actionsCreator } = this.props;

        return (
            <Hub
                className="work-items-hub-view"
                hubViewState={hubViewState}
                commands={commands}
                viewActions={viewActions}
                pivotProviders={[this._pivotProvider]}
                pivotRenderingModeOptions={this._getPivotRenderingModeOptions()}
                onRenderFilterBar={() => <WorkItemsTabFilter
                    filter={hubViewState.filter}
                    tabId={hubViewState.selectedPivot.value.toLowerCase()}
                    store={store}
                    actionsCreator={actionsCreator}
                    projectInfo={projectInfo}
                    ref={this._resolveWorkItemsTabFilter}
                />}>
                <HubHeader title={Resources.WorkItemsHubTitle} />
            </Hub >
        );
    }

    private _getPivotRenderingModeOptions(): IPivotRenderingModeOptions {
        return {
            mode: PivotRenderingMode.DropDown,
            props: {
                dropdownWidth: 180
            }
        } as IPivotRenderingModeOptions;
    }

    /**
     * Shows and focuses on the filter bar.
     */
    public activateFilter(): void {
        this.props.hubViewState.viewOptions.setViewOption(HubViewOptionKeys.showFilterBar, true);
        if (this._workItemsTabFilter) {
            this._workItemsTabFilter.focusFilterBar();
        }
        else {
            this._focusFilterBarOnMount = true; // remember to focus on render if the filter bar was previously not mounted
        }
    }

    @autobind
    private _resolveWorkItemsTabFilter(filter: WorkItemsTabFilter): void {
        this._workItemsTabFilter = filter;

        if (this._focusFilterBarOnMount) {
            this._focusFilterBarOnMount = false;
            this._workItemsTabFilter.focusFilterBar();
        }
    }
}
