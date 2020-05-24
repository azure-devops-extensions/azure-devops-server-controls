import * as Constants from "Dashboards/Scripts/Generated/Constants";
import * as TFS_Dashboards_Resources from "Dashboards/Scripts/Resources/TFS.Resources.Dashboards";
import { ErrorMessageControl, ErrorMessageControlOptions } from "Dashboards/Scripts/ErrorMessageControl";
import Dashboard_Shared_Contracts = require("Dashboards/Scripts/Contracts");
import TFS_Dashboards_Common = require("Dashboards/Scripts/Common");
import TFS_Dashboards_WidgetContracts = require("TFS/Dashboards/WidgetContracts");
import { MoreInfoControl, MoreInfoOptions } from "Presentation/Scripts/TFS/TFS.UI.Controls.MoreInfoControl";

import * as Utils_String from "VSS/Utils/String";
import { Control } from "VSS/Controls";

/** Options for the creation of configuration labels */
export interface ConfigurationLabelOptions {
    /* The text for the label itself */
    labelText: string;

    /* The text for the tooltip next to the config label */
    tooltipText?: string;

    /* DOM Id */
    id?: string;
}

/**
 * Give some utilities method to be shared between general and custom settings
 */
export class SettingsUtilities {

    /**
     * Creates a label as used for widget configuration fields and returns the containing element.
     * <div>
     *   <label />
     *   <MoreInfoControl />
     * </div>
     */
    public static createConfigurationLabel(options: ConfigurationLabelOptions): JQuery {

        let $label = $("<label>")
            .text(options.labelText);

        if (options.id) {
            $label.attr('id', options.id);
        }

        let $labelcontainer = $("<div>")
            .addClass("configuration-label-container")
            .append($label);

        if (options.tooltipText) {
            const tooltipAriaLabelText = Utils_String.format(TFS_Dashboards_Resources.Configuration_MoreInfoLabelFormat, options.labelText);

            Control.create<MoreInfoControl<MoreInfoOptions>, MoreInfoOptions>(MoreInfoControl, $labelcontainer, {
                tooltipText: options.tooltipText,
                ariaLabelText: tooltipAriaLabelText
            });
        } 
                
        return $labelcontainer;
    }
    
    /**
     * Set the input with or without an error class
     * @param {JQuery} input - The fieldSet that contain the input that is evaluating
     * @param {boolean} isValid - True if valid, False when invalid
     */
    public static setInputValidationState(fieldSet: JQuery, isValid: boolean) {
        if (isValid) {
            fieldSet.removeClass(ErrorMessageControl.CssConfigurationErrorClass);
        } else {
            fieldSet.addClass(ErrorMessageControl.CssConfigurationErrorClass);
        }
    }

    /**
     * check if the custom settings have changed. This will happen if the data payload has changed, or the payload remains the same
     * but the version changes. 
     * @param currentSettings current settings to compare against. 
     * @param newSettings new settings to compare with
     */
    public static isCustomSettingsUnchanged(
        currentSettings: TFS_Dashboards_WidgetContracts.CustomSettings,
        newSettings: TFS_Dashboards_WidgetContracts.CustomSettings): boolean {
        let areBothSameData = Utils_String.localeIgnoreCaseComparer(newSettings.data, currentSettings.data) == 0;
        let areSameVersion = newSettings.version &&
            currentSettings.version &&
            TFS_Dashboards_Common.SemanticVersionExtension.verifyVersionsEqual(newSettings.version, currentSettings.version);
        let areBothDefaultVersion =
            (newSettings.version == null || TFS_Dashboards_Common.SemanticVersionExtension.isInitialVersion(newSettings.version)) &&
            (currentSettings.version == null || TFS_Dashboards_Common.SemanticVersionExtension.isInitialVersion(currentSettings.version));

        return areBothSameData && (areBothDefaultVersion || areSameVersion);
    }

    /**
     * check if the general settings have changed. This will happen if the size or name has changed. 
     * @param currentSettings current settings to compare against. 
     * @param newSettings new settings to compare with
     */
    public static areGeneralSettingsEqual(
        currentSettings: Dashboard_Shared_Contracts.IGeneralSettings,
        newSettings: Dashboard_Shared_Contracts.IGeneralSettings): boolean {
        let sameSize = newSettings.WidgetSize.columnSpan === currentSettings.WidgetSize.columnSpan &&
            newSettings.WidgetSize.rowSpan === currentSettings.WidgetSize.rowSpan;
        let sameName = Utils_String.localeIgnoreCaseComparer(newSettings.WidgetName, currentSettings.WidgetName) == 0;

        return sameSize && sameName;
    }
}