import AdminCommonBowtieControls = require("Admin/Scripts/Common/BowtieControls");
import AdminCommonRadioSelection = require("Admin/Scripts/Common/RadioSelection");
import ColorPicker = require("Presentation/Scripts/TFS/TFS.UI.Controls.ColorPicker");
import Combos = require("VSS/Controls/Combos");
import Controls = require("VSS/Controls");
import PresentationResources = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");

/**
 * Creates label and combo input
 */
export function createCombo(
    $container: JQuery, id: string, label: string, onChange: (string, number) => void, source: string[] = [], initialValue: string = null)
    : AdminCommonBowtieControls.ComboWithErrorMessage {
    var $fieldSet = $("<fieldset>");
    $fieldSet.append(`<label for="${id}_txt">${label}</label>`);
    var control: AdminCommonBowtieControls.ComboWithErrorMessage;

    var options: Combos.IComboOptions = {
        id: id,
        source: source,
        allowEdit: false,
        maxAutoExpandDropWidth: 200,
        change: () => onChange(control.getText(), control.getSelectedIndex()),
        value: initialValue,
        setTitleOnlyOnOverflow: true
    };

    control = <AdminCommonBowtieControls.ComboWithErrorMessage>Controls.BaseControl.createIn(AdminCommonBowtieControls.ComboWithErrorMessage, $fieldSet, options);

    $container.append($fieldSet);

    return control;
}

/**
 * Creates label and text input
 */
export function createTextInput(
    $container: JQuery, id: string, label: string, maxLength: number, onChange: (string) => void): AdminCommonBowtieControls.ComboWithErrorMessage {
    var $fieldSet = $("<fieldset>");
    $fieldSet.append(`<label for="${id}_txt">${label}</label>`);
    var control: AdminCommonBowtieControls.ComboWithErrorMessage;

    var options: Combos.IComboOptions = {
        mode: "text",
        id: id,
        change: () => onChange(control.getText()),
        setTitleOnlyOnOverflow: true
    };

    control = <AdminCommonBowtieControls.ComboWithErrorMessage>Controls.BaseControl.createIn(AdminCommonBowtieControls.ComboWithErrorMessage, $fieldSet, options);
    control.getInput().attr("maxLength", maxLength);

    $container.append($fieldSet);

    return control;
}

/**
 * Creates legend and radio selection
 */
export function createRadioSelection<TSelection>(
    $container: JQuery, legend: string, radioOptions: AdminCommonRadioSelection.IRadioSelectionOptions<TSelection>):
    AdminCommonRadioSelection.RadioSelection<TSelection> {
    var $fieldSet = $("<fieldset>");
    if (legend != null && legend.length > 0) {
        $fieldSet.append(`<legend>${legend}</legend>`);
    }

    var control = new AdminCommonRadioSelection.RadioSelection<TSelection>($fieldSet, radioOptions);
    $container.append($fieldSet);

    return control;
}

/**
 * Creates legend and checkbox
 */
export function createCheckBox<TSelection>($container: JQuery, id: string, legend: string, text: string, onChange?: (boolean) => void):
    AdminCommonBowtieControls.CheckBox {

    var options: AdminCommonBowtieControls.ICheckBoxOptions = {
        id: id,
        text: text,
        legend: legend
    };
    return new AdminCommonBowtieControls.CheckBox($container, options, onChange);
}

/**
 * Creates radio selection without a legend
 */
export function createRadioSelectionWithoutLegend<TSelection>(
    $container: JQuery, radioOptions: AdminCommonRadioSelection.IRadioSelectionOptions<TSelection>):
    AdminCommonRadioSelection.RadioSelection<TSelection> {
    return createRadioSelection<TSelection>($container, null, radioOptions);
}

/**
 * Creates label and primitive text area
 */
export function createPrimitiveTextArea(
    $container: JQuery, id: string, label: string, maxLength: number, rows: number, onChange: (string) => void): JQuery {
    var $fieldSet = $("<fieldset>");
    $fieldSet.append(`<label for="${id}">${label}</label>`);

    var $textArea: JQuery = $(`<textarea id="${id}" class="process-common-textarea" rows="${rows}" maxlength= "${maxLength}"></textarea>`)
        .appendTo($fieldSet);

    $container.append($fieldSet);
    $textArea.on("input propertychange", () => onChange($textArea.val()));

    return $textArea;
}

/**
 * Creates label and input for color
 */
export function createColorInput($container: JQuery, label: string, defaultColor: string, onChange: (string) => void):
    ColorPicker.DefinedPaletteColorPickerControl {
    var $fieldSet = $("<fieldset>");
    $fieldSet.append(`<label>${label}</label>`);

    var options = <ColorPicker.DefinedPaletteColorPickerControlOptions>{
        tagName: "div",
        template: ColorPicker.PaletteTemplate.Full,
        onColorSelected: (source: ColorPicker.IColorPickerControl, color: ColorPicker.AccessibilityColor) => onChange(color.asHex().replace('#', '')),
        defaultColor: new ColorPicker.AccessibilityColor(defaultColor),
        allowNonPaletteDefaultColor: true
    };

    var colorControl = <ColorPicker.DefinedPaletteColorPickerControl>Controls.Control.createIn
        <ColorPicker.DefinedPaletteColorPickerControlOptions>(ColorPicker.DefinedPaletteColorPickerControl, $fieldSet, options);

    $fieldSet.find('label').click(() => colorControl.getElement().find('.color-picker-combo').focus());
    $container.append($fieldSet);

    return colorControl;
}

/**
 * Creates learn more link block (for stuff like dialogs)
 */
export function createLearnMoreLinkBlock($container: JQuery, learnMoreUrl: string, title?: string, ariaLabel?: string): JQuery {
    const $infoContainer = $(
        `<div class="form-section"><p><a href="${learnMoreUrl}" target="_blank" rel="external">${
        PresentationResources.LearnMore
        }</a></p></div>`).appendTo($container);
    if (title != null) {
        $infoContainer.find("a").attr("title", title);
    }
    if (ariaLabel != null) {
        $infoContainer.find("a").attr("aria-label", ariaLabel);
    }

    return $infoContainer;
}
