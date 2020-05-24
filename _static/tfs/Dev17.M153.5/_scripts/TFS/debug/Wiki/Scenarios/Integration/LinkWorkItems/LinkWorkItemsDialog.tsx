import * as React from "react";
import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";
import { Dialog, DialogFooter, DialogType } from "OfficeFabric/Dialog";
import { Label } from "OfficeFabric/Label";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { Spinner } from "OfficeFabric/Spinner";
import { autobind } from "OfficeFabric/Utilities";
import { Artifact } from "VSS/Artifacts/Services";
import * as Events_Action from "VSS/Events/Action";
import { publishEvent, TelemetryEventData } from "VSS/Telemetry/Services";

import { ILinkedArtifact } from "TFS/WorkItemTracking/ExtensionContracts";
import { LinkedArtifactsControl } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Control";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import {
    ViewMode,
    ZeroDataExperienceViewMode,
    ILinkedArtifactsCache,
    IInternalLinkedArtifactDisplayData,
} from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Contracts";

import { WorkItemListSelector } from "VersionControl/Scenarios/Shared/WorkItemListSelector";
import { mapWorkItemIdToLinkedArtifact } from "VersionControl/Scripts/Utils/WorkItemLinkUtils";
import { LinkedWorkItemDataProviderConstants } from "WorkItemTracking/Scripts/DataProviders/LinkedWorkItemDataProvider";
import { WorkItemActions } from "WorkItemTracking/Scripts/Utils/WorkItemControlsActions";

import { LinkWorkItemsActionCreator } from "Wiki/Scenarios/Integration/LinkWorkItems/LinkWorkItemsActionCreator";
import { LinkWorkItemsActionsHub } from "Wiki/Scenarios/Integration/LinkWorkItems/LinkWorkItemsActionsHub";
import { LinkWorkItemsSource } from "Wiki/Scenarios/Integration/LinkWorkItems/LinkWorkItemsSource";
import { LinkWorkItemsStore } from "Wiki/Scenarios/Integration/LinkWorkItems/LinkWorkItemsStore";
import * as WikiResources from "Wiki/Scripts/Resources/TFS.Resources.Wiki";

import "VSS/LoaderPlugins/Css!Wiki/Scenarios/Integration/LinkWorkItems/LinkWorkItems";

export interface LinkWorkItemsDialogProps {
    projectId: string;
    isOpen: boolean;
    message: string;
    onDismiss(workItemsUpdated: boolean): void;
    hostArtifact: Artifact;
    artifactLinkName: string;
    dialogHeaderLabel: string;
    telemetryEventData: TelemetryEventData;
}

export interface LinkWorkItemsDialogState {
    isSaving: boolean;
    workItemsInDraft: number[];
    isDirty: boolean;
    errorMessage: string;
}

export class LinkWorkItemsDialog extends React.PureComponent<LinkWorkItemsDialogProps, LinkWorkItemsDialogState> {
    private _actionCreator: LinkWorkItemsActionCreator;
    private _store: LinkWorkItemsStore;
    private _onDismissTimeoutHandler: number = null;
    private _workItemCache: IDictionaryStringTo<IInternalLinkedArtifactDisplayData> = {};

    constructor(props: LinkWorkItemsDialogProps) {
        super(props);

        this._instantiateFlux();
        this.state = this._getStateFromStore();
    }

    public render() {
        const hostArtifact = this.props.hostArtifact;

        return (
            <Dialog
                hidden={!this.props.isOpen}
                modalProps={{
                    className: "link-work-items-dialog",
                    containerClassName: "container",
                    isBlocking: true,
                }}
                dialogContentProps={{
                    type: DialogType.normal,
                    showCloseButton: true,
                    closeButtonAriaLabel: WikiResources.CloseButtonText,
                }}
                title={this.props.dialogHeaderLabel}
                onDismiss={this._onCancel}
            >
                {this.state.errorMessage &&
                    <MessageBar
                        className={"wiki-message-bar"}
                        messageBarType={MessageBarType.error}>
                        {this.state.errorMessage}
                    </MessageBar>
                }
                {this.props.message &&
                    <Label className="text-content">{this.props.message}</Label>
                }
                <div className={"add-work-items-container"}>
                    <WorkItemListSelector
                        tfsContext={TfsContext.getDefault()}
                        linkedArtifacts={this.state.workItemsInDraft.map(mapWorkItemIdToLinkedArtifact)}
                        onWorkItemAdd={this._onAddWorkItem}
                        checkWorkItemExists={this._containsWorkItem}
                        onRemoveLinkedArtifact={this._onRemoveWorkItem}
                        viewOptions={{ viewMode: ViewMode.List }}
                        zeroDataOptions={{
                            zeroDataExperienceViewMode: ZeroDataExperienceViewMode.Default,
                            message: WikiResources.LinkWorkItemsZeroDataText,
                        }}
                        linkTypeRefNames={null}
                        hostArtifactId={this.props.hostArtifact.getId()}
                        hostArtifact={{
                            id: hostArtifact.getId(),
                            tool: hostArtifact.getTool(),
                            type: hostArtifact.getType(),
                            uri: hostArtifact.getUri(),
                        }}
                        dropIconCss="bowtie-chevron-down-light"
                        cache={{
                            set: (key, value) => this._workItemCache[key] = value,
                            get: (key) => this._workItemCache[key],
                            invalidate: (key) => delete this._workItemCache[key]
                        }}
                    />
                </div>
                {
                    this.state.isSaving
                        ? <Spinner label={WikiResources.UpdatingWorkItemsSpinnerText} />
                        : <DialogFooter>
                            <PrimaryButton
                                disabled={!this.state.isDirty}
                                onClick={this._onSave}>
                                {WikiResources.UpdateButtonText}
                            </PrimaryButton>
                            <DefaultButton
                                disabled={false}
                                onClick={this._onCancel}>
                                {WikiResources.CancelButtonText}
                            </DefaultButton>
                        </DialogFooter>
                }
            </Dialog>
        );
    }

    public componentDidMount(): void {
        this._store.addChangedListener(this._onWorkItemStoreChanged);
        this._actionCreator.fetchLinkedWorkItems(this.props.hostArtifact.getUri());

        /*
        * This is to fix bug:#1174054 where link work items dialog overlaps work item form.
        * Handling the work item open action so that the form always open in a new tab.
        */
        Events_Action.getService().registerActionWorker(
            WorkItemActions.ACTION_WORKITEM_OPEN,
            this._onWorkItemOpenHandler,
            0,
        );
    }

    public componentWillUnmount(): void {
        Events_Action.getService().unregisterActionWorker(
            WorkItemActions.ACTION_WORKITEM_OPEN,
            this._onWorkItemOpenHandler,
        );

        if (this._onDismissTimeoutHandler) {
            clearTimeout(this._onDismissTimeoutHandler);
            this._onDismissTimeoutHandler = null;
        }

        if (this._store) {
            this._store.removeChangedListener(this._onWorkItemStoreChanged);
            this._store.dispose();
            this._store = null;
        }
    }

    @autobind
    private _onWorkItemOpenHandler(): string {
        return LinkedWorkItemDataProviderConstants.WorkItemOpenNotHandled;
    }

    @autobind
    private _onAddWorkItem(workItemId: number): void {
        if (this.state.workItemsInDraft.indexOf(workItemId) === -1) {
            this._actionCreator.addWorkItemToDraft(workItemId);
        }
    }

    @autobind
    private _onRemoveWorkItem(workItem: ILinkedArtifact): void {
        const workItemId = parseInt(workItem.id);
        const index = this.state.workItemsInDraft.indexOf(workItemId);
        if (index !== -1) {
            this._actionCreator.removeWorkItemFromDraft(workItemId);
        }
    }

    @autobind
    private _onSave(): void {
        const workItemsStoreState = this._store.state;
        const props = this.props;
        this._actionCreator.saveWorkItems(
            this._store.state.savedWorkItems,
            this.state.workItemsInDraft,
            props.hostArtifact.getUri(),
            props.artifactLinkName,
        );

        const workItemsToAdd = this.state.workItemsInDraft.filter(
            (workItem: number) => workItemsStoreState.savedWorkItems.indexOf(workItem) < 0
        );
        const workItemsToRemove = workItemsStoreState.savedWorkItems.filter(
            (workItem: number) => this.state.workItemsInDraft.indexOf(workItem) < 0
        );

        if (props.telemetryEventData) {
            const telemetryEventData: TelemetryEventData = Object.assign({}, props.telemetryEventData);
            Object.assign(telemetryEventData.properties, { AddCount: workItemsToAdd.length, RemoveCount: workItemsToRemove.length });

            publishEvent(telemetryEventData);
        }
    }

    @autobind
    private _onWorkItemStoreChanged(): void {
        if (this._store.state.workItemsUpdated) {
            this._onDismissTimeoutHandler = setTimeout(this.props.onDismiss, 0, true);
        } else {
            this.setState(this._getStateFromStore());
        }
    }

    @autobind
    private _onCancel(): void {
        this.props.onDismiss(false);
    }

    private _getStateFromStore(): LinkWorkItemsDialogState {
        const storeState = this._store.state;
        const state: LinkWorkItemsDialogState = {
            isDirty: storeState.isDirty,
            isSaving: storeState.isSaving,
            errorMessage: storeState.errorMessage,
            workItemsInDraft: storeState.workItemsInDraft,
        }

        return state;
    }

    private _instantiateFlux() {
        const actionsHub = new LinkWorkItemsActionsHub();
        const workItemsSource = new LinkWorkItemsSource();
        this._actionCreator = new LinkWorkItemsActionCreator(actionsHub, workItemsSource, this.props.projectId);
        this._store = new LinkWorkItemsStore(actionsHub);
    }

    @autobind
    private _containsWorkItem(workItemId: number): boolean {
        return this.state.workItemsInDraft.indexOf(workItemId) >= 0;
    }
}
