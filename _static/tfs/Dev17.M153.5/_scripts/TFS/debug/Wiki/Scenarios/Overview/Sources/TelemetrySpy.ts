import { autobind } from "OfficeFabric/Utilities";
import { WikiPage } from "TFS/Wiki/Contracts";
import { ViewActionsHub } from "Wiki/Scenarios/Overview/ViewActionsHub";
import { Attachment } from "Wiki/Scenarios/Shared/SharedActionsHub";
import { TelemetryWriter } from "Wiki/Scenarios/Shared/Sources/TelemetryWriter";
import {
    PageErrorType,
    SaveOptionType,
    SavePageOperationType,
    TelemetryConstants,
} from "Wiki/Scripts/CustomerIntelligenceConstants";
import { getDepthOfPage } from "Wiki/Scripts/Helpers";

/**
 * Writes telemetry events based on the Overview actions invoked in Flux.
 */
export class TelemetrySpy implements IDisposable {
    constructor(
        private _telemetryWriter: TelemetryWriter,
        private _viewActionsHub: ViewActionsHub,
    ) {
        this._registerActionsHubHandlers();
        this._registerDialogActionHandlers();
    }

    public dispose(): void {
        this._disposeActionsHubHandlers();
        this._disposeDialogActionHandlers();
    }

    public publishPageError(errorMessage: string, errorType: PageErrorType): void {
        this._telemetryWriter.publish(
            TelemetryConstants.PageError,
            {
                errorMessage: errorMessage,
                errorType: PageErrorType[errorType],
            });
    }

    public publishNonConformantPageAction(): void {
        this._telemetryWriter.publish(TelemetryConstants.NonConformancePageAction);
    }

    public publishPageSaved(saveOptionType: SaveOptionType, savePageOperationType: SavePageOperationType, wikiPage: WikiPage, isDefaultCommentChanged: boolean): void {
        this._telemetryWriter.publish(
            TelemetryConstants.PageSaved,
            {
                saveOptionType: SaveOptionType[saveOptionType],
                savePageOperationType: SavePageOperationType[savePageOperationType],
                depth: getDepthOfPage(wikiPage.path),
                order: wikiPage.order,
                isDefaultCommentChanged: isDefaultCommentChanged,
            });
    }

    public publishSearchWithWikiSearchClicked(): void {
        this._telemetryWriter.publish(TelemetryConstants.PublishSearchWithWikiSearchClicked);
    }

    public publishConflictError(wikiPage: WikiPage): void {
        this._telemetryWriter.publish(
            TelemetryConstants.ConflictErrorOnPageSave,
            {
                depth: getDepthOfPage(wikiPage.path),
                order: wikiPage.order,
            });
    }

    public publishSecurityDialogPrompted(): void {
        this._telemetryWriter.publish(TelemetryConstants.SecurityDialogPrompted);
    }

    public publishCopyCloneUrlClicked(): void {
        this._telemetryWriter.publish(TelemetryConstants.CopyCloneUrlClicked);
    }

    public publishCopyPagePathClicked(): void {
        this._telemetryWriter.publish(TelemetryConstants.CopyPagePathClicked);
    }

    public publishPagePrinted(): void {
        this._telemetryWriter.publish(TelemetryConstants.PagePrinted);
    }

    public publishEditContainerPreviewToggled(previewMode: string): void {
        this._telemetryWriter.publish(
            TelemetryConstants.EditContainerPreviewToggled,
            {
                preview: previewMode,
            }
        );
    }

    public publishPageFilterPerformed(): void {
        this._telemetryWriter.publish(TelemetryConstants.PageFilterPerformed);
    }

    public publishPageEditingCancelledWithoutAnyChange(): void {
        this._telemetryWriter.publish(TelemetryConstants.PageEditingCancelledWithoutAnyChange);
    }

    public publishFilteredPagesClickedCount(filteredPagesClickCount: number): void {
        this._telemetryWriter.publish(
            TelemetryConstants.FilteredPageClicked,
            {
                filteredPagesClickCount: filteredPagesClickCount
            });
    }

    public publishBrokenLinkErrorPageVisited(): void {
        this._telemetryWriter.publish(TelemetryConstants.BrokenLinkErrorPageVisited);
    }

    public publishBrokenLinkWithBrokenParentVisited(): void {
        this._telemetryWriter.publish(TelemetryConstants.BrokenLinkWithBrokenParentVisited);
    }

    public publishPageCreatedAtBrokenLink(): void {
        this._telemetryWriter.publish(TelemetryConstants.PageCreatedAtBrokenLink);
    }

    public publishAddPageContent(): void {
        this._telemetryWriter.publish(TelemetryConstants.AddPageContentToParentPagesWithoutMDFiles);
    }

    public publishPageCreatedWithTemplate(): void {
        this._telemetryWriter.publish(TelemetryConstants.PageCreatedWithTemplate);
    }

    private _registerActionsHubHandlers(): void {
        this._viewActionsHub.attachmentsAdded.addListener(this._publishAttachmentAdded);
        this._viewActionsHub.cancelPageEditing.addListener(this._publishPageEditingAbandoned);
        this._viewActionsHub.deletePageCompleted.addListener(this._publishPageDeleted);
        this._viewActionsHub.movePageCompleted.addListener(this._publishPageMoved);
        this._viewActionsHub.setAsHomePageCompleted.addListener(this._publishPageSetAsHomePage);
        this._viewActionsHub.wikiRenameSucceeded.addListener(this._renameWikiSucceeded);
        this._viewActionsHub.wikiRenameFailed.addListener(this._renameWikiFailed);
    }

    private _disposeActionsHubHandlers(): void {
        this._viewActionsHub.attachmentsAdded.removeListener(this._publishAttachmentAdded);
        this._viewActionsHub.cancelPageEditing.removeListener(this._publishPageEditingAbandoned);
        this._viewActionsHub.deletePageCompleted.removeListener(this._publishPageDeleted);
        this._viewActionsHub.movePageCompleted.removeListener(this._publishPageMoved);
        this._viewActionsHub.setAsHomePageCompleted.removeListener(this._publishPageSetAsHomePage);
    }

    private _registerDialogActionHandlers(): void {
        this._viewActionsHub.deletePageDialogPrompted.addListener(this._publishDeletePageDialogPrompted);
        this._viewActionsHub.deletePageDialogDismissed.addListener(this._publishDeletePageDialogDismissed);
        this._viewActionsHub.movePageDialogPrompted.addListener(this._publishMovePageDialogPrompted);
        this._viewActionsHub.movePageDialogDismissed.addListener(this._publishMovePageDialogDismissed);
        this._viewActionsHub.setAsHomePageDialogPrompted.addListener(this._publishSetAsHomePageDialogPrompted);
        this._viewActionsHub.setAsHomePageDialogDismissed.addListener(this._publishSetAsHomePageDialogDismissed);
        this._viewActionsHub.movePagePickerDialogPrompted.addListener(this._publishMovePagePickerDialogPrompted);
    }

    private _disposeDialogActionHandlers(): void {
        this._viewActionsHub.deletePageDialogPrompted.removeListener(this._publishDeletePageDialogPrompted);
        this._viewActionsHub.deletePageDialogDismissed.removeListener(this._publishDeletePageDialogDismissed);
        this._viewActionsHub.movePageDialogPrompted.removeListener(this._publishMovePageDialogPrompted);
        this._viewActionsHub.movePageDialogDismissed.removeListener(this._publishMovePageDialogDismissed);
        this._viewActionsHub.setAsHomePageDialogPrompted.removeListener(this._publishSetAsHomePageDialogPrompted);
        this._viewActionsHub.setAsHomePageDialogDismissed.removeListener(this._publishSetAsHomePageDialogDismissed);
        this._viewActionsHub.movePagePickerDialogPrompted.removeListener(this._publishMovePagePickerDialogPrompted);
    }

    @autobind
    private _publishAttachmentAdded(payload: Attachment[]): void {
        this._telemetryWriter.publish(TelemetryConstants.AttachmentsAdded);
    }

    @autobind
    private _publishPageEditingAbandoned(): void {
        this._telemetryWriter.publish(TelemetryConstants.PageEditingAbandoned);
    }

    @autobind
    private _publishPageDeleted(): void {
        this._telemetryWriter.publish(TelemetryConstants.PageDeleted);
    }

    @autobind
    private _publishPageMoved(): void {
        this._telemetryWriter.publish(TelemetryConstants.PageMoved);
    }

    @autobind
    private _publishPageSetAsHomePage(): void {
        this._telemetryWriter.publish(TelemetryConstants.PageSetAsHomePage);
    }

    @autobind
    private _publishDeletePageDialogPrompted(): void {
        this._telemetryWriter.publish(TelemetryConstants.DeletePageDialogPrompted);
    }

    @autobind
    private _publishDeletePageDialogDismissed(): void {
        this._telemetryWriter.publish(TelemetryConstants.DeletePageDialogDismissed);
    }

    @autobind
    private _publishMovePageDialogPrompted(): void {
        this._telemetryWriter.publish(TelemetryConstants.MovePageDialogPrompted);
    }

    @autobind
    private _publishMovePageDialogDismissed(): void {
        this._telemetryWriter.publish(TelemetryConstants.MovePageDialogDismissed);
    }

    @autobind
    private _publishSetAsHomePageDialogPrompted(): void {
        this._telemetryWriter.publish(TelemetryConstants.SetAsHomePageDialogPrompted);
    }

    @autobind
    private _publishSetAsHomePageDialogDismissed(): void {
        this._telemetryWriter.publish(TelemetryConstants.SetAsHomePageDialogDismissed);
    }

    @autobind
    private _publishMovePagePickerDialogPrompted(): void {
        this._telemetryWriter.publish(TelemetryConstants.MovePagePickerDialogPrompted);
    }

    @autobind
    private _renameWikiSucceeded(): void {
        this._telemetryWriter.publish(TelemetryConstants.WikiRenameSucceeded);
    }

    @autobind
    private _renameWikiFailed(): void {
        this._telemetryWriter.publish(TelemetryConstants.WikiRenameFailed);
    }

}
