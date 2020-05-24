/// <amd-dependency path='VSS/LoaderPlugins/Css!VersionControlControls' />

import Controls = require("VSS/Controls");
import { getClient } from "VSS/Service";
import { SettingsHttpClient } from "VSS/Settings/RestClient";
import VSS = require("VSS/VSS");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Utils_UI = require("VSS/Utils/UI");
import Utils_Core = require("VSS/Utils/Core");
import VCAdminOptionsInfoBar = require("VersionControl/Scripts/Controls/AdminOptionsInfoBar");
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { TfvcRepositoryContext } from "VersionControl/Scripts/TfvcRepositoryContext";
import { SettingKeys, getTfvcWebEditEnabled, setTfvcRepositorySettings } from "VersionControl/Scripts/VersionControlSettings";
import VCWebAccessContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import { VERSION_CONTROL_AREA, ADMIN_REPOSITORY_OPTION } from "VersionControl/Scripts/CustomerIntelligenceConstants";
import { publishEvent, TelemetryEventData } from "VSS/Telemetry/Services";

import domElem = Utils_UI.domElem;
import delegate = Utils_Core.delegate;
import TfsContext = TFS_Host_TfsContext.TfsContext;

class AdminOption {
    public text: string;
    public value: boolean;
    public originalValue: boolean;
    public key: string;
    public usesSettingsService: boolean;

    constructor(context: any) {
        this.text = context.text;
        this.value = context.value;
        this.originalValue = context.value;
        this.key = context.key;
        this.usesSettingsService = context.usesSettingsService;
    }
}

interface RepositoryOption extends VCWebAccessContracts.VersionControlRepositoryOption {
    usesSettingsService?: boolean;
}

export class RepositoryOptionsControl extends Controls.BaseControl {

    public static enhancementTypeName: string = "tfs.versioncontrol.optionsview";

    public static OPTIONDATA: string = "option-data";

    private _infoBar: VCAdminOptionsInfoBar.OptionsInfoBar;
    private _optionsElement: JQuery;
    private _repositoryContext: RepositoryContext;
    private _savesInProgress: number;

    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: "vc-repository-option-info vertical-fill-layout"
        }, options));
    }

    public initialize() {
        super.initialize();

        // Create wrapper elements
        this._createWrapper();
    }

    public setRepositoryContext(context: RepositoryContext) {
        this._repositoryContext = context;

        // get options
        this._optionsElement.empty();
        if (context instanceof TfvcRepositoryContext) {

            getTfvcWebEditEnabled(context.getTfsContext().navigation.projectId)
                .then((enabled: boolean) => {
                    let options: RepositoryOption[] = [{
                        displayHtml: VCResources.TfvcWebEditEnabledOption,
                        key: SettingKeys.tfvcWebEditEnabled,
                        value: enabled,
                        usesSettingsService: true,
                        category: "",
                    }];
                    this._createOptionsContent(this._optionsElement, options);
                });
        }
        else {
            this._repositoryContext.getClient().beginGetRepositoryOptions(this._repositoryContext, (data: RepositoryOption[]) => {
                this._createOptionsContent(this._optionsElement, data);
            });
        }
    }

    private _createWrapper() {
        let $content: JQuery;
        let $infoBar: JQuery;

        if (this._options.header) {
            $(domElem('div'))
                .addClass('description fixed-header')
                .appendTo(this._element)
                .text(this._options.header);
        }

        $content = $(domElem('div'))
            .addClass('vc-repository-option-content')
            .addClass('fill-content')
            .appendTo(this._element);

        // Add content elements
        $(domElem('div'))
            .addClass('display-options-error-pane')
            .appendTo($content);

        $(domElem('div'))
            .addClass('content')
            .appendTo($content);

        $infoBar = $(domElem('div'))
            .addClass('vc-repository-option-actions')
            .appendTo($content);

        this._infoBar = <VCAdminOptionsInfoBar.OptionsInfoBar>Controls.BaseControl.createIn(VCAdminOptionsInfoBar.OptionsInfoBar, $infoBar);

        // Add footer
        $(domElem('div'))
            .addClass('fixed-footer')
            .appendTo(this._element);

        this._optionsElement = $content;
    }

    private _createOptionsContent($container: JQuery, options: RepositoryOption[]) {
        let $table: JQuery,
            $optionsContainer: JQuery;

        // Create options container
        $optionsContainer = $(domElem('div'))
            .addClass('options-control')
            .appendTo($container);

        $table = $(domElem('table')).addClass('options-table').appendTo($optionsContainer);

        if (options) {
            // add options rows
            $.each(options, (i: number, option: RepositoryOption) => {
                let $tr: JQuery,
                    $td: JQuery,
                    optionId = "vc-option-" + i;

                // Create the row
                $tr = $(domElem('tr'))
                    .addClass('option-row')
                    .appendTo($table);

                // add option as data to row
                $tr.data(RepositoryOptionsControl.OPTIONDATA, new AdminOption(option));

                // add value
                $td = $(domElem('td'))
                    .addClass('option-value-column')
                    .addClass('accessible')
                    .append($(domElem('input'))
                        .attr('type', 'checkbox')
                        .prop('checked', option.value)
                        .attr('id', optionId)
                        .attr('name', optionId)
                        .change(delegate(this, this._onCheckboxChanged)))
                    .appendTo($tr);

                // add displayHtml
                $td = $(domElem('td'))
                    .addClass('option-name-column')
                    .append($(domElem('label'))
                        .attr('for', optionId)
                        .html(option.displayHtml))
                    .appendTo($tr);
            });
        }
    }

    private _onCheckboxChanged(e?: Event) {
        let checked: boolean,
            suppressEvent: boolean,
            that = this,
            $checkbox: JQuery = $(e.target),
            option: AdminOption = $checkbox.closest('tr').data(RepositoryOptionsControl.OPTIONDATA);

        checked = $checkbox.prop("checked");
        suppressEvent = $checkbox.data("suppressChangeEvent") === true;

        option.value = checked;

        if (!suppressEvent && option.value !== option.originalValue) {
            $checkbox.prop("disabled", true);
            $checkbox.data("suppressChangeEvent", true);

            if (this._savesInProgress++ === 0) {
                this._handleUpdateOptionStarted();
            }

            let vcOption = <RepositoryOption>{
                key: option.key,
                value: option.value,
                usesSettingsService: option.usesSettingsService,
            };

            if (vcOption.usesSettingsService) {
                const entries: { [key: string]: any } = { [option.key]: option.value };
                setTfvcRepositorySettings(entries, this._repositoryContext.getTfsContext().navigation.projectId)
                    .then(() => { that._handleUpdateComplete($checkbox, option) },
                    (reason: any) => that._handleUpdateComplete($checkbox, option, reason));
            }
            else {
                this._repositoryContext.getClient().beginUpdateRepositoryOption(this._repositoryContext, vcOption, () => {
                    that._handleUpdateComplete($checkbox, option);
                },
                    (errorMessage) => {
                    that._handleUpdateComplete($checkbox, option, errorMessage);
                });
            }
        }
    }

    private _handleUpdateComplete($checkbox: JQuery, option: AdminOption, errorMessage?: string) {
        let that = this;

        if (errorMessage) {
            alert(errorMessage);
            $checkbox.prop("checked", !$checkbox.prop("checked"));
        }
        else {
            option.originalValue = option.value;
            this._handleUpdateOptionSuccess();
        }

        if (--this._savesInProgress === 0) {
            if (errorMessage) {
                this._handleUpdateOptionError();
            }
            else {
                this._handleUpdateOptionCompleted();
            }
        }

        $checkbox.removeAttr("disabled");
        $checkbox.data("suppressChangeEvent", false);

        let telemEvent = new TelemetryEventData(
            VERSION_CONTROL_AREA,
            ADMIN_REPOSITORY_OPTION, {
                option: option && option.key,
                value: option && option.value,
            });
        publishEvent(telemEvent);
    }

    private _handleUpdateOptionStarted() {
        this.delayExecute("updateAfterOptionUpdated", 200, false, function () {
            this._infoBar.setStatus(true, VCResources.UpdatingOptionMessage);
        });
    }

    private _handleUpdateOptionSuccess() {
        this._infoBar.setStatus(false, VCResources.OptionUpdatedSuccessfullyMessage, 0, 2000);
    }

    private _handleUpdateOptionError() {
        this._infoBar.setStatus(false);
        this._handleUpdateOptionCompleted();
    }

    private _handleUpdateOptionCompleted() {
        this.cancelDelayedFunction("updateAfterOptionUpdated");
    }

}

VSS.classExtend(RepositoryOptionsControl, TfsContext.ControlExtensions);