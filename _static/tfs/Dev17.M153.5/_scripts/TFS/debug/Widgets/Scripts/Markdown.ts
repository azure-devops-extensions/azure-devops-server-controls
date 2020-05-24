import Q = require("q");

import TFS_Dashboards_Common = require("Dashboards/Scripts/Common");
import Dashboard_Shared_Contracts = require("Dashboards/Scripts/Contracts");

import { MarkdownRenderer } from "ContentRendering/Markdown";
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import Dashboards_WidgetContracts = require("TFS/Dashboards/WidgetContracts");
import TFS_VersionControl_Contracts = require("TFS/VersionControl/Contracts");
import WidgetHelpers = require("TFS/Dashboards/WidgetHelpers");

import VCClient = require("VersionControl/Scripts/TFS.VersionControl.ClientServices");
import { RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import VCWikiImageTransformer = require("VersionControl/Scripts/TFS.VersionControl.WikiImageTransformer");
import VCWikiLinkTransformer = require("VersionControl/Scripts/TFS.VersionControl.WikiLinkTransformer");

import Ajax = require("VSS/Ajax");
import Controls = require("VSS/Controls");
import Controls_Menus = require("VSS/Controls/Menus");
import Events_Action = require("VSS/Events/Action");
import SDK = require("VSS/SDK/Shim");
import Utils_UI = require("VSS/Utils/UI");

import TFS_Widget_Utilities = require("Widgets/Scripts/TFS.Widget.Utilities");
import VCPathSelectorControl = require("Widgets/Scripts/Shared/VCPathSelectorControl");
import VSS_Control_BaseWidget = require("Widgets/Scripts/VSS.Control.BaseWidget");
import WidgetResources = require("Widgets/Scripts/Resources/TFS.Resources.Widgets");

import { UserContentAnchorHelper } from "ContentRendering/Markdown";
import { WidgetLinkHelper } from "Widgets/Scripts/WidgetLinkHelper";

export class MarkdownWidget
    extends VSS_Control_BaseWidget.BaseWidgetControl<IMarkdownWidgetOptions>
    implements Dashboards_WidgetContracts.IConfigurableWidget, Dashboard_Shared_Contracts.IWidgetCustomMenu {

    public _$markdownContainer: JQuery;

    public _context = TFS_Host_TfsContext.TfsContext.getDefault();

    public _markdownRendererConstructor : typeof MarkdownRenderer;

    constructor(options = <IMarkdownWidgetOptions>{}) {
        super(options);

        this._markdownRendererConstructor = MarkdownRenderer;
    }    
    /**
     * Extends options for control with style enhancements, called by base control during initialization.
     * @param {any} options for the control.
     */
    public initializeOptions(options?: IMarkdownWidgetOptions) {
        super.initializeOptions($.extend({
            coreCssClass: "markdown-widget"
        }, options));
    }

    /**
    * This tells the framework to show the stakeholder view if the current user is a stakeholder
    */
    public disableWidgetForStakeholders(settings: Dashboards_WidgetContracts.WidgetSettings): IPromise<boolean> {
        return Q(MarkdownWidget.parseVCPathInformation(this._getWidgetSettingValue(settings)) != null);
    }

    public preload(widgetSettings: Dashboards_WidgetContracts.WidgetSettings): IPromise<Dashboards_WidgetContracts.WidgetStatus> {
        this._$markdownContainer = $("<div>")
            .addClass("markdown-widget-container");

        this.getElement().append(this._$markdownContainer);
        var markdown = widgetSettings.customSettings.data;
        this._$markdownContainer.text(<string>markdown);

        return WidgetHelpers.WidgetStatusHelper.Success();
    }

    public load(widgetSettings: Dashboards_WidgetContracts.WidgetSettings): IPromise<Dashboards_WidgetContracts.WidgetStatus> {
        return this._render(widgetSettings);
    }

    public listen(event: string, data: Dashboards_WidgetContracts.EventArgs<any>): void {
        if (event === WidgetHelpers.WidgetEvent.LightboxResized) {
            var lightboxSize = <Dashboards_WidgetContracts.EventArgs<Dashboards_WidgetContracts.Size>>data;
            this.getElement().css("width", lightboxSize.data.width).css("height", lightboxSize.data.height);
            this.ensureKeyboardCanScroll();
        }
    }


    public lightbox(widgetSettings: Dashboards_WidgetContracts.WidgetSettings, lightboxSize: Dashboards_WidgetContracts.Size): IPromise<Dashboards_WidgetContracts.WidgetStatus> {
        return this.preload(widgetSettings).then(() => {

            this.getElement().addClass("lightboxed");
            this.getElement().css("width", lightboxSize.width).css("height", lightboxSize.height);

            return this.load(widgetSettings)
                .then(widgetStatus => {
                    this.ensureKeyboardCanScroll();
                    return widgetStatus;
                });
        });
    }

    /**
     * Returns true if the height (or width) of the widget's contents is greater than the height (or width) of the widget container.
     */
    private contentOverflowsWidget(): boolean {
        const container = this.getElement()[0];
        return (container.offsetWidth < container.scrollWidth) || (container.offsetHeight < container.scrollHeight);
    }

    /**
     * If the contents of the widget overflow then we want to make sure a user can tab to the widget to scroll it using the keyboard.
     */
    private ensureKeyboardCanScroll(): void {
        // Firefox automatically adds a tabstop to containers with overflow scrolling
        if (!Utils_UI.BrowserCheckUtils.isFirefox() && this.contentOverflowsWidget()) {
            this.getElement().attr("tabindex", 0);
        } else {
            this.getElement().removeAttr("tabindex");
        }
    }

    /**
     * Converts markdown from settings into HTML and displays it in the Widget. Public for unit testing purposes.
     * @param settings Passed when the widget is updated during configuration by the user.
     */
    public _render(settings?: Dashboards_WidgetContracts.WidgetSettings): IPromise<Dashboards_WidgetContracts.WidgetStatus> {
        var customSettingsData = this._getWidgetSettingValue(settings);
        this._$markdownContainer.empty();

        var pathInformation = MarkdownWidget.parseVCPathInformation(customSettingsData);
        const $markContainer = $("<div />").addClass("rendered-markdown").appendTo(this._$markdownContainer);

        if (pathInformation != null) {
            var dependencyPromises = <IPromise<any>[]>[];

            dependencyPromises.push(this._getContent(pathInformation));
            dependencyPromises.push(this._getContentRendererOptions(pathInformation));

            return Q.all(dependencyPromises).spread((content: string, transformers: Array<any>) => {
                const imageTransformer = transformers[0];
                const linkTransformer = transformers[1];

                const resultHtml = this.transformMarkdownHtml(content,linkTransformer,imageTransformer);
                $(resultHtml).appendTo($markContainer);


                this.scroll(this._$markdownContainer[0]);
                // Only notify the load success after we get the content so the loading animation can load if needed.
                if (this.performanceScenario) {
                    this.performanceScenario.addData({ pivot: "file" });
                }
                this.publishLoadedEvent({});
                if (WidgetLinkHelper.mustOpenNewWindow()) {
                    this._$markdownContainer.find("a").attr("target", "_blank");
                }
                return WidgetHelpers.WidgetStatusHelper.Success();
            }, (e) => {
                return WidgetHelpers.WidgetStatusHelper.Failure(e);
            });
        } else {
            const resultHtml = this.transformMarkdownHtml(customSettingsData);
            $(resultHtml).appendTo($markContainer);
            this.scroll(this._$markdownContainer[0]);

            if (this.performanceScenario) {
                this.performanceScenario.addData({ pivot: "content" });
            }
            this.publishLoadedEvent({});
            if (WidgetLinkHelper.mustOpenNewWindow()) {
                this._$markdownContainer.find("a").attr("target", "_blank");
            }
            return WidgetHelpers.WidgetStatusHelper.Success();
        }
    }

    private transformMarkdownHtml(content: string, linkTransformer ?: any, imageTransformer ?: any) : string {
        const renderer = new this._markdownRendererConstructor({
            linkTransformer: linkTransformer ? (href) => linkTransformer.transformLink(href) : null,
            imageUrlTransformer: imageTransformer ? (src) => imageTransformer.transformImage(src) : null,
            validateLink: MarkdownWidget.validateLinkCallback
        });        
        return renderer.renderHtml(content);
    }

    // Inspect the provided urls for all protocols we want to prevent
    // The markdown-it defaults are to allow the data protocol if it is an image but
    // we don't want to allow embeded images that we'll have to scan for malicious content
    private static BAD_PROTOCOLS = /^(vbscript|javascript|file|data):/;
    private static validateLinkCallback(url){
        var str = url.trim().toLowerCase();
        return !MarkdownWidget.BAD_PROTOCOLS.test(str);
    }

    private scroll(element: HTMLElement) {
        UserContentAnchorHelper.attach(element);
    }

    /**
     * Fetches the image and link transformers which resolve images/links within the markdown that reference files in the repository
     */
    public _getContentRendererOptions(pathInformation: VCPathSelectorControl.VCPathInformation): IPromise<Array<any>> {
        var deferred = Q.defer<Array<any>>();
        // Fetch the context for the repository that contains the markdown file backing the widget
        VCClient.beginGetContext(this._context, pathInformation.path, pathInformation.repositoryId, (repositoryContext) => {
            // Fetch the markdown file information (image transformer transforms paths relative to markdown file)
            repositoryContext.getClient().beginGetItem(
                repositoryContext,
                pathInformation.path,
                pathInformation.version,
                <VCLegacyContracts.ItemDetailsOptions>{},
                (item: VCLegacyContracts.ItemModel) => {
                    var imageTransformer = new VCWikiImageTransformer.WikiImageTransformer(repositoryContext, item);
                    var linkTransformer = new VCWikiLinkTransformer.CodeExplorerWikiLinkTransformer(repositoryContext, item);
                    deferred.resolve([imageTransformer,linkTransformer]);
                }, (error) => {
                    deferred.reject(TFS_Widget_Utilities.ErrorParser.stringifyError(error));
                });
        }, (error: any) => {
            deferred.reject(TFS_Widget_Utilities.ErrorParser.stringifyError(error));
        });

        return deferred.promise;
    }

    public _getWidgetSettingValue(widgetSettings?: Dashboards_WidgetContracts.WidgetSettings): string {
        return MarkdownWidget.getDefaultSettings(widgetSettings.customSettings.data);
    }

    /**
     * Attempts to parse path information from a string and returns null on failure
     * @param customSettingsData - The string to be parse from
     */
    public static parseVCPathInformation(customSettingsData: string): VCPathSelectorControl.VCPathInformation {
        var pathInformation: VCPathSelectorControl.VCPathInformation = null;
        if (customSettingsData) {
            try {
                pathInformation = <VCPathSelectorControl.VCPathInformation>JSON.parse(customSettingsData);
                // Because this is a free form, user could potentially parsing in a block of JSON data.
                // Verify this is a well formed VCPathInformation, and reset if not
                if (!(pathInformation.path)) {
                    pathInformation = null;
                }
            } catch (e) {
            }
        }
        return pathInformation;
    }

    public _getContent(queryParams: VCPathSelectorControl.VCPathInformation): IPromise<string> {
        var markdownContent = Q.defer<string>();
        var path = this._getUrl();

        var ajaxOptions: JQueryAjaxSettings = {
            type: "get",
            data: queryParams,
            dataType: "html",
            timeout: TFS_Dashboards_Common.ClientConstants.WidgetAjaxTimeoutMs
        };

        Ajax.issueRequest(path, ajaxOptions).then((value) => {
            var response: TFS_VersionControl_Contracts.ItemContent = JSON.parse(value);
            markdownContent.resolve(response.content);
        },
            (reason) => {
                markdownContent.reject(WidgetResources.Markdown_APICallFailed + TFS_Widget_Utilities.ErrorParser.stringifyError(reason));
            });
        return markdownContent.promise;
    }

    private _getUrl(): string {
        var context = TFS_Host_TfsContext.TfsContext.getDefault();
        var path = context.getActionUrl("itemContentJson", "versioncontrol", {
            area: "api"
        });
        return path;
    }

    /** Revert to default settings if settings are null
    * @param currentSettings current settings
    * @returns currentSettings or default settings if currentSettings are null
    */
    public static getDefaultSettings(currentSettings: string): string {
        var result = currentSettings;
        // If we didn't receive settings via constructor or context, default to resource
        // Null is the trigger for this, empty settings will return as empty string.
        if (result == null) {
            result = WidgetResources.Markdown_DefaultMarkdown;
        }
        return result;
    }

    /**
     * Callback for when settings have been updated during configuration. Public for unit testing purposes.
     * @param settings The current settings that have been configured by the user.
     */
    public reload(settings: Dashboards_WidgetContracts.WidgetSettings): IPromise<Dashboards_WidgetContracts.WidgetStatus> {
        return this._render(settings);
    }

    public getMenu(settings: Dashboards_WidgetContracts.WidgetSettings): IPromise<Controls_Menus.IMenuItemSpec[]> {
        var menuDefer = Q.defer<Controls_Menus.IMenuItemSpec[]>();
        var customSettingsData = this._getWidgetSettingValue(settings);
        var pathInformation = MarkdownWidget.parseVCPathInformation(customSettingsData);
        if (pathInformation != null) {
            menuDefer.resolve([
                {
                    id: "navigate",
                    text: WidgetResources.Markdown_ViewSourceFile,
                    title: WidgetResources.Markdown_ViewSourceFile,
                    disabled: false,
                    icon: "bowtie-icon bowtie-tfvc-raw-source",
                    action: () => {
                        Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_NAVIGATE, {
                            url: this._buildNavigateUrl(pathInformation)
                        });
                    }
                }
            ]);
        } else {
            menuDefer.resolve(null);
        }
        return menuDefer.promise;
    }

    public _buildNavigateUrl(pathInformation: VCPathSelectorControl.VCPathInformation): string {
        var url: string;
        if (TFS_Widget_Utilities.VersionControlHelper.GetRepoType(pathInformation.path) === RepositoryType.Tfvc) {
            url = this._context.getActionUrl("", "versionControl", {
                path: pathInformation.path
            } as TFS_Host_TfsContext.IRouteData);
        } else {
            // while repositoryId will unique identify the action on the git controller, it appears VC uses the name instead (but supports both server side). We should consider
            // whether we want to pass the repo name as part of the pinning contract.
            url = this._context.getActionUrl(pathInformation.repositoryId, "git", {
                path: pathInformation.path,
                version: pathInformation.version
            } as TFS_Host_TfsContext.IRouteData);
        }
        return url;
    }
}

export interface IMarkdownWidgetOptions extends Dashboard_Shared_Contracts.WidgetOptions {
}

SDK.VSS.register("dashboards.markdown", () => MarkdownWidget);
SDK.registerContent("dashboards.markdown-init", (context) => {
    return Controls.create(MarkdownWidget, context.$container, context.options);
});
