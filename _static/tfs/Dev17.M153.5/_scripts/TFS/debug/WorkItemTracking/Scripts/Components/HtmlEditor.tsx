import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!WorkItemTracking/Components/HtmlEditor";

import * as MentionResources from "Mention/Scripts/Resources/TFS.Resources.Mention";
import * as Social_RichText_Autocomplete_Async from "Mention/Scripts/TFS.Social.RichText.Autocomplete";
import { Async, css } from "OfficeFabric/Utilities";
import * as React from "react";
import * as Rooster_Async from "RoosterReact/rooster-react-amd";
import * as Resources_Platform from "VSS/Resources/VSS.Resources.Platform";
import { publishEvent, TelemetryEventData } from "VSS/Telemetry/Services";
import { announce } from "VSS/Utils/Accessibility";
import { Utils } from "VSS/Utils/Html";
import { KeyUtils } from "VSS/Utils/UI";
import * as VSS from "VSS/VSS";
import * as EmojiStrings_Async from "WorkItemTracking/Scripts/Components/HtmlEditor.Emoji.Strings";
import * as Strings_Async from "WorkItemTracking/Scripts/Components/HtmlEditor.Strings";
import * as HtmlEditorLinkPlugin_Async from "WorkItemTracking/Scripts/Components/HtmlEditorLinkPlugin";
import * as WITResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";

const TelemetryAreaName = "HtmlEditor";
const ToolbarButtonClickFeature = "ToolbarButtonClick";
const ShortcutCommandFeature = "ShortcutCommand";
const TelemetryCreateScenario = "CreateHtmlEditor";
const TelemetrySetContentScenario = "SetContent";
const SanitizePropertyCallbacks = { style: (value: string) => value.replace(/(height|line-height)\s*:.+?(;[\s]?|$)/g, "") }; // remove height and line-height from inline style
const HyperlinkShortcut = KeyUtils.shouldUseMetaKeyInsteadOfControl() ? Resources_Platform.CommandClickToOpen : Resources_Platform.CtrlClickToOpen;

// by default, there is HTML bloat/workaround for Edge and Chrome around lists (only when setting specific font)
// to avoid the bloat, we're disabling this until we allow setting font
const DisableListWorkaround = true;

const PlaceholderImageClassName = "html-editor-img-placeholder";
const ExcludePlaceholderSelector = `:not(.${PlaceholderImageClassName})`;

// we currently don't support file drop
const PreventFileDropHandler = (ev: React.DragEvent<HTMLElement>) => {
    const { dataTransfer } = ev.nativeEvent;
    if (!dataTransfer && !dataTransfer.types) {
        return;
    }

    const fileType = "Files";
    const types = dataTransfer.types as any;
    // IE11 has contains but not indexOf
    if ((types.indexOf && types.indexOf(fileType)) || (types.contains && types.contains(fileType))) {
        ev.preventDefault();
        try {
            dataTransfer.dropEffect = "none"; // IE11 throws an error
        } catch (_) {}

        return false;
    }
};

const AutoCompleteModuleList = ["Mention/Scripts/TFS.Social.RichText.Autocomplete"];
const EmojiStringsModuleList = ["WorkItemTracking/Scripts/Components/HtmlEditor.Emoji.Strings"];

const RoosterReactModulePath = "RoosterReact/rooster-react-amd";
const HtmlEditorStringsModulePath = "WorkItemTracking/Scripts/Components/HtmlEditor.Strings";
const HtmlEditorLinkPluginModulePath = "WorkItemTracking/Scripts/Components/HtmlEditorLinkPlugin";
let RoosterReactModule: typeof Rooster_Async = null;
let HtmlEditorStringsModule: typeof Strings_Async = null;
let HtmlEditorLinkPluginModule: typeof HtmlEditorLinkPlugin_Async = null;

export interface ITelemetryContext {
    controlName?: string;
}

export interface IHtmlEditorProps {
    className?: string;
    fullScreen?: boolean;
    helpText?: string;
    hidden?: boolean;
    htmlContent: string;
    mentionsEnabled?: boolean;
    onChange?: () => void;
    placeholder?: string;
    readonly?: boolean;
    showChromeBorder?: boolean;
    telemetryContext?: ITelemetryContext;
    uploadImageHandler?: (file: File) => Promise<string>;
    ariaLabel?: string;
    height?: number;
    forceDelayLoad?: boolean;
}

export interface IHtmlEditorState {
    fullScreen: boolean;
    hidden: boolean;
    moduleLoaded: boolean;
    readonly: boolean;
}

export class HtmlEditor extends React.PureComponent<IHtmlEditorProps, IHtmlEditorState> {
    private _leanRooster: Rooster_Async.LeanRooster;
    private _leanRoosterContentDiv: HTMLDivElement;
    private _commandBar: Rooster_Async.RoosterCommandBar;
    private _commandBarPlugin: Rooster_Async.RoosterCommandBarPlugin;
    private _imageResizePlugin: Rooster_Async.ImageResize;
    private _async: Async = new Async();
    private _throttledOnContentChanged: (updatedContent: string, isInitializing?: boolean) => void;
    private _editorPlugins: Rooster_Async.EditorPlugin[];
    private _emojiPlugin: Rooster_Async.EmojiPlugin;
    private _undoPlugin: Rooster_Async.UndoWithImagePlugin;
    private _imageManager: Rooster_Async.ImageManager;
    private _buttonOverrides: Rooster_Async.RoosterCommandBarButton[];
    private _autocompleteControl: Social_RichText_Autocomplete_Async.RichTextAutocompleteControl;
    private _autoCompleteSelectedEventName: string;
    private _creationStartTime: number;
    private _asynchronouslyLoaded: boolean;
    private _viewState: Rooster_Async.EditorViewState;

    public constructor(props: IHtmlEditorProps) {
        super(props);

        this._throttledOnContentChanged = this._async.throttle(this._handleContentChanged, 100, { trailing: true });

        let moduleLoaded = false;
        const { htmlContent, readonly, hidden, fullScreen, forceDelayLoad } = props;
        this._viewState = { content: htmlContent, isDirty: false } as Rooster_Async.EditorViewState;

        const initializeRooster = (loadedSynchronously: boolean): void => {
            this._createAdditionalEditorPlugins();
            this._initializeButtonOverrides();
            this._creationStartTime = Date.now();

            moduleLoaded = true;
            const viewState = this._viewState;
            const santizedContent = RoosterReactModule.sanitizeHtml(viewState.content, undefined, undefined, SanitizePropertyCallbacks);
            viewState.content = santizedContent;
            if (!loadedSynchronously) {
                this.setState({ moduleLoaded });
            }
        };
        if (require.defined(RoosterReactModulePath) && require.defined(HtmlEditorStringsModulePath) && require.defined(HtmlEditorLinkPluginModulePath)) {
            RoosterReactModule = require(RoosterReactModulePath);
            HtmlEditorStringsModule = require(HtmlEditorStringsModulePath);
            HtmlEditorLinkPluginModule = require(HtmlEditorLinkPluginModulePath);
            if (forceDelayLoad) {
                setTimeout(() => initializeRooster(false), 0); // this helps exclude rooster initialization from form TTI (like the old editor)
            } else {
                initializeRooster(true);
            }
        } else {
            this._ensureRoosterModule().then(() => initializeRooster(false));
        }

        this.state = { readonly, hidden, fullScreen, moduleLoaded };
    }

    public render(): JSX.Element {
        const { className, height } = this.props;
        return (
            <div
                className={css("html-editor", className, {
                    "is-hidden": this.state.hidden,
                    "full-screen": this.state.fullScreen,
                    "auto-grow": height == null
                })}
                style={{ height }}
            >
                {this._renderRoosterEditor()}
            </div>
        );
    }

    public setContent(newContent: string): void {
        const startTime = Date.now();
        // If the module is not loaded, just set the state, we will sanitize when the module has been loaded
        const content = RoosterReactModule ? RoosterReactModule.sanitizeHtml(newContent, undefined, undefined, SanitizePropertyCallbacks) : newContent;
        if (this._tryUpdateState(content) && this._leanRooster) {
            this._leanRooster.reloadContent(true /* triggerContentChangedEvent */, false /* resetUndo */);
            const initialContent = this._leanRooster.getContent();
            this._undoPlugin.reset(initialContent);
        }

        // Publish telemetry only if it is not part of creation scenario, since setContent before creation just updates the state
        if (RoosterReactModule) {
            const contentLength = (this._viewState.content || "").length;
            const elapsedTime = Date.now() - startTime;
            publishEvent(
                new TelemetryEventData(TelemetryAreaName, TelemetrySetContentScenario, {
                    elapsedTime,
                    contentLength
                })
            );
        }
    }

    public get isDirty(): boolean {
        return this._viewState.isDirty;
    }

    public get htmlContent(): string {
        return this._viewState.content;
    }

    public focus(): void {
        if (this._leanRooster) {
            this._leanRooster.focus();
        }
    }

    public selectAll(): void {
        if (this._leanRooster) {
            this._leanRooster.selectAll();
        }
    }

    public flushChanges(): void {
        if (this._leanRooster) {
            // Force the content changed event bypassing the throttling to ensure that all changes are processed before saving the workitem.
            const content = this._leanRooster.getContent();
            this._handleContentChanged(content);
        }
    }

    // force update on command bar will cause reflow, debounce here for all callers
    public refreshCommandBar = this._async.debounce(() => this._commandBar && this._commandBar.forceUpdate(), 100, {
        trailing: true
    });

    public hasFocus(): boolean {
        return this._leanRooster && this.mode === RoosterReactModule.LeanRoosterModes.Edit;
    }

    public setEnabled(enabled: boolean): void {
        this.setState({ readonly: !enabled });
    }

    public setVisible(visible: boolean): void {
        this.setState({ hidden: !visible });
    }

    public setFullScreen(fullScreen: boolean): void {
        this.setState({ fullScreen });
    }

    public get mode(): Rooster_Async.LeanRoosterModes {
        return this._leanRooster.mode;
    }

    public set mode(value: Rooster_Async.LeanRoosterModes) {
        this._leanRooster.mode = value;
    }

    public componentWillUnmount(): void {
        const leanRoosterContentDiv = this._leanRoosterContentDiv;
        if (leanRoosterContentDiv) {
            this._leanRoosterContentDiv = null;
            this._emojiPlugin = null; // set to null to avoid race with _loadEmojiStrings(); also note rooster will call dispose on its plugins

            if (this._autocompleteControl) {
                leanRoosterContentDiv.removeEventListener(this._autoCompleteSelectedEventName, this._onMentionSelect);
                this._autocompleteControl.cleanUpEditor(leanRoosterContentDiv);
                this._autocompleteControl = null;
            }
        }

        if (this._async) {
            this._async.dispose();
            this._async = null;
        }
    }

    private _renderRoosterEditor(): JSX.Element {
        if (!this.state.moduleLoaded) {
            this._asynchronouslyLoaded = true;
            return null;
        }

        const { showChromeBorder, placeholder, ariaLabel } = this.props;
        const { FocusOutShell, LeanRooster, RoosterCommandBar } = RoosterReactModule;
        const { All, CommandBarLocaleStrings } = HtmlEditorStringsModule;

        return (
            <FocusOutShell
                className={css("rooster-wrapper", { "with-chrome": showChromeBorder })}
                allowMouseDown={this._focusOutShellAllowMouseDown}
                onBlur={this._focusOutShellOnBlur}
                onFocus={this._focusOutShellOnFocus}
            >
                {(calloutClassName: string, calloutOnDismiss: Rooster_Async.FocusEventHandler) => {
                    this._createPluginsWithCallout(calloutClassName, calloutOnDismiss);
                    return [
                        <LeanRooster
                            key="rooster"
                            className={css("rooster-editor", "propagate-keydown-event", "text-element")}
                            viewState={this._viewState}
                            plugins={this._editorPlugins}
                            undo={this._undoPlugin}
                            ref={this._leanRoosterOnRef}
                            updateViewState={this._updateViewState}
                            contentDivRef={this._leanRoosterContentDivOnRef}
                            readonly={this.state.readonly}
                            placeholder={placeholder}
                            hyperlinkToolTipCallback={this._hyperlinkToolTipCallback}
                            onFocus={this._leanRoosterOnFocus}
                            onDragEnter={PreventFileDropHandler}
                            onDragOver={PreventFileDropHandler}
                            aria-label={ariaLabel}
                        />,
                        <RoosterCommandBar
                            key="cmd"
                            className="rooster-command-bar"
                            commandBarClassName="html-command-bar-base"
                            buttonOverrides={this._buttonOverrides}
                            roosterCommandBarPlugin={this._commandBarPlugin}
                            emojiPlugin={this._emojiPlugin}
                            imageManager={this._imageManager}
                            calloutClassName={css("rooster-callout", calloutClassName)}
                            calloutOnDismiss={calloutOnDismiss}
                            strings={CommandBarLocaleStrings}
                            ref={this._commandBarOnRef}
                            onButtonClicked={this._publishToolbarTelemetry}
                            disableListWorkaround={DisableListWorkaround}
                            overflowMenuProps={{ className: "rooster-command-bar-overflow" }}
                            ellipsisAriaLabel={All.Toolbar_More}
                        />
                    ];
                }}
            </FocusOutShell>
        );
    }
    private _createPluginsWithCallout(calloutClassName: string, calloutOnDismiss: Rooster_Async.FocusEventHandler): any {
        const { CommandBarLocaleStrings, SearchForEmoji } = HtmlEditorStringsModule;
        const { RoosterCommandBarPlugin, EmojiPlugin } = RoosterReactModule;

        if (!this._emojiPlugin) {
            this._emojiPlugin = new EmojiPlugin({
                calloutClassName: css(calloutClassName, "rooster-emoji-callout"),
                calloutOnDismiss,
                emojiPaneProps: {
                    quickPickerClassName: "rooster-emoji-quick-pick",
                    navBarProps: {
                        className: "rooster-emoji-navbar",
                        buttonClassName: "rooster-emoji-navbar-button",
                        iconClassName: "rooster-emoji-navbar-icon",
                        selectedButtonClassName: "rooster-emoji-navbar-selected"
                    },
                    statusBarProps: {
                        className: "rooster-emoji-status-bar"
                    },
                    emojiIconProps: {
                        className: "rooster-emoji-icon",
                        selectedClassName: "rooster-emoji-selected"
                    },
                    searchPlaceholder: SearchForEmoji,
                    searchInputAriaLabel: SearchForEmoji
                } as Rooster_Async.EmojiPaneProps,
                onKeyboardTriggered: this._publishEmojiFromKeyboardTelemetry,
                strings: { emjDNoSuggetions: WITResources.NoSuggestionsFound } //  only load a small portion of required strings first (the rest is async loaded)
            } as Rooster_Async.EmojiPluginOptions);
            this._editorPlugins.push(this._emojiPlugin);
        }

        if (!this._commandBarPlugin) {
            this._commandBarPlugin = new RoosterCommandBarPlugin({
                strings: CommandBarLocaleStrings,
                onShortcutTriggered: this._publishShortcutCommandTelemetry,
                disableListWorkaround: DisableListWorkaround,
                calloutClassName,
                calloutOnDismiss
            } as Rooster_Async.RoosterCommandBarPluginOptions);
            this._editorPlugins.push(this._commandBarPlugin);
        }
    }

    private _ensureRoosterModule(): Promise<void> {
        return new Promise<void>(resolve => {
            if (RoosterReactModule && HtmlEditorStringsModule && HtmlEditorLinkPluginModule) {
                resolve();
                return;
            }

            VSS.using(
                [RoosterReactModulePath, HtmlEditorStringsModulePath, HtmlEditorLinkPluginModulePath],
                (RoosterReact: typeof Rooster_Async, HtmlEditorStrings: typeof HtmlEditorStringsModule, HtmlEditorLinkPlugin: typeof HtmlEditorLinkPluginModule): void => {
                    RoosterReactModule = RoosterReact;
                    HtmlEditorStringsModule = HtmlEditorStrings;
                    HtmlEditorLinkPluginModule = HtmlEditorLinkPlugin;
                    resolve();
                },
                VSS.handleError
            );
        });
    }

    private _initializeButtonOverrides(): void {
        const { All } = HtmlEditorStringsModule;

        const supportInsertImage = !!this.props.uploadImageHandler;
        const keys = RoosterReactModule.RoosterCommmandBarButtonKeys;
        const buttonClassName = "html-command-bar-button";
        this._buttonOverrides = [
            { key: keys.Bold, order: 0 },
            { key: keys.Italic, order: 1 },
            { key: keys.Underline, order: 2 },
            { key: keys.BulletedList, order: 3 },
            { key: keys.NumberedList, order: 4 },
            { key: keys.Highlight, order: 5, subMenuPropsOverride: { ariaLabel: All.HighlightColorPicker_AriaLabel } },
            { key: keys.FontColor, order: 6, subMenuPropsOverride: { ariaLabel: All.FontColorPicker_AriaLabel } },
            { key: keys.Emoji, order: 7, buttonClassName: css("rooster-emoji-button", buttonClassName) },
            { key: keys.Outdent, order: 8 },
            { key: keys.Indent, order: 9 },
            { key: keys.Strikethrough, order: 10 },
            { key: keys.Header, order: 11, subMenuPropsOverride: { ariaLabel: All.HeaderMenu_AriaLabel } },
            { key: keys.Code, order: 12 },
            { key: keys.ClearFormat, order: 16 },
            { key: keys.InsertImage, order: 17, exclude: !supportInsertImage },
            { key: keys.Link, order: 18 },
            { key: keys.Unlink, order: 19 }
        ];

        if (this.props.mentionsEnabled) {
            this._buttonOverrides.push({
                key: HtmlEditorStringsModule.CustomButtonKeys.AtMention,
                name: MentionResources.MentionSomeone,
                iconProps: { iconName: "Accounts" },
                onRender: RoosterReactModule.getIconOnRenderDelegate(),
                handleChange: this._createMentionButttonHandler("@"),
                order: 13
            });
            this._buttonOverrides.push({
                key: HtmlEditorStringsModule.CustomButtonKeys.HashMention,
                name: MentionResources.MentionWorkItem,
                iconProps: { iconName: "NumberSymbol" },
                onRender: RoosterReactModule.getIconOnRenderDelegate(),
                handleChange: this._createMentionButttonHandler("#"),
                order: 14
            });
            this._buttonOverrides.push({
                key: HtmlEditorStringsModule.CustomButtonKeys.PRMention,
                name: MentionResources.MentionPR,
                iconProps: { iconName: "BranchPullRequest" },
                onRender: RoosterReactModule.getIconOnRenderDelegate(),
                handleChange: this._createMentionButttonHandler("!"),
                order: 15
            });
        }

        this._buttonOverrides.forEach(b => {
            b.className = b.className || "html-command-button-root";
            b.buttonClassName = b.buttonClassName || buttonClassName;
        });
    }

    private _createMentionButttonHandler(mentionChar: string): (editor: Rooster_Async.Editor) => void {
        return (editor: Rooster_Async.Editor): void => {
            this._autocompleteControl.closeActiveAutocomplete();

            const selection = editor.getSelection();
            const alreadyHasWhitespace = selection && selection.focusNode && /\s/.test(selection.focusNode.textContent.substr(-1));
            editor.insertContent(alreadyHasWhitespace ? mentionChar : ` ${mentionChar}`);
            editor.triggerContentChangedEvent("Mentions");

            this._autocompleteControl.suggest(this._leanRoosterContentDiv);
        };
    }

    private _createAdditionalEditorPlugins(): void {
        const { uploadImageHandler: uploadImage } = this.props;
        const {
            ImageManager,
            UndoWithImagePlugin,
            ContentChangedPlugin,
            ImageResize,
            TableResize,
            PasteImagePlugin,
            DoubleClickImagePlugin,
            IgnorePasteImagePlugin
        } = RoosterReactModule;

        this._imageManager = new ImageManager({
            uploadImage,
            placeholderImageClassName: PlaceholderImageClassName
        } as Rooster_Async.ImageManagerOptions);
        this._undoPlugin = new UndoWithImagePlugin(this._imageManager);
        this._imageResizePlugin = new ImageResize(undefined, undefined, undefined, undefined, ExcludePlaceholderSelector);

        const supportInsertImage: boolean = !!uploadImage;
        this._editorPlugins = [
            new ContentChangedPlugin(this._throttledOnContentChanged),
            this._imageResizePlugin,
            new TableResize(),
            supportInsertImage ? new PasteImagePlugin(this._imageManager) : IgnorePasteImagePlugin.Instance,
            new DoubleClickImagePlugin(ExcludePlaceholderSelector),
            new HtmlEditorLinkPluginModule.HtmlEditorLinkPlugin()
        ];
    }

    private _tryUpdateState(newContent: string, isInitializing: boolean = false): boolean {
        newContent = Utils.isEmpty(newContent) ? "" : newContent;
        const viewState = this._viewState;
        if (newContent !== viewState.content) {
            viewState.content = newContent;
            viewState.isDirty = true;

            return !isInitializing;
        }

        return false;
    }

    private _endCreateScenario() {
        if (this._creationStartTime) {
            const contentLength = (this._viewState.content || "").length;
            const asyncLoaded = !!this._asynchronouslyLoaded;
            const elapsedTime = Date.now() - this._creationStartTime;
            publishEvent(
                new TelemetryEventData(TelemetryAreaName, TelemetryCreateScenario, {
                    elapsedTime,
                    contentLength,
                    asyncLoaded
                })
            );
            this._creationStartTime = null;
        }
    }

    private _publishEmojiFromKeyboardTelemetry = (): void => {
        this._publishShortcutCommandTelemetry("Emoji");
    };

    private _publishToolbarTelemetry = (command: string): void => {
        const controlName = (this.props.telemetryContext || ({} as ITelemetryContext)).controlName;
        publishEvent(
            new TelemetryEventData(TelemetryAreaName, ToolbarButtonClickFeature, {
                controlName,
                command
            })
        );
    };

    private _publishShortcutCommandTelemetry = (command: Rooster_Async.RoosterShortcutCommands | string): void => {
        const controlName = (this.props.telemetryContext || ({} as ITelemetryContext)).controlName;
        publishEvent(
            new TelemetryEventData(TelemetryAreaName, ShortcutCommandFeature, {
                controlName,
                command
            })
        );
    };

    private _handleContentChanged = (content: string, isInitializing: boolean = false): void => {
        if (this._tryUpdateState(content, isInitializing) && this.props.onChange) {
            this.props.onChange();
        }
    };

    private _updateViewState = (existingViewState: Rooster_Async.EditorViewState, content: string, isInitializing: boolean): void => {
        this._throttledOnContentChanged(content, isInitializing);
    };

    private _focusOutShellAllowMouseDown = (element: HTMLElement): boolean => {
        const isContenteditable = this._leanRoosterContentDiv && this._leanRoosterContentDiv.contains(element);

        if (!isContenteditable && this._autocompleteControl) {
            // make sure autocomplete is closed when click on a non-content-editable element
            this._autocompleteControl.closeActiveAutocomplete();
        }

        return isContenteditable;
    };

    private _focusOutShellOnFocus = (ev: React.FocusEvent<HTMLElement>): void => {
        this._commandBarPlugin.registerRoosterCommandBar(this._commandBar); // re-register command b/c we're changing mode on blur
        if (this._leanRooster) {
            this.mode = RoosterReactModule.LeanRoosterModes.Edit;
        }
    };

    private _leanRoosterOnFocus = (ev: React.FocusEvent<HTMLElement>): void => {
        const { helpText } = this.props;
        if (helpText && this._leanRooster && this._leanRooster.hasPlaceholder()) {
            announce(helpText, true);
        }
    };

    private _focusOutShellOnBlur = (ev: React.FocusEvent<HTMLElement>): void => {
        if (this._leanRooster) {
            this.mode = RoosterReactModule.LeanRoosterModes.View;
            this._imageResizePlugin.hideResizeHandle();
        }
    };

    private _leanRoosterOnRef = (ref: Rooster_Async.LeanRooster): void => {
        this._leanRooster = ref;
        this._endCreateScenario();
    };

    private _leanRoosterContentDivOnRef = (ref: HTMLDivElement): void => {
        this._leanRoosterContentDiv = ref;
        this.props.mentionsEnabled && this._setupAutocomplete();
        this._loadEmojiStrings();
    };

    private _commandBarOnRef = (ref: Rooster_Async.RoosterCommandBar): void => {
        this._commandBar = ref;
    };

    private _hyperlinkToolTipCallback = (href: string): string => {
        // roosterjs will support which link to process in the future, for now we don't show tooltip
        // href having just hash (@ mention)
        if (href.replace(location.href, "") === "#") {
            return "";
        }

        return `${href}\n${HyperlinkShortcut}`;
    };

    private _onMentionSelect = (): void => this._throttledOnContentChanged(this._leanRooster.getContent());

    private _setupAutocomplete(): void {
        VSS.using(
            AutoCompleteModuleList,
            (SocialRichTextAutocomplete: typeof Social_RichText_Autocomplete_Async): void => {
                if (this._leanRoosterContentDiv) {
                    const { RichTextAutocompleteControl } = SocialRichTextAutocomplete;

                    this._autocompleteControl = RichTextAutocompleteControl.getInstance();
                    this._autocompleteControl.attachToEditable(this._leanRoosterContentDiv);
                    this._autocompleteControl.initialize();
                    this._autoCompleteSelectedEventName = RichTextAutocompleteControl.SELECTED_EVENT_NAME;
                    this._leanRoosterContentDiv.addEventListener(this._autoCompleteSelectedEventName, this._onMentionSelect);
                }
            }
        );
    }

    private _loadEmojiStrings(): void {
        VSS.using(EmojiStringsModuleList, (EmojiStrings: typeof EmojiStrings_Async): void => this._emojiPlugin && this._emojiPlugin.setStrings(EmojiStrings.EmojiLocaleStrings));
    }
}
