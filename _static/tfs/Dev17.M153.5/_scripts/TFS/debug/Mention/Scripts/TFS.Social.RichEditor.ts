import Context = require("VSS/Context");
import Social_RichText_Autocomplete = require("Mention/Scripts/TFS.Social.RichText.Autocomplete");
import VSS_Diag = require("VSS/Diag");
import VSS_RichEditor = require("VSS/Controls/RichEditor");

/**
 * This extension enables mention autocomplete functionality for a RichEditor.
 */
export class RichEditorAutocompleteExtension {
    public static SOCIAL_CSS_MODULE_PATH = "Mention";

    constructor(private _richEditor: VSS_RichEditor.RichEditor) {
        if (!_richEditor) throw new Error("_richEditor is required");
        _richEditor.ready(() => {
            this._addSocialStyleSheetToEditable();
            this._wrapRichTextControlMethods();
            Social_RichText_Autocomplete.RichTextAutocompleteControl.getInstance().attachToEditable(this._getEditable());
        });
    }

    public prefetch() {
        Social_RichText_Autocomplete.RichTextAutocompleteControl.getInstance().prefetch();
    }

    public dispose() {
        // Guard against EDGE BUG: There's a cross-origin check bug that prevents access to the document even though the window is SAME ORIGIN
        try {
            const editorWindow: Window = this._richEditor.getWindow();
            let editorDocument: Document;
            let editorBody: HTMLBodyElement;
            if (editorWindow) editorDocument = editorWindow.document;
            if (editorDocument) editorBody = <HTMLBodyElement>editorDocument.body;
            if (editorBody) {
                const autocompleteControl = Social_RichText_Autocomplete.RichTextAutocompleteControl.getInstance();
                autocompleteControl.cleanUpEditor(editorBody);
            }
        }
        catch (e) {
            VSS_Diag.logWarning("RichEditorAutocompleteExtension.dispose failed");
        }
    }

    private _getEditable(): HTMLElement {
        const editableWindow = this._richEditor.getWindow();
        if (!editableWindow || !editableWindow.document || !editableWindow.document.body) {
            throw new Error("rich text control is not ready");
        }
        return editableWindow.document.body;
    }

    private _addSocialStyleSheetToEditable() {
        const editorDoc = this._richEditor.getWindow().document;
        const cssUrl = Context.getCssModuleUrl("", RichEditorAutocompleteExtension.SOCIAL_CSS_MODULE_PATH);
        const linkNode = editorDoc.createElement('link');
        linkNode.setAttribute('rel', 'stylesheet');
        linkNode.setAttribute('type', 'text/css');
        linkNode.setAttribute('href', cssUrl);
        editorDoc.head.appendChild(linkNode);
    }

    private _wrapRichTextControlMethods() {
        const that = this;
        const rtc = this._richEditor;

        const originalSetValue = rtc.setValue;
        rtc.setValue = function () {
            that._onBeforeSetValue();
            originalSetValue.apply(rtc, arguments);
        }

        const originalGetValue = rtc.getValue;
        rtc.getValue = function () {
            that._onBeforeGetValue();
            let value = originalGetValue.apply(rtc, arguments);
            that._onAfterGetValue();
            return value;
        }
    }

    private _onBeforeSetValue() {
        const e = $.Event("beforeSetValue"); // This event object will be only used for telemetry
        Social_RichText_Autocomplete.RichTextAutocompleteControl.getInstance().resetEditable(e, this._getEditable());
    }

    private _onBeforeGetValue() {
        Social_RichText_Autocomplete.RichTextAutocompleteControl.getInstance().stashHighlight(this._getEditable());
    }

    private _onAfterGetValue() {
        Social_RichText_Autocomplete.RichTextAutocompleteControl.getInstance().unstashHighlight(this._getEditable());
    }
}