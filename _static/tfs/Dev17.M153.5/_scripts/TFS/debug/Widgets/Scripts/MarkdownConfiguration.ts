import BladeConfiguration = require("Dashboards/Scripts/BladeConfiguration");
import Dashboard_Shared_Contracts = require("Dashboards/Scripts/Contracts");
import Dashboards_Constants = require("Dashboards/Scripts/Generated/Constants");
import { SettingsUtilities } from "Dashboards/Scripts/SettingsUtilities";

import TFS_Dashboards_Contracts = require("TFS/Dashboards/Contracts");
import WidgetContracts = require("TFS/Dashboards/WidgetContracts");
import WidgetHelpers = require("TFS/Dashboards/WidgetHelpers");

import {RepositoryContext} from "VersionControl/Scripts/RepositoryContext";
import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");

import Controls = require("VSS/Controls");
import SDK = require("VSS/SDK/Shim");
import Utils_String = require("VSS/Utils/String");

import Base = require("Widgets/Scripts/VSS.Control.BaseWidgetConfiguration");
import MarkdownWidget = require("Widgets/Scripts/Markdown");
import Resources = require("Widgets/Scripts/Resources/TFS.Resources.Widgets");
import VCPathSelectorControl = require("Widgets/Scripts/Shared/VCPathSelectorControl");
import Widget_Telemetry = require("Widgets/Scripts/VSS.Widget.Telemetry");

export class MarkdownConfiguration
    extends Base.BaseWidgetConfiguration<Dashboard_Shared_Contracts.WidgetConfigurationOptions>
    implements WidgetContracts.IWidgetConfiguration{
    public static LengthValidationErrorMessage: string = Utils_String.format(
        Resources.Markdown_LengthValidationMessage,
        0,
        Dashboards_Constants.DashboardWidgetLimits.MaxWidgetSettingsLength);

    //Tests should operate against OM, not private fields.
    public _$customMarkdownContainer: JQuery;

    public _$documentationLink: JQuery;

    public _vccontrol: VCPathSelectorControl.PathSelectorControl;
    public _$vcContainer: JQuery;
    public _$vcSelector: JQuery;
    public _$textArea: JQuery;
    public _$customMarkdownSelector: JQuery;

    private static validPathRegularExpression: RegExp = /\.md$/i;
    private static subSectionContainerClass: string = "subsection-container";
    private static radioGroupName: string = "markdown-configuration-options";

    public _widgetConfigurationContext: WidgetContracts.IWidgetConfigurationContext;

    constructor(options?: Dashboard_Shared_Contracts.WidgetConfigurationOptions) {
        super(options);
    }

    /**
     * Called when text is entered in the textarea
     */
    public onInputChange() {
        this.updateErrorPresentation();
        if (this.isConfigurationValid()) {
            this._widgetConfigurationContext.notify(WidgetHelpers.WidgetEvent.ConfigurationChange, WidgetHelpers.WidgetEvent.Args(this._getCustomSettings()));
        }
    }

    /**
     * Determines if user input is valid
     */
    public isConfigurationValid(): boolean {
        if (this.isCustomMarkdown()){
            var length = this.getCustomContent().length;
            return (length <= Dashboards_Constants.DashboardWidgetLimits.MaxWidgetSettingsLength);
        }
        else {
            return this._vccontrol.isValid();
        }
    }

    /** Exposes the text content for internal and test consumers */
    public getCustomContent(): string{
        return this._$textArea.val();
    }

    /**
     * Ensure the UI reflects current Error state.
     */
    public updateErrorPresentation(): void {
        if (this.isCustomMarkdown()) {
            SettingsUtilities.setInputValidationState(this._$customMarkdownContainer, this.isConfigurationValid());
        }
        else {
            this._vccontrol.validate();
        }
    }

    public getConfiguration(): string{
        if (this.isCustomMarkdown()) {
            return this.getCustomContent();
        }
        else {
            return JSON.stringify(this._vccontrol.getCurrentSettings());
        }
    }

    public isCustomMarkdown(): boolean {
        return this._$customMarkdownSelector.prop("checked");
    }

    /**
     * Creates a textarea element for entering markdown
     * @returns {JQuery} The textarea element created by this function
     */
    public createTextArea($container: JQuery, settings: string, enabled: boolean = false): void {

        var idForRadioButton = "custom-markdown";

        // Add the radio button
        this._$customMarkdownSelector = $("<input>")
            .attr({
                "type": "radio",
                "id": idForRadioButton,
                "name": MarkdownConfiguration.radioGroupName
             })
            .prop("checked", enabled)
            .click(() => {
                this._$customMarkdownContainer.slideDown(200);
                this._$vcContainer.slideUp(200);
                if (this.isConfigurationValid()) {
                    this._widgetConfigurationContext.notify(WidgetHelpers.WidgetEvent.ConfigurationChange, WidgetHelpers.WidgetEvent.Args(this._getCustomSettings()));
                }
            })
            .appendTo($container);

        // Add the label for the radio button
        $("<label>")
            .attr("for", idForRadioButton)
            .text(Resources.Markdown_CustomMarkdownHeader)
            .appendTo($container);

        this._$customMarkdownContainer = $("<div />").addClass(MarkdownConfiguration.subSectionContainerClass);

        this._$textArea = $("<textarea>")
            .addClass("textbox")
            .attr("wrap", "off") // HTML5 cross-browser solution to text wrapping: http://stackoverflow.com/questions/14443262/cross-browser-nowrap-textarea
            .attr("maxlength", Dashboards_Constants.DashboardWidgetLimits.MaxWidgetSettingsLength) // Does not work for IE9
            .attr("aria-labelledby", idForRadioButton)
            .on("input", (e) => this.onInputChange())
            .val(settings) // Set text to current settings
            .appendTo(this._$customMarkdownContainer);

        this._$documentationLink = this.createDocumentationLink().appendTo(this._$customMarkdownContainer);

        if (!enabled) {
            this._$customMarkdownContainer.hide();
        }

        $container.append(this._$customMarkdownContainer);

    }

    /**
     * Construct version control section
     * @param $container parent container
     * @param settings version control path information
     * @param enabled true if this is currently enabled
     */
    public createVCControl($container: JQuery, settings: VCPathSelectorControl.VCPathInformation, enabled: boolean = false): void {

        var idForRadioButton = "select-markdown-file";

        // Add the radio button
        this._$vcSelector = $("<input>")
            .attr({
                "type": "radio",
                "id": idForRadioButton,
                "name": MarkdownConfiguration.radioGroupName
            })
            .prop("checked", enabled)
            .click(() => {
                this._$vcContainer.slideDown(200);
                this._$customMarkdownContainer.slideUp(200);
                if (this.isConfigurationValid()) {
                    this._widgetConfigurationContext.notify(WidgetHelpers.WidgetEvent.ConfigurationChange, WidgetHelpers.WidgetEvent.Args(this._getCustomSettings()));
                }
            })
            .appendTo($container);

        // Add the label for the radio button
        $("<label>")
            .attr("for", idForRadioButton)
            .text(Resources.Markdown_SelectMarkdown)
            .appendTo($container);

        this._$vcContainer = $("<div />").addClass(MarkdownConfiguration.subSectionContainerClass);

        this._vccontrol = <VCPathSelectorControl.PathSelectorControl>Controls.BaseControl.createIn<VCPathSelectorControl.VCPathSelectorOptions>(
            VCPathSelectorControl.PathSelectorControl,
            this._$vcContainer,
            {
                initialValue: settings,
                onChange: () => this.onInputChange(),
                filter: this.filterVCItems,
                onBeforeSelect: (tag) : boolean => {
                    if (tag instanceof RepositoryContext) {
                        return false;
                    }
                    else {
                        return MarkdownConfiguration.isValidFile((<VCLegacyContracts.ItemModel>tag).serverItem);
                    }
                },
                clickToggles: true,
                customWatermark: Resources.Markdown_SelectMarkdown + "...",
                customErrorMessage: Resources.Markdown_VC_SelectFileErrorNoFileSelected,
                pathSelectionValidator: MarkdownConfiguration.isValidFile
           }
        );

        if (!enabled) {
            this._$vcContainer.hide();
        }

        this._$vcContainer.appendTo($container);

    }

    public filterVCItems(item: VCLegacyContracts.ItemModel): boolean {
        return item.isFolder || MarkdownConfiguration.isValidFile(item.serverItem);
    }

    /**
     * Test that the file path is valid and matches markdown pattern
     * @param path file path
     */
    public static isValidFile(path: string): boolean {
        return path.search(MarkdownConfiguration.validPathRegularExpression) > 0;
    }

    /**
     * Creates a documentation link
     * @returns {JQuery} The paragraph with documentation link
     */
    public createDocumentationLink(): JQuery {
        var $documentationLink = $("<p>");

        var link = $("<a>");
        link.attr("href", Resources.Markdown_LearnLinkUrl);
        link.attr("target", "_blank");
        link.text(Resources.Markdown_LearnLinkText);
        $documentationLink.append(link);

        var icon = $("<span class='bowtie-icon bowtie-navigate-external'></span>");
        icon.attr("title", Resources.Markdown_LearnLinkText);
        $documentationLink.append(icon);

        return $documentationLink;
    }

    /**
     * Extends options for control with style enhancements, called by base control during initialization
     * @param {any} options for the control.
     */
    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: "markdownconfiguration-container"
        }, options));
    }

    /**
    * The widget control being initialized.
    */
    public initialize() {
        super.initialize();
        this.getElement().addClass(Dashboards_Constants.BowTieClassNames.Bowtie);
    }

    /**
     * @implements {WidgetContracts.IWidgetConfiguration}
     */
    public load(widgetSettings: WidgetContracts.WidgetSettings,
        widgetConfigurationContext: WidgetContracts.IWidgetConfigurationContext): IPromise<WidgetContracts.WidgetStatus> {

        this._widgetConfigurationContext = widgetConfigurationContext;

        var vcsettings = <VCPathSelectorControl.VCPathInformation>{};
        var customMarkdown = "";
        var customMarkdownEnabled = true;
        var vcEnabled = false;

        var rawsettings = widgetSettings.customSettings;
        vcsettings = MarkdownWidget.MarkdownWidget.parseVCPathInformation(rawsettings.data);
        if (vcsettings != null) {
            vcEnabled = true;
            customMarkdownEnabled = false;
        }else{
            customMarkdown = MarkdownWidget.MarkdownWidget.getDefaultSettings(rawsettings.data);
        }

        this.createTextArea(this.getElement(), customMarkdown, customMarkdownEnabled);

        this.createVCControl(this.getElement(), vcsettings, vcEnabled);

        return WidgetHelpers.WidgetStatusHelper.Success();
    }

    public _getCustomSettings(): WidgetContracts.CustomSettings {
        return { data:this.getConfiguration() };
    }

    /**
     * @implements {WidgetContracts.IWidgetConfiguration}
     */
    public onSave(): IPromise<WidgetContracts.SaveStatus> {
        this.updateErrorPresentation();

        if (this.isConfigurationValid()) {
            return WidgetHelpers.WidgetConfigurationSave.Valid(this._getCustomSettings());
        } else {
            return WidgetHelpers.WidgetConfigurationSave.Invalid();
        }
    }

    /**
     * @implements {WidgetContracts.IWidgetConfiguration}
     */
    public onSaveComplete(): void {

        // Create the property payload
        var properties: IDictionaryStringTo<any> = {
            "ContentLengthCharacters": this.getCustomContent().length,
            "BackedByVC": !this.isCustomMarkdown()
        }

        // Publish
        Widget_Telemetry.WidgetTelemetry.onConfigurationSave(this.getWidgetTypeId(), properties);
    }
}
SDK.VSS.register("dashboards.markdownConfiguration", () => MarkdownConfiguration);
SDK.registerContent("dashboards.markdownConfiguration-init", (context) => {
    return Controls.create(MarkdownConfiguration, context.$container, context.options);
});
