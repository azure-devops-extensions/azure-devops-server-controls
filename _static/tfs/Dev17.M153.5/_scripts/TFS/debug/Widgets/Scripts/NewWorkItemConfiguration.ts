import Q = require("q");

import Dashboard_Shared_Contracts = require("Dashboards/Scripts/Contracts");
import { SettingsField } from "Dashboards/Scripts/SettingsField";

import WidgetContracts = require("TFS/Dashboards/WidgetContracts");
import WidgetHelpers = require("TFS/Dashboards/WidgetHelpers");

import Controls = require("VSS/Controls");
import SDK = require("VSS/SDK/Shim");
import Combos = require("VSS/Controls/Combos");

import Base = require("Widgets/Scripts/VSS.Control.BaseWidgetConfiguration");
import NewWorkItemWidget = require("Widgets/Scripts/NewWorkItem");
import Widgets_Resources = require("Widgets/Scripts/Resources/TFS.Resources.Widgets");
import Widget_Telemetry = require("Widgets/Scripts/VSS.Widget.Telemetry");

export class NewWorkItemConfiguration
    extends Base.BaseWidgetConfiguration<Dashboard_Shared_Contracts.WidgetConfigurationOptions>
    implements WidgetContracts.IWidgetConfiguration{

    public _widgetConfigurationContext: WidgetContracts.IWidgetConfigurationContext;
    private workItemTypeCombo: Combos.Combo;
    private workItemTypeField: SettingsField<Controls.Control<any>>;
    public _workItemTypeList: string[];
    public _defaultWorkItemType: string;

    constructor(options?: Dashboard_Shared_Contracts.WidgetConfigurationOptions) {
        super(options);
    }

    /**
     * Determines if user input is valid
     */
    public isConfigurationValid(): boolean {
        return (this._workItemTypeList.indexOf(this.workItemTypeCombo.getText()) > -1);
    }

    /**
     * Extends options for control with style enhancements, called by base control during initialization
     * @param {any} options for the control.
     */
    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: "newworkitemconfiguration-container"
        }, options));
    } 
    
    /**
    * The widget control being initialized.
    */
    public initialize() {
        super.initialize();
    }

    /**
     * @implements {WidgetContracts.IWidgetConfiguration}
     */
    public load(widgetSettings: WidgetContracts.WidgetSettings,
        widgetConfigurationContext: WidgetContracts.IWidgetConfigurationContext): IPromise<WidgetContracts.WidgetStatus> {

        this._widgetConfigurationContext = widgetConfigurationContext;

        this._defaultWorkItemType = NewWorkItemWidget.NewWorkItemWidget.parseWorkItemTypeFromSettings(widgetSettings);

        var $workItemTypeComboContainer = $("<div>");
        this.workItemTypeCombo = <Combos.Combo>Controls.BaseControl.createIn(Combos.Combo, $workItemTypeComboContainer, {
            cssClass: "new-work-item-config",
            inputCss: "new-work-item-config-input",
            change: () => {
                if (this.isConfigurationValid()) {
                    this._defaultWorkItemType = this.workItemTypeCombo.getText();
                    this._widgetConfigurationContext.notify(WidgetHelpers.WidgetEvent.ConfigurationChange, WidgetHelpers.WidgetEvent.Args(this._getCustomSettings()));
                }
                this.workItemTypeField.hideError();
            },
            allowEdit: false
        });

        this.workItemTypeField = SettingsField.createSettingsFieldForJQueryElement({
            labelText: Widgets_Resources.NewWorkItem_DefaultTypeText,
            initialErrorMessage: Widgets_Resources.NewWorkItem_DefaultTypeError,
        }, $workItemTypeComboContainer, null);
        this.getElement().append(this.workItemTypeField.getElement());

        return NewWorkItemWidget.NewWorkItemWidget.getWorktItemTypeNames(new NewWorkItemWidget.ProjectWrapper(), this.tfsContext.project.id)
            .then((list) => {
                this.workItemTypeCombo.setSource(list);
                this._workItemTypeList = list;
                NewWorkItemWidget.NewWorkItemWidget.setDefaultWorkItemType(this._defaultWorkItemType, this._workItemTypeList, this.workItemTypeCombo);
                this._defaultWorkItemType = this.workItemTypeCombo.getText();                
                return WidgetHelpers.WidgetStatusHelper.Success();
            },
            ((e) => {
                return WidgetHelpers.WidgetStatusHelper.Failure(e);
            }));
    }

    public _getCustomSettings(): WidgetContracts.CustomSettings {
        return {
            data:
            JSON.stringify(<NewWorkItemWidget.INewWorkItemConfiguration>{
                defaultWorkItemType: this._defaultWorkItemType
            })
        };
    }

    /**
     * @implements {WidgetContracts.IWidgetConfiguration}
     */
    public onSave(): IPromise<WidgetContracts.SaveStatus> {
        
        if (this.isConfigurationValid()) {
            return WidgetHelpers.WidgetConfigurationSave.Valid(this._getCustomSettings());
        } else {
            this.workItemTypeField.showError();
            return WidgetHelpers.WidgetConfigurationSave.Invalid();
        }
    }

    /**
     * @implements {WidgetContracts.IWidgetConfiguration}
     */
    public onSaveComplete(): void {

        // Create the property payload
        var properties: IDictionaryStringTo<any> = {
            "DefaultWorkItemType": this._defaultWorkItemType
        }

        // Publish
        Widget_Telemetry.WidgetTelemetry.onConfigurationSave(this.getWidgetTypeId(), properties);
    }

}
SDK.VSS.register("dashboards.newWorkItemConfiguration", () => NewWorkItemConfiguration);
SDK.registerContent("dashboards.newWorkItemConfiguration-init", (context) => {
    return Controls.create(NewWorkItemConfiguration, context.$container, context.options);
});
