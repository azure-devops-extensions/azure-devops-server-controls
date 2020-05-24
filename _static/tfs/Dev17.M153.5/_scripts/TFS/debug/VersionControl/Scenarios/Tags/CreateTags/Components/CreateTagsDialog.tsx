/// <reference types="react" />
/// <reference types="react-dom" />
import * as React from "react";
import * as ReactDOM from "react-dom";
import {
    Dialog,
    DialogType,
    DialogFooter,
} from "OfficeFabric/Dialog";
import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";
import { Label } from "OfficeFabric/Label";
import { TextField } from "OfficeFabric/TextField";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { Overlay } from "OfficeFabric/Overlay";
import { css, getId } from "OfficeFabric/Utilities";

import { GitAnnotatedTag, GitVersionDescriptor, GitVersionType } from "TFS/VersionControl/Contracts";

import { GitRefDropdownSwitch } from "VersionControl/Scenarios/Shared/GitRefDropdownSwitch";
import { ActionsCreator } from "VersionControl/Scenarios/Tags/CreateTags/ActionCreator";
import { ActionsHub } from "VersionControl/Scenarios/Tags/CreateTags/ActionsHub";
import { CreateTagStore, State } from "VersionControl/Scenarios/Tags/CreateTags/CreateTagStore";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import { CustomerIntelligenceProperty } from "VersionControl/Scripts/CustomerIntelligenceData";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { VersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import { gitVersionStringToVersionDescriptor } from "VersionControl/Scripts/VersionSpecUtils";

import "VSS/LoaderPlugins/Css!VersionControl/CreateTagsDialog";

export interface CreateTagsDialogProps {
    repositoryContext: GitRepositoryContext;
    version: VersionSpec;
    initliazedFromView?: string;
}

export class CreateTagsDialog {
    private static createTagsDialogNode: HTMLElement;

    public static show(props: CreateTagsDialogProps): void {
        CreateTagsDialog.createTagsDialogNode = document.createElement("div");
        ReactDOM.render(<CreateTagsHelperDialog {...props} />, CreateTagsDialog.createTagsDialogNode);
    }

    public static close(): void {
        ReactDOM.unmountComponentAtNode(CreateTagsDialog.createTagsDialogNode);

        // not supported in IE - this will result in empty div remaining
        if (CreateTagsDialog.createTagsDialogNode.remove) {
            CreateTagsDialog.createTagsDialogNode.remove();
        }
    }
}

// Wrapper Flux Component over the actual Dialog
export class CreateTagsHelperDialog extends React.Component<CreateTagsDialogProps, State> {
    private _actionCreator: ActionsCreator;
    private _store: CreateTagStore;
    private _dialogId: string;

    constructor(props: CreateTagsDialogProps) {
        super(props);
        this._dialogId = getId();
        this._initializeFlux();
    }

    public shouldComponentUpdate(nextPros: CreateTagsDialogProps, nextState: State): boolean {
        if (nextState.isTagCreationComplete) {
            this._actionCreator.recordTelemetry(
                CustomerIntelligenceConstants.CREATETAGS_CREATION_SUCCEEDED,
                CustomerIntelligenceConstants.ACTIONSOURCE_VIEW_CTA_BUTTON,
                this.props.initliazedFromView,
                [{
                    name: "TagCreatedFrom",
                    value: this._getVersionType(nextState.selectedVersion.toVersionString())
                } as CustomerIntelligenceProperty],
            );

            CreateTagsDialog.close();
            return false;
        }
        return true;
    }

    public render(): JSX.Element {
        const createTagsState = this._store.getState();
        return (
            <CreateTagsDialogInternal
                repositoryContext={this.props.repositoryContext}
                selectedVersion={createTagsState.selectedVersion}
                onCreateTagPressed={this._actionCreator.createTag}
                closeDialog={CreateTagsDialog.close}
                isTagCreationEnabled={createTagsState.isTagCreationEnabled}
                tagNameError={createTagsState.tagNameError}
                onVersionChanged={this._actionCreator.updateVersion}
                onMessageEdited={this._actionCreator.updateMessage}
                onNameEdited={this._actionCreator.updateTagName}
                tagCreationError={createTagsState.tagCreationError}
                isTagCreationInProgress={createTagsState.isTagCreationInProgress}
                dialogId={this._dialogId} />);
    }

    public componentWillUnmount(): void {
        if (this._store) {
            this._store.removeChangedListener(this._onChange);
            this._store.dispose();
            this._store = null;
        }

        this._actionCreator = null;
    }

    private _onChange = (): void => {
        this.setState(this._store.getState());
    }

    private _initializeFlux = (): void => {
        const actionsHub = new ActionsHub();
        this._store = new CreateTagStore(actionsHub, this.props.version);
        this._actionCreator = new ActionsCreator(
            actionsHub,
            this._store.getState,
            this.props.repositoryContext);

        this._actionCreator.recordTelemetry(
            CustomerIntelligenceConstants.CREATETAGS_DIALOG_OPENED,
            CustomerIntelligenceConstants.ACTIONSOURCE_VIEW_CTA_BUTTON,
            this.props.initliazedFromView);

        this._store.addChangedListener(this._onChange);
    }

    private _getVersionType = (versionSpec: string): string => {
        const versionDescriptor: GitVersionDescriptor = gitVersionStringToVersionDescriptor(versionSpec);
        return GitVersionType[versionDescriptor.versionType];
    }
}

export interface CreateTagsDialogInternalProps {
    repositoryContext: GitRepositoryContext;
    selectedVersion: VersionSpec;
    onVersionChanged(version: VersionSpec): void;
    tagNameError: string;
    onNameEdited(value: string): string;
    onMessageEdited(value: string): void;
    isTagCreationEnabled: boolean;
    onCreateTagPressed(): void;
    tagCreationError: string;
    isTagCreationInProgress: boolean;
    closeDialog?(): void;
    dialogId?: string;
}

const CreateTagsDialogInternal = (props: CreateTagsDialogInternalProps): JSX.Element => {
    const tagNameInputClass = "tag-name-input";
    const tagFromLabelId = "tag-from-label" + props.dialogId;
    return (
        <Dialog
            modalProps={{ containerClassName: "vc-create-tag-dialog", isBlocking: true }}
            hidden={false}
            title={VCResources.CreateTag_AddTagHeader}
            firstFocusableSelector={tagNameInputClass}
            dialogContentProps={{ type: DialogType.close }}
            onDismiss={props.closeDialog}
            closeButtonAriaLabel={VCResources.DialogClose}>
            {props.isTagCreationInProgress && <Overlay />}
            {
                props.tagCreationError &&
                <MessageBar messageBarType={MessageBarType.error} >
                    {props.tagCreationError}
                </MessageBar>
            }
            <TextField
                required={true}
                label={VCResources.CreateTag_TagNameLabel}
                onGetErrorMessage={props.onNameEdited}
                deferredValidationTime={500}
                validateOnLoad={false}
                className="dialog-section"
                inputClassName={css("tag-input", tagNameInputClass)}/>
            <div className="dialog-section">
                <Label
                    id={tagFromLabelId}>
                    {VCResources.CreateTag_TagFromLabel}
                </Label>
                <GitRefDropdownSwitch
                    repositoryContext={props.repositoryContext as GitRepositoryContext}
                    versionSpec={props.selectedVersion}
                    onSelectionChanged={props.onVersionChanged}
                    className={"vc-branches-container git-versionSelector"}
                    isDrodownFullWidth={true}
                    viewCommitsPivot={true}
                    ariaLabelledBy={tagFromLabelId}/>
            </div>
            <TextField
                required={true}
                label={VCResources.CreateTag_TagMessageLabel}
                onChanged={props.onMessageEdited}
                multiline
                className="dialog-section"
                inputClassName="tag-input"/>
            <DialogFooter>
                <PrimaryButton
                    onClick={props.onCreateTagPressed}
                    disabled={!props.isTagCreationEnabled}>
                    {VCResources.CreateTag_OKButton}
                </PrimaryButton>
                <DefaultButton onClick={props.closeDialog}>
                    {VCResources.Cancel}
                </DefaultButton>
            </DialogFooter>
        </Dialog>);
};
