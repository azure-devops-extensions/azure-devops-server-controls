import * as React from "react";

import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";
import { Dialog, DialogFooter, DialogType } from "OfficeFabric/Dialog";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { Spinner } from "OfficeFabric/Spinner";
import { autobind } from "OfficeFabric/Utilities";

import { IItemPickerProvider, IPickListItem } from "VSSUI/Components/PickList/PickList.Props";
import { ItemPickList } from "VSSUI/PickList";
import { IVssIconProps, VssIconType } from "VSSUI/VssIcon";

import { GitVersionDescriptor } from "TFS/VersionControl/Contracts";
import { WikiV2 } from "TFS/Wiki/Contracts";
import { getAsyncLoadedComponent } from "VSS/Flux/AsyncLoadedComponent";
import * as Utils_String from "VSS/Utils/String";

import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import * as RenamePageDialog_Async from "Wiki/Scenarios/Integration/RenamePageDialog/RenamePageDialog";
import { ConfirmationDialog } from "Wiki/Scenarios/Shared/Components/ConfirmationDialog";
import { RepoConstants } from "Wiki/Scripts/CommonConstants";
import { OperationStatus } from "Wiki/Scripts/CommonInterfaces";
import * as WikiResources from "Wiki/Scripts/Resources/TFS.Resources.Wiki";
import { getPageNameFromPath } from "Wiki/Scripts/Helpers";
import * as WikiFeatures from "Wiki/Scripts/WikiFeatures";

import "VSS/LoaderPlugins/Css!Wiki/Scenarios/Overview/Components/EditPageDialogs";

export interface SavePageDialogProps {
    errorMessage: string;
    warningMessage: string;
    pageTitle(): string;
    onDismiss(autofixCompleted: boolean): void;
    onSave(closeOnComplete: boolean): void;
    isOpen: boolean;
    isRename: boolean;
    oldPagePath: string;
    newPagePath: string;
    repositoryContext: GitRepositoryContext;
    wiki: WikiV2;
    savePageStatus: OperationStatus;
}

export class SavePageDialog extends React.PureComponent<SavePageDialogProps, {}> {
    private _handleBrokenLinksFeatureEnabled: boolean;

    constructor(props: SavePageDialogProps) {
        super(props);

        this._handleBrokenLinksFeatureEnabled = WikiFeatures.isHandleBrokenLinksEnabled();
    }

    public render(): JSX.Element {
        /**
         * Use Rename dialog only if BrokenLinkFeatureFlag is enabled, and wiki
         * page is renamed. Otherwise continue to use existing dialog which
         * takes care of showing error messages as well when page renamed. 
         */
        if (this._handleBrokenLinksFeatureEnabled
            && (this.props.isRename || !this.props.errorMessage)) {
            // should recreate the flux flow every time Rename page dialog is opened.
            if (this.props.isOpen) {
                const oldPageName: string = getPageNameFromPath(this.props.oldPagePath);
                const newPageName: string = getPageNameFromPath(this.props.newPagePath);

                const initialMessage = Utils_String.format(
                    WikiResources.PageRenameTitleMessage,
                    oldPageName,
                    newPageName);

                const successMessage = Utils_String.format(
                    WikiResources.PageRenameSuccessMessage,
                    oldPageName,
                    newPageName);

                return <AsyncRenamePageDialog
                    oldPagePath={this.props.oldPagePath}
                    newPagePath={this.props.newPagePath}
                    repositoryContext={this.props.repositoryContext}
                    wiki={this.props.wiki}
                    isOpen={true}
                    onConfirm={this.props.onSave}
                    onDismiss={this.props.onDismiss}
                    title={WikiResources.SavePageDialog_Title}
                    initialMessage={initialMessage}
                    successMessage={successMessage}
                    failureMessage={this.props.errorMessage}
                    renamePageStatus={this.props.savePageStatus}
                    fixAndUpdateButtonText={WikiResources.FixAndRenameButtonText}
                    updateWithoutFixingButtonText={WikiResources.RenameWithoutFixingButtonText}
                    updateButtonText={WikiResources.SaveButtonText}
                />
            }
        } else {
            const isSaving = this.props.savePageStatus === OperationStatus.InProgress;
            const isOpen = this.props.isOpen && this.props.savePageStatus !== OperationStatus.Completed;

            return (
                <Dialog
                    hidden={!isOpen}
                    modalProps={{
                        className: "save-page-dialog",
                        containerClassName: "container",
                        isBlocking: true,
                    }}
                    dialogContentProps={{
                        type: DialogType.close,
                        showCloseButton: !isSaving,
                        closeButtonAriaLabel: WikiResources.CloseButtonText,
                    }}
                    title={WikiResources.SavePageDialog_Title}
                    onDismiss={() => this.props.onDismiss(false)}
                >
                    {
                        this.props.errorMessage &&
                        <MessageBar
                            className={"wiki-message-bar"}
                            messageBarType={MessageBarType.error}
                        >
                            {this.props.errorMessage}
                        </MessageBar>
                    }
                    {
                        !this.props.errorMessage &&
                        this.props.warningMessage &&
                        <MessageBar
                            className={"wiki-message-bar"}
                            messageBarType={MessageBarType.warning}
                        >
                            {this.props.warningMessage}
                        </MessageBar>
                    }
                    {
                        isSaving
                            ? <Spinner label={WikiResources.SavePageDialog_SavingPageText} />
                            : <DialogFooter>
                                <PrimaryButton
                                    disabled={this._isSaveDisabled}
                                    onClick={this._onSave}
                                >
                                    {WikiResources.SaveButtonText}
                                </PrimaryButton>
                                <DefaultButton
                                    disabled={isSaving}
                                    onClick={() => this.props.onDismiss(false)}
                                >
                                    {WikiResources.CancelButtonText}
                                </DefaultButton>
                            </DialogFooter>
                    }
                </Dialog>
            );
        }

        return null;
    }

    @autobind
    private _onSave(): void {
        this.props.onSave(true);
    }

    private get _isSaveDisabled(): boolean {
        return (!!this.props.errorMessage
            || this.props.savePageStatus === OperationStatus.InProgress);
    }
}

export interface NavigateAwayDialogProps {
    isOpen: boolean;
    ctaText: string;
    onCtaClick(): void;
    onDiscardChanges(): void;
    onDismiss(): void;
    isCtaActionInProgress: boolean;
    navigateAwayMessage: string;
}

export const NavigateAwayDialog = (props: NavigateAwayDialogProps): JSX.Element => {
    return (
        <ConfirmationDialog
            isOpen={props.isOpen}
            title={WikiResources.EditPage_CancelDialogTitle}
            confirmButtonText={props.ctaText}
            onConfirm={props.onCtaClick}
            cancelButtonText={WikiResources.DiscardButtonText}
            onCancel={() => { props.onDiscardChanges(); props.onDismiss(); }}
            isWaiting={props.isCtaActionInProgress}
            onDismiss={props.onDismiss}
            confirmDialogMessage={props.navigateAwayMessage}
            defaultFocusOnConfirmButton={true}
        />
    );
};

export interface DeletePageDialogProps {
    isOpen: boolean;
    onDelete(): void;
    onDismiss(): void;
    pageName: string;
    isDeleting: boolean;
}

export const DeletePageDialog = (props: DeletePageDialogProps): JSX.Element => {
    return (
        <ConfirmationDialog
            isOpen={props.isOpen}
            title={WikiResources.EditPage_DeleteDialogTitle}
            confirmButtonText={WikiResources.DeleteButtonText}
            onConfirm={props.onDelete}
            cancelButtonText={WikiResources.CancelButtonText}
            onCancel={props.onDismiss}
            onDismiss={props.onDismiss}
            isWaiting={props.isDeleting}
            waitSpinnerLabel={WikiResources.DeletePageDialog_DeletingPageText}
            confirmDialogMessage={Utils_String.format(WikiResources.EditPage_DeleteDialogMessage, props.pageName)}
        />
    );
};

export interface MovePageDialogProps {
    isOpen: boolean;
    onMove(closeOnComplete: boolean): void;
    onDismiss(): void;
    newPagePath: string;
    oldPagePath: string;
    repositoryContext: GitRepositoryContext;
    wiki: WikiV2;
    movePageStatus: OperationStatus;
}

export class MovePageDialog extends React.PureComponent<MovePageDialogProps, {}>{
    private _handleBrokenLinksFeatureEnabled: boolean;

    constructor(props: MovePageDialogProps) {
        super(props);

        this._handleBrokenLinksFeatureEnabled = WikiFeatures.isHandleBrokenLinksEnabled();
    }

    public render(): JSX.Element {
        if (this.props.isOpen) {
            if (this._handleBrokenLinksFeatureEnabled) {
                return (
                    <AsyncRenamePageDialog
                        oldPagePath={this.props.oldPagePath}
                        newPagePath={this.props.newPagePath}
                        repositoryContext={this.props.repositoryContext}
                        wiki={this.props.wiki}
                        isOpen={this.props.isOpen}
                        onConfirm={this.props.onMove}
                        onDismiss={this.props.onDismiss}
                        title={WikiResources.MovePageDialog_Title}
                        initialMessage={Utils_String.format(WikiResources.RenamePageDialogAutoFixMove, this.props.oldPagePath, this.props.newPagePath)}
                        successMessage={Utils_String.format(WikiResources.PageMoveSuccessMessage, this.props.oldPagePath, this.props.newPagePath)}
                        failureMessage={WikiResources.PageMoveFailureMessage}
                        renamePageStatus={this.props.movePageStatus}
                        fixAndUpdateButtonText={WikiResources.FixAndMoveButtonText}
                        updateWithoutFixingButtonText={WikiResources.MoveWithoutFixingButtonText}
                        updateButtonText={WikiResources.MovePageDialog_MoveButtonText}
                    />
                );
            } else {
                return (
                    <ConfirmationDialog
                        isOpen={this.props.movePageStatus !== OperationStatus.Completed}
                        title={WikiResources.MovePageDialog_Title}
                        confirmButtonText={WikiResources.MovePageDialog_MoveButtonText}
                        onConfirm={this._onMove}
                        cancelButtonText={WikiResources.CancelButtonText}
                        onCancel={this.props.onDismiss}
                        onDismiss={this.props.onDismiss}
                        isWaiting={this.props.movePageStatus === OperationStatus.InProgress}
                        waitSpinnerLabel={WikiResources.MovePageDialog_MovingPageText}
                        confirmDialogMessage={Utils_String.format(WikiResources.MovePageDialog_Message, getPageNameFromPath(this.props.oldPagePath), this.props.newPagePath)}
                    />
                );
            }
        }

        return null;
    }

    @autobind
    private _onMove(): void {
        this.props.onMove(true);
    }
}

export interface SetAsHomePageDialogProps {
    oldPagePath: string;
    repositoryContext: GitRepositoryContext;
    onDismiss(): void;
    wiki: WikiV2;
    setAsHomePageStatus: OperationStatus;
    isOpen: boolean;
    onSetAsHomePage(closeOnComplete: boolean): void;
}

export class SetAsHomePageDialog extends React.PureComponent<SetAsHomePageDialogProps, {}>{
    private _handleBrokenLinksFeatureEnabled: boolean;

    constructor(props: SetAsHomePageDialogProps) {
        super(props);

        this._handleBrokenLinksFeatureEnabled = WikiFeatures.isHandleBrokenLinksEnabled();
    }

    public render(): JSX.Element {
        if (this.props.isOpen) {
            if (this._handleBrokenLinksFeatureEnabled) {
                const pageName: string = getPageNameFromPath(this.props.oldPagePath);
                const newPagePath = RepoConstants.RootPath + pageName;

                return (
                    <AsyncRenamePageDialog
                        oldPagePath={this.props.oldPagePath}
                        newPagePath={newPagePath}
                        repositoryContext={this.props.repositoryContext}
                        wiki={this.props.wiki}
                        isOpen={this.props.isOpen}
                        onConfirm={this.props.onSetAsHomePage}
                        onDismiss={this.props.onDismiss}
                        title={WikiResources.SetAsHomePageDialog_Title}
                        initialMessage={Utils_String.format(WikiResources.RenamePageDialogAutoFixSetAsHomePage, pageName)}
                        successMessage={Utils_String.format(WikiResources.SetAsHomePageSuccessMessage, pageName)}
                        failureMessage={WikiResources.SetAsHomePageFailureMessage}
                        renamePageStatus={this.props.setAsHomePageStatus}
                        fixAndUpdateButtonText={WikiResources.FixAndMoveButtonText}
                        updateWithoutFixingButtonText={WikiResources.MoveWithoutFixingButtonText}
                        updateButtonText={WikiResources.MovePageDialog_MoveButtonText}
                    />
                );
            } else {
                return (
                    <ConfirmationDialog
                        isOpen={this.props.setAsHomePageStatus !== OperationStatus.Completed}
                        title={WikiResources.SetAsHomePageDialog_Title}
                        confirmButtonText={WikiResources.SetAsHomePageDialog_SetAsHomeButtonText}
                        onConfirm={this._onSetAsHomePage}
                        cancelButtonText={WikiResources.CancelButtonText}
                        onCancel={this.props.onDismiss}
                        onDismiss={this.props.onDismiss}
                        isWaiting={this.props.setAsHomePageStatus === OperationStatus.InProgress}
                        waitSpinnerLabel={WikiResources.SetAsHomePageDialog_SettingAsHomePageText}
                        confirmDialogMessage={Utils_String.format(WikiResources.SetAsHomePageDialog_Message, getPageNameFromPath(this.props.oldPagePath))}
                    />
                );
            }
        }

        return null;
    }

    @autobind
    private _onSetAsHomePage(): void {
        this.props.onSetAsHomePage(true);
    }
}

const AsyncRenamePageDialog = getAsyncLoadedComponent(
    ["Wiki/Scenarios/Integration/RenamePageDialog/RenamePageDialog"],
    (m: typeof RenamePageDialog_Async) => m.RenamePageDialog
);

export interface EditInDraftVersionDialogProps {
    isOpen: boolean;
    selectedItem: GitVersionDescriptor;
    onSelectionChange(): void;
    onDismiss(): void;
    draftVersions: GitVersionDescriptor[];
    editInSelectedDraftVersion(selectedDraftVersion: GitVersionDescriptor): void;
}

interface IWikiVersionPickerListItem extends IPickListItem {
    id?: string;
    properties?: IDictionaryStringTo<GitVersionDescriptor>;
}

// Task 1302744: Use single version picker provider
class DraftVersionPickerProvider implements IItemPickerProvider<IWikiVersionPickerListItem> {
    private _props: EditInDraftVersionDialogProps;
    public selectedItem: IWikiVersionPickerListItem;

    constructor(props: EditInDraftVersionDialogProps) {
        this._props = props;
        if (this._props.draftVersions && this._props.draftVersions.length > 0) {
            this.selectedItem = {
                id: this._props.draftVersions[0].version,
                key: this._props.draftVersions[0].version,
                name: this._props.draftVersions[0].version,
                properties: {
                    "version": this._props.draftVersions[0],
                },
                iconProps: this._getIconProps(),
            }
        }
        else {
            this.selectedItem = null;
        }
    }

    @autobind
    public getItems(): IWikiVersionPickerListItem[] {
        const items: IWikiVersionPickerListItem[] = [];
        if (this._props.draftVersions) {
            this._props.draftVersions.forEach((version: GitVersionDescriptor, index: number) => {
                items.push({
                    id: version.version,
                    key: version.version,
                    name: version.version,
                    properties: {
                        "version": version,
                    },
                    iconProps: this._getIconProps(),
                });
            });
        }
        return items;
    }

    public get noItemsText(): (string | JSX.Element) {
        return WikiResources.EditInDraftVersionDialog_NoDraftVersionText;
    }

    @autobind
    public onSelectedItemChanged(selectedItem: IWikiVersionPickerListItem): void {
        this.setSelectedItem(selectedItem);
        this._props.onSelectionChange();
    }

    @autobind
    public getListItem(item: IWikiVersionPickerListItem): IPickListItem {
        return item;
    }

    @autobind
    public getTitleTextForItem(item: IWikiVersionPickerListItem): string {
        return item && item.name;
    }

    public getSelectedDraftVersion(): GitVersionDescriptor {
        if (this.selectedItem) {
            return this.selectedItem.properties["version"];
        }
        return null;
    }

    @autobind
    private setSelectedItem(item: IWikiVersionPickerListItem): void {
        this.selectedItem = {
            id: item.id,
            key: item.id,
            name: item.name,
            properties: item.properties,
            iconProps: this._getIconProps(),
        };
    }

    private _getIconProps(): IVssIconProps {
        const iconName = "bowtie-tfvc-branch"
        return {
            iconName: iconName,
            iconType: VssIconType.bowtie
        } as IVssIconProps;
    }
}

export class EditInDraftVersionDialog extends React.Component<EditInDraftVersionDialogProps, {}> {
    private _versionPickerProvider: DraftVersionPickerProvider;

    constructor(props: EditInDraftVersionDialogProps) {
        super(props);

        this._versionPickerProvider = new DraftVersionPickerProvider(props);
    }

    public render(): JSX.Element {
        if (this.props.isOpen) {
            return (
                <Dialog
                    hidden={!this.props.isOpen}
                    modalProps={{
                        className: "edit-in-draft-version-dialog",
                        containerClassName: "container",
                        isBlocking: true,
                    }}
                    dialogContentProps={{
                        type: DialogType.normal,
                        showCloseButton: true,
                        closeButtonAriaLabel: WikiResources.CloseButtonText,
                    }}
                    title={WikiResources.EditInDraftVersionDialog_Title}
                    onDismiss={this.props.onDismiss}
                >
                    <div className={"select-draft-version-container"}>
                        <ItemPickList
                            provider={this._versionPickerProvider} />
                    </div>
                    {
                        <DialogFooter>
                            <PrimaryButton
                                disabled={false}
                                onClick={this._onEdit}>
                                {WikiResources.EditCommand}
                            </PrimaryButton>
                            <DefaultButton
                                disabled={false}
                                onClick={this.props.onDismiss}>
                                {WikiResources.CancelButtonText}
                            </DefaultButton>
                        </DialogFooter>
                    }
                </Dialog>
            )
        }
        return null;
    }

    @autobind
    private _onEdit(): void {
        this.props.editInSelectedDraftVersion(this._versionPickerProvider.getSelectedDraftVersion());
    }
}
