///<amd-dependency path="jQueryUI/droppable"/>
///<amd-dependency path="VSS/Utils/Draggable"/>
/// <reference types="jquery" />
/// <reference types="knockout" />

import ko = require("knockout");

import VSS = require("VSS/VSS");
import VSSControls = require("VSS/Controls");
import VSSControlsCombos = require("VSS/Controls/Combos");
import Utils_UI = require("VSS/Utils/UI");
import Utils_Core = require("VSS/Utils/Core");
import Utils_Date = require("VSS/Utils/Date");
import { AccessibilityColor, PaletteColorPickerControl, PaletteColorPickerControlOptions } from "Presentation/Scripts/TFS/TFS.UI.Controls.ColorPicker";
import ksb = require("knockoutSecureBinding");

export function overrideDefaultBindings(): void {
        var options = { attribute: "data-bind", globals: window, bindings: ko.bindingHandlers, noVirtualElements: false };
        ko.bindingProvider.instance = new ksb(options);
}

var domElem = Utils_UI.domElem;

/**
 * Creates a knockout observable for a date value
 * @param value The initial value
 */
export function observableDate(value?: Date): KnockoutObservable<Date> {
    var observable = ko.observable(value);
    observable.equalityComparer = Utils_Date.equals;
    return observable;
}

/**
 * Loads an html template
 * @param name The template name
 * @param cssClass A CSS class to add to the template
 */
export function loadHtmlTemplate(name: string, cssClass?: string): JQuery {
    var template: JQuery = $(domElem("div"))
        .attr("data-bind", "template: { name: '" + name + "' }");

    if (!!cssClass) {
        template.addClass(cssClass);
    }

    return template;
}

/**
 * Returns a knockout binding for displaying generated resource strings
 * example:
 * ko.bindingHandlers["buildResource"] = getResourceBindingHandler(BuildResources);
 * ...
 * <label data-bind="buildResource: 'LabelText'" />
 *     or
 * <label data-bind="buildResource: { resource: 'LabelText' }" />
 */
export function getResourceBindingHandler(resourceType: any): KnockoutBindingHandler {
    return {
        init: function (element: JQuery, valueAccessor: () => any, allBindingsAccessor: () => any, viewModel: any, bindingContext: KnockoutBindingContext) {
            var target = $(element);
            var options: any = valueAccessor();
            var text: string = "";
            var title: string;
            if (!!options) {
                if (typeof options === 'string') {
                    text = resourceType[options];
                }
                else {
                    text = resourceType[options.resource];
                    title = resourceType[options.title];
                }
            }

            if (text) {
                target.text(text);
            }

            if (title) {
                target.attr("title", title);
            }

            return { controlsDescendantBindings: false };
        }
    };
}

ko.bindingHandlers["droppable"] = {
    init: function (element: JQuery, valueAccessor: () => any, allBindingsAccessor: () => any, viewModel: any, bindingContext: KnockoutBindingContext) {
        var droppable = $(element);
        var options: any = valueAccessor();
        droppable.droppable(options);
    }
};

ko.bindingHandlers["draggable"] = {
    init: function (element: JQuery, valueAccessor: () => any, allBindingsAccessor: () => any, viewModel: any, bindingContext: KnockoutBindingContext) {
        var draggable = $(element);
        var options: any = valueAccessor();
        if (!!options.appendToSelector) {
            options.appendTo = $(options.appendToSelector);
        }
        draggable.draggable(options);
    }
};

ko.bindingHandlers["hover"] = {
    init: function (element: JQuery, valueAccessor: () => any, allBindingsAccessor: () => any, viewModel: any, bindingContext: KnockoutBindingContext) {
        var target = $(element);
        var options: any = valueAccessor();
        target.hover(
            (eventObject: JQueryEventObject) => {
                target.addClass(options.hoverClass);
            },
            (eventObject: JQueryEventObject) => {
                target.removeClass(options.hoverClass);
            });
    }
};

/**
 * Knockout custom binding for handling Enter key down same as click
 */
ko.bindingHandlers["clickOnEnterKey"] = {
    init: function (element: JQuery, valueAccessor: () => any, allBindingsAccessor: () => any) {
        var target = $(element);
        target.keyup((e: JQueryKeyEventObject) => {
            if (e.keyCode === Utils_UI.KeyCode.ENTER || e.keyCode === Utils_UI.KeyCode.SPACE) {
                // Generate a click event on the element.
                target.click();
            }
        });
    }
};

/**
 * Knockout custom binding for handling single click and double click.
 * The knockout template needs to define click and dblclick handler as following:
 * <div data-bind="singleOrDoubleClick: { click: singleClickHandler, dblclick: dblClickHandler } />
 */
ko.bindingHandlers["singleOrDoubleClick"] = {
    init: function (element: JQuery, valueAccessor: () => any, allBindingsAccessor: () => any, viewModel: any, bindingContext: KnockoutBindingContext) {
        var singleHandler = valueAccessor().click;
        var doubleHandler = valueAccessor().dblclick;
        var delay = valueAccessor().delay || 200;
        var clicks = 0;

        $(element).click((event: JQueryEventObject) => {
            clicks++;
            if (clicks === 1) {
                setTimeout(() => {
                    if (clicks === 1) {
                        // Call the single click handler.
                        if (singleHandler !== undefined) {
                            singleHandler.call(viewModel, bindingContext.$data, event);
                        }
                    } else {
                        // Call the double click handler.
                        if (doubleHandler !== undefined) {
                            doubleHandler.call(viewModel, bindingContext.$data, event);
                        }
                    }
                    clicks = 0;
                }, delay);
            }
        });
    }
};

/**
 * Knockout custom binding for handling scroll element in view.
 */
ko.bindingHandlers["scrollTo"] = {
    update: function (element: any, valueAccessor: () => boolean) {
        if (valueAccessor()) {
            var parentContainer = element.parentNode;
            $(parentContainer).scrollTop(element.offsetTop);
        }
    }
};

/**
 * Knockout custom binding for animating an element by fading it in then out.
 */
ko.bindingHandlers["fadeInThenOut"] = {
    init: function (element: JQuery, valueAccessor: () => any, allBindingsAccessor: () => any, viewModel: any, bindingContext: KnockoutBindingContext) {
        // Initially set the element to be instantly visible/hidden depending on the value
        var value = valueAccessor();
        $(element).toggle(ko.utils.unwrapObservable(value)); // Use "unwrapObservable" so we can handle values that may or may not be observable
    },
    update: function (element: JQuery, valueAccessor: () => any, allBindingsAccessor: () => any, viewModel: any, bindingContext: KnockoutBindingContext) {
        // Whenever the value subsequently changes, slowly fade the element in, wait a little then fade out
        var value = valueAccessor();
        if (ko.utils.unwrapObservable(value)) {
            $(element).fadeIn(750).delay(1000).fadeOut(750);
        }
    }
};

/**
 * Custom array changed function to detect which item was added or removed from the observable array.
 *
 * @param itemAddedCallback The callback that will be invoked when an item is added to the observable array.
 * @param itemRemovedCallback The callback that will be invoked when an item is removed from the observable array.
 * @param context The object that will be used as current 'this' object within the callback function.
 * @return The knockout subscriptions.
 */
ko.observableArray.fn.subscribeArrayChanged = function <T>(itemAddedCallback: (addedItem: T) => void, itemRemovedCallback: (removedItem: T) => void, context?: any): KnockoutSubscription<T>[] {
    var i: number,
        j: number,
        cachedPreviousValue: any[] = null,
        beforeChangeSubscription: KnockoutSubscription<T>,
        changeSubscription: KnockoutSubscription<T>;

    beforeChangeSubscription = this.subscribe(function (previousValue: any[]) {
        cachedPreviousValue = previousValue.slice(0);
    },
        null,
        "beforeChange");

    changeSubscription = this.subscribe(function (latestValue: T[]): void {
        var arrayChanges = ko.utils.compareArrays(cachedPreviousValue, latestValue);

        for (i = 0, j = arrayChanges.length; i < j; i++) {
            switch (arrayChanges[i].status) {
                case "retained":
                    break;
                case "deleted":
                    if (itemRemovedCallback) {
                        itemRemovedCallback.call(context, arrayChanges[i].value);
                    }

                    break;
                case "added":
                    if (itemAddedCallback) {
                        itemAddedCallback.call(context, arrayChanges[i].value);
                    }

                    break;
                default:
                    break;
            }
        }

        cachedPreviousValue = null;
    });

    return [beforeChangeSubscription, changeSubscription];
};


/** VSS Controls KO Binding Handlers */

/**
 * Knockout custom binding for vss combo control.
 * <div data-bind="vssCombo: getComboOptions()"></div>
 */
ko.bindingHandlers["vssCombo"] = {
    init: function (element: JQuery, valueAccessor: () => any, allBindingsAccessor: () => any, viewModel: any, bindingContext: KnockoutBindingContext) {
        var combo = VSSControls.Control.create(VSSControlsCombos.Combo, $(element), valueAccessor());
    }
};

/**
 * Knockout custom binding for tfs color picker control.
 * <div data-bind="tfsColorPicker: getPaletteColorPickerOptions()"></div>
 */
ko.bindingHandlers["tfsColorPicker"] = {
    init: function (element: JQuery, valueAccessor: () => PaletteColorPickerControlOptions, allBindingsAccessor: () => any, viewModel: any, bindingContext: KnockoutBindingContext) {
        VSSControls.Control.create(PaletteColorPickerControl, $(element), valueAccessor());
    }
};

/**
 * Knockout custom binding for tfs color picker control.
 * <div data-bind="tfsFontColorPicker: getTitleColorPickerOptions()"></div>
 */
ko.bindingHandlers["tfsFontColorPicker"] = {
    init: function (element: JQuery, valueAccessor: () => PaletteColorPickerControlOptions, allBindingsAccessor: () => any, viewModel: any, bindingContext: KnockoutBindingContext) {
        const $element = $(element);
        const inputOptions: PaletteColorPickerControlOptions = valueAccessor() || {} as PaletteColorPickerControlOptions;

        // Add trigger element with the desired style
        const $triggerElement = $("<div>")
            .addClass("font-trigger")
            .attr("tabindex", 0)
            .attr("role", "button")
            .attr("aria-haspopup", "true")
            .attr("aria-label", valueAccessor().ariaLabelPrefix);
        const $icon = $("<span>").addClass("icon bowtie-icon bowtie-format-font-color");
        const $colorbar = $("<div>").addClass("style-rule-font-color-bar");
        if (inputOptions.defaultColor) {
            $colorbar.css("background-color", inputOptions.defaultColor.asHex());
        }
        $triggerElement.append($icon, $colorbar);
        $element.append($triggerElement);

        // Initialize options
        const options: PaletteColorPickerControlOptions = $.extend({}, inputOptions, {
            triggerElement: $triggerElement,
            onColorSelected: (source: PaletteColorPickerControl, selectedColor: AccessibilityColor) => {
                // Update the css and then invoke the handler specified by the caller.
                $colorbar.css("background-color", selectedColor.asHex());
                if ($.isFunction(inputOptions.onColorSelected)) {
                    inputOptions.onColorSelected(source, selectedColor);
                }
            }
        } as PaletteColorPickerControlOptions);

        // Create the control
        VSSControls.Control.create(PaletteColorPickerControl, $element, options);
    }
};

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Knockout", exports);
