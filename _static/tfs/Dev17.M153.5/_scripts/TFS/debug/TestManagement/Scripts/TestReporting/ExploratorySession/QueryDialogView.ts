/*
* ---------------------------------------------------------
* Copyright(C) Microsoft Corporation. All rights reserved.
* ---------------------------------------------------------
*/

import q = require("q");
import QueryScalar = require("Widgets/Scripts/QueryScalar");
import Resources = require("TestManagement/Scripts/Resources/Tfs.Resources.TestManagement");
import DataProvider = require("TestManagement/Scripts/TestReporting/DataProviders/WorkItem.DataProvider");
import ManualUtils = require("TestManagement/Scripts/TestReporting/ExploratorySession/Utils");
import MessageArea = require("TestManagement/Scripts/TFS.TestManagement.MessageArea");
import BladeConfigQuery = require("Widgets/Scripts/Shared/BladeConfigurationQueryControl");
import {SettingsField, SettingsFieldOptions} from "Dashboards/Scripts/SettingsField";
import Context = require("VSS/Context");
import Contracts = require("TFS/TestManagement/Contracts");
import Dialogs = require("VSS/Controls/Dialogs");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import VSS = require("VSS/VSS");
let delegate = Utils_Core.delegate;

export interface IQueryDialogViewOptions {
    onOkClickDelegate: (query: QueryScalar.IQueryInformation) => void;
    onCancelClickDelegate: () => void;
    team: string;
}

export class QueryDialogView extends Dialogs.ModalDialog {

    private _querySelector: BladeConfigQuery.QuerySelectorControl;
    private _buttons: any[];
    private _selectedQuery: QueryScalar.IQueryInformation = null;
    private _onOkClickDelegate: (query: QueryScalar.IQueryInformation) => void;
    private _onCancelClickDelegate: () => void;
    private _okButtonId = "query-ok-button";
    private _cancelButtonId = "query-canel-button";
    private _messageArea: MessageArea.MessageAreaView;
    private _messageAreaViewModel: MessageArea.MessageAreaViewModel;
    private _team: string;

    public initializeOptions(options?: Dialogs.IModalDialogOptions): void {

        this._onOkClickDelegate = (options as any).onOkClickDelegate,
            this._onCancelClickDelegate = (options as any).onCancelClickDelegate;
        this._team = (options as IQueryDialogViewOptions).team;
        super.initializeOptions($.extend({
            resizable: false,
            title: Resources.QuerySelectorText,
            okText: Resources.OkText,
            buttons: this._getButtons(),
            width: 460,
            height: 360
        }, options));
    }

    public initialize(): void {
        super.initialize();
        this._decorate();
    }

    public dispose() {

        if (this._selectedQuery) {
            this._selectedQuery = null;
        }
        if (this._querySelector) {
            this._querySelector.dispose();
            this._querySelector = null;
        }
        if (this._buttons) {
            this._buttons = null;
        }
        if (this._onOkClickDelegate) {
            this._onOkClickDelegate = null;
        }
        if (this._onCancelClickDelegate) {
            this._onCancelClickDelegate = null;
        }
        if (this._messageArea) {
            this._messageArea.dispose();
            this._messageArea = null;
        }
    }

    public onClose(): void {
        if (this._onCancelClickDelegate) {
            this._onCancelClickDelegate();
        }
    }

    private _getButtons(): any {
        /// <summary>Gets the buttons of the dialog.</summary>
        this._buttons = [
            {
                id: "query-ok-button",
                text: Resources.OkText,
                click: Utils_Core.delegate(this, this._onOkButtonClicked),
            },
            {
                id: "query-cancel-button",
                text: Resources.CancelText,
                click: Utils_Core.delegate(this, this._onCancelButtonClicked)
            }];
        return this._buttons;
    }

    private _onOkButtonClicked(): void {
        this._onOkClickDelegate(this._selectedQuery);
        this.close();
    }

    private _onCancelButtonClicked(): void {
        this._onCancelClickDelegate();
        this.close();
    }

    private _decorate() {

        this._toggleDialogButtons(this._okButtonId, false);

        this._element.append(this._createErrorMessageContainer());

        let $querySelectorContainer = $("<div>").addClass("session-insight-wit-query-selector-container").addClass("settings-field");
        const context = Context.getDefaultWebContext();
        context.team = {
            id: this._team,
            name: this._team
        };
        this._querySelector =
            <BladeConfigQuery.QuerySelectorControl>Controls.BaseControl.createIn(
                BladeConfigQuery.QuerySelectorControl,
                $querySelectorContainer,
                <BladeConfigQuery.QuerySelectorOptions>{
                    onChange: delegate(this, this._onWorkItemQueryChange),
                    webContext: context
                }

            );

        let settingsField = SettingsField.createSettingsField(<SettingsFieldOptions<BladeConfigQuery.QuerySelectorControl>>{
            labelText: Utils_String.empty,
            control: this._querySelector,
            toolTipText: Utils_String.empty,
            controlElement: $querySelectorContainer,
            hasErrorField: false
        }, this.getElement());

        // Don't use bowtie styling for this settings field
        settingsField.getElement().removeClass("bowtie");

        this._element.append(this._createInfoMessageContainer());
    }

    private _createInfoMessageContainer(): JQuery {
        let $div = $("<div />").addClass("session-insight-query-dialog").addClass("info-message-container");
        let $infoIcon = $("<div />").addClass("bowtie-icon bowtie-status-info");
        $div.append($infoIcon);
        let $message = $("<div />").addClass("info-text").text(Resources.SessionInsightQueryDialogInfoText);
        $div.append($message);
        return $div;
    }

    private _createErrorMessageContainer(): JQuery {

        this._messageAreaViewModel = new MessageArea.MessageAreaViewModel();
        let $div = $("<div />").addClass("session-insight-dialog-error").addClass("error-message-holder");
        this._messageArea = <MessageArea.MessageAreaView>Controls.BaseControl.enhance(MessageArea.MessageAreaView, $div, {
            viewModel: this._messageAreaViewModel
        });

        return $div;
    }

    private _toggleDialogButtons(buttonId: string, enabled: boolean): void {
        this._element.trigger(Dialogs.ModalDialog.EVENT_BUTTON_STATUS_CHANGE, { button: buttonId, enabled: enabled });
    }

    private _onWorkItemQueryChange(): void {
        this._selectedQuery = this._querySelector.getCurrentValue();
        if (this._selectedQuery.queryId) {
            // scenario: when query text length exceed limit
            if (!$(this._element.find(".session-insight-wit-query-selector-container .query-selector span")[0]).hasClass("query-text")) {
                $(this._element.find(".session-insight-wit-query-selector-container .query-selector span")[0]).addClass("query-text");
            }

            this._validateQuery(this._selectedQuery.queryId).then((witIds: number[]) => {
                if (witIds) {
                    this._toggleDialogButtons(this._okButtonId, true);
                } else {
                    this._toggleDialogButtons(this._okButtonId, false);
                }
            },
                (error) => {
                    this._toggleDialogButtons(this._okButtonId, false);
                });
        }
    }

    private _validateQuery(wiqlQuery: string): IPromise<number[]> {
        let deferred: Q.Deferred<number[]> = q.defer<number[]>();
        // fetch workitems based on selected query
        DataProvider.WorkItemDataProvider.getInstance().beginGetWorkItemsFromQueryId(wiqlQuery)
            .then((fetchedWorkItems: IDictionaryStringTo<Contracts.WorkItemReference>) => {
                let witIds: number[] = null;
                if (fetchedWorkItems) {
                    witIds = [];
                    for (let item in fetchedWorkItems) {
                        if (ManualUtils.isLinkabaleWorkItem(fetchedWorkItems[item].type)) {
                            witIds.push(parseInt(fetchedWorkItems[item].id));
                        }
                    }
                }

                if (witIds && fetchedWorkItems && Object.keys(fetchedWorkItems).length === 0) {
                    this._messageAreaViewModel.logError(Resources.SessionInsightNoWorkItemInQueryResultText);
                    deferred.resolve(null);
                }
                else if (witIds && witIds.length === 0) {
                    this._messageAreaViewModel.logError(Resources.SessionInsightNoWorkItemSupportedInQueryText2);
                    deferred.resolve(null);
                } else {
                    this._messageAreaViewModel.clear();
                    deferred.resolve(witIds);
                }

            },
            (error: TfsError) => {
                Diag.logError(Utils_String.format("failed to fetch workitem from query id. Error: {0}", (error.message || error)));
                this._messageAreaViewModel.logError(ManualUtils.getErrorMessageFromQueryIdResult(error.message));
                deferred.reject(error);
            });

        return deferred.promise;
    }
}

// TFS plug-in model requires this call for each TFS module.
VSS.tfsModuleLoaded("ExploratorySession/QueryDialogView", exports);
