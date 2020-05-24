import { autobind } from "OfficeFabric/Utilities";
import { Store } from "VSS/Flux/Store";
import {
    LinkWorkItemsDialogParams,
    MovePageParams,
    MovePagePickerDialogParams,
    TemplatePickerDialogParams,
} from "Wiki/Scenarios/Overview/ViewActionsHub";
import { OperationStatus } from "Wiki/Scripts/CommonInterfaces";

export interface PageDialogsState {
    // States for Save Page Dialog
    isSavePageDialogVisible: boolean;
    savePageStatus: OperationStatus;
    errorMessage: string;
    // States for Delete Page Dialog
    isDeletePageDialogVisibile: boolean;
    isDeleting: boolean;
    pagePathToBeDeleted: string;
    // States for move page dialog
    isMovePageDialogVisibile: boolean;
    movePageStatus: OperationStatus;
    movePageParams: MovePageParams;
    // States for Set as home page dialog
    isSetAsHomePageDialogVisibile: boolean;
    setAsHomePageStatus: OperationStatus;
    pagePathToBeSetAsHomePage: string;
    // States for move page picker dialog
    isMovePagePickerDialogVisible: boolean;
    movePagePickerDialogParams: MovePagePickerDialogParams;
    // States for link work items dialog
    isLinkWorkItemsDialogVisibile: boolean;
    linkWorkItemsDialogParams: LinkWorkItemsDialogParams;
    // State for unpublish wiki dialog
    isUnpublishWikiDialogVisibile: boolean;
    // States for template picker dialog
    isTemplatePickerDialogVisible: boolean;
    templatePickerDialogParams: TemplatePickerDialogParams;
    // State for edit in draft version dialog
    isEditInDraftVersionDialogVisible: boolean,
}

export class PageDialogsStore extends Store {
    public state = {
        isSavePageDialogVisible: false,
        savePageStatus: OperationStatus.NotStarted,
        errorMessage: null,
        isDeletePageDialogVisibile: false,
        isDeleting: false,
        pagePathToBeDeleted: null,
        isCancelChangesDialogVisible: false,
        onCancelAction: undefined,
        isMovePageDialogVisibile: false,
        movePageStatus: OperationStatus.NotStarted,
        movePageParams: null,
        isSetAsHomePageDialogVisibile: false,
        setAsHomePageStatus: OperationStatus.NotStarted,
        pagePathToBeSetAsHomePage: null,
        isMovePagePickerDialogVisible: false,
        movePagePickerDialogParams: null,
        isLinkWorkItemsDialogVisibile: false,
        linkWorkItemsDialogParams: null,
        isUnpublishWikiDialogVisibile: false,
        isTemplatePickerDialogVisible: false,
        templatePickerDialogParams: null,
        isEditInDraftVersionDialogVisible: false,
    } as PageDialogsState;

    public promptSavePageDialog = (): void => {
        this.state.isSavePageDialogVisible = true;
        this.state.savePageStatus = OperationStatus.NotStarted;
        this.emitChanged();
    }

    public dismissSavePageDialog = (): void => {
        this.state.isSavePageDialogVisible = false;
        this.state.savePageStatus = OperationStatus.NotStarted;
        this.state.errorMessage = null;
        this.emitChanged();
    }

    public promptDeletePageDialog = (path: string): void => {
        this.state.isDeletePageDialogVisibile = true;
        this.state.pagePathToBeDeleted = path;
        this.emitChanged();
    }

    public dismissDeletePageDialog = (): void => {
        this.state.isDeletePageDialogVisibile = false;
        this.state.pagePathToBeDeleted = null;
        this.emitChanged();
    }

    public startSavingPage = (): void => {
        this.state.savePageStatus = OperationStatus.InProgress;
        this.state.errorMessage = null;
        this.emitChanged();
    }

    public completeSavingPage = (closeRenameDialogOnComplete?: boolean): void => {
        this.state.errorMessage = null;
        this.state.savePageStatus = OperationStatus.Completed;
        const isDialogVisible = this.state.isSavePageDialogVisible;
        this.state.isSavePageDialogVisible = isDialogVisible && !closeRenameDialogOnComplete;
        this.emitChanged();
    }

    public startDeletingPage = (): void => {
        this.state.isDeleting = true;
        this.emitChanged();
    }

    public completeDeletingPage = (): void => {
        this.state.isDeletePageDialogVisibile = false;
        this.state.isDeleting = false;
        this.state.pagePathToBeDeleted = null;
        this.emitChanged();
    }

    public promptMovePageDialog = (params: MovePageParams): void => {
        this.state.isMovePageDialogVisibile = true;
        this.state.movePageStatus = OperationStatus.NotStarted;
        this.state.movePageParams = params;
        this.emitChanged();
    }

    public dismissMovePageDialog = (): void => {
        this.state.isMovePageDialogVisibile = false;
        this.state.movePageParams = null;
        this.emitChanged();
    }

    public startMovingPage = (): void => {
        this.state.movePageStatus = OperationStatus.InProgress;
        this.emitChanged();
    }

    public onPageMoveCompleted = (closeOnComplete: boolean): void => {
        this.state.movePageStatus = OperationStatus.Completed;
        const isDialogVisible = this.state.isMovePageDialogVisibile;
        this.state.isMovePageDialogVisibile = isDialogVisible && !closeOnComplete;
        this.state.movePageParams = null;
        this.emitChanged();
    }

    @autobind
    public onPageMoveFailed(): void {
        this.state.movePageStatus = OperationStatus.Failed;
        this.state.movePageParams = null;
        this.emitChanged();
    }

    public promptSetAsHomePageDialog = (path: string): void => {
        this.state.isSetAsHomePageDialogVisibile = true;
        this.state.pagePathToBeSetAsHomePage = path;
        this.state.setAsHomePageStatus = OperationStatus.NotStarted;
        this.emitChanged();
    }

    public dismissSetAsHomePageDialog = (): void => {
        this.state.isSetAsHomePageDialogVisibile = false;
        this.state.pagePathToBeSetAsHomePage = null;
        this.emitChanged();
    }

    public startSettingAsHomePage = (): void => {
        this.state.setAsHomePageStatus = OperationStatus.InProgress;
        this.emitChanged();
    }

    public onSetAsHomePageCompleted = (closeOnComplete?: boolean): void => {
        this.state.setAsHomePageStatus = OperationStatus.Completed;
        const isDialogVisible = this.state.isSetAsHomePageDialogVisibile;
        this.state.isSetAsHomePageDialogVisibile = isDialogVisible && !closeOnComplete;
        this.state.pagePathToBeSetAsHomePage = null;
        this.emitChanged();
    }

    @autobind
    public onSetAsHomePageFailed(): void {
        this.state.setAsHomePageStatus = OperationStatus.Failed;
        this.state.pagePathToBeSetAsHomePage = null;
        this.emitChanged();
    }

    public showSaveErrorMessage = (errorMessage: string): void => {
        this.state.errorMessage = errorMessage;
        this.state.savePageStatus = OperationStatus.Failed;
        this.emitChanged();
    }

    public promptMovePagePickerDialog = (params: MovePagePickerDialogParams): void => {
        this.state.isMovePagePickerDialogVisible = true;
        this.state.movePagePickerDialogParams = params;
        this.emitChanged();
    }

    public dismissMovePagePickerDialog = (): void => {
        this.state.isMovePagePickerDialogVisible = false;
        this.state.movePagePickerDialogParams = null;
        this.emitChanged();
    }

    public promptLinkWorkItemsDialog = (linkWorkItemsDialogParams: LinkWorkItemsDialogParams) => {
        this.state.isLinkWorkItemsDialogVisibile = true;
        this.state.linkWorkItemsDialogParams = linkWorkItemsDialogParams;

        this.emitChanged();
    }

    public dismissLinkWorkItemsDialog = () => {
        this.state.isLinkWorkItemsDialogVisibile = false;
        this.state.linkWorkItemsDialogParams = null;

        this.emitChanged();
    }

    @autobind
    public promptUnpublishWikiDialog(): void {
        this.state.isUnpublishWikiDialogVisibile = true;
        this.emitChanged();
    }

    @autobind
    public dismissUnpublishWikiDialog(): void {
        this.state.isUnpublishWikiDialogVisibile = false;
        this.emitChanged();
    }

    @autobind
    public promptTemplatePickerDialog(params: TemplatePickerDialogParams): void {
        this.state.isTemplatePickerDialogVisible = true;
        this.state.templatePickerDialogParams = params;

        this.emitChanged();
    }

    @autobind
    public dismissTemplatePickerDialog(): void {
        this.state.isTemplatePickerDialogVisible = false;
        this.state.templatePickerDialogParams = null;

        this.emitChanged();
    }

    @autobind
    public promptEditInDraftVersionDialog(): void {
        this.state.isEditInDraftVersionDialogVisible = true;
        this.emitChanged();
    }

    @autobind
    public dismissEditInDraftVersionDialog(): void {
        this.state.isEditInDraftVersionDialogVisible = false;
        this.emitChanged();
    }
}
