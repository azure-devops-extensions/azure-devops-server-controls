/// <amd-dependency path='VSS/LoaderPlugins/Css!VersionControlControls' />

import Utils_Clipboard = require("VSS/Utils/Clipboard");
import Controls = require("VSS/Controls");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");
import Utils_UI = require("VSS/Utils/UI");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");

import delegate = Utils_Core.delegate;
import domElem = Utils_UI.domElem;
import TfsContext = TFS_Host_TfsContext.TfsContext;

/**
 * An interface representing the key/value pair to be toggled by this control.
 */
export interface MultipleToggleKeyValue {
    toggleKey: string;
    toggleValue: string;
}

/**
 * Options type for the MultipleToggleTextBox control.
 */
export interface MultipleToggleTextBoxOptions {
    toggleKeyValues: MultipleToggleKeyValue[];
    editableSelection: boolean;
    allowEditing: boolean;
    topMargin: boolean;
    containerClass: string;
    textClass: string;
    toggleEventCallback(MultipleToggleKeyValue): any;
}

/**
 * A control that has some text with a button that allows you to copy the value
 *  of the text to the user's clipboard. You can also provide multiple values
 *  for text and a button is shown to toggle the text to be copied.
 */
export class MultipleToggleTextBox extends Controls.Control<MultipleToggleTextBoxOptions> {

    private _$toggleButton: JQuery;
    private _$textBox: JQuery;
    private _$copyButtonContainer: JQuery;
    private _keyValuePairs: MultipleToggleKeyValue[];
    private _selectedIndex: number;

    constructor(options?: any) {
        super(options);
    }

    public initializeOptions(options?: MultipleToggleTextBoxOptions) {
        super.initializeOptions($.extend({}, options));

        this._keyValuePairs = options.toggleKeyValues;
        this._selectedIndex = 0;
    }

    public initialize() {
        super.initialize();

        this.drawControl();
    }

    public getSelectedValue(): MultipleToggleKeyValue {
        return this._keyValuePairs[this._selectedIndex];
    }

    public getShouldShowToggleOptions(): boolean {
        return this._keyValuePairs.length > 1;
    }

    private drawControl(): void {
        let $container: JQuery = $(domElem("div")).addClass("multiple-toggle-container");

        if (this._options.containerClass) {
            $container.addClass(this._options.containerClass);
        }

        this._element.append($container);

        if (!this._options.editableSelection) {
            $container.addClass("non-editable-selection");
        }

        if (this._options.topMargin) {
            $container.addClass("multiple-toggle-top-margin");
        }

        this._createToggleButton($container);
        this._createTextInput($container);
        this._createCopyButton($container)
    }

    private _createCopyButton($container: JQuery): void {

        this._$copyButtonContainer = $(domElem("div"))
            .addClass("multiple-toggle-copy-button-container")
            .append($(domElem("button", "bowtie-widget bowtie-tooltipped bowtie-tooltipped-sw copy-button"))
                .attr("aria-label", Resources_Platform.CopyContentDialogTitle)
                .append($(domElem("span", "bowtie-icon bowtie-edit-copy")))
            );
        if (!this._options.editableSelection) {
            this._$copyButtonContainer.addClass("multiple-toggle-copy-button-console-style");
        }

        //bind events to the copy button
        this._$copyButtonContainer.find(".copy-button")
            .bind("mouseout", e => {
                this._$copyButtonContainer.find(".copy-button").attr("aria-label", Resources_Platform.CopyContentDialogTitle);
            })
            .bind("click", e=> {
                //Copy to Clipboard.
                Utils_Clipboard.copyToClipboard(this._getTextToCopy());

                this._$copyButtonContainer.find(".copy-button").attr("aria-label", Resources_Platform.CopiedContentDialogTitle);
            });

        $container.append(this._$copyButtonContainer);
    }

    private _createTextInput($container: JQuery): void {

        // Use an input element for editable selection
        if (this._options.editableSelection) {
            this._$textBox = $(domElem("input", "multiple-toggle-text-showing-copy-button"))
                .attr("type", "text")
                .prop("readonly", !this._options.allowEditing)
                .attr("value", this._keyValuePairs[0].toggleValue)
                .addClass("multiple-toggle-text")
                .addClass("multiple-toggle-text-editable")
                .on("click", function () {
                    $(this).select();
                });

            if (this.getShouldShowToggleOptions()) {
                this._$textBox.addClass("multiple-toggle-text-showing-options");
            }
        }
        else {
            this._$textBox = $(domElem("div"))
                .attr("type", "text")
                .addClass("multiple-toggle-text");

            this._$textBox.append(this._keyValuePairs[0].toggleValue);
        }

        if (this._options.textClass) {
            this._$textBox.addClass(this._options.textClass);
        }

        $container.append(this._$textBox);
    }

    private _createToggleButton($container: JQuery): void {

        if (this.getShouldShowToggleOptions()) {

            this._$toggleButton = $(domElem("button"))
                .addClass("multiple-toggle-button")
                .bind("click", delegate(this, this._toggleSelection));

            for (let i = 0; i < this._keyValuePairs.length; ++i) {

                let $buttonText = $(domElem("span"))
                    .text(this._keyValuePairs[i].toggleKey)
                    .attr("id", i);

                if (i == this._selectedIndex) {
                    $buttonText.addClass("multiple-toggle-button-text-selected");
                }

                $buttonText.addClass("multiple-toggle-button-text");
                this._$toggleButton.append($buttonText);

                if (i !== this._keyValuePairs.length - 1) {
                    this._$toggleButton.append($(domElem("span")).addClass("multiple-toggle-vertical-bar").text("|"));
                }
            }
            $container.append(this._$toggleButton);
        }
    }

    private _toggleSelection(): boolean {

        this._selectedIndex = (this._selectedIndex + 1) % this._keyValuePairs.length;

        this._$toggleButton.find(Utils_String.format(".{0}", "multiple-toggle-button-text-selected")).removeClass("multiple-toggle-button-text-selected");
        this._$toggleButton.find(Utils_String.format("#{0}", this._selectedIndex)).addClass("multiple-toggle-button-text-selected");

        this._$textBox.attr("value", this._keyValuePairs[this._selectedIndex].toggleValue);

        //If a callback is specified in the options in order to notify caller of a toggle, then call it now.
        if (this._options.toggleEventCallback) {
            this._options.toggleEventCallback(this._keyValuePairs[this._selectedIndex]);
        }

        //to stop href action from happening
        return false;
    }

    private _getTextToCopy(): string {

        let $textElement: JQuery = this._element.find(Utils_String.format(".{0}", "multiple-toggle-text"));

        if (!$textElement) return Utils_String.empty;

        if (this._options.editableSelection) {
            return $textElement.val();
        }
        else {
            return $textElement.text();
        }
    }
}
VSS.classExtend(MultipleToggleTextBox, TfsContext.ControlExtensions);
