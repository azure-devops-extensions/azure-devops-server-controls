/// <amd-dependency path='VSS/LoaderPlugins/Css!Mention' />

import * as Q from "q";
import Controls = require("VSS/Controls");
import Core = require("VSS/Utils/Core");
import TFS_Core_Utils = require("Presentation/Scripts/TFS/TFS.Core.Utils");
import UI = require("VSS/Utils/UI");
import MentionAutocomplete = require("Mention/Scripts/TFS.Mention.Autocomplete");
import MentionHelpers = require("Mention/Scripts/TFS.Mention.Helpers");
import Telemetry = require("Mention/Scripts/TFS.Social.Telemetry");
import { logError } from "VSS/Diag";

export interface IAutocompleteOptions {
    artifactUri?: string;
    mentionType?: MentionAutocomplete.MentionType;
    pluginConfigs?: IAutocompletePluginConfig<any>[];
    dropDown?: JQuery;
    open?: (range: MentionAutocomplete.IRange) => void;
    select?: (replacement: MentionAutocomplete.IAutocompleteReplacement) => void;
    close?: () => void;
    pluginsInitialized?: () => void;
    defaultTelemetryProperties?: Object;
}
export interface IAutocompletePluginConfig<TOptions extends MentionAutocomplete.IAutocompletePluginOptions> {
    factory?: (options: MentionAutocomplete.IAutocompletePluginOptions) => MentionAutocomplete.IAutocompletePlugin<TOptions>;
    factoryPromise?: IPromise<(options: MentionAutocomplete.IAutocompletePluginOptions) => MentionAutocomplete.IAutocompletePlugin<TOptions>>;
    options?: TOptions;
}

export interface IAutocompleteSessionManagerOptions {
    artifactUri?: string;
    pluginConfigs: IAutocompletePluginConfig<any>[];
    open: (range: MentionAutocomplete.IRange) => void;
    close: () => void;
    select: (replacement: MentionAutocomplete.IAutocompleteReplacement) => void;
    focus: (replacement: MentionAutocomplete.IAutocompleteReplacement) => void;
    getMentionArtifactContext?: () => MentionAutocomplete.IMentionArtifactContext;
    pluginsInitialized?: () => void;
    defaultTelemetryProperties?: Object;
}

module Helpers {

    export function getInputCaretPosition($inputElement: JQuery): number {
        // Based on TFS.ChatRoom.Controls.ts > MessageInputControl._getCaretPosition(). 
        // This code can eventually be removed from Chatroom when Chatroom is switched over to using TFS.Mention for autocomplete.
        var caretPos: number = 0,
            textBoxHTMLElement: HTMLInputElement = <HTMLInputElement>$inputElement[0];

        if (textBoxHTMLElement.selectionStart) {
            // chrome, FF, safari support
            caretPos = textBoxHTMLElement.selectionStart;
        }
        else if (Core.documentSelection) {
            // IE support
            this.$inputElement.focus();
            var sel = Core.documentSelection.createRange();
            sel.moveStart('character', -this.$inputElement.val().length);
            caretPos = sel.text.length;
        }

        return caretPos;
    }

    export function setInputSelectionRange($inputElement: JQuery, startPosition: number, endPosition: number) {
        UI.SelectionUtils.selectInputText($inputElement, startPosition, endPosition, false);
    }

    export function moveAllAddedEventHandlersToFront($element: JQuery, eventTypes: string, action: Function) {
        var events = (<any>$)._data($element[0], 'events');
        var handlersOldLengths: { [key: string]: number };

        if (events) {
            var eventTypeArray = $.grep(eventTypes.split(" "), (x, i) => !!x);
            handlersOldLengths = {};
            for (var i = 0; i < eventTypeArray.length; i++) {
                var eventType = eventTypeArray[i];
                var handlers = events[eventType];
                handlersOldLengths[eventType] = handlers ? handlers.length : 0;
            }
        }
        action();
        if (events) {
            for (var eventTypeIndex = 0; eventTypeIndex < eventTypeArray.length; eventTypeIndex++) {
                var eventType = eventTypeArray[eventTypeIndex];
                var handlers = events[eventType];
                var handlersOldLength = handlersOldLengths[eventType];
                if (handlers && handlers.length > handlersOldLength) {
                    var addedHandlers = [];
                    for (var i = handlersOldLength; i < handlers.length; i++) {
                        addedHandlers.push(handlers[i]);
                    }
                    for (var i = handlers.length - addedHandlers.length - 1; i >= 0; i--) {
                        handlers[i + addedHandlers.length] = handlers[i];
                    }
                    for (var i = 0; i < addedHandlers.length; i++) {
                        handlers[i] = addedHandlers[i];
                    }
                }
            }
        }
    }
}

/**
 * Responsible for maintaining autocomplete session. Autocomplete session starts when a plugin is activated and ends when it is closed.
 * It uses set of IAutocompletePlugins to provide different types of mentions.
 */
export class AutocompleteSessionManager {
    private static REGEX_TELEMETRY_UI_EVENT_TYPES = /^(key[a-z]+|input|blur|click)$/i;

    private _instanceId: string = TFS_Core_Utils.GUIDUtils.newGuid();
    private _options: IAutocompleteSessionManagerOptions;
    private _plugins: MentionAutocomplete.IAutocompletePlugin<MentionAutocomplete.IAutocompletePluginOptions>[] = [];
    private _pluginsPromise: IPromise<MentionAutocomplete.IAutocompletePlugin<MentionAutocomplete.IAutocompletePluginOptions>[]>;
    private _artifactUri: string;
    private _sessionActive: boolean = false;
    private _sessionPluginActive: boolean = false;
    private _sessionPluginIndex: number;
    private _sessionId: string;
    private _sessionStartTime: Date = null;
    private _sessionSuggestionSelected: boolean;
    private _lastKeyEvent: JQueryEventObject; // used only for telemetry

    constructor(options: IAutocompleteSessionManagerOptions, pluginOptions: MentionAutocomplete.IAutocompletePluginOptions) {
        this._options = options;
        this._artifactUri = options.artifactUri;

        let basicPluginConfigs = this._options.pluginConfigs.filter(pluginConfig => Boolean(pluginConfig.factory));
        let asyncPluginConfigs = this._options.pluginConfigs.filter(pluginConfig => Boolean(pluginConfig.factoryPromise));
        let asyncPluginPromises = asyncPluginConfigs.map(pluginConfig => pluginConfig.factoryPromise);
        this._pluginsPromise = Q.allSettled(asyncPluginPromises).then(asyncPluginStates => {
            this._plugins = basicPluginConfigs.map(basicConfig => {
                return this._createPlugin(basicConfig, pluginOptions);
            });

            asyncPluginStates.forEach(pluginState => {
                if (pluginState.state === "fulfilled" && pluginState.value) {
                    this._plugins.push(this._createPlugin({ factory: pluginState.value }, pluginOptions));
                }
                else {
                    logError(`Failed loading mention plugin: ${pluginState.reason}`);
                }
            });

            return this._plugins;
        });
    }

    private _createPlugin(pluginConfig: IAutocompletePluginConfig<MentionAutocomplete.IAutocompletePluginOptions>,
        pluginOptions: MentionAutocomplete.IAutocompletePluginOptions): MentionAutocomplete.IAutocompletePlugin<MentionAutocomplete.IAutocompletePluginOptions> {
        return pluginConfig.factory({
            select: (event, replacement, telemetryProperties) => {
                if (this._sessionPluginActive) {
                    this._pluginSelect(event, replacement, telemetryProperties);
                }
            },
            focus: (event, replacement) => {
                if (this._sessionPluginActive) {
                    this._pluginFocus(event, replacement);
                }
            },
            close: (event, inputText) => {
                if (this._sessionPluginActive) {
                    this.close(event, inputText);
                }
            },
            ...pluginOptions,
            ...pluginConfig.options
        });
    }

    public initialize(): IPromise<void> {
        return this._pluginsPromise.then(plugins => {
            plugins.forEach((plugin) => {
                plugin.initialize();
            });
            this._plugins = plugins;

            if (this._options && this._options.pluginsInitialized) {
                this._options.pluginsInitialized();
            }

            return null;
        });
    }

    public dispose(): void {
        if (this._plugins) {
            this._plugins.forEach((plugin: MentionAutocomplete.IAutocompletePlugin<MentionAutocomplete.IAutocompletePluginOptions>) => {
                plugin.dispose();
            });

            this._plugins = null;
        }
    }

    public isActive() {
        return this._sessionActive;
    }

    public getActivePlugin(): MentionAutocomplete.IAutocompletePlugin<MentionAutocomplete.IAutocompletePluginOptions> {
        if (this._sessionPluginActive) {
            return this._getPlugin();
        }
        return null;
    }

    public updateSession(event: JQueryEventObject, inputText: MentionAutocomplete.IInputText) {
        var initialActivePluginIndex = this._sessionPluginActive ? this._sessionPluginIndex : null;
        if (this._sessionPluginActive && !this._getPlugin().canOpen(inputText)) {
            this._pluginClose(event, inputText);
        }
        var tryFirstNPlugins = this._sessionPluginActive
            ? this._sessionPluginIndex
            : this._plugins.length;
        var activatePluginIndex = null;
        var openRange: MentionAutocomplete.IRange;
        for (var i = 0; i < tryFirstNPlugins; i++) {
            var openRange = this._plugins[i].canOpen(inputText);
            if (openRange) {
                activatePluginIndex = i;
                break;
            }
        }
        if (this._sessionPluginActive && activatePluginIndex !== null) {
            this._pluginClose(event, inputText);
        }
        if (activatePluginIndex !== null) {
            this._sessionId = TFS_Core_Utils.GUIDUtils.newGuid();
            this._sessionStartTime = new Date();
            this._sessionSuggestionSelected = false;
            this._sessionPluginActive = true;
            this._sessionPluginIndex = activatePluginIndex;
            this._getPlugin().open(event, inputText);
            this._publishTelemetry(Telemetry.EventLogging.publishAutocompleteOpenEvent, event, this._getPlugin().getPluginName(), inputText, {});
        }
        if (initialActivePluginIndex !== null && !this._sessionPluginActive) {
            this._sessionClose(event, inputText, initialActivePluginIndex);
        }
        if (initialActivePluginIndex === null && this._sessionPluginActive) {
            this._sessionActive = true;
            if (this._options.open) {
                this._options.open(openRange);
            }
        }
    }

    public suggest(event: JQueryEventObject, inputText: MentionAutocomplete.IInputText): void {
        if (this._sessionPluginActive) {
            const pluginName = this._getPlugin().getPluginName();
            const startTime = new Date();
            this._getPlugin().suggest(event, inputText).then((result) => {
                const telemetryProperties = {
                    durationInMSec: `${new Date().getTime() - startTime.getTime()}`,
                    mentionAfrifactContext: this._options.getMentionArtifactContext ? this._options.getMentionArtifactContext() : undefined,
                    ...result.telemetry
                };
                this._publishTelemetry(Telemetry.EventLogging.publishAutocompleteSuggestEvent, event, pluginName, inputText, telemetryProperties);
            });
        }
    }

    /**
      * Set the last event which had a keyCode.
      * This is only used for telemetry.
      */
    public setLastKeyEvent(event: JQueryEventObject) {
        this._lastKeyEvent = event;
    }

    public prefetch() {
        this._pluginsPromise.then(plugins => {
            plugins.forEach((plugin) => {
                plugin.prefetch();
            });
        });
    }

    public setArtifactUri(artifactUri: string) {
        this._artifactUri = artifactUri;
    }

    public close(event: JQueryEventObject, inputText: MentionAutocomplete.IInputText) {
        if (this._sessionPluginActive) {
            this._pluginClose(event, inputText);
            this._sessionClose(event, inputText, this._sessionPluginIndex);
        }
    }

    private _getPlugin() {
        return this._plugins[this._sessionPluginIndex];
    }

    private _pluginSelect(event: JQueryEventObject, replacement: MentionAutocomplete.IAutocompleteReplacement, telemetryProperties: Telemetry.IAutocompleteSelectEvent) {
        if (this._sessionPluginActive) {
            this._sessionSuggestionSelected = true;
            if (this._options.select) {
                this._options.select(replacement);
            }
            this._publishTelemetry(Telemetry.EventLogging.publishAutocompleteSelectEvent, event, this._getPlugin().getPluginName(), replacement.getPlainText(), telemetryProperties);
        }
    }

    private _pluginFocus(event: JQueryEventObject, replacement: MentionAutocomplete.IAutocompleteReplacement) {
        if (this._sessionPluginActive) {
            if (this._options.focus) {
                this._options.focus(replacement);
            }
        }
    }

    private _pluginClose(event: JQueryEventObject, inputText: MentionAutocomplete.IInputText) {
        if (this._sessionPluginActive) {
            this._sessionPluginActive = false;
            this._getPlugin().close(event, inputText);
            if (!this._sessionSuggestionSelected) {
                var pluginName = this._plugins[this._sessionPluginIndex].getPluginName();
                this._publishTelemetry(Telemetry.EventLogging.publishAutocompleteCancelEvent, event, pluginName, inputText, {});
            }
        }
    }

    private _sessionClose(event: JQueryEventObject, inputText: MentionAutocomplete.IInputText, lastActivePluginIndex: number) {
        if (this._sessionActive) {
            this._sessionActive = false;
            if (this._options.close) {
                this._options.close();
            }
        }
    }

    private _publishTelemetry<TTelemetry extends Telemetry.IAutocompleteEvent>(
        publishFunction: (telemetryProperties: TTelemetry) => void,
        uiEvent: JQueryEventObject, 
        pluginName: string, 
        inputText: MentionAutocomplete.IInputText,
        telemetryProperties: TTelemetry) {
        var uiEventDescription = "";
        while (uiEvent && uiEvent.type && !AutocompleteSessionManager.REGEX_TELEMETRY_UI_EVENT_TYPES.exec(uiEvent.type)) {
            uiEvent = <JQueryEventObject>uiEvent.originalEvent;
        }
        if (uiEvent && uiEvent.type) {
            uiEventDescription += `${uiEvent.type}`;
            var keyEvent = uiEvent;
            if (keyEvent.type === "input" && !keyEvent.keyCode && this._lastKeyEvent) {
                keyEvent = this._lastKeyEvent;
            }
            if (keyEvent.keyCode) {
                uiEventDescription += `:${keyEvent.keyCode}`;
            }
            if (keyEvent.altKey) {
                uiEventDescription += ":alt";
            }
            if (keyEvent.ctrlKey) {
                uiEventDescription += ":ctrl";
            }
        }
        var mergedProperties = $.extend({
            telemetryVersion: "0.3",
            artifactUri: this._artifactUri,
            autocompleteSessionId: this._sessionId,
            autocompleteSessionStartTime: this._sessionStartTime.toISOString(),
            time: new Date().toISOString(),
            uiEvent: uiEventDescription,
            pluginName: pluginName,
        }, telemetryProperties, this._options.defaultTelemetryProperties);
        publishFunction(mergedProperties);
    }
}

/**
 * Main responsibility of AutocompleteManager is to receive input events, throttle them for suggestions and delegate them
 * down to {@link AutocompleteSessionManager}.
 */
export class AutocompleteManager {
    private static AUTOCOMPLETE_DELAY_MSEC = 100;

    private _throttledSuggest: (event: JQueryEventObject, inputText: MentionAutocomplete.IInputText) => void;
    private _sessionManager: AutocompleteSessionManager;

    constructor(options: IAutocompleteSessionManagerOptions, pluginOptions: MentionAutocomplete.IAutocompletePluginOptions) {
        this._throttledSuggest = MentionHelpers.throttledDelegate(this, AutocompleteManager.AUTOCOMPLETE_DELAY_MSEC, this._suggest);
        this._sessionManager = new AutocompleteSessionManager(options, pluginOptions);
    }

    public initialize() {
        this._sessionManager.initialize();
    }

    public dispose(): void {
        if (this._sessionManager) {
            this._sessionManager.dispose();
            this._sessionManager = null;
        }
    }

    public prefetch() {
        this._sessionManager.prefetch();
    }

    public handleEvent(event: JQueryEventObject, newValue?: MentionAutocomplete.IInputText) {
        if (event.keyCode) {
            this._sessionManager.setLastKeyEvent(event);
        }
        if (newValue != undefined) {
            this._sessionManager.updateSession(event, newValue);
            this._throttledSuggest(event, newValue);
        }
        if (this._sessionManager.isActive()) {
            var result = this._sessionManager.getActivePlugin().handle(event);
            return result;
        }
    }

    public close(event: JQueryEventObject, inputText: MentionAutocomplete.IInputText) {
        this._sessionManager.close(event, inputText);
    }

    public setArtifactUri(artifactUri: string) {
        this._sessionManager.setArtifactUri(artifactUri);
    }

    public isActive(): boolean {
        return this._sessionManager.isActive();
    }

    private _suggest(event: JQueryEventObject, inputText: MentionAutocomplete.IInputText) {
        // since _suggest is called via throttledDelegate, sometimes this._sessionManager can become null
        // if control is disposed before delegate is called.
        if (this._sessionManager) {
            this._sessionManager.suggest(event, inputText);
        }
    }
}

export class AutocompleteEnhancement extends Controls.Enhancement<IAutocompleteOptions> {
    private static PASSTHROUGH_EVENT_TYPES = "keyup keydown keypress input focus blur";
    private static INTERCEPTED_EVENT_KEYCODES = [UI.KeyCode.ENTER, UI.KeyCode.ESCAPE, UI.KeyCode.TAB];

    protected _autocompleteManager: AutocompleteManager;
    private _suppressInputEvents: boolean;
    private _lastValue: string;

    // used for stubbing in unit tests
    private static _createAutocompleteManager(options: IAutocompleteSessionManagerOptions, pluginOptions: MentionAutocomplete.IAutocompletePluginOptions): AutocompleteManager {
        return new AutocompleteManager(options, pluginOptions);
    }

    constructor(options?: IAutocompleteOptions, enhancementOptions?: Controls.EnhancementOptions) {
        super(options, enhancementOptions);

        this._autocompleteManager = AutocompleteEnhancement._createAutocompleteManager({
            artifactUri: this._options.artifactUri,
            pluginConfigs: this._options.pluginConfigs,
            open: MentionHelpers.delegate(this, this._sessionOpen),
            close: MentionHelpers.delegate(this, this._sessionClose),
            select: MentionHelpers.delegate(this, this._sessionSelect),
            focus: MentionHelpers.delegate(this, this._sessionFocus),
            pluginsInitialized: MentionHelpers.delegate(this, this._pluginsInitialized),
            defaultTelemetryProperties: this._options.defaultTelemetryProperties,
        },
            {
                menuContainer: MentionHelpers.delegate(this, this._getMenuContainer),
                positioningElement: MentionHelpers.delegate(this, this._getPositioningElement),
                textElement: MentionHelpers.delegate(this, this.getElement)
            });
    }

    public dispose() {
        super.dispose();
        this._options = null;

        if (this._autocompleteManager) {
            this._autocompleteManager.dispose();
            this._autocompleteManager = null;
        }

        if (this.getElement()) {
            this.getElement().off(AutocompleteEnhancement.PASSTHROUGH_EVENT_TYPES);
        }
    }

    public initialize() {
        this._lastValue = this.getElement().val();
        this._autocompleteManager.initialize();
        Helpers.moveAllAddedEventHandlersToFront(this.getElement(), AutocompleteEnhancement.PASSTHROUGH_EVENT_TYPES, () => {
            this.getElement().on(AutocompleteEnhancement.PASSTHROUGH_EVENT_TYPES, MentionHelpers.delegate(this, this._handleEvent));
        });
    }

    public prefetch() {
        this._autocompleteManager.prefetch();
    }

    public isActive(): boolean {
        return this._autocompleteManager.isActive();
    }

    public runAutocomplete(inputText: MentionAutocomplete.IInputText) {
        let event = jQuery.Event("manual");
        this._autocompleteManager.handleEvent(event, inputText);
    }

    private _getMenuContainer(): JQuery {
        if (this.getElement() && this.getElement().parent()) {
            return this.getElement().parent();
        }
        else {
            return $(document.body);
        }
    }

    private _getPositioningElement(): JQuery {
        return this.getElement();
    }

    protected _createInputText(e: JQueryEventObject, value: string): MentionAutocomplete.IInputText {
        var caretPos = Helpers.getInputCaretPosition(this.getElement());
        return {
            textBeforeSelection: value.substring(0, caretPos),
            textInSelection: "",
            textAfterSelection: value.substring(caretPos)
        }
    }

    private _handleEvent(e: JQueryEventObject) {
        if (this._suppressInputEvents && e.type === "input") {
            return;
        }

        let newValue: MentionAutocomplete.IInputText = undefined;
        if ((e.type === "keyup" && e.keyCode !== UI.KeyCode.ENTER && e.keyCode !== UI.KeyCode.TAB) || e.type === "input") {
            // Get value of input when keyboard or input event occurs.
            // Ignores TAB as well as ENTER key for we do not want to trigger a new session on them.
            const value = this.getElement().val();
            if (value != this._lastValue) {
                this._lastValue = value;
                newValue = this._createInputText(e, value);
            }
        }

        const wasActive = this._autocompleteManager.isActive();
        const result = this._autocompleteManager.handleEvent(e, newValue);
        // need to check wasActive rather than isActive() because handleEvent() could have changed the state.
        if (wasActive && AutocompleteEnhancement.INTERCEPTED_EVENT_KEYCODES.some(keyCode => keyCode === e.keyCode)) {
            e.preventDefault();
            e.stopImmediatePropagation();
            return false;
        }

        return result;
    }

    protected _sessionOpen(range: MentionAutocomplete.IRange) {
        if (this._options.open) {
            this._options.open(range);
        }
    }

    protected _sessionClose() {
        if (this._options.close) {
            this._options.close();
        }
    }

    protected _sessionSelect(replacement: MentionAutocomplete.IAutocompleteReplacement) {
        this._setValue(replacement.getPlainText(), () => this._triggerInputEvent());
        if (this._options.select) {
            this._options.select(replacement);
        }
    }

    protected _sessionFocus(replacement: MentionAutocomplete.IAutocompleteReplacement) {
        this._setValue(replacement.getPlainText());
    }

    protected _pluginsInitialized(): void {
        if (this._options && this._options.pluginsInitialized) {
            this._options.pluginsInitialized();
        }
    }

    private _setValue(inputText: MentionAutocomplete.IInputText, changeHandler?: () => void) {
        this.getElement().val(inputText.textBeforeSelection + inputText.textInSelection + inputText.textAfterSelection);
        Helpers.setInputSelectionRange(
            this.getElement(),
            inputText.textBeforeSelection.length,
            inputText.textBeforeSelection.length + inputText.textInSelection.length
        );
        var value = this.getElement().val();
        if (value !== this._lastValue) {
            if (changeHandler) {
                changeHandler();
            }
            this._lastValue = value;
        }
    }

    private _triggerInputEvent() {
        this._suppressInputEvents = true;
        try {
            this.getElement().trigger("input");
        }
        finally {
            this._suppressInputEvents = false;
        }
    }
}