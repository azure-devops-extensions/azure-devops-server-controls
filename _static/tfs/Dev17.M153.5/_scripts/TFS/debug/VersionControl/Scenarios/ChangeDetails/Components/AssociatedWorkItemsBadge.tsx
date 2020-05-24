import * as React from "react";
import { autobind, getId } from 'OfficeFabric/Utilities';
import * as Number from "VSS/Utils/Number";
import * as Utils_String from "VSS/Utils/String";
import * as Telemetry from "VSS/Telemetry/Services";

import { IHostArtifact, IInternalLinkedArtifactDisplayData } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Contracts";
import { getAsyncLoadedComponent } from "VSS/Flux/AsyncLoadedComponent";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import { queueModulePreload } from "VersionControl/Scripts/DeferredJobQueue";
import {
    AssociatedWorkItemFormat,
    AssociatedWorkItemsFormat,
    AssociatedWorkItems_AriaDescription,
    ChangeDetailsAssociatedWorkItems,
    WorkItem,
    WorkItems,
} from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as AssociatedWorkItems_Async from "VersionControl/Scenarios/ChangeDetails/Components/AssociatedWorkItems";
import { Flyout } from "VersionControl/Scenarios/Shared/Flyout";
import { StatBadge } from "VersionControl/Scenarios/Shared/StatBadge";


export interface IAssociatedWorkItemsBadgeProps {
    associatedWorkItemIds: number[];
    tfsContext: TfsContext;
    telemetryEventData: Telemetry.TelemetryEventData;
    hostArtifact?: IHostArtifact;
}

// We want to delay load the of Associated work items in flyout content
const AsyncAssociatedWorkItems = getAsyncLoadedComponent(
    ["VersionControl/Scenarios/ChangeDetails/Components/AssociatedWorkItems"],
    (m: typeof AssociatedWorkItems_Async) => m.AssociatedWorkItems);

/**
 * Rendering container for Associcated work items Badge control 
 */
export class AssociatedWorkItemsBadge extends React.Component<IAssociatedWorkItemsBadgeProps, {}> {
    private _isLoadEventJobForWorkItemsQueued: boolean;
    private _ariaDescribedById: string;
    private _workItemCache: IDictionaryStringTo<IInternalLinkedArtifactDisplayData> = {};

    constructor(props: IAssociatedWorkItemsBadgeProps) {
        super(props);

        this._ariaDescribedById = getId("workitem-flyout-describedby");
    }

    public render(): JSX.Element {
        const workItems = this.props.associatedWorkItemIds;

        if (!workItems || workItems.length === 0) {
            return null;
        } else if (!this._isLoadEventJobForWorkItemsQueued) {
            queueModulePreload("VersionControl/Scenarios/ChangeDetails/Components/AssociatedWorkItems");
            this._isLoadEventJobForWorkItemsQueued = true;
        }

        return (
            <Flyout
                className={"associated-work-items-flyout"}
                headerClassName={"stats-badge-header"}
                isEnabled={true}
                calloutHasFocusableElements={true}
                ariaLabel={this._getWorkItemsAriaLabel(workItems.length)}
                ariaDescribedBy={this._ariaDescribedById}
                setInitialFocus={true}
                dropdownContent={this._getWorkItemsFlyoutContent()}
                onOpen={this._onFlyoutOpened}>
                <StatBadge
                    title={this._getWorkItemString(workItems.length)}
                    count={workItems.length}
                    iconClassName={"bowtie-work-item"} />
                <div className={"hidden"} id={this._ariaDescribedById}>
                    {AssociatedWorkItems_AriaDescription}
                </div>
            </Flyout>
        );
    }

    private _getWorkItemsFlyoutContent(): JSX.Element {
        return ( // tabIndex is temporary hack to give focus to work items flyout content. should be removed once work items flyout starts using details list.
            <div className={"workitems-flyout-content"}>
                <div className={"flyout-content-title"} tabIndex={0} title={ChangeDetailsAssociatedWorkItems} aria-label={ChangeDetailsAssociatedWorkItems} >
                    {ChangeDetailsAssociatedWorkItems}
                </div>
                <AsyncAssociatedWorkItems
                    associatedWorkItemIds={this.props.associatedWorkItemIds}
                    hostArtifact={this.props.hostArtifact}
                    tfsContext={this.props.tfsContext}
                    getWorkItemDisplayData={this._getWorkItemDisplayData}
                    setWorkItemDisplayData={this._setWorkItemDisplayData}
                    invalidateWorkItemDisplayData={this._invalidateWorkItemDisplayData} />
            </div>
        );
    }

    private _getWorkItemString(count: number): string {
        return count === 1 ? WorkItem : WorkItems;
    }

    private _getWorkItemsAriaLabel(count: number): string {
        if (count === 1) {
            return Utils_String.format(AssociatedWorkItemFormat, Number.toDecimalLocaleString(count, true));
        } else {
            return Utils_String.format(AssociatedWorkItemsFormat, Number.toDecimalLocaleString(count, true));
        }
    }

    private _setWorkItemDisplayData = (key: string, value: IInternalLinkedArtifactDisplayData) => {
        if (key && value) {
            this._workItemCache[key] = value;
        }
    }

    private _getWorkItemDisplayData = (key: string): IInternalLinkedArtifactDisplayData => {
        let workItemDisplayData = null;
        if (key) {
            workItemDisplayData = this._workItemCache[key];
        }

        return workItemDisplayData;
    }

    private _invalidateWorkItemDisplayData = (key: string) => {
        if (key) {
            delete this._workItemCache[key];
        }
    }

    @autobind
    private _onFlyoutOpened(): void {
        this._logTelemetry();
    }

    private _logTelemetry(): void {
        const ciData: Telemetry.TelemetryEventData = $.extend({}, this.props.telemetryEventData);
        ciData.feature = ciData.feature ? ciData.feature : CustomerIntelligenceConstants.STATS_BADGE;
        ciData.properties[CustomerIntelligenceConstants.STATS_BADGE_NAME_PROPERTY] = "AssoicatedWorkItemsStatsBadge";
        Telemetry.publishEvent(ciData);
    }
}
