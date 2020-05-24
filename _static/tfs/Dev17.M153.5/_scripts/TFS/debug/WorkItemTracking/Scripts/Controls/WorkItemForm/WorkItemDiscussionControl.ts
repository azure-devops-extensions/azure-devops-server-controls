import Events_Handlers = require("VSS/Events/Handlers");
import Events_Services = require("VSS/Events/Services");
import FormEvents = require("WorkItemTracking/Scripts/Form/Events");
import IdentityImage = require("Presentation/Scripts/TFS/TFS.IdentityImage");
import Menus = require("VSS/Controls/Menus");
import Q = require("q");
import RichEditor = require("VSS/Controls/RichEditor");
import Utils_Core = require("VSS/Utils/Core");
import VSS = require("VSS/VSS");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import WorkItemTrackingResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import { BaseControl } from "VSS/Controls";
import { DiscussionControl, IDiscussionControlOptions, IDiscussionControlExtendedState, IDiscussionControlData } from "WorkItemTracking/Scripts/Controls/WorkItemForm/TFS.Social.Discussion";
import { IWorkItemDiscussionControlOptions } from "WorkItemTracking/Scripts/Controls/WorkItemForm/Interfaces";
import { WIFormCIDataHelper } from "WorkItemTracking/Scripts/Utils/WIFormCIDataHelper";
import { WorkItemRichTextHelper } from "WorkItemTracking/Scripts/Utils/WorkItemRichTextHelper";
import { WorkItemRichText } from "WorkItemTracking/Scripts/Utils/WorkItemRichText";
import { WorkItemChangeType } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import { MaximizableWorkItemControl } from "WorkItemTracking/Scripts/Controls/WorkItemForm/MaximizableWorkItemControl";
import { WorkItemDiscussionFactory, IWorkItemDiscussionIterator, IWorkItemDiscussionResult } from "WorkItemTracking/Scripts/OM/History/Discussion";
import { IMessageEntryControl } from "WorkItemTracking/Scripts/Controls/WorkItemForm/DiscussionEditorInterfaces";
import { isNewHtmlEditorEnabled } from "WorkItemTracking/Scripts/Utils/WitControlMode";

import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import * as WITMentionUtility_Async from "WorkItemTracking/Scripts/Utils/WorkItemMentionPreSaveProcessor";
import { getAvatarUrl } from "WorkItemTracking/Scripts/Utils/WorkItemIdentityHelper";
import * as Mention_WorkItems_Async from "Mention/Scripts/TFS.Mention.WorkItems";

const delegate = Utils_Core.delegate;

export class WorkItemDiscussionControl extends MaximizableWorkItemControl {

    public _options: IWorkItemDiscussionControlOptions;
    private _onWorkItemChangedDelegate: Function;
    private _discussionControl: DiscussionControl;
    private _messageBatchSize: number;
    private _discussionIterator: IWorkItemDiscussionIterator;
    private static DEFAULT_MESSAGE_BATCH_SIZE_RESTORED: number = 50;
    private static DEFAULT_MESSAGE_BATCH_SIZE_MAXIMIZED: number = 200;
    private static MAX_PAGE_SIZE: number = 200;
    private static MIN_PAGE_SIZE: number = 1;
    private static ADD_COMMENT_CONTROL_HEIGHT: string = "60";
    private static CONTROLHEIGHT_NOCONTENT: number = 60;
    private static CONTROLHEIGHT_HASCONTENT: number = 200;
    private _isMaximized: boolean = false;
    private _workItemMentionPreSaveProcessorDisposeCallBack: () => void;

    constructor(container, options?: IWorkItemDiscussionControlOptions, workItemType?) {
        super(container, options, workItemType);

        this._onWorkItemChangedDelegate = delegate(this, this._onWorkItemChanged);
    }

    public _init(): void {
        super._init();

        this._container.addClass("work-item-discussion-control");

        if (this._options.pageSize != null) {
            this._options.pageSize = Math.min(Math.max(this._options.pageSize, WorkItemDiscussionControl.MIN_PAGE_SIZE), WorkItemDiscussionControl.MAX_PAGE_SIZE);
        } else {
            this._options.pageSize = WorkItemDiscussionControl.DEFAULT_MESSAGE_BATCH_SIZE_RESTORED;
        }

        if (this._options.maximizedPageSize != null) {
            this._options.maximizedPageSize = Math.min(Math.max(this._options.maximizedPageSize, WorkItemDiscussionControl.MIN_PAGE_SIZE), WorkItemDiscussionControl.MAX_PAGE_SIZE);
        } else {
            this._options.maximizedPageSize = WorkItemDiscussionControl.DEFAULT_MESSAGE_BATCH_SIZE_MAXIMIZED;
        }

        this._messageBatchSize = this._options.pageSize;
        const controlOptions = <IDiscussionControlOptions>{
            createAvatar: delegate(this, this._createAvatar),
            currentIdentity: this.getTfsContext().currentIdentity,
            messageEntryControlType: RichEditor.RichEditor,
            enableContactCard: this._options.enableContactCard,
            showChromeBorder: this._options.chromeBorder,
            messageEntryControlOptions: {
                waterMark: FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessVersionControlPullRequestsMentions, false) ?
                    WorkItemTrackingResources.WorkItemDiscussionAddWithPRComment : WorkItemTrackingResources.WorkItemDiscussionAddComment,
                helpText: FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessVersionControlPullRequestsMentions, false) ?
                    WorkItemTrackingResources.WorkItemDiscussionAddWithPRCommentHelpText : WorkItemTrackingResources.WorkItemDiscussionAddCommentHelpText,
                fireOnEveryChange: true,
                change: delegate(this, this._flush),
                customCommandGroups: WorkItemRichText.getCustomCommandGroups(this),
                id: this._options.controlId,
                linkClickHandler: this._workItemLinkClickHandler.bind(this),
                pageHtml: WorkItemRichTextHelper.getPageHtml(),
                height: WorkItemDiscussionControl.ADD_COMMENT_CONTROL_HEIGHT,
                noToolbar: true,
                internal: true,
                locale: VSS.uiCulture,
                focusIn: () => this._toggleHeight(),
                focusOut: () => this._toggleHeight(),
                ariaLabel: WorkItemTrackingResources.WorkItemDiscussionLabel
            },
            onShowMorePromise: (currentState: IDiscussionControlExtendedState) => {
                if (this._workItem) {
                    const hiddenMessagesCount: number = currentState.totalCount - currentState.visibleCount;
                    const numberOfMessagesToAppend = hiddenMessagesCount >= this._messageBatchSize ? this._messageBatchSize : hiddenMessagesCount;

                    if (numberOfMessagesToAppend > 0) {

                        const iterator = this._discussionIterator;

                        return iterator.next(numberOfMessagesToAppend).then(
                            (discussionResult: IWorkItemDiscussionResult) => {
                                if (iterator != this._discussionIterator || !this._discussionControl) {
                                    return;
                                }

                                return this._createDiscussionControlDataFromDiscussionEntries(discussionResult);
                            }
                        );
                    }
                }
            }
        };

        this._discussionControl = <DiscussionControl>BaseControl.createIn<IDiscussionControlOptions>(
            DiscussionControl, this._container, controlOptions);

        VSS.using(["WorkItemTracking/Scripts/Utils/WorkItemMentionPreSaveProcessor", "Mention/Scripts/TFS.Mention.WorkItems"], (WITMentionUtility: typeof WITMentionUtility_Async, MentionWorkItems: typeof Mention_WorkItems_Async) => {

            const workItemMentionPreSaveProcessor = new WITMentionUtility.WorkItemMentionPreSaveProcessor();
            workItemMentionPreSaveProcessor.attachWorkItemChanged();

            this._workItemMentionPreSaveProcessorDisposeCallBack = () => {
                if (workItemMentionPreSaveProcessor) {
                    workItemMentionPreSaveProcessor.detachWorkItemChanged();
                }
            };
        });
    }

    public bind(workItem: WITOM.WorkItem, disabled?: boolean): void {
        this._discussionControl.stopProgress();
        this._discussionControl.clearErrors();

        super.bind(workItem, disabled);
        if (this._workItem) {
            this._workItem.attachWorkItemChanged(this._onWorkItemChangedDelegate);
            this._workItem.store.beginGetLinkTypes(() => {}, () => { });

            this._discussionControl.pushDiscussionContext({
                sourceArtifact: "WIT",
                field: "Discussion",
                artifactType: this._workItemType ? this._workItemType.name : "N/A",
                workItemId: this._workItem.id
            });

            if (!this._workItem.isReadOnly()) {
                this._discussionControl.showDiscussionEditorControl();
            } else {
                this._discussionControl.hideDiscussionEditorControl();
            }

        }
    }

    public unbind(isDisposing?: boolean): void {
        this._discussionControl.stopProgress();
        this._discussionControl.clearErrors();

        if (this._workItem) {
            this._workItem.detachWorkItemChanged(this._onWorkItemChangedDelegate);
        }
        super.unbind(isDisposing);

        this._discussionControl.popDiscussionContext();
    }

    public invalidate(flushing: boolean): void {

        if (!flushing) {
            this._getMessageEntryControl().ready(() => {
                this._getMessageEntryControl().setValue(this._getFieldTextValue());
                this._setUploadAttachmentHandler();
            });

            this._updateDiscussionControlMessages();

            super.invalidate(flushing);
        }
    }

    public clear(): void {
        this._getMessageEntryControl().ready(() => {
            this._getMessageEntryControl().setValue("");
        });
    }

    public focus(): void {
        this._getMessageEntryControl().ready(() => {
            if (this._workItem && !this._workItem.isReadOnly()) {
                this._getMessageEntryControl().selectText(true);
            }
        });
    }

    public _getControlValue(): string {
        return this._getMessageEntryControl().getValue();
    }

    public dispose(): void {
        if (this._getMessageEntryControl()) {
            this._getMessageEntryControl().dispose();
        }
        if (this._discussionControl) {
            this._discussionControl.dispose();
            this._discussionControl = null;
        }
        if (this._workItemMentionPreSaveProcessorDisposeCallBack) {
            this._workItemMentionPreSaveProcessorDisposeCallBack();
        }
        super.dispose();
    }

    public maximizeInPlace(top: number) {
        this._isMaximized = true;
        const control = this._getMessageEntryControl();
        // Adjust UI layout
        if (control) {
            control.enableToolbar();
            top = top // Group header height
                + control.getOuterHeight(true) // Editor text area height
                + 12; // Margin

            this._toggleHeight();
        }

        const discussionEditorControl = this._discussionControl.getDiscussionEditorControl();
        discussionEditorControl && discussionEditorControl.setFullScreen(true);

        this._discussionControl.setDiscussionMessagesContainerTop(top.toString());
        this._messageBatchSize = this._options.maximizedPageSize;

        // Adjust Discussion messages as well as necessary parameters
        if (this._workItem) {
            var visibleItemCount = this._discussionControl.getExtendedState().visibleCount;

            this._discussionControl.clearErrors();

            if (visibleItemCount < this._messageBatchSize) {
                let numberOfItemsToPage = this._messageBatchSize - visibleItemCount;

                this._discussionControl.startProgress(50);

                var iterator = this._discussionIterator;

                iterator.next(numberOfItemsToPage).then(
                    (discussionResult: IWorkItemDiscussionResult) => {
                        if (iterator != this._discussionIterator || !this._discussionControl) {
                            return;
                        }

                        this._discussionControl.stopProgress();

                        let dataToAppend = this._createDiscussionControlDataFromDiscussionEntries(discussionResult);
                        this._discussionControl.append(dataToAppend);
                    },
                    (error) => {
                        if (this._discussionIterator === iterator && this._discussionControl) {
                            this._discussionControl.stopProgress();
                            this._discussionControl.update([]);

                            const errorMessage = (error && error.message) ?
                                `${WorkItemTrackingResources.WorkItemCommentsRetrievalError}: ${error.message}`
                                : WorkItemTrackingResources.WorkItemCommentsRetrievalError;

                            this._discussionControl.showError(errorMessage);
                        }
                    }
                );
            }
        }
    }

    public restoreInPlace() {
        this._isMaximized = false;
        const control = this._getMessageEntryControl();
        // Restore UI layout
        if (control) {
            control.disableToolbar();
        }

        this._discussionControl.setDiscussionMessagesContainerTop("");
        const discussionEditorControl = this._discussionControl.getDiscussionEditorControl();
        discussionEditorControl && discussionEditorControl.setFullScreen(false);

        // Restore necessary parameters
        this._messageBatchSize = this._options.pageSize;

        this.focus();
        this._toggleHeight();
    }

    /** @override **/
    protected isEmpty(): boolean {
        return false;
    }

    private _setUploadAttachmentHandler(): void {
        const discussionEditorControl = this._discussionControl.getDiscussionEditorControl();
        if (discussionEditorControl) {
            if (isNewHtmlEditorEnabled()) {
                discussionEditorControl.setWorkItem(this._workItem);
                return;
            }

            const uploadApiLocation = WorkItemRichText.getUploadAttachmentApiLocation(this);
            discussionEditorControl.setUploadAttachmentApiLocation(uploadApiLocation);
        }
    }

    private _getNewHeight(): IPromise<number> {
        const control = this._getMessageEntryControl();
        if (control.hasFocus() || control.getValue()) {
            if (this._isMaximized) {
                return this.getAvailableSpace().then(availableDrawSpace => {
                    return Math.floor(availableDrawSpace.height * 0.60);
                });
            }

            return Q.when(WorkItemDiscussionControl.CONTROLHEIGHT_HASCONTENT);
        }

        return Q.when(WorkItemDiscussionControl.CONTROLHEIGHT_NOCONTENT);
    }

    private _toggleHeight() {
        const control = this._getMessageEntryControl();
        if (control) {
            this._getNewHeight().then(newHeight => {
                if (control) {
                    if (newHeight !== control.getHeight()) {
                        control.setHeight(newHeight);
                        Events_Services.getService().fire(FormEvents.FormEvents.ControlResizedEvent());
                    }
                }
            });
        }
    }

    private _updateDiscussionControlMessages(): void {
        if (this._discussionControl && this._workItem) {

            this._discussionControl.clearErrors();
            this._discussionControl.startProgress(50);

            this._discussionIterator = WorkItemDiscussionFactory.getDiscussionIterator(this._workItem);

            // If we are being invalidated due to a save/refresh instead of a bind bring in as many
            // items as we had showing before, up to the maximum size.
            const currentVisibleCount = this._discussionControl.getExtendedState().visibleCount;
            let countToRetrieve = Math.max(currentVisibleCount, this._messageBatchSize);
            countToRetrieve = Math.min(countToRetrieve, WorkItemDiscussionControl.DEFAULT_MESSAGE_BATCH_SIZE_MAXIMIZED);

            const iterator = this._discussionIterator;

            iterator.next(countToRetrieve).then(
                (discussionResult: IWorkItemDiscussionResult) => {
                    if (iterator != this._discussionIterator || !this._discussionControl) {
                        return;
                    }

                    this._discussionControl.stopProgress();

                    const dataToAdd = this._createDiscussionControlDataFromDiscussionEntries(discussionResult);
                    this._discussionControl.update(dataToAdd);
                },
                (error) => {
                    if (this._discussionIterator === iterator && this._discussionControl) {
                        this._discussionControl.stopProgress();
                        this._discussionControl.update([]);

                        let errorMessage = (error && error.message) ?
                            `${WorkItemTrackingResources.WorkItemCommentsRetrievalError}: ${error.message}`
                            : WorkItemTrackingResources.WorkItemCommentsRetrievalError;

                        this._discussionControl.showError(errorMessage);
                    }
                }
            );
        }
    }

    private _createDiscussionControlDataFromDiscussionEntries(messageActions: IWorkItemDiscussionResult): IDiscussionControlData {

        const discussionControlData: IDiscussionControlData = {
            state: {
                totalCount: messageActions.totalCount,
            },
            messages: messageActions.comments,
        };

        return discussionControlData;
    }

    private _createAvatar(identity: any): JQuery {
        const avatarUrl = getAvatarUrl(identity);
        const $avatar = IdentityImage.identityImageElementFromAvatarUrl(avatarUrl);
        $avatar.attr({ "data-sip": identity.email });
        $avatar.attr({ "alt": "" });
        return $avatar;
    }

    private static isHtmlEmpty(value: string): boolean {
        var wrapperElement = document.createElement("div");
        wrapperElement.innerHTML = value;
        return $(wrapperElement).text().trim().length === 0;
    }

    private _flush(element?: any, preventFire?: boolean): void {
        const contents = this._getControlValue();
        if (contents.length < 100) {
            // This is to fix #320022. We dont want to set the field value if user presses enter or space in this control by mistake.
            // Since its a Rich Editor control, even a enter or space will cause to add empty div or br tags and we'll set the field value
            // as these empty tags and we'll see blank containers when we see them in WIT form (like History control).
            // This fix will try to remove all tags that can be added by mistake and replace them with "" and then see if there is any text left.
            // If all that the contents had was blank tags then we wont set the field value.
            // We check for contents.length for performance reason. String replace is not very performant call and we dont want to run it on long strings.
            // 100 seems to be long enough for text entered by mistake. We also dont want to not let user enter empty tags if he really wants to.
            if (WorkItemDiscussionControl.isHtmlEmpty(contents)) {
                this._smartFlush(element, preventFire, "");
                return;
            }
        }

        this._smartFlush(element, preventFire, contents);
    }

    private _onWorkItemChanged(workitem: WITOM.WorkItem, eventData: WITOM.IWorkItemChangedArgs): void {
        if (!eventData) {
            return;
        }

        const control = this._getMessageEntryControl();
        if (eventData.change === WorkItemChangeType.PreSave && control) {
            // Force the control to immediately fire any pending CHANGE events before we continue
            //  with saving the workitem.
            // We only read the value of the control when it fires its CHANGE event. The control
            //  does not fire its CHANGE event synchronously after every user input though, causing
            //  a small time window in which our workitem model could be out-of-sync with the value
            //  of the control.
            control.checkModified();
        } else if (eventData.change === WorkItemChangeType.Saving) {
            const historyFieldUpdate = eventData.workItem.getFieldValue(WITConstants.CoreField.History);
            if (historyFieldUpdate) {
                WIFormCIDataHelper.discussionControlCommentSaveEvent();
            }
        } else if (eventData.change === WorkItemChangeType.Reset) {
            this._toggleHeight();
        } else if (eventData && eventData.change == WorkItemChangeType.FieldChange && control && eventData.changedFields[WITConstants.CoreField.AreaId]) {
            // If the areaId has changed update the url so we get the right permission check
            this._setUploadAttachmentHandler();
        }
    }

    private _workItemLinkClickHandler(e: JQueryEventObject) {
        const workItemLinkRegex = /^x-mvwit:workitem\/([0-9]+)$/;

        if (!e) {
            return;
        }
        var linkTarget = <HTMLAnchorElement>e.currentTarget;
        var regexResult = workItemLinkRegex.exec(linkTarget.href);
        if (regexResult) {
            Menus.menuManager.executeCommand(new Events_Handlers.CommandEventArgs("open-work-item", {
                id: regexResult[1],
                tfsContext: this.getTfsContext()
            }, null));
            return false;
        }
    }

    private _getMessageEntryControl(): IMessageEntryControl {
        if (this._discussionControl) {
            return this._discussionControl.getMessageEntryControl();
        }
        return null;
    }
}


