import * as React from "react";

import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";
import { Checkbox } from "OfficeFabric/Checkbox";
import { IColumn, ColumnActionsMode } from "OfficeFabric/DetailsList";
import { Dialog, DialogFooter, DialogType } from "OfficeFabric/Dialog";
import { IModal } from "OfficeFabric/Modal";
import { Icon } from "OfficeFabric/Icon";
import { Label } from "OfficeFabric/Label";
import { Link } from "OfficeFabric/Link";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { Spinner } from "OfficeFabric/Spinner";
import { TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";
import { autobind, css } from "OfficeFabric/Utilities";
import { announce } from "VSS/Utils/Accessibility";
import * as Utils_String from "VSS/Utils/String";
import { PivotBar, PivotBarItem } from "VSSUI/PivotBar"

import { PrimaryArtifact } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Components/ArtifactRenderer";
import { WikiV2 } from "TFS/Wiki/Contracts";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";

import { LinkWorkItemsSource } from "Wiki/Scenarios/Integration/LinkWorkItems/LinkWorkItemsSource";
import {
    BrokenLinkComponent,
    BrokenLinkComponentProps,
    BrokenLinkItem,
    BrokenWikiPageLink,
    BrokenWorkItemLink,
} from "Wiki/Scenarios/Integration/RenamePageDialog/BrokenLinkComponent";
import { RenamePageDialogActionCreator, Sources } from "Wiki/Scenarios/Integration/RenamePageDialog/RenamePageDialogActionCreator";
import {
    BrokenLinksAutoFixMetrics,
    RenamePageDialogActionsHub,
    WikiPageUpdateData,
    WorkItemData,
} from "Wiki/Scenarios/Integration/RenamePageDialog/RenamePageDialogActionsHub";
import { RenamePageDialogSource } from "Wiki/Scenarios/Integration/RenamePageDialog/RenamePageDialogSource";
import { RenamePageDialogState, RenamePageDialogStore } from "Wiki/Scenarios/Integration/RenamePageDialog/RenamePageDialogStore";
import { WikiPagesSource } from "Wiki/Scenarios/Shared/Sources/WikiPagesSource";
import { RepoConstants } from "Wiki/Scripts/CommonConstants";
import { OperationStatus } from "Wiki/Scripts/CommonInterfaces";
import * as WikiResources from "Wiki/Scripts/Resources/TFS.Resources.Wiki";
import { getWikiPageEditUrl } from "Wiki/Scripts/WikiUrls";

import "VSS/LoaderPlugins/Css!Controls/LinkedArtifacts/LinkedArtifacts";
import "VSS/LoaderPlugins/Css!Wiki/Scenarios/Integration/RenamePageDialog/RenamePageDialog";

export interface RenamePageDialogProps {
    oldPagePath: string;
    newPagePath: string;
    isOpen: boolean;
    repositoryContext: GitRepositoryContext;
    onConfirm(closeOnComplete: boolean): void;
    onDismiss(autofixCompleted: boolean): void;
    title: string;
    initialMessage: string;
    successMessage: string;
    failureMessage: string;
    wiki: WikiV2;
    renamePageStatus: OperationStatus;
    fixAndUpdateButtonText: string;
    updateWithoutFixingButtonText: string;
    updateButtonText: string;
}

export interface DialogTitleProperties {
    value: string;
    cssClassName: string;
    message: JSX.Element;
}

export interface ButtonProperties {
    text: string;
    isDisabled: boolean;
    onClick(): void;
    showSpinner?: boolean;
}

export class RenamePageDialog extends React.PureComponent<RenamePageDialogProps, RenamePageDialogState>{
    private _oldPagePath: string;
    private _newPagePath: string;
    private _initialMessage: string;
    private _successMessage: string;
    private _actionCreator: RenamePageDialogActionCreator;
    private _store: RenamePageDialogStore;
    private _modalRef: IModal;

    constructor(props: RenamePageDialogProps) {
        super(props);

        this._oldPagePath = props.oldPagePath;
        this._newPagePath = props.newPagePath;
        this._initialMessage = props.initialMessage;
        this._successMessage = props.successMessage;

        this._instantiateFlux();
        this.state = this._getStateFromStore();
    }

    public render(): JSX.Element {
        return <DialogRenderer
            titleProps={this._getDialogTitleProperties()}
            isOpen={this.props.isOpen}
            onDismiss={this._onDismiss}
            setModalRef={this._setModalRef}
            dialogContainerClassName={css("wiki-page-rename-dialog-container", this.state.hasEvaluationStarted && "expanded")}
            dialogContentWrapperClassName={css("dialog-content-wrapper", this.state.hasEvaluationStarted && "expanded")}
            primaryButtonProperties={this._getPrimaryButtonProperties()}
            secondaryButtonProperties={this._getSecondaryButtonProperties()}
            hasEvaluationStarted={this.state.hasEvaluationStarted}
            wikiPageListRenderProps={this._getWikiPageListRenderProps()}
            workItemListRenderProps={this._getWorkItemListRenderProps()}
            wikiPagesMaxCount={this.state.wikiPagesToFixCount}
            workItemsMaxCount={this.state.workItemsToFixCount}
        />;
    }

    public componentDidMount(): void {
        this._store.addChangedListener(this._onStoreChanged);
    }

    public componentWillUnmount(): void {
        this._store.removeChangedListener(this._onStoreChanged);
        this._store.dispose();
        this._actionCreator = null;
        this._modalRef = null;
    }

    public componentDidUpdate(prevProps: RenamePageDialogProps, prevState: RenamePageDialogState): void {
        if (prevState.hasEvaluationStarted === false && this.state.hasEvaluationStarted && this._modalRef) {
            this._modalRef.focus();
        } else if (prevState.hasAutofixCompleted === false && this.state.hasAutofixCompleted) {
            this._onAutoFixCompleted();
        }
    }

    public componentWillReceiveProps(nextProps: RenamePageDialogProps): void {
        if (this.props.renamePageStatus !== OperationStatus.Completed
            && nextProps.renamePageStatus === OperationStatus.Completed
            && this.state.autofixingLinks) {

            this._actionCreator.handleBrokenLinks(
                this.state.workItemIdToDataMap,
                this._oldPagePath,
                this._newPagePath,
            );
        }
    }

    @autobind
    private _onEvaluate(): void {
        this._actionCreator.EvaluatePageRename(this._oldPagePath);
    }

    @autobind
    private _onDismiss(): void {
        this._actionCreator.onDialogDismissed(this.state.autofixingLinks);
        this.props.onDismiss(this.state.hasAutofixCompleted);
    }

    private _onAutoFixCompleted(): void {
        let announceMessageString: string;
        if (this._hasAutoFixFailures()) {
            announceMessageString = WikiResources.UpdateLinksFailedWarningMessage;
        } else {
            announceMessageString = this._successMessage;
        }
        announce(announceMessageString, true);
    }

    private _getPrimaryButtonProperties(): ButtonProperties {
        let text: string = null;
        let isDisabled = false;
        let onClick: () => void = null;

        if (this.state.hasAutofixCompleted || this.props.renamePageStatus === OperationStatus.Failed) {
            return null;
        }

        if (!this.state.hasEvaluationStarted) {
            // Evaluation has not started
            text = WikiResources.CheckAffectedLinksButtonText;
            onClick = this._onEvaluate;
        } else if (this._hasNoBrokenLink()) {
            return null;
        } else {
            text = this.props.fixAndUpdateButtonText;
            onClick = this._onAutofixLinks;
        }

        isDisabled = this.state.isLoadingWorkItems
            || this.state.isPageSearchQueryPending
            || this.state.isFetchingMorePageLinks
            || this.state.updateStarted
            || this.props.renamePageStatus === OperationStatus.InProgress;

        return {
            text,
            isDisabled,
            onClick,
        } as ButtonProperties;
    }

    private _getSecondaryButtonProperties(): ButtonProperties {
        let text: string = null;
        let isDisabled = false;
        let showSpinner = false;
        let onClick: () => void = null;

        if (this.state.hasAutofixCompleted
            || this.props.renamePageStatus === OperationStatus.Failed) {
            text = WikiResources.CloseButtonText;
            onClick = this._onDismiss;
        } else if (!this.state.hasEvaluationStarted) {
            text = this.props.updateWithoutFixingButtonText;
            onClick = this._onUpdateWithoutFixing;
        } else if (this._hasNoBrokenLink()) {
            text = this.props.updateButtonText;
            onClick = this._onUpdateWithoutFixing;
        } else {
            text = this.props.updateWithoutFixingButtonText;
            onClick = this._onUpdateWithoutFixing;
        }

        isDisabled = this.props.renamePageStatus === OperationStatus.InProgress
            || this._isAutofixInProgress();
        showSpinner = this.props.renamePageStatus === OperationStatus.InProgress
            && !this.state.autofixingLinks;

        return {
            text,
            isDisabled,
            onClick,
            showSpinner,
        } as ButtonProperties;
    }

    private _hasNoBrokenLink(): boolean {
        return this.state.hasEvaluationStarted
            && !this.state.isLoadingWorkItems
            && !this.state.isPageSearchQueryPending
            && this.state.wikiPagesToFixCount === 0
            && this.state.workItemsToFixCount === 0;
    }

    private _isAutofixInProgress(): boolean {
        return this.state.updateStarted
            && this.props.renamePageStatus !== OperationStatus.Failed
            && !this.state.hasAutofixCompleted;
    }

    @autobind
    private _setModalRef(ref: IModal): void {
        this._modalRef = ref;
    }

    @autobind
    private _onAutofixLinks(): void {
        this._actionCreator.updateStarted(true);
        this.props.onConfirm(false);
    }

    @autobind
    private _onUpdateWithoutFixing(): void {
        this._actionCreator.updateStarted(false);
        this.props.onConfirm(true);
    }

    @autobind
    private _onStoreChanged(): void {
        this.setState(this._getStateFromStore());
    }

    @autobind
    private _renderReferencingPageCell(item: BrokenWikiPageLink, index: number): JSX.Element {
        if (item && item.pagePath) {
            const editPageUrl: string = getWikiPageEditUrl({
                pagePath: item.pagePath,
                latestPagePath: null,
                version: null,
                view: null,
            });
            return (
                <TooltipHost
                    content={item.pagePath}
                    overflowMode={TooltipOverflowMode.Parent}>
                    <Link
                        href={editPageUrl}
                        target={"_blank"}
                        rel={"noreferrer noopener"}>
                        {item.pagePath}
                    </Link>
                </TooltipHost>
            );
        }

        return null;
    }

    @autobind
    private _renderReferencingWorkItemCell(item: BrokenWorkItemLink, index: number): JSX.Element {
        if (item && item.workItem) {
            return (
                <div>
                    <PrimaryArtifact.Component primaryData={item.workItem.primaryData} />
                </div>
            );
        }

        return null;
    }

    @autobind
    private _renderLink(item: BrokenWikiPageLink, index: number): JSX.Element {
        if (item && item.link) {
            return (
                <TooltipHost
                    content={item.link}
                    overflowMode={TooltipOverflowMode.Parent}>
                    {item.link}
                </TooltipHost>
            );
        }

        return null;
    }

    @autobind
    private _renderUpdateStatus(item: BrokenLinkItem, index: number): JSX.Element {
        /**
         * Render the update status of each wiki page and work item only if rename
         * operation is complete and user has checked for autofixing the links.
         */
        if (this.props.renamePageStatus === OperationStatus.Completed && this.state.autofixingLinks) {
            switch (item.updateState) {
                case OperationStatus.InProgress:
                    return <Spinner
                        key={"brokenLinkSpinner"}
                        className={"updating-link-spinner"} />;

                case OperationStatus.Completed:
                    return (
                        <div className="status-icon-container">
                            <Icon
                                iconName={"CheckMark"}
                                className={"update-status success"}
                                aria-label={WikiResources.LinkUpdatedAriaLabel} />
                        </div>
                    );

                case OperationStatus.Failed:
                    return (
                        <div className="status-icon-container">
                            <Icon
                                iconName={"Cancel"}
                                className={"update-status failure"}
                                aria-label={WikiResources.LinkUpdateFailedAriaLabel} />
                        </div>
                    );

                default:
                    return null;
            }
        }

        return null;
    }

    private _getDialogTitleProperties(): DialogTitleProperties {
        if (this.props.renamePageStatus === OperationStatus.Failed) {
            return this._getTitlePropertiesForFailedOperation();
        } else if (this.props.renamePageStatus === OperationStatus.Completed
            && this.state.hasAutofixCompleted) {
            return this._getTitlePropertiesForSuccessfulOperation();
        } else {
            return this._getInitialTitleProperties();
        }
    }

    private _getTitlePropertiesForFailedOperation(): DialogTitleProperties {
        return {
            value: WikiResources.OperationStatusFailed,
            cssClassName: "rename-dialog-title-failed",
            message: (
                <MessageBar
                    className={"rename-page-dialog-message-bar"}
                    messageBarType={MessageBarType.error}>
                    {this.props.failureMessage}
                </MessageBar>
            ),
        } as DialogTitleProperties;
    }

    private _getTitlePropertiesForSuccessfulOperation(): DialogTitleProperties {
        const showAutoFixFailureWarningMessage = this.state.autofixingLinks && this._hasAutoFixFailures();

        return {
            value: WikiResources.OperationStatusSuccess,
            cssClassName: "rename-dialog-title-success",
            message: (
                <div>
                    {showAutoFixFailureWarningMessage &&
                        <MessageBar
                            className={"rename-page-dialog-message-bar"}
                            messageBarType={MessageBarType.warning}>
                            {WikiResources.UpdateLinksFailedWarningMessage}
                        </MessageBar>
                    }
                    <Label className="text-content" >
                        {this._successMessage}
                    </Label >
                </div>
            ),
        } as DialogTitleProperties;
    }

    private _hasAutoFixFailures(): boolean {
        const brokenLinksUpdateMetrics: BrokenLinksAutoFixMetrics = this.state.brokenLinksAutoFixMetrics;
        return brokenLinksUpdateMetrics.pageUpdateFailureCount + brokenLinksUpdateMetrics.workItemUpdateFailureCount > 0;
    }

    private _getInitialTitleProperties(): DialogTitleProperties {
        return {
            value: this.props.title,
            cssClassName: "",
            message:
                <Label className="text-content">
                    {this._initialMessage}
                </Label>,
        } as DialogTitleProperties;
    }

    @autobind
    private _onWikiPageLinksShowMoreClicked(): void {
        this._actionCreator.loadMoreWikiPageLinks(this._oldPagePath);
    }

    private _getWikiPageListRenderProps(): BrokenLinkComponentProps {
        return {
            items: this._getBrokenPageLinks(),
            columns: this._getColumns(false),
            isLoading: this.state.isPageSearchQueryPending,
            spinnerLoadingText: WikiResources.LoadingWikiPageLinksText,
            onShowMoreLinkClick: this._onWikiPageLinksShowMoreClicked,
        };
    }

    private _getWorkItemListRenderProps(): BrokenLinkComponentProps {
        return {
            items: this._getBrokenWorkItems(),
            columns: this._getColumns(true),
            isLoading: this.state.isLoadingWorkItems,
            spinnerLoadingText: WikiResources.LoadingWorkItemsText,
        };
    }

    private _getStateFromStore(): RenamePageDialogState {
        return { ...(this._store.state) };
    }

    private _getBrokenPageLinks(): BrokenWikiPageLink[] {
        const items: BrokenWikiPageLink[] = [];
        const wikiPagesUpdateData = this.state.wikiPagesUpdateData;

        if (wikiPagesUpdateData) {
            wikiPagesUpdateData.forEach((wikiPageUpdateData: WikiPageUpdateData) => {
                wikiPageUpdateData.links.forEach(
                    (link: string) => {
                        items.push({
                            pagePath: this._getPagePathWithoutRootCharacter(wikiPageUpdateData.pagePath),
                            link: link,
                            updateState: wikiPageUpdateData.updateState,
                        });
                    }
                );
            });


            if (this.state.isFetchingMorePageLinks) {
                items.push({
                    link: null,
                    pagePath: null,
                    updateState: null,
                    isSpinnerItem: true,
                });
            } else if (!this.state.hasFetchedAllBrokenPageLinks) {
                items.push({
                    link: null,
                    pagePath: null,
                    updateState: null,
                    isShowMoreLinkItem: true,
                });
            }
        }

        return items;
    }

    private _getBrokenWorkItems(): BrokenWorkItemLink[] {
        const items: BrokenWorkItemLink[] = [];
        const workItemIdToDataMap: IDictionaryNumberTo<WorkItemData> = this.state.workItemIdToDataMap;

        if (workItemIdToDataMap) {
            for (const workItemId in workItemIdToDataMap) {
                if (workItemIdToDataMap.hasOwnProperty(workItemId)) {
                    const workItemData: WorkItemData = workItemIdToDataMap[workItemId];

                    workItemData.wikiPagePaths.forEach((wikiPagePath: string) => {
                        items.push({
                            workItem: workItemData.displayData,
                            link: this._getPagePathWithoutRootCharacter(wikiPagePath),
                            updateState: workItemData.updateState,
                        });
                    });
                }
            }
        }

        return items;
    }

    private _getColumns(isWorkItemList: boolean): IColumn[] {
        const columns: IColumn[] = [];

        if (!isWorkItemList) {
            columns.push({
                key: "ReferencingWikiPage",
                name: WikiResources.WikiPageListTitle,
                fieldName: null,
                minWidth: 100,
                maxWidth: 350,
                isResizable: true,
                columnActionsMode: ColumnActionsMode.disabled,
                onRender: this._renderReferencingPageCell,
            });
        } else {
            columns.push({
                key: "ReferencingWorkItem",
                name: WikiResources.WorkItemListTitle,
                fieldName: null,
                minWidth: 100,
                maxWidth: 350,
                isResizable: true,
                columnActionsMode: ColumnActionsMode.disabled,
                onRender: this._renderReferencingWorkItemCell,
            });
        }

        columns.push({
            key: "link",
            name: WikiResources.LinkListTitle,
            fieldName: null,
            minWidth: 100,
            isResizable: true,
            columnActionsMode: ColumnActionsMode.disabled,
            onRender: this._renderLink,
        });

        if (this.props.renamePageStatus === OperationStatus.Completed && this.state.autofixingLinks) {
            columns.push({
                key: "UpdateStatus",
                name: WikiResources.BrokenLinkUpdateStatusTitle,
                fieldName: null,
                minWidth: 50,
                columnActionsMode: ColumnActionsMode.disabled,
                onRender: this._renderUpdateStatus,
            });
        }

        return columns;
    }

    private _getPagePathWithoutRootCharacter(pagePath: string): string {
        if (pagePath && pagePath.length > 0 && Utils_String.startsWith(pagePath, RepoConstants.RootPath)) {
            return pagePath.substring(RepoConstants.RootPath.length);
        }

        return pagePath;
    }

    private _instantiateFlux(): void {
        const props = this.props;
        const actionsHub = new RenamePageDialogActionsHub();
        this._store = new RenamePageDialogStore(actionsHub);

        const sources: Sources = {
            LinkWorkItemsSource: new LinkWorkItemsSource(),
            RenamePageDialogSource: new RenamePageDialogSource(),
            WikiPagesSource: new WikiPagesSource(props.wiki, null),
        };

        const repoContext: GitRepositoryContext = props.repositoryContext;
        this._actionCreator = new RenamePageDialogActionCreator(
            actionsHub,
            sources,
            repoContext.getProjectId(),
            repoContext.getRepositoryId(),
            this._store.getRenamePageDialogState,
        );
    }
}

interface DialogRendererProps {
    titleProps: DialogTitleProperties;
    dialogContainerClassName: string;
    dialogContentWrapperClassName: string;
    isOpen: boolean;
    hasEvaluationStarted: boolean;
    workItemListRenderProps: BrokenLinkComponentProps;
    wikiPageListRenderProps: BrokenLinkComponentProps;
    onDismiss(): void;
    primaryButtonProperties: ButtonProperties;
    secondaryButtonProperties: ButtonProperties;
    wikiPagesMaxCount: number;
    workItemsMaxCount: number;
    setModalRef(ref: IModal): void;
}

const DialogRenderer = (props: DialogRendererProps): JSX.Element =>
    <Dialog
        hidden={!props.isOpen}
        modalProps={{
            className: "wiki-page-rename-dialog",
            containerClassName: props.dialogContainerClassName,
            isBlocking: true,
            componentRef: (ref: IModal) => { props.setModalRef(ref) },
        }}
        dialogContentProps={{
            type: DialogType.normal,
            showCloseButton: true,
            closeButtonAriaLabel: WikiResources.CloseButtonText,
            title: props.titleProps.value,
            className: props.titleProps.cssClassName,
        }}
        onDismiss={props.onDismiss}
    >
        <div className={props.dialogContentWrapperClassName}>
            {props.titleProps.message}
            {props.hasEvaluationStarted &&
                <div className={"broken-link-pivots-container"}>
                    <PivotBar className={"broken-link-pivot-bar"}>
                        <PivotBarItem
                            name={WikiResources.PageLinksPivotTitle}
                            className={"broken-link-pivot-content"}
                            badgeCount={props.wikiPagesMaxCount}
                            itemKey={"pageLinksPivot"}>
                            <BrokenLinkComponent
                                items={props.wikiPageListRenderProps.items}
                                columns={props.wikiPageListRenderProps.columns}
                                isLoading={props.wikiPageListRenderProps.isLoading}
                                spinnerLoadingText={props.wikiPageListRenderProps.spinnerLoadingText}
                                onShowMoreLinkClick={props.wikiPageListRenderProps.onShowMoreLinkClick}
                            />
                        </PivotBarItem>
                        <PivotBarItem
                            name={WikiResources.WorkItemsPivotTitle}
                            className={"broken-link-pivot-content"}
                            badgeCount={props.workItemsMaxCount}
                            itemKey={"workItemsPivot"}>
                            <BrokenLinkComponent
                                items={props.workItemListRenderProps.items}
                                columns={props.workItemListRenderProps.columns}
                                isLoading={props.workItemListRenderProps.isLoading}
                                spinnerLoadingText={props.workItemListRenderProps.spinnerLoadingText}
                            />
                        </PivotBarItem>
                    </PivotBar>
                </div>
            }
        </div>
        <DialogFooter>
            {props.primaryButtonProperties &&
                <PrimaryButton
                    disabled={props.primaryButtonProperties.isDisabled}
                    onClick={props.primaryButtonProperties.onClick}>
                    {props.primaryButtonProperties.text}
                </PrimaryButton>
            }
            {props.secondaryButtonProperties &&
                <DefaultButton
                    className={"secondary-button"}
                    disabled={props.secondaryButtonProperties.isDisabled}
                    onClick={props.secondaryButtonProperties.onClick}>
                    {props.secondaryButtonProperties.showSpinner &&
                        <span className="bowtie-icon bowtie-spinner" />}
                    {props.secondaryButtonProperties.text}
                </DefaultButton>
            }
        </DialogFooter>
    </Dialog>;
