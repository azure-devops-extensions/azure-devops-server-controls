import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { Editor, EditorPlugin, ExtractContentEvent, PluginEvent, PluginEventType } from "RoosterReact/rooster-react-amd";
import { ActionUrl } from "WorkItemTracking/Scripts/ActionUrls";
import { getTranslatorService } from "VSS/Utils/Url";
import { startsWith, ignoreCaseComparer } from "VSS/Utils/String";
import { LinkingUtilities } from "VSS/Artifacts/Services";

const OriginalUrlAttribute = "data-html-editor-org-href";
const AnchorRegex = /(<a\s+([^>]*\s+)?)(data\-html\-editor\-org\-href="([^"]*)")(\s?)([^>]*>)/gm;
const XmvitUrlRegex = /^x-mvwit:workitem\/([0-9]+)$/;

export class HtmlEditorLinkPlugin implements EditorPlugin {
    private _baseUrl: string;

    protected editor: Editor;

    public constructor() {
        const workItemsBaseUrl = TfsContext.getDefault().getActionUrl(null, "workitems");
        this._baseUrl = `${workItemsBaseUrl}/${ActionUrl.ACTION_EDIT}/`;
    }

    public initialize(editor: Editor): void {
        this.editor = editor;
    }

    public onPluginEvent(event: PluginEvent): void {
        // On content change and editor ready, we'll replace all x-vwit and VSTFS links with final links
        // so that user can CTRL+Click and right click new window. When extracting content for saving,
        // we want to go back to the original links.
        const editorReadyEvent = event.eventType === PluginEventType.EditorReady;
        if (event.eventType === PluginEventType.ContentChanged || editorReadyEvent) {
            this.editor.queryElements("a[href]", this._changeToClickable);
        } else if (PluginEventType.ExtractContent) {
            const extractContentEvent = event as ExtractContentEvent;
            extractContentEvent.content = this._getOriginalContent(extractContentEvent.content);
        }
    }

    public dispose(): void {
        this.editor = null;
    }

    private _changeToClickable = (anchor: HTMLAnchorElement) => {
        const originalHref = anchor.href;

        const result = XmvitUrlRegex.exec(originalHref);
        if (result) {
            anchor.href = `${this._baseUrl}${result[1]}`;
            anchor.setAttribute(OriginalUrlAttribute, originalHref);
        } else if (startsWith(originalHref, LinkingUtilities.VSTFS, ignoreCaseComparer)) {
            getTranslatorService().beginTranslateUrl(originalHref, null, result => {
                if (this.editor) {
                    anchor.href = result;
                    anchor.setAttribute(OriginalUrlAttribute, originalHref);
                }
            });
        }
    };

    private _getOriginalContent(content: string): string {
        if (!content) {
            return content;
        }

        return content.replace(
            AnchorRegex,
            (...groups: string[]): string => {
                const hasTrailingSpace = !!groups[5];
                let start = hasTrailingSpace ? groups[1] : groups[1].slice(0, -1);
                start = start.replace(/href="[^"]*"/, `href="${groups[4]}"`);
                const end = groups[6];
                return `${start}${end}`;
            }
        );
    }
}
