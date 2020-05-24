import Agile_Utils = require("Agile/Scripts/Common/Utils");
import Agile = require("Agile/Scripts/Common/Agile");

import Cards = require("Agile/Scripts/Card/Cards");
import Identities_Picker_Controls = require("VSS/Identities/Picker/Controls");
import { RichContentTooltip } from "VSS/Controls/PopupContent";

import Utils_Array = require("VSS/Utils/Array");
import Utils_Date = require("VSS/Utils/Date");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import Locations = require("VSS/Locations");

import TFS_OM_Identities = require("Presentation/Scripts/TFS/TFS.OM.Identities");
import TFS_UI_Controls_Identities = require("Presentation/Scripts/TFS/TFS.UI.Controls.Identities");

import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import WITResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import { WiqlOperators } from "WorkItemTracking/Scripts/OM/WiqlOperators";
import { BacklogConfigurationService, BacklogFieldTypes } from "Presentation/Scripts/TFS/FeatureRef/BacklogConfiguration/Service";

/**
* gets the core fields for the WIT Card
* @param string The effort field in the specific context
* @returns string[] core fields array
*/
export function getCoreFieldNames(effortFieldName?: string): string[] {

    var coreFields: string[];
    if (effortFieldName) {
        coreFields = [Agile_Utils.DatabaseCoreFieldRefName.Id, Agile_Utils.DatabaseCoreFieldRefName.Title, Agile_Utils.DatabaseCoreFieldRefName.AssignedTo, effortFieldName, Agile_Utils.DatabaseCoreFieldRefName.Tags];
    } else {
        coreFields = [Agile_Utils.DatabaseCoreFieldRefName.Id, Agile_Utils.DatabaseCoreFieldRefName.Title, Agile_Utils.DatabaseCoreFieldRefName.AssignedTo, Agile_Utils.DatabaseCoreFieldRefName.Tags];
    }
    return coreFields;
}

export function isCoreField(fieldRefName: string, effortFieldName?: string): boolean {

    var coreFields = getCoreFieldNames(effortFieldName);
    return Utils_Array.contains(coreFields, fieldRefName, Utils_String.ignoreCaseComparer);
}

export function applyEllipsis($titleElement: JQuery, $clickableTitle: JQuery): RichContentTooltip {
    //we need to apply ellipsis at the end of the text area if the title runs more than it's container (meaning that it is greater than 2 lines)
    var differenceThreshold = 2;
    if (Math.abs($titleElement.outerHeight() - $clickableTitle.outerHeight()) > differenceThreshold) {
        if ($titleElement.children(".multi-line-ellipsis").length === 0) {
            var $dotDiv = $("<div>...</div>");
            $dotDiv.addClass("multi-line-ellipsis");
            $titleElement.append($dotDiv);
        }

        // Add tooltip since title is ellipsised 
        return RichContentTooltip.add($clickableTitle.text(), $clickableTitle);
    }
    else if ($titleElement.children(".multi-line-ellipsis").length !== 0) {
        $titleElement.children(".multi-line-ellipsis").remove()
        return null;
    }
}

export function populateFieldSettings(fields: Cards.ICardFieldSetting[], effortField: string, orderField: string, isAdvancedBacklogFeatures: boolean, getFieldDefinition: IFunctionPR<string, Cards.CardFieldDefinition>): void {
    fields.forEach((fieldSetting: Cards.ICardFieldSetting) => {
        var fieldDefinition: Cards.CardFieldDefinition;
        var fieldIdentifier = fieldSetting[Cards.CardSettings.FIELD_IDENTIFIER];
        if (fieldIdentifier) {
            fieldDefinition = getFieldDefinition(fieldIdentifier);
        }
        if (fieldDefinition) {
            var isEditable = isFieldEditable(fieldDefinition, effortField, orderField, isAdvancedBacklogFeatures);
            if (isEditable) {
                fieldSetting["isEditable"] = isEditable.toString();
            }
        }
        else {
            fieldSetting["isEditable"] = isAdvancedBacklogFeatures.toString();
        }
    });
}

export function shouldRenderAsCoreField(fieldSettings: Cards.ICardFieldSetting, coreFields: string[]): boolean {
    return _isNotDisplayType(fieldSettings, coreFields, Cards.CardFieldDisplayType.ADDITIONAL);
}

export function shouldRenderAsAdditionalField(fieldSettings: Cards.ICardFieldSetting, coreFields: string[]): boolean {
    return _isNotDisplayType(fieldSettings, coreFields, Cards.CardFieldDisplayType.CORE);
}

/**
    * Creates html element for the identity view based on the format provided
    * @param value  The value for which identity view is to be generated
    * @param format  Display format for identity view
    * @param size  The size of the image, it is optinal
    * @return string The identity view html
    */
export function buildIdentityViewHtml(value: string, format?: Cards.CardFieldDisplayFormats.AssignedToFieldFormats, size?: number): string {
    var assignedToFormats = Cards.CardFieldDisplayFormats.AssignedToFieldFormats;
    var showImage = (format !== assignedToFormats.FullName);
    var $identityViewElement: JQuery;

    $identityViewElement = TFS_UI_Controls_Identities.IdentityViewControl.getIdentityViewElement(value, { showImage: showImage, size: size });
    if (format === assignedToFormats.AvatarOnly) {
        $identityViewElement.find("span").addClass("avatar-only");;
    }
    $identityViewElement.find("span").addClass("ellipsis");
    return $identityViewElement.html();
}

function _isNotDisplayType(fieldSettings: Cards.ICardFieldSetting, coreFields: string[], displayType: Cards.CardFieldDisplayType): boolean {
    var condition = false;
    var fieldDisplayType = getFieldDisplayType(fieldSettings, coreFields);
    if (fieldDisplayType !== null && fieldDisplayType !== displayType) {
        condition = true;
    }
    return condition;
}

export function getFieldDisplayType(fieldSettings: Cards.ICardFieldSetting, coreFields: string[]): Cards.CardFieldDisplayType {
    var fieldDisplayType: Cards.CardFieldDisplayType = null;

    if (Utils_String.ignoreCaseComparer(fieldSettings[Cards.CardSettings.FIELD_IDENTIFIER], "") !== 0) {
        if (fieldSettings && fieldSettings[Cards.CardSettings.FIELD_DISPLAY_TYPE]) {
            fieldDisplayType = Cards.CardFieldDisplayType[fieldSettings[Cards.CardSettings.FIELD_DISPLAY_TYPE].toUpperCase()];
        } else if (Utils_Array.contains(coreFields, fieldSettings[Cards.CardSettings.FIELD_IDENTIFIER], Utils_String.ignoreCaseComparer)) {
            fieldDisplayType = Cards.CardFieldDisplayType.CORE;
        } else {
            fieldDisplayType = Cards.CardFieldDisplayType.ADDITIONAL;
        }
    }
    return fieldDisplayType;
}

export function initializeFieldDefinitions(fieldDefinitions: any, fieldDefMap: IDictionaryStringTo<Cards.WitCardFieldDefinition>): void {
    $.map(fieldDefinitions, (fieldData: any, index: number) => {
        var fieldDef = new Cards.WitCardFieldDefinition(fieldData.ReferenceName, fieldData.Name, fieldData.Type, fieldData.IsEditable, fieldData.IsIdentity);
        fieldDefMap[fieldData.ReferenceName.toUpperCase()] = fieldDef;
    });
}

export function constructFieldDefinitionMap(fields: Cards.ICardFieldSetting[], getFieldDefinition: IFunctionPR<string, Cards.CardFieldDefinition>): IDictionaryStringTo<Cards.CardFieldDefinition> {
    var fieldDefinitionMap: IDictionaryStringTo<Cards.CardFieldDefinition> = {};
    fields.forEach((fieldSetting: Cards.ICardFieldSetting) => {
        var fieldIdentifier = fieldSetting[Cards.CardSettings.FIELD_IDENTIFIER].toUpperCase();
        var fieldDefinition = getFieldDefinition(fieldIdentifier);
        fieldDefinitionMap[fieldIdentifier] = fieldDefinition;
    });

    return fieldDefinitionMap;
}

/**
* Build a date object with the specified object. 
* As of now, number and string types are recognized.
* 
* @param value The value to be converted to a Date object
* @param localized Optional param to indicate if the string date value passed in is in users locale format/UTC
*/
export function buildDate(value: Date | number | string, localized?: boolean): Date {
    var date: Date = null;
    if (value instanceof Date) {
        date = value;
    } else if (typeof value === "number") {
        date = new Date(value);
    } else if (typeof value === "string") {
        var dateString: string = value;
        dateString = $.trim(dateString);
        if (Utils_String.startsWith(dateString, WiqlOperators.MacroToday, Utils_String.ignoreCaseComparer)) {
            dateString = dateString.replace(/\s/g, "");
            dateString = dateString.substr(WiqlOperators.MacroToday.length);

            // The macro can be as follows : @Today , @Today + Days , @Today - Days
            if (dateString === "") {
                date = new Date();
            }
            else {
                var match = dateString.match(/([+-])(\d+)/);
                if (match) {
                    var addedDays: number = parseInt(match[2]);
                    if (match[1] === "-") {
                        addedDays *= -1;
                    }
                    date = new Date();
                    date = Utils_Date.addDays(date, addedDays, true /* fix offset for DST*/);
                }
            }
            if (date) {
                date = Utils_Date.convertClientTimeToUserTimeZone(date, true);
            }
        }
        else {
            if (localized) {
                date = Utils_Date.parseDateString(value, undefined, true);
            }
            else {
                date = new Date(dateString);
            }
        }
    }

    return date;
}

/**
    * Helper method to check if the field is part of �not so useful� fields for card customization and card colouring.
    * This is a UX only filtering and blacklisted fields can still be added to card configuration via REST API's
    * If any field needs to be blacklisted from selection on Card Fields and Styling dialogs Add them to the list below.
    * 
    * @param fieldReferenceName Reference name of the field to be checked for blacklisting
    * @return True if the field is blacklisted, false otherwise
    */
export function isFieldBlackListed(fieldReferenceName: string): boolean {

    if (!fieldReferenceName) {
        return false;
    }

    //blacklist Order type field       
    var orderField = BacklogConfigurationService.getBacklogFieldName(BacklogFieldTypes.Order);
    if (Utils_String.ignoreCaseComparer(orderField, fieldReferenceName) === 0) {
        return true;
    }

    switch (fieldReferenceName.toLowerCase()) {
        case WITConstants.CoreFieldRefNames.AreaId.toLowerCase():
        case WITConstants.CoreFieldRefNames.IterationId.toLowerCase():
        case WITConstants.CoreFieldRefNames.Rev.toLowerCase():
        case WITConstants.CoreFieldRefNames.RevisedDate.toLowerCase():
        case WITConstants.CoreFieldRefNames.NodeName.toLowerCase():
        case WITConstants.CoreFieldRefNames.TeamProject.toLowerCase():
        case WITConstants.CoreFieldRefNames.Watermark.toLowerCase():
        case WITConstants.CoreFieldRefNames.ExternalLinkCount.toLowerCase():
        case WITConstants.CoreFieldRefNames.HyperLinkCount.toLowerCase():
        case WITConstants.CoreFieldRefNames.RelatedLinkCount.toLowerCase():
        case WITConstants.CoreFieldRefNames.AttachedFileCount.toLowerCase():
        case WITConstants.CoreFieldRefNames.AuthorizedAs.toLowerCase():
        case WITConstants.CoreFieldRefNames.AuthorizedDate.toLowerCase():
            return true;
        default:
            return false;
    }
}

export function getBoolShowEmptyFieldsFromString(value: string, defaultValue: boolean): boolean {
    var showEmptyFields = defaultValue;
    if (value) {
        switch (value.toLowerCase()) {
            case "true":
                showEmptyFields = true;
                break;
            case "false":
                showEmptyFields = false;
                break;
        }
    }

    return showEmptyFields;
}

export function shouldFocusOnCardAfterEdit(id: number, field: string, e: JQueryKeyEventObject, discard: boolean): boolean {
    var focus = false;
    // if we need to create a new tile, this tile should not get focus on edit completion
    // in other cases, we should attempt to focus back on the tile if user has pressed Enter, Tab or Esc
    if (!discard && shouldCreateNewCardAfterEdit(id, field, e)) {
        focus = false;
    }
    else {
        focus = true;
    }

    return focus;
}

export function shouldCreateNewCardAfterEdit(id: number, field: string, e: JQueryKeyEventObject): boolean {
    return (id < 0 && Utils_String.ignoreCaseComparer(field, Agile_Utils.DatabaseCoreFieldRefName.Title) === 0 && e && e.keyCode === Utils_UI.KeyCode.ENTER);
}

export function isFieldEditable(fieldDefinition: Cards.CardFieldDefinition, effortFieldName: string, orderFieldName: string, isAdvancedBacklog: boolean): boolean {
    var isFieldEditable = isAdvancedBacklog;
    if (isFieldEditable) {
        var fieldRefName = fieldDefinition.referenceName();

        // Order field (StackRank) and ChangedBy field should not be editable
        if ((Utils_String.ignoreCaseComparer(orderFieldName, fieldRefName) === 0) || (Utils_String.ignoreCaseComparer(Agile_Utils.DatabaseCoreFieldRefName.ChangedBy, fieldRefName) === 0)) {
            isFieldEditable = false;
        }
        if (isFieldEditable) {
            isFieldEditable = fieldDefinition.isEditable()
                && _isFieldTypeEditSupported(fieldDefinition.type());
        }
    }
    return isFieldEditable;
}

/**
 *  Creates common options used to render the Identity display control
 * 
 * @param user  The user for whom the control is being rendered
 * @param size  The size of the avatar in the control 
 * @param displayType  The displayType determines what is shown in the control (Avatar+Text, Avatar only etc)
 * @return The control options
 */
export function setupCommonIdentityDisplayControlOptions(user: TFS_OM_Identities.IIdentityReference,
    size?: Identities_Picker_Controls.IdentityPickerControlSize,
    displayType?: Identities_Picker_Controls.EDisplayControlType): Identities_Picker_Controls.IIdentityDisplayOptions {

    var options: Identities_Picker_Controls.IIdentityDisplayOptions = {
        identityType: { User: true, Group: true },
        operationScope: { Source: true, IMS: true },
        item: (user && (user.uniqueName || user.displayName)) || Identities_Picker_Controls.EntityFactory.createStringEntity(WITResources.AssignedToEmptyText, Locations.urlHelper.getVersionedContentUrl("notassigned-user.svg")),
        size: size || Identities_Picker_Controls.IdentityPickerControlSize.Small,
        displayType: displayType || Identities_Picker_Controls.EDisplayControlType.AvatarText,
        friendlyDisplayName: (user && user.displayName) || WITResources.AssignedToEmptyText,
        turnOffHover: true, /* no contact card on hover */
        consumerId: Agile.IdentityControlConsumerIds.CardFieldDisplayControl
    };

    return options;
}

function _isFieldTypeEditSupported(fieldType: Cards.CardFieldType): boolean {
    var isEditable = false;
    switch (fieldType) {
        case Cards.CardFieldType.Boolean:
        case Cards.CardFieldType.Double:
        case Cards.CardFieldType.Guid:
        case Cards.CardFieldType.Identity:
        case Cards.CardFieldType.Integer:
        case Cards.CardFieldType.PlainText:
        case Cards.CardFieldType.String:
        case Cards.CardFieldType.DateTime:
        case Cards.CardFieldType.TreePath:
            isEditable = true;
            break;

        case Cards.CardFieldType.Html:
            isEditable = false;
            break;
    }
    return isEditable;
}
