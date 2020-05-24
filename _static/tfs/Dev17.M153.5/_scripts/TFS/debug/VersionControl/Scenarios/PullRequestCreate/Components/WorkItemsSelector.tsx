import * as React from "react";
import { IconButton } from "OfficeFabric/Button";
import { Label } from "OfficeFabric/Label";
import { DirectionalHint, TooltipHost } from "VSSUI/Tooltip";
import { autobind, css } from "OfficeFabric/Utilities";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { WorkItemListSelector } from "VersionControl/Scenarios/Shared/WorkItemListSelector";
import { RemoveWorkItemsDialog } from "VersionControl/Scenarios/Shared/RemoveWorkItemsDialog";
import { mapWorkItemIdToLinkedArtifact } from "VersionControl/Scripts/Utils/WorkItemLinkUtils";
import { StoresHub } from "VersionControl/Scenarios/PullRequestCreate/Stores/StoresHub";
import { ViewMode, IInternalLinkedArtifactDisplayData, ZeroDataExperienceViewMode } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Contracts";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as Telemetry from "VSS/Telemetry/Services";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import * as Utils_Array from "VSS/Utils/Array";

import "VSS/LoaderPlugins/Css!VersionControl/WorkItemsSelector";

export interface WorkItemsSelectorProps {
    tfsContext: TfsContext;
    workItemIds: number[];
    addWorkItem(workItemId: number): void;
    containsWorkItem(workItemId: number): boolean;
    removeWorkItem(workItemId: IInternalLinkedArtifactDisplayData): void;
    removeAllWorkItems(): void;
    validationMessage?: string;
}

export interface WorkItemsSelectorState {
    showConfirmDialog?: boolean;
    workItemToRemove?: IInternalLinkedArtifactDisplayData; // if null, remove all
}

export class WorkItemsSelector extends React.Component<WorkItemsSelectorProps, WorkItemsSelectorState> {
    constructor(props: WorkItemsSelectorProps) {
        super(props);
        this.state = { showConfirmDialog: false };
    }

    public shouldComponentUpdate(nextProps: WorkItemsSelectorProps, nextState: WorkItemsSelectorState) {
        const workItemsChanged = !Utils_Array.arrayEquals(this.props.workItemIds, nextProps.workItemIds, (n1, n2) => n1 === n2);
        const otherPropsChanged = this.props.tfsContext !== nextProps.tfsContext
            || this.props.addWorkItem !== nextProps.addWorkItem
            || this.props.containsWorkItem !== nextProps.containsWorkItem
            || this.props.removeWorkItem !== nextProps.removeWorkItem
            || this.props.removeAllWorkItems !== nextProps.removeAllWorkItems
            || this.props.validationMessage !== nextProps.validationMessage;

        const stateChanged = this.state.showConfirmDialog !== nextState.showConfirmDialog
            || this.state.workItemToRemove !== nextState.workItemToRemove;

        return workItemsChanged || otherPropsChanged || stateChanged;
    }

    public render(): JSX.Element {
        const showRemoveAllButton: boolean = Boolean(this.props.removeAllWorkItems) && Boolean(this.props.workItemIds) && this.props.workItemIds.length > 0;

        return (
            <div className="vc-pullRequestCreate-workItemsSelector">
                {
                    this.state.showConfirmDialog &&
                    <RemoveWorkItemsDialog
                        workItemToRemove={this.state.workItemToRemove && Number(this.state.workItemToRemove.id)}
                        okAction={this._removeWorkItems}
                        dismissAction={this._hideConfirmDialog} />
                }
                <Label id="addWorkItemsLabel" className="vc-pullRequestCreate-label">{VCResources.PullRequest_RelatedArtifactsTitle}</Label>
                {
                    showRemoveAllButton &&
                    <div className="vc-pullRequestCreate-removeAllWorkItemsTooltipHost">
                        <TooltipHost
                            content={VCResources.PullRequest_RelatedArtifactsRemoveAllLabel}
                            directionalHint={DirectionalHint.bottomCenter}>
                            <IconButton
                                id="removeAllButton"
                                iconProps={{ iconName: null }}
                                className={css("vc-pullRequestCreate-removeAllWorkItemsButton", "bowtie-icon", "bowtie-edit-delete")}
                                onClick={this._confirmRemoveAllWorkItems} />
                        </TooltipHost>
                    </div>
                }
                <span
                    id="workItemSelectorError"
                    aria-live="assertive"
                    className={css("workItemsSelector-error", { "visible": Boolean(this.props.validationMessage)}, { "hidden": !this.props.validationMessage})}>
                    {this.props.validationMessage}
                </span>
                <WorkItemListSelector
                    tfsContext={this.props.tfsContext}
                    linkedArtifacts={this.props.workItemIds.map(mapWorkItemIdToLinkedArtifact)}
                    onWorkItemAdd={this.props.addWorkItem}
                    checkWorkItemExists={this.props.containsWorkItem}
                    onRemoveLinkedArtifact={this._confirmRemoveWorkItem}
                    viewOptions={{ viewMode: ViewMode.List, showGroupHeaders: false }}
                    zeroDataOptions={{ zeroDataExperienceViewMode: ZeroDataExperienceViewMode.Hidden }}
                    linkTypeRefNames={null}
                    hostArtifactId={null}
                    dropIconCss="bowtie-chevron-down-light"
                    ariaLabelledBy="addWorkItemsLabel" />
            </div>);
    }

    @autobind
    private _confirmRemoveAllWorkItems(): void {
        this.setState({
            showConfirmDialog: true,
            workItemToRemove: null,
        });
    }

    @autobind
    private _confirmRemoveWorkItem(workItemId: IInternalLinkedArtifactDisplayData): void {
        this.setState({
            showConfirmDialog: true,
            workItemToRemove: workItemId,
        });
    }

    @autobind
    private _removeWorkItems(): void {
        if (this.state.workItemToRemove) {
            if (this.props.removeWorkItem) {
                this.props.removeWorkItem(this.state.workItemToRemove);
            }
        }
        else {
            Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
                CustomerIntelligenceConstants.RELATED_WORK_ITEMS_DELETE_ALL_CREATE, {
                    "contextId": "pullRequestCreateContext",
                    "workItemIds": this.props.workItemIds,
                }));

            if (this.props.removeAllWorkItems) {
                this.props.removeAllWorkItems();
            }
        }

        this.setState({ showConfirmDialog: false });
    }

    @autobind
    private _hideConfirmDialog(): void {
        this.setState({ showConfirmDialog: false });
    }
}
