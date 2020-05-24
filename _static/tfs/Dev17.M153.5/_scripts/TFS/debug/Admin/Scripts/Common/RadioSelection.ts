import Controls = require("VSS/Controls");

export interface IRadioSelectionOptions<TSelection> {
    change: (selection: TSelection) => void;
    groupName: string;
    selectionIdGetter: (selection: TSelection) => string;
    selections: TSelection[];

    id?: string;
    selectionHtmlFactory?: (selection: TSelection, inputHtml: string) => string;
    defaultSelection?: TSelection;
    disabled?: boolean;
    selectionAriaLabelGetter: (selection: TSelection) => string;
}

export class RadioSelection<TSelection> {
    private _id: string;
    private _groupName: string;
    private _currentSelection: TSelection;

    protected _element: JQuery;
    protected _radios: JQuery;

    constructor($container: JQuery, options: IRadioSelectionOptions<TSelection>) {
        var that = this;

        options = $.extend({
            id: Controls.getId().toString(),
            selections: [],
            selectionHtmlFactory: (_, inputHtml) => inputHtml
        }, options);

        options.groupName = options.groupName == null ? options.id + '_radio' : options.groupName;
        options.defaultSelection = options.selections.length > 0 && options.defaultSelection == null ? options.selections[0] : options.defaultSelection;

        var $element = $(`<div id="${options.id}" class="radio-selection">`).appendTo($container);
        this._element = $element;

        this._currentSelection = options.defaultSelection;
        options.selections.forEach((selection, i) => {
            var inputHtml = `<input type="radio" id="${options.selectionIdGetter(selection)}" name="${options.groupName}" aria-label="${options.selectionAriaLabelGetter(selection)}" />`;
            var $section = $(options.selectionHtmlFactory(selection, inputHtml)).appendTo($element);

            $('input[type=radio]', $section)
                .change(() => {
                    that._currentSelection = selection;
                    options.change(selection);
                })
                .prop('checked', options.defaultSelection === selection)
                .prop('disabled', options.disabled);
        });

        this._id = options.id;
        this._groupName = options.groupName;
        this._radios = $(`input:radio[name=${options.groupName}]`, $element);
    }

    public getId() {
        return this._id;
    }

    public getGroupName() {
        return this._groupName;
    }

    public getSelection() : TSelection {
        return this._currentSelection;
    }

    public setEnabled(enabled: boolean) {
        this._radios.prop('disabled', !enabled);
    }

    public setSelection(id: string) {
        this._radios.filter('#'+ id).prop('checked', true).change();
    }

    public clearSelection() {
        this._radios.prop('checked', false);
        this._currentSelection = null;
    }
}