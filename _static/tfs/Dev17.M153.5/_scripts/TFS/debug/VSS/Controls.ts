
import "jQueryUI/core";
import "jQueryUI/widget";

import Q = require("q");

import Diag = require("VSS/Diag");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");

var getErrorMessage = VSS.getErrorMessage;
var delegate = Utils_Core.delegate;
var domElem = Utils_UI.domElem;

var idSeed = 0;

/**
 * Returns a unique integer from an increasing sequence.
 */
export function getId(): number {
    return ++idSeed;
}

/**
 * Returns a unique string suitable for use as an id for an HTML element.
 */
export function getHtmlId(): string {
    return "vss_" + getId();
}

interface EnhancementEntry {
    typeName: string;
    enhancement: (context: Node) => void;
}

export type TrueOrFalse = "true" | "false" | boolean;

export interface AriaAttributes {
    // any properties added here should also be added to _ariaAttributesSet below
    activedescendant?: string; // ID reference
    atomic?: TrueOrFalse;
    autocomplete?: "inline" | "list" | "both" | "none";
    busy?: TrueOrFalse;
    checked?: TrueOrFalse | "mixed" | "undefined";
    controls?: string; // ID reference list
    describedby?: string; // ID reference list
    disabled?: TrueOrFalse;
    dropeffect?: "copy" | "move" | "link" | "execute" | "popup" | "none";
    expanded?: TrueOrFalse | "undefined";
    flowto?: string; // ID reference list
    grabbed?: TrueOrFalse | "undefined";
    haspopup?: TrueOrFalse | "undefined";
    hidden?: TrueOrFalse | "undefined";
    invalid?: TrueOrFalse | "grammar" | "spelling";
    label?: string;
    labelledby?: string; // ID reference list
    level?: string | number;
    live?: "off" | "polite" | "assertive";
    multiline?: TrueOrFalse;
    multiselectable?: TrueOrFalse;
    orientation?: "vertical" | "horizontal";
    owns?: string; // ID reference list
    posinset?: string | number;
    pressed?: TrueOrFalse | "mixed" | "undefined";
    readonly?: TrueOrFalse;
    relevant?: "additions" | "removals" | "text" | "all" | "additions text";
    required?: TrueOrFalse;
    selected?: TrueOrFalse | "undefined";
    setsize?: string | number;
    sort?: "ascending" | "descending" | "none" | "other";
    valuemax?: string | number;
    valuemin?: string | number;
    valuenow?: string | number;
    valuetext?: string;
}

export interface EnhancementOptions {
    earlyInitialize?: boolean;
    cssClass?: string;
    coreCssClass?: string;
    tagName?: string;
    width?: number | string;
    height?: number | string;
    title?: string;
    role?: string;
    id?: number | string;
    prepend?: boolean;
    change?: Function;
    /**
     * Legacy option. Superseded by ariaAttributes property.
     */
    ariaLabel?: string;
    /**
     * Add these aria attributes to the Enhancement.
     */
    ariaAttributes?: AriaAttributes;
}

type AriaAttributesSet = { 
    [P in keyof AriaAttributes]: true
}

const _ariaAttributesSet: AriaAttributesSet = {
        "activedescendant": true,
        "atomic": true,
        "autocomplete": true,
        "busy": true,
        "checked": true,
        "controls": true,
        "describedby": true,
        "disabled": true,
        "dropeffect": true,
        "expanded": true,
        "flowto": true,
        "grabbed": true,
        "haspopup": true,
        "hidden": true,
        "invalid": true,
        "label": true,
        "labelledby": true,
        "level": true,
        "live": true,
        "multiline": true,
        "multiselectable": true,
        "orientation": true,
        "owns": true,
        "posinset": true,
        "pressed": true,
        "readonly": true,
        "relevant": true,
        "required": true,
        "selected": true,
        "setsize": true,
        "sort": true,
        "valuemax": true,
        "valuemin": true,
        "valuenow": true,
        "valuetext": true,
    };

export class Enhancement<TOptions> {

    public static ENHANCEMENTS_DATA_KEY: string = "tfs-enhancements";
    public static ENHANCEMENT_OPTIONS_KEY: string = "tfs-enhancement-options";
    public static ENHANCEMENT_OPTIONPREFIX_KEY: string = "optionsPrefix";
    public static optionsPrefix: string = "";

    private static enhancementList = [];

    private _id: string;
    private _typeName: string;
    private _eventNamespace: string;
    private _trackedElements: any;
    private _delayedFunctions: IDictionaryStringTo<Utils_Core.DelayedFunction>;

    protected _enhancementOptions: EnhancementOptions;

    public _options: TOptions = <TOptions>{};
    public _initialized: boolean;
    public _element: JQuery;
    public _disposed: boolean;

    /**
     * @param options 
     */
    constructor(options?: TOptions, enhancementOptions?: EnhancementOptions) {
        if (this.getType() === Enhancement) {
            throw new Error("You cannot instantiate an abstract type.");
        }
        this.initializeOptions(options);
        this.setEnhancementOptions(enhancementOptions);
        this.getTypeName();
    }

    /**
     * @param type 
     * @return 
     */
    public static getTypeName(type?): string {
        var typeName;

        if (typeof type !== "function") {
            type = this;
        }

        if (type.enhancementTypeName) {
            typeName = type.enhancementTypeName;
        } else {
            typeName = type._typeName || ("tfs.controls." + VSS.getTypeName(type));
        }
        return typeName;
    }

    /**
     * @return 
     */
    public static getOptionPrefix(type): string {
        var runningType = type;

        while (runningType) {
            if (runningType.hasOwnProperty(Enhancement.ENHANCEMENT_OPTIONPREFIX_KEY)) {
                return runningType[Enhancement.ENHANCEMENT_OPTIONPREFIX_KEY];
            }

            runningType = runningType._base;
        }
        return "";
    }

    /**
     * @param type 
     * @param element 
     */
    public static getEnhancementOptions(type, element) {
        var options, optionsPrefix, optionsElement, json, runningType, methods = [], method;

        if (typeof type !== "function") {
            element = type;
            type = this;
        }

        optionsPrefix = Enhancement.getOptionPrefix(type) || "";

        options = element.data(optionsPrefix + "options");

        if (!options) {
            optionsElement = element.children("." + optionsPrefix + "options");

            if (optionsElement.length > 0) {
                json = optionsElement.html();

                if (json) {
                    options = Utils_Core.parseMSJSON(json, false);
                }
            }
        }

        runningType = type;

        while (runningType) {
            if (runningType["initializeEnhancementOptions"]) {
                methods.push(runningType["initializeEnhancementOptions"]);
            }

            runningType = runningType._base;
        }

        while (methods.length > 0) {
            method = methods.pop();

            if ($.isFunction(method)) {
                options = method.call(type, element, options);
            }
        }

        return options;
    }

    /**
     * @param type 
     * @param element 
     * @param options 
     * @return 
     */
    public static enhance<TOptions>(
        type: new (options: TOptions, enhancementOptions: EnhancementOptions) => Enhancement<TOptions>,
        element: Enhancement<any> | JQuery | Node | string,
        options?: ((element: JQuery) => TOptions) | TOptions,
        enhancementOptions?: EnhancementOptions): Enhancement<TOptions> {

        var enhancement, $element: JQuery, typeName: string, enhancements;

        if (typeof element !== "string" && element instanceof Enhancement) {
            $element = element.getElement();
        }
        else {
            $element = $(element);
        }

        enhancements = $element.data(Enhancement.ENHANCEMENTS_DATA_KEY);

        if (enhancements) {
            $.each(enhancements, function (i, instance) {
                if (instance instanceof type || instance._typeName === Enhancement.getTypeName(type)) {
                    enhancement = instance;
                    return false;
                }
            });
        }

        if (!enhancement) {
            var optionsObj: TOptions;
            if (typeof options === "function") {
                optionsObj = (<any>options).call(type, $element);
            } else {
                optionsObj = <TOptions>options;
            }

            optionsObj = <TOptions>$.extend(Enhancement.getEnhancementOptions(type, $element), optionsObj);
            enhancement = new type(optionsObj, enhancementOptions);
            enhancement.enhance($element);
        }
        return enhancement;
    }

    /**
     * @param type 
     * @param element 
     * @return 
     */
    public static getInstance(type?, element?): Enhancement<any> {
        return this.getInstanceO<any>(type, element);
    }

    public static getInstanceO<TOptions>(type?, element?): Enhancement<TOptions> {
        var enhancement;

        if (typeof type !== "function") {
            element = type;
            type = this;
        }

        var enhancements = <Enhancement<TOptions>>element.data(Enhancement.ENHANCEMENTS_DATA_KEY);

        if (enhancements) {
            $.each(enhancements, function (i, instance) {

                if (instance instanceof type || instance._typeName === Enhancement.getTypeName(type)) {
                    enhancement = instance;
                    return false;
                }
            });
        }

        return enhancement;
    }

    /**
     * @param type 
     * @param selector 
     * @param options 
     * @param errorCallback 
     */
    public static registerEnhancement<TOptions>(type?: { new (options: TOptions): Enhancement<TOptions> }, selector?: string, options?: TOptions, errorCallback?: IErrorCallback, enhancementOptions?: EnhancementOptions): void {
        var typeName = Enhancement.getTypeName(type);

        function enhance(context: Node | JQuery) {
            var instances = [], selection;

            if (context) {
                selection = $(context);
            }

            if (!selection || !selection.is(selector)) {
                selection = $(selector, selection);
            }

            selection.each(function () {
                instances.push(Enhancement.enhance(type, $(this), options, enhancementOptions));
            });

            return instances;
        }
        Enhancement.enhancementList.push({ typeName: typeName, enhancement: enhance });

        Diag.logTracePoint("Enhancement.registered-pending", [selector, typeName]);
        
        const callback = function() {
            try {
                enhance(document);
                Diag.logTracePoint("Enhancement.registered-complete", [selector, typeName]);
            } 
            catch (e) {
                Diag.logTracePoint("Enhancement.register-exception", e);
                if (errorCallback) {
                    var error = new Error(
                        Utils_String.format("Enhancement failed for '{0}'. Details: {1}", typeName, getErrorMessage(e)),
                    );
                    error.name = "EnhancementFailed";
                    VSS.handleError(error, errorCallback);
                } 
                else {
                    console.error(Utils_String.format("Enhancement failed for '{0}'.", typeName));
                    throw e;
                }
            }
        };

        if (document.readyState !== "loading") {
            callback();
        } else {
            document.addEventListener("DOMContentLoaded", callback);
        }
    }

    /**
     * @param type 
     * @param context 
     * @param errorCallback 
     * @return 
     */
    public static ensureEnhancements(type?, context?, errorCallback?): Enhancement<any>[] {
        var enhancementEntry, i, l, instances = [];

        if (typeof type !== "function") {
            errorCallback = context;
            context = type;
            type = this;
        }

        for (i = 0, l = Enhancement.enhancementList.length; i < l; i++) {
            enhancementEntry = Enhancement.enhancementList[i];

            if (type === Enhancement || enhancementEntry.typeName === Enhancement.getTypeName(type)) {
                try {
                    instances = instances.concat(enhancementEntry.enhancement(context) || []);
                }
                catch (e) {
                    var error = new Error(Utils_String.format("Enhancement failed for '{0}'. Details: {1}", enhancementEntry.typeName, getErrorMessage(e)));
                    error.name = "EnhancementFailed";
                    Diag.logTracePoint("Enhancement.ensure-exception", error);
                    if (errorCallback) {
                        VSS.handleError(error, errorCallback);
                    }
                    else {
                        throw error;
                    }
                }
            }
        }
        return instances;
    }

    /**
     * @param type 
     * @param context 
     * @param errorCallback 
     * @return 
     */
    public static ensureEnhancement(type?, context?, errorCallback?): Enhancement<any> {
        if (typeof type !== "function") {
            errorCallback = context;
            context = type;
            type = this;
        }
        return Enhancement.ensureEnhancements(type, context, errorCallback)[0];
    }

    /**
     * @param type 
     * @param widgetName 
     * @param widgetOptions 
     */
    public static registerJQueryWidget<TOptions>(type?, widgetName?, widgetOptions?: TOptions, enhancementOptions?: EnhancementOptions): void {
        var typeName;

        if (typeof type === "string") {
            widgetOptions = widgetName;
            widgetName = type;
            type = this;
        }

        if (!widgetName) {
            widgetName = type._widgetName;

            if (!widgetName) {
                typeName = Enhancement.getTypeName(type);

                Diag.Debug.assert(typeName ? true : false, "_widgetName or _typeName needs to present in order to register this control as JQuery widget.");
                widgetName = typeName.split(".");
                widgetName = widgetName[widgetName.length - 1];
            }
        }

        $.fn[widgetName] = function (options) {
            return this.each(function () {
                Enhancement.enhance(type, $(this), <TOptions>$.extend(widgetOptions || {}, options), enhancementOptions);
            });
        };
    }

    /**
     * @return 
     */
    protected _getUniqueId(): string {
        return `vss_${getId()}`;
    }

    /**
     * @return 
     */
    public getId(): string {
        if (!this._id) {
            this._setId(this._getUniqueId());
        }
        return this._id;
    }

    /**
     * @param id 
     */
    protected _setId(id: string) {
        this._id = id;
    }

    /**
     * Sets options related to the creation of this control or enhancement of an element as this control.
     * Note: Options are merged.
     * @param EnhancementOptions
     */
    public setEnhancementOptions(enhancementOptions: EnhancementOptions) {
        if (!this._enhancementOptions) {
            var earlyInitFromOptions = this._options && this._options["earlyInitialize"];
            this._enhancementOptions = <EnhancementOptions>$.extend({}, {
                earlyInitialize: earlyInitFromOptions !== undefined ? earlyInitFromOptions : true
            }, enhancementOptions);
        } else {
            $.extend(this._enhancementOptions, enhancementOptions);
        }
    }

    /**
     * @return 
     */
    public getTypeName(): string {
        if (!this._typeName) {
            this._typeName = Enhancement.getTypeName(this.getType());
        }
        return this._typeName;
    }

    /**
     * @return 
     */
    protected _getEventNameSpace(): string {
        if (!this._eventNamespace) {
            this._eventNamespace = this.getTypeName().replace(/\./g, "_") + this.getId();
        }
        return this._eventNamespace;
    }

    public getType() {
        return this['constructor'];
    }

    /**
     * @param options 
     */
    public initializeOptions(options?: TOptions) {
        if (this._options) {
            $.extend(this._options, options);
        } else {
            this._options = <TOptions>$.extend({}, options);
        }
    }

    public initialize() {
        this._initialized = true;
    }

    /**
     * @return 
     */
    public _ensureInitialized(): boolean {
        if (!this._initialized) {
            this.initialize();

            return true;
        }
        return false;
    }

    protected _attemptInitialize() {
        if (this._getEnhancementOption("earlyInitialize")) {
            this.initialize();
        }
    }

    public enhance($element) {
        this._enhance($element);
        this._attemptInitialize();
    }

    /**
     * @param element 
     */
    protected _enhance(element: JQuery) {
        this._setElement(element);
    }

    /**
     * @param element 
     */
    protected _setElement(element: JQuery) {
        var type = this.getType(), enhancements;

        if (this._element !== element) {
            this._cleanup();

            this._element = element;
            this._bind("remove.remove_" + this.getTypeName(), delegate(this, this._dispose));

            enhancements = this._element.data(Enhancement.ENHANCEMENTS_DATA_KEY);

            if (!enhancements) {
                enhancements = [];
                this._element.data(Enhancement.ENHANCEMENTS_DATA_KEY, enhancements);
            }

            Utils_Array.add(enhancements, this);

            this._setStyles();
            
            // promote EnhancementOptions.ariaLabel to EnhancementOptions.ariaAttributes.label for backcompat
            const legacyAriaLabel = this._getEnhancementOption("ariaLabel");
            if (legacyAriaLabel) {
                let ariaAttributes = this._getEnhancementOption("ariaAttributes");
                if (!ariaAttributes) {
                    this._enhancementOptions.ariaAttributes = ariaAttributes = {};
                }
                // don't overwrite if it's already set in ariaAttributes though
                if (!ariaAttributes.label) {
                    ariaAttributes.label = legacyAriaLabel;
                }
            }

            this._setAriaAttributes();
        }
    }

    protected _setStyles() {
        if (this._getEnhancementOption("coreCssClass")) {
            this._element.addClass(this._getEnhancementOption("coreCssClass"));
        }
        if (this._getEnhancementOption("cssClass")) {
            this._element.addClass(this._getEnhancementOption("cssClass"));
        }
    }

    protected _setAriaAttributes(element: JQuery = this._element) {
        const ariaAttributes: AriaAttributes = this._getEnhancementOption("ariaAttributes");
        // iterate over the given attributes
        for (const key in ariaAttributes) {
            // ensure that this is an aria attribute we know about
            if (_ariaAttributesSet[key]) {
                const ariaAttributeValue = ariaAttributes[key];
                
                // ensure that aria attribute value is not undefined or null or empty                
                if (ariaAttributeValue !== undefined && ariaAttributeValue !== null && ariaAttributeValue !== "") {
                    element.attr("aria-" + key, String(ariaAttributeValue));
                }
            }
        }
    }

    /**
     * Gets the element associated with this control.
     * 
     * @return 
     */
    public getElement(): JQuery {
        return this._element;
    }

    /**
     * @param element 
     * @param eventType 
     * @param args 
     */
    // Should be protected, but too many places rely on public.
    public _fire(element?, eventType?, args?) {
        if (typeof element === "string") {
            args = eventType;
            eventType = element;
            element = this._element;
        }
        return element.trigger(eventType, args);
    }

    /**
     * @param element 
     * @param eventType 
     * @param handler 
     * @param track 
     */
    public _bind(element?, eventType?, handler?, track?): Enhancement<TOptions> {

        var $element: JQuery, self = this, namespace;

        if (typeof element === "string") {
            track = handler;
            handler = eventType;
            eventType = element;
            element = this._element;
        }

        $element = $(element);
        if ($element.length > 0) {
            namespace = this._getEventNameSpace();
            $element.bind($.map(eventType.split(" "), function (et) {
                return et + "." + namespace;
            }).join(" "),
                handler);

            if (track) {
                $element.each(function () {
                    if (this !== self._element[0]) {
                        self._trackElement(this);
                    }
                });
            }
        }

        return this;
    }

    /**
     * @param element 
     * @param eventType 
     * @param handler 
     * @param track 
     */
    public _unbind(element?, eventType?, handler?, track?): Enhancement<TOptions> {

        var $element, self = this, namespace;

        if (typeof element === "string") {
            handler = track;
            track = eventType;
            eventType = element;
            element = this._element;
        }

        $element = $(element);
        if ($element.length > 0) {
            namespace = this._getEventNameSpace();

            $element.unbind($.map(eventType.split(" "), function (et) {
                return et + "." + namespace;
            }).join(" "), handler);

            if (track) {
                $element.each(function () {
                    if (this !== self._element[0]) {
                        self._untrackElement(this);
                    }
                });
            }
        }

        return this;
    }

    /**
     * Executes the provided function after the specified amount of time
     * 
     * @param name (Optional) Name for this operation. Allows subsequent calls to cancel this action.
     * @param msDelay Delay in milliseconds to wait before executing the Function
     * @param cancelPendingOps If true, cancel any pending requests with this name. If false, and there are outstanding requests with this name already in progress, then do nothing.
     * @param func Method to execute after the delay
     */
    public delayExecute(name?: string, msDelay?: number, cancelPendingOps?: boolean, func?: Function) {
        if (!name) {
            // Unnamed operation - just use the Core delay method
            Utils_Core.delay(this, msDelay, func);
            return;
        }

        if (!this._delayedFunctions) {
            this._delayedFunctions = {};
        }

        let operation = this._delayedFunctions[name];
        if (operation) {
            operation.setDelay(msDelay);
            operation.setMethod(this, func);
        }
        else {
            operation = new Utils_Core.DelayedFunction(this, msDelay, name, func);
            this._delayedFunctions[name] = operation;
        }

        if (cancelPendingOps) {
            operation.reset();
        }
        else {
            operation.start();
        }
    }

    /**
     * Cancels any pending delayed functions (delayExecute calls) with the specified name
     * 
     * @param name Name (supplied in the delayExecute call) of the operations to cancel
     * @return True if any operation was canceled. False if no operations with the specified name were in progress
     */
    public cancelDelayedFunction(name: string): boolean {
        if (this._delayedFunctions) {
            const prevOperation = this._delayedFunctions[name];
            if (prevOperation) {
                prevOperation.cancel();
                delete this._delayedFunctions[name];
                return true;
            }
        }

        return false;
    }

    protected _cleanup() {
        var type = this.getType(), enhancements;

        if (this._element) {
            this._unbind("remove.remove_" + this.getTypeName());    
            this._element.unbind("." + this._getEventNameSpace());

            enhancements = this._element.data(Enhancement.ENHANCEMENTS_DATA_KEY);

            if (enhancements) {
                Utils_Array.remove(enhancements, this);

                if (enhancements.length === 0) {
                    this._element.data(Enhancement.ENHANCEMENTS_DATA_KEY, null);
                }
            }
        }
    }

    protected _dispose() {
        var elems = this._trackedElements, i, l;

        if (elems) {
            for (i = 0, l = elems.length; i < l; i++) {
                $(elems[i]).unbind("." + this._getEventNameSpace());
            }
        }

        this._trackedElements = null;
        // this._options = null;   // TODO: We should be able to clear the options here, but some code is still accessing them after being disposed!

        if (this._delayedFunctions) {
            Object.keys(this._delayedFunctions).forEach(name => this.cancelDelayedFunction(name));
        }

        this._disposed = true;
    }

    public dispose() {
        this._cleanup();
        this._dispose();
    }

    /**
     * @return 
     */
    public isDisposed(): boolean {

        return this._disposed;
    }

    protected _getEnhancementOption(key: string) {
        return this._enhancementOptions[key] || this._options[key];
    }

    private _trackElement(domElement) {
        var elems = this._trackedElements, i, l, record, found;
        if (!elems) {
            this._trackedElements = elems = [];
        }

        for (i = 0, l = elems.length; i < l; i++) {
            record = elems[i];
            if (record.elem === domElement) {
                record.count++;
                found = true;
                break;
            }
        }

        if (!found) {
            elems.push({ elem: domElement, count: 1 });
        }
    }

    private _untrackElement(domElement) {
        var elems = this._trackedElements, i, l, record, found = -1;
        if (elems) {
            for (i = 0, l = elems.length; i < l; i++) {
                record = elems[i];
                if (record.elem === domElement) {
                    record.count--;
                    found = i;
                    break;
                }
            }

            if (found >= 0) {
                if (!record.count) {
                    elems.splice(found);
                }
            }
        }
    }
}

VSS.initClassPrototype(Enhancement, {
    _id: "",
    _typeName: "",
    _eventNamespace: "",
    _options: null,
    _initialized: false,
    _element: null,
    _trackedElements: null,
    _delayedFunctions: null,
    _disposed: false
});

/**
 * Creates a the control specified by TControl in the given container.
 * @typeparam TControl extends Control<TOptions> - a reference to the type of control to create. Should be the 
 *            same type as the constructor function passed as the first parameter to this function. Note: TypeScript 
 *            doesn't support the constraint of a type parameter referencing any other type parameter in the same
 *            list, but callers should ensure that TControl extends Control<TOptions>.
 * @typeparam TOptions - The type that is passed in as the options for this control. The instantiated control must 
 *            an options parameter of this type.
 * @param controlType: new (options: TOptions) => TControl - the constructor function (ClassName) of this type.
 * @param container: JQuery - a JQuery element to place the control in.
 * @param controlOptions: TOptions - Options to pass in for this control. See the interface for the options type
 *        for more details.
 * @param enhancementOptions?: EnhancementOptions - Optional options for the control enhancement.
 * @return TControl - returns an instance of the controlType (first parameter), typed as a TControl (first type param).
 */
export function create<TControl extends Control<any>, TOptions>(
    controlType: new (options: TOptions) => TControl,
    container: JQuery,
    controlOptions: TOptions,
    enhancementOptions?: EnhancementOptions): TControl {
    return Control.create(controlType, container, controlOptions, enhancementOptions);
}

export class Control<TOptions> extends Enhancement<TOptions> {
    /**
     * Creates a the control specified by TControl in the given container.
     * @typeparam TControl extends Control<TOptions> - a reference to the type of control to create. Should be the 
     *            same type as the constructor function passed as the first parameter to this function. Note: TypeScript 
     *            doesn't support the constraint of a type parameter referencing any other type parameter in the same
     *            list, but callers should ensure that TControl extends Control<TOptions>.
     * @typeparam TOptions - The type that is passed in as the options for this control. The instantiated control must 
     *            an options parameter of this type.
     * @param controlType: new (options: TOptions) => TControl - the constructor function (ClassName) of this type.
     * @param container: JQuery - a JQuery element to place the control in.
     * @param controlOptions: TOptions - Options to pass in for this control. See the interface for the options type
     *        for more details.
     * @param enhancementOptions?: EnhancementOptions - Optional options for the control enhancement.
     * @return TControl - returns an instance of the controlType (first parameter), typed as a TControl (first type param).
     */
    public static create<TControl extends Control<any>, TOptions>(
        controlType: new (options: TOptions) => TControl,
        container: JQuery,
        controlOptions: TOptions,
        enhancementOptions?: EnhancementOptions): TControl {

        return <TControl>Control.createIn<TOptions>(controlType, container, <TOptions>$.extend({}, controlOptions, enhancementOptions));
    }

    /**
     * @param type 
     * @param container 
     * @param options 
     * @return 
     */
    public static createIn<TOptions>(type?, container?, options?: TOptions, koCompatable: boolean = false): Control<any> {

        var control, $container;

        // If koCompatable is set, the control has to support ko widget and enhancement
        // These controls have contructor ( element, options )
        // Should always be called using : whatevercontrol.createIn(null, $element, options, true );
        // TODO: Use named parameters if are supported in the version we use
        // >>Note: Any other signature of call for compatable control is not supported as far as now, though the signature of function definition allows it<<
        if (koCompatable) {
            type = this;
            control = new type(container, options);
        } else {
            if (typeof type !== "function") {
                options = container;
                container = type;
                type = this;
            }

            control = new type(options);
        }
        if (container instanceof Enhancement) {
            $container = container.getElement();
        }
        else {
            $container = $(container);
        }
        control.createIn($container);

        return control;
    }

    private _overlay: JQuery = null;
    private _elementInDomPromise: IPromise<any>;

    /**
     * @param options 
     */
    constructor(options?: TOptions) {
        super(options);
    }

    /**
     * @param options 
     */
    public initializeOptions(options?: TOptions) {
        $.extend(this._options, { tagName: "div" }, options);
    }

    /**
     * @return 
     */
    public _getUniqueId(): string {

        var id;
        if (this._element) {
            id = this._element.attr("id");
        }

        if (typeof id === "undefined") {
            id = super._getUniqueId();
        }

        return id;
    }

    /**
     * @param id 
     */
    public _setId(id: string) {

        if (this._element) {
            this._element.attr("id", id);
        }

        super._setId(id);
    }

    public dispose() {
        super.dispose();
        if (this._element) {
            this._element.remove();
            this._element = null;
        }
    }

    public showElement() {
        Diag.Debug.assert(this._element ? true : false, "DomElement is null or undefined.");
        if (this._element) { this._element.show(); }
    }

    public hideElement() {
        Diag.Debug.assert(this._element ? true : false, "DomElement is null or undefined.");
        if (this._element) { this._element.hide(); }
    }

    public enableElement(enabled) {
        if (enabled) {
            this._element.removeAttr("disabled");
            this._element.removeClass("disabled");
        }
        else {
            this._element.attr("disabled", "disabled");
            this._element.addClass("disabled");
        }
    }

    public showBusyOverlay(): JQuery {
        if (!this._overlay) {
            this._overlay = $("<div />").addClass("control-busy-overlay").appendTo(this._element.parent());
        }
        this._overlay.show();
        return this._overlay;
    }

    public hideBusyOverlay() {
        if (this._overlay) {
            this._overlay.hide();
        }
    }

    public isVisible(): boolean {
        return $(this._element).is(":visible");
    }

    public _createElement() {
        var element = $(domElem(this._getEnhancementOption("tagName")));

        this._setElement(element);
    }

    public _initializeElement() {
        if (this._element) {
            if (this._getEnhancementOption("id")) {
                this._setId(this._getEnhancementOption("id").toString());
            }
        }
    }

    public _setStyles() {
        var element = this._element;
        var options = this._options;

        if (this._getEnhancementOption("width")) {
            element.width(<any>this._getEnhancementOption("width"));
        }

        if (this._getEnhancementOption("height")) {
            element.height(<any>this._getEnhancementOption("height"));
        }

        if (this._getEnhancementOption("title")) {
            element.attr("title", this._getEnhancementOption("title"));
        }

        this.setRole(this._getEnhancementOption("role"), element);

        super._setStyles();
    }

    public createIn(container: JQuery) {
        this._createIn(container);
        this._initializeElement();
        this._attemptInitialize();
    }

    protected _createIn(container: JQuery) {
        this._createElement();
        if (this._getEnhancementOption("prepend")) {
            container.prepend(this._element);
        } else {
            container.append(this._element);
        }
    }

    /**
     * Set Focus to the control
     */
    public focus() {
        // TODO: override in child controls that have different focus receiver
        this._element.focus();
    }

    /**
     * Fires the change event for the control immediately
     * 
     * @param sender Source element of the event
     */
    protected _fireChange(sender?: any) {
        var args;
        sender = sender || this;

        // Actual event fire happening here
        if (typeof this._getEnhancementOption("change") === "function") {
            // Set sender as initial parameter if undefined
            args = arguments;
            args[0] = sender;
            args.length = arguments.length || 1;
            if (this._getEnhancementOption("change").apply(sender, args) === false) {
                return false;
            }
        }

        return this._fire("change", sender);
    }

    /**
    * Get a promise that is resolved once the containing element for this
    * control has been added to the DOM hierarchy.
    */
    protected _getInDomPromise(): IPromise<any> {
        if (!this._elementInDomPromise) {
            var deferred = Q.defer();
            this._elementInDomPromise = deferred.promise;
            this._waitForElementInDom(deferred);
        }
        return this._elementInDomPromise;
    }

    private _waitForElementInDom(deferred: Q.Deferred<any>) {
        if (!this._disposed) {
            if (Utils_UI.isInDomTree(this._element[0])) {
                deferred.resolve(null);
            }
            else {
                window.setTimeout(() => {
                    this._waitForElementInDom(deferred);
                }, 100);
            }
        }
    }

    /**
     * Sets the role for the current control using the specified role value on the specified element.
     * If no element specified, default element is used.
     * 
     * @param role Role to assign.
     * @param element Element to apply the role (default is root element).
     */
    protected setRole(role: string, element?: JQuery): void {
        this.setAttribute("role", role, element);
    }

    /**
     * Sets the attribute for the current control using the specified attribute name, value on the specified element.
     * If no element specified, default element is used.
     * 
     * @param attribute Attribute name to set value.
     * @param value Attribute value to set.
     * @param element Element to apply the attribute (default is root element).
     */
    protected setAttribute(attribute: string, value: string | number, element: JQuery = this._element): void {
        if (element && attribute) {
            // Apply the role if element and role are valid
            element.attr(attribute, value);
        }
    }
}

export class BaseControl extends Control<any> {

}

export class BaseDataSource {

    protected _source: any;
    private _items: any;
    private _allItems: any;

    public _options: any;

    constructor(options?) {
        this._options = $.extend({
            sorted: false,
            comparer: Utils_String.localeIgnoreCaseComparer
        }, options);

        this.setSource(this._options.source);
    }

    public setSource(source) {
        this._source = source;
        this._items = null;
        this._allItems = null;
    }

    public getSource(): any {
        return this._source;
    }

    /**
     * @param source 
     */
    public prepareSource(source?) {
        var items = source || [];

        if (this._options.sorted) {
            Utils_Array.sortIfNotSorted(items, this._options.comparer || Utils_String.localeIgnoreCaseComparer);
        }

        this.setItems(items);
    }

    public getComparer() {
        return this._options.comparer;
    }

    public ensureItems() {
        var source;
        if (!this._items) {
            source = this._source;
            if ($.isFunction(source)) {
                source = source.call(this);
            }

            this.prepareSource(source);
        }
    }

    /**
     * @param all 
     */
    public getItems(all?) {

        this.ensureItems();

        return all ? this._allItems : this._items;
    }

    /**
     * @param allItems 
     */
    public setItems(items, allItems?) {
        this._items = items || [];
        this._allItems = allItems || this._items;
    }

    /**
     * @param all 
     */
    public getCount(all?) {

        return this.getItems(all).length;
    }

    /**
     * @param all 
     */
    public getItem(index, all?) {

        return this.getItems(all)[index];
    }

    /**
     * @param all 
     * @param textOnly 
     * @return 
     */
    public getItemText(index, all?, textOnly?): string {

        return this.getItem(index, all) + "";
    }

    /**
     * Gets first matching index to text input
     *
     * @param itemText
     * @param startsWith 
     * @param all 
     */
    public getItemIndex(itemText, startsWith?, all?): any {
        var indexes = this._getItemIndexesInternal(itemText, startsWith, all, true);
        if (indexes.length > 0) {
            return indexes[0];
        }
        else {
            // no index found, return -1
            return -1;
        }
    }

    /**
     * Returns an array of all indexes that match the search criteria
     * @param itemText
     * @param startsWith 
     * @param all 
     */
    public getItemIndexes(itemText: string, startsWith?: boolean, all?: boolean): number[] {
        return this._getItemIndexesInternal(itemText, startsWith, all);
    }

    /**
     * Returns an array of all indexes that match the search criteria
     * @param itemText
     * @param startsWith 
     * @param all
     * @param first Only return the first result
     */
    private _getItemIndexesInternal(inputText: string, startsWith?: boolean, all?: boolean, first?: boolean): number[] {
        var retVal: number[] = [],
            items: any,
            i: number,
            inputComparer = this._getInputTextToItemComparer(startsWith);

        // No input text passed in, return default value
        if (!inputText) {
            return retVal;
        }

        items = this.getItems(all);

        if (this._options.sorted) {
            // source is sorted so use binary search
            var hi: number, lo: number,
                comparison: number,
                sourceItemText: string;
            lo = 0; hi = items.length - 1;

            while (hi >= lo) {
                i = (lo + hi) >> 1; //mid point
                comparison = inputComparer(i, inputText, all);

                if (comparison < 0) {
                    hi = i - 1;
                } else if (comparison > 0) {
                    lo = i + 1;
                } else {
                    break;
                }
            }

            // The comparer may match mutiple items, back up to the first one
            while (i > 0 && inputComparer(i - 1, inputText, all) === 0) {
                i--;
            }

            // Add all items in order     
            for (i; i < items.length; i++) {
                comparison = inputComparer(i, inputText, all);
                if (comparison === 0) {
                    retVal.push(i);
                    if (first) {
                        return retVal;
                    }
                }
                else if (comparison < 0) {
                    // We stopped finding matches, stop searching
                    break;
                }
            }
            return retVal;
        }
        else {
            // Unsorted list, we must run through entire list and check all items
            for (i = 0; i < items.length; i++) {
                if (inputComparer(i, inputText, all) === 0) {
                    retVal.push(i);
                    if (first) {
                        return retVal;
                    }
                }
            }
        }
        return retVal;
    }

    private _getInputTextToItemComparer(matchPartial?: boolean): (itemIndex: number, inputText: string, all: boolean) => number {
        if ($.isFunction(this._options.compareInputToItem)) {
            return (itemIndex: number, inputText: string, all: boolean) => {
                return this._options.compareInputToItem(this.getItem(itemIndex, all), inputText, matchPartial);
            }
        }
        else {
            if (matchPartial) {
                return (itemIndex: number, inputText: string, all: boolean) => {
                    return this._options.comparer(inputText, this.getItemText(itemIndex, all).substr(0, inputText.length));
                }
            }
            else {
                return (itemIndex: number, inputText: string, all: boolean) => {
                    return this._options.comparer(inputText, this.getItemText(itemIndex, all));
                }
            }
        }
    }

    public nextIndex(selectedIndex, delta, all) {
        var itemCount = this.getCount(all);

        if (itemCount < 1) {
            return -1;
        }
        else if (selectedIndex < 0) {
            return 0;
        }
        else if (delta > 0) {
            //Next
            if (selectedIndex === (itemCount - 1)) {
                return -1;
            }

            return Math.min(itemCount - 1, selectedIndex + delta);
        }
        else {
            //Prev
            if (selectedIndex === 0) {
                return -1;
            }

            return Math.max(0, selectedIndex + delta);
        }
    }
}

VSS.initClassPrototype(BaseDataSource, {
    _options: null,
    _source: null,
    _items: null,
    _allItems: null
});

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("VSS.UI.Controls", exports);
