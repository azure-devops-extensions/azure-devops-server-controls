import * as React from "react";
import * as ReactDOM from "react-dom";

import { BaseControl, Enhancement } from "VSS/Controls";
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import { KeyCode } from "VSS/Utils/UI";
import { getErrorMessage } from "VSS/VSS";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { autobind } from "OfficeFabric/Utilities";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { QueryChartsView } from "WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.Charts";
import { QueryResultGrid } from "WorkItemTracking/Scripts/Controls/Query/QueryResultGrid";
import * as Events_Services from "VSS/Events/Services";
import { WorkItemViewActions } from "WorkItemTracking/Scripts/Utils/WorkItemViewActions";

export interface QueryResultInfoBarOptions {
    showQueryTitle: boolean;
    tfsContext: TfsContext;
    keepTitle: boolean;
    cssClass: string;
}
const eventService = Events_Services.getService();

interface IMessages {
    info?: string;
    error?: string;
}
class MessageStore {
    private readonly store: {[queryId: string]: IMessages} = {};
    public get(queryId: string): IMessages {
        if (!this.store[queryId]) {
            this.store[queryId] = {};
        }
        return this.store[queryId];
    }
}

export class QueryResultInfoBar extends BaseControl {
    public static enhancementTypeName: string = "tfs.wit.queryResultGridInfo";
    /**
     * Can't imbed links in error message b/c react will escape them. Separate out links first then pass to react.
     */
    public static processLinks(message: string) {
        const messages: (string | JSX.Element)[] = [];
        let match: RegExpMatchArray;
        message = message.replace(/[\n\r]+/g, " ");
        // tslint:disable-next-line:no-conditional-assignment
        while (message && (match = message.match(/^(.*?)(?:<a href="(.*?)">(.*?)<\/a>(.*))?$/))) {
            if (match[1]) {
                messages.push(match[1]);
            }
            message = match[4];
            const href = match[2];
            const linkText = match[3];
            if (linkText) {
                messages.push(<a href={href}>{linkText}</a>);
            }
        }
        return messages;
    }

    private _view: QueryResultGrid | QueryChartsView;
    private _$queryInfoContainer: JQuery;
    private _$titleElement: JQuery;
    private _$statusElement: JQuery;
    private _$descriptionElement: JQuery;
    private _descriptionControl: RichContentTooltip;
    private _$errorMessageBarContainer: JQuery;
    private readonly _currentMessages = new MessageStore();

    constructor(options?: QueryResultInfoBarOptions) {
        super(options);
    }

    public initializeOptions(options?: QueryResultInfoBarOptions) {
        super.initializeOptions({
            coreCssClass: "query-result-grid-info",
            showQueryTitle: false,
            ...options
        });
    }

    public dispose() {
        this.unbind();
        super.dispose();
    }

    public bind(view: QueryResultGrid | QueryChartsView) {
        this._view = view;
        this._view._bind("statusUpdate", this._update);
        eventService.attachEvent(WorkItemViewActions.WORKITEM_VIEW_INFO_CHANGE, this._onInfo);

        // Container top level elements
        this._$errorMessageBarContainer = $("<div />").addClass("error-message-container").appendTo(this._element);
        this._$queryInfoContainer = $("<div />").addClass("query-result-info-bar").appendTo(this._element);

        // Title
        this._$titleElement = $("<div />").addClass("query-title").appendTo(this._$queryInfoContainer);

        // Description
        this._$descriptionElement = $("<div />").addClass("query-description icon icon-info-white").appendTo(this._$queryInfoContainer);

        // Query status
        this._$statusElement = $("<div />").addClass("query-status").appendTo(this._$queryInfoContainer);
    }

    public unbind() {
        eventService.detachEvent(WorkItemViewActions.WORKITEM_VIEW_INFO_CHANGE, this._onInfo);
        if (this._view) {
            this._view._unbind("statusUpdate", this._update);
            this._view = null;
        }

        if (!this._options || !this._options.keepTitle) {
            this._$titleElement.text("");
        }

        this._$statusElement.text("");

        ReactDOM.unmountComponentAtNode(this._$errorMessageBarContainer[0]);
    }

    private updateMessages(newMessages: IMessages) {
        const below1 = "below-1-message";
        const below2 = "below-2-messages";
        const nextClass = getRightHubClass(newMessages);
        $(".right-hub-content").removeClass(below1).removeClass(below2).addClass(nextClass);
        const {info, error} = newMessages;
        const messageElems: JSX.Element[] = [];
        if (info) {
            messageElems.push(<MessageBar messageBarType={MessageBarType.info} onDismiss={() => this._onInfo(null, "")}>{QueryResultInfoBar.processLinks(info)}</MessageBar>);
        }
        if (error) {
            messageElems.push(<MessageBar messageBarType={MessageBarType.error}>{QueryResultInfoBar.processLinks(error)}</MessageBar>);
        }
        ReactDOM.render(
            <div className="messages">
                {messageElems}
            </div>,
            this._$errorMessageBarContainer[0]
        );

        function getRightHubClass(o: IMessages) {
            const count = Object.keys(o).length;
            switch (count) {
                case 2: return below2;
                case 1: return below1;
                default: return "";
            }
        }
    }
    @autobind
    private _onInfo(sender: null, infoMessage: string) {
        const messages = this._currentMessages.get(this._getQueryId());
        if (infoMessage) {
            messages.info = infoMessage;
        } else {
            delete messages.info;
        }
        this.updateMessages(messages);
    }

    private _getQueryId() {
        return this._view.getProvider().getId();
    }

    @autobind
    private _update(sender: any, status: any, statusIsError?: boolean) {
        const message: string = statusIsError ? getErrorMessage(status) : status;
        const messages: IMessages = this._currentMessages.get(this._getQueryId());
        if (statusIsError) {
            messages.error = message;
        } else {
            delete messages.error;
        }
        this.updateMessages(messages);
        if (message) {
            if (statusIsError) {
                this._$statusElement.text("");
            } else {
                this._$statusElement.text(message);
            }
        }

        const showTitle = this._options.showQueryTitle;
        if (showTitle && this._view && this._view.getProvider()) {
            const name = this._view.getProvider().getTitle();
            this._$titleElement.text(name);
            RichContentTooltip.addIfOverflow(name, this._$titleElement);

            this._view.getProvider().beginGetDescription(this._updateDescription);
        } else {
            ReactDOM.unmountComponentAtNode(this._$titleElement[0]);
            this._$titleElement.empty();
            this._$descriptionElement.hide();
        }

        this._$queryInfoContainer.toggleClass("no-title", !showTitle);
    }

    @autobind
    private _updateDescription(description: string): void {
        if (!description) {
            this._$descriptionElement.hide();
        } else {
            if (!this._descriptionControl) {
                this._$descriptionElement.attr("tabindex", "0").keydown((e?: JQueryEventObject) => {
                    if (e.keyCode === KeyCode.ENTER) {
                        this._$descriptionElement.click();
                    }
                });

                const descriptionOption = {
                    cssClass: "description-popup-content-container",
                    openCloseOnHover: false,
                    text: description
                };
                this._descriptionControl = Enhancement.enhance(RichContentTooltip, this._$descriptionElement, descriptionOption) as RichContentTooltip;
            } else {
                this._descriptionControl.setTextContent(description);
            }

            this._$descriptionElement.show();
        }
    }
}

// Deprecated, please don't rely on this enhancement, as it will be removed
Enhancement.registerEnhancement(QueryResultInfoBar, ".query-result-grid-info");
