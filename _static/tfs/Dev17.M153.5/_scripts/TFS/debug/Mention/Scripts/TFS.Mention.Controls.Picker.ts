/// <reference types="jquery" />

import Controls = require("VSS/Controls");
import UI = require("VSS/Utils/UI");

import MentionAutocomplete = require("Mention/Scripts/TFS.Mention.Autocomplete");
import MentionAutocompleteControls = require("Mention/Scripts/TFS.Mention.Autocomplete.Controls");
import MentionWorkItems = require("Mention/Scripts/TFS.Mention.WorkItems");
import "Mention/Scripts/TFS.Mention.WorkItems.Registration";  // to register work-item mention parser and provider

export class MentionPickerEnhancement extends MentionAutocompleteControls.AutocompleteEnhancement {
    private _elementFocused: boolean;

    constructor(options?: MentionAutocompleteControls.IAutocompleteOptions, enhancementOptions?: Controls.EnhancementOptions) {
        options = options || {};
        if (options.mentionType === MentionAutocomplete.MentionType.WorkItem && !options.pluginConfigs) {
            options.pluginConfigs = [{
                factory: o => new MentionWorkItems.WorkItemAutocompleteProvider(o)
            }];
        }
        super(options, enhancementOptions);
    }

    public initialize() {
        super.initialize();
        const $element = this.getElement();
        if (!$element) return;
        const $dropdown = this._options.dropDown || this.getElement().parent().children(".bowtie-triangle-down");

        $element.on("mouseenter", () => {
            this.prefetch();
        });
        $element.bind("keydown", (e) => {
            if (e.altKey && !e.shiftKey && !e.ctrlKey) {
                const code = (e.keyCode ? e.keyCode : e.which);
                const inputText = this._createInputText(e, $element.val());

                if (code === UI.KeyCode.DOWN) {
                    this._autocompleteManager.handleEvent(e, inputText);
                }
                else if (code === UI.KeyCode.UP) {
                    this._autocompleteManager.close(e, inputText);
                }
            }
        });
        $element.on("click keyup", (e) => {
            if (
                this._autocompleteManager.isActive() ||
                (e.type === "keyup" && e.keyCode !== UI.KeyCode.TAB)
            ) {
                return;
            }

            // Don't open the dropdown if focus originated with the picker.
            if (this._elementFocused !== true) {
                const inputText = this._createInputText(e, $element.val());
                this._autocompleteManager.handleEvent(e, inputText);
                this._elementFocused = true;
            }
        });
        $element.on("blur", (e) => {
            this._elementFocused = false;
        });
        $dropdown.on("click", (e) => {
            const inputText = this._createInputText(e, $element.val());
            if (this._autocompleteManager.isActive()) {
                this._autocompleteManager.close(e, inputText);
            }
            else {
                this._autocompleteManager.handleEvent(e, inputText);
            }
        });
        $dropdown.on("blur", (e) => {
            // IE11 fires blur event when scrollbar in the pickers was clicked
            const $activeElement = $(document.activeElement);
            if ($activeElement.is(".mention-autocomplete-menu")) {
                return;
            }

            const inputText = this._createInputText(e, $element.val());
            this._autocompleteManager.close(e, inputText);
        });
    }

    protected _sessionSelect(replacement: MentionAutocomplete.IAutocompleteReplacement) {
        if (this._options.select) {
            this._options.select(replacement);
        }
    }

    protected _sessionFocus(replacement: MentionAutocomplete.IAutocompleteReplacement) {
        // override to do nothing
    }

    protected _createInputText(e: JQueryEventObject, value: string) {
        var newInputText = {
            textBeforeSelection: this._filterSearchString(value),
            textInSelection: "",
            textAfterSelection: "",
        }
        if (this.isActive()) {
            return newInputText;
        }
        else {
            // need to trick autocomplete into activating first before we actually give the autocomplete enhancement the new input text
            setTimeout(() => {
                this._autocompleteManager.handleEvent(e, newInputText);
            }, 0);
            return {
                textBeforeSelection: "#",
                textInSelection: "",
                textAfterSelection: "",
            }
        }
    }

    private _filterSearchString(text: string): string {
        // consolidate whitespaces, remove "#" in value, add "#" in front
        return "#" + text.trim().replace(/\#/g, " ").replace(/\s{2,}/g, " ");
    }
} 
