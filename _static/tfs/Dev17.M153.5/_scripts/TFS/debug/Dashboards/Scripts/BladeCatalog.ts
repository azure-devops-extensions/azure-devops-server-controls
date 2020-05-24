/// <reference types="jquery" />

import Q = require("q");

import TFS_Dashboards_BladeCommon = require("Dashboards/Scripts/BladeCommon");
import TFS_Dashboards_Common = require("Dashboards/Scripts/Common");
import { ErrorMessageControl } from "Dashboards/Scripts/ErrorMessageControl";
import TFS_Dashboards_Constants = require("Dashboards/Scripts/Generated/Constants");
import TFS_Dashboards_Resources = require("Dashboards/Scripts/Resources/TFS.Resources.Dashboards");
import TFS_Dashboards_Telemetry = require("Dashboards/Scripts/Telemetry");
import { WidgetSource } from "Dashboards/Scripts/WidgetSource";
import { WidgetSizeConverter } from "TFS/Dashboards/WidgetHelpers";
import { IBlade, IBladeOptions } from "Dashboards/Scripts/BladeContracts";
import { WidgetCatalogItemControl, WidgetCatalogItemControlOptions } from "Dashboards/Scripts/WidgetCatalogItemControl";
import {createInitialWidgetState} from "Dashboards/Scripts/CreateInitialWidgetState";
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import TFS_Dashboards_Contracts = require("TFS/Dashboards/Contracts");
import TFS_Dashboards_RestClient = require("TFS/Dashboards/RestClient");

import Contribution_Contracts = require("VSS/Contributions/Contracts");
import Contribution_Services = require("VSS/Contributions/Services");
import Controls = require("VSS/Controls");
import Controls_StatusIndicator = require("VSS/Controls/StatusIndicator");
import Service = require("VSS/Service");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import Utils_Core = require("VSS/Utils/Core");
import Performance = require("VSS/Performance");
import Utils_File = require("VSS/Utils/File");
import * as Utils_Accessibility from "VSS/Utils/Accessibility";


/**
 * Options to create BladeCatalog blade
 */
export interface IBladeCatalogOptions extends IBladeOptions {
    /** Callback to execute when widget requested to be added */
    addWidgetCallback: (widget: TFS_Dashboards_Contracts.Widget, source: WidgetSource) => IPromise<TFS_Dashboards_Contracts.Widget>;
    /** Widget scope, to filter the catalog */
    scope: TFS_Dashboards_Contracts.WidgetScope;
}

/**
 * This is a concrete blade for the catalog. It has hard coded level to 1 which is the first level possible. The reason
 * is that the catalog may have in the future configuration which will be a subsequent blade (2+).
 */
export class BladeCatalog extends TFS_Dashboards_BladeCommon.Blade<IBladeCatalogOptions> implements IBlade<IBladeCatalogOptions> {
    /**
     * The last container is the button to next and close.
     */
    public _buttons: TFS_Dashboards_BladeCommon.BladeButtons;
    public _nextButton: TFS_Dashboards_BladeCommon.BladeButton;
    public _closeButton: TFS_Dashboards_BladeCommon.BladeButton;

    public _widgetCatalogControl: WidgetCatalogControl;
    private options: IBladeCatalogOptions;

    public $allWidgetsContainer: JQuery;

    /**
     * Blade level below the configuration level.
     */
    public static BladeLevel: number = 1;

    public constructor(options: IBladeCatalogOptions) {
        super(<IBladeOptions>{
            level: BladeCatalog.BladeLevel,
            heading: options.heading,
            onWidgetContextChange: options.onWidgetContextChange,
            onBladeClose: options.onBladeClose,
            withCurtain: options.withCurtain
        });
        this.options = options;
    }

    /**
     * Override from the Blade class. Set the focus and reset the count of widget added for telemetry.
     * @param bladeComeFrom
     */
    public open(bladeComeFrom: IBlade<IBladeOptions> = null): void {
        super.open(bladeComeFrom);
        if (this._widgetCatalogControl) {
            this._widgetCatalogControl.reset();
        }
        else {
            this._widgetCatalogControl = <WidgetCatalogControl>Controls.Control.createIn<WidgetCatalogControlOptions>(
                WidgetCatalogControl, this.$allWidgetsContainer,
                <WidgetCatalogControlOptions>{
                    widgetCatalogController: new WidgetCatalogController(<WidgetCatalogControllerOptions>{
                        scope: this.options.scope,
                        widgetSelectionCallback: (s) => { this._onWidgetSelected(s); },
                        widgetConfirmedCallback: () => { this.addOrConfigure(WidgetSource.DoubleClick); }
                    }),
                    addWidgetCallback: this.options.addWidgetCallback
                }
            );
        }
    }

    public initialize() {
        super.initialize();

        const widgetCatalogInstructionsId = "widget-catalog-instructions";
        $("<span />")
            .attr("id", widgetCatalogInstructionsId) // Id needed so aria-describedby can refer to this element
            .text(TFS_Dashboards_Resources.WidgetCatalog_Instructions)
            .appendTo(this._$bladeContainerElement);

        this._$bladeContainerElement.attr("aria-describedby", widgetCatalogInstructionsId);

        // Remove the bowtie class when configuration blade is updated to use it - Feat#526064
        this.getElement()
            .addClass("config-margin")
            .addClass("bowtie-blade")
            .addClass(TFS_Dashboards_Constants.BowTieClassNames.Bowtie);

        this.$allWidgetsContainer = $('<div>')
            .addClass('main-blade-container')
            .addClass('catalog-container')
            .attr('id', "catalog-widgets-container")
            .appendTo(this._$bladeContainerElement);

        this._configureButtons();
    }

    /**
     * Action to executed when a widget is selected
     * @param {boolean} isWidgetSelected - True if selected; False when deselected
     */
    public _onWidgetSelected(isWidgetSelected: boolean): void {
        this._nextButton.setEnabled(isWidgetSelected);
    }

    /**
     * Configure default buttons for the blade catalog
     */
    public _configureButtons(): void {
        //Define the next button with a default behavior
        this._nextButton = new TFS_Dashboards_BladeCommon.BladeButton(
            TFS_Dashboards_Resources.WidgetCatalog_AddButtonTitle,
            TFS_Dashboards_BladeCommon.BladeButtons.ActionSave,
            () => {
                this.addOrConfigure(WidgetSource.AddButton);
            },
            null,
            true
        );

        //Define the close button with a default behavior. Handle propagation.
        this._closeButton = new TFS_Dashboards_BladeCommon.BladeButton(
            TFS_Dashboards_Resources.CloseCatalog,
            TFS_Dashboards_BladeCommon.BladeButtons.ActionCancel,
            () => {
                this.closeCatalog();
                return false; //This stop propagation which re-open the catalog
            },
            (eventObject: JQueryKeyEventObject) => {
                this.lastButtonHandler(eventObject);
            }
        );
        this._buttons = new TFS_Dashboards_BladeCommon.BladeButtons([
            this._nextButton,
            this._closeButton
        ]);
        this._buttons.render().appendTo(this._$bladeContainerElement);
        this._nextButton.setEnabled(false); // Must be set after render
    }

    /**
     * Save button action
     */
    public addOrConfigure(source: WidgetSource): void {
        var widgetlist = this._widgetCatalogControl.widgetCatalogController.getSelectedWidgetList();
        if (widgetlist.length > 0) {
            var metadata = widgetlist[0];
            var response = createInitialWidgetState(metadata);
            this.options.addWidgetCallback(response, source);
        }
    }

    /**
     * Close button action
     */
    public closeCatalog(): void {
        this._bladeMenuActions.requestCloseBlades().then(
            () => {
                if ($.isFunction(this.options.onBladeClose)) {
                    this.options.onBladeClose(null);
                }
            },
            () => { /* Blade hasn't finished opening */ });
    }

    /**
    * Override the focus of the BladeMenu to set to specific control of the Catalog Blade
    */
    public setFocus(): boolean {
        this._widgetCatalogControl.focus();

        // in catalog, we have access to control that should gets focus, so always return true
        return true;
    }
}

/** Options to pass to WidgetCatalogControl control create call */
export interface WidgetCatalogControlOptions {
    widgetCatalogController: WidgetCatalogController;

    /** Callback to execute when widget requested to be added */
    addWidgetCallback: (widget: TFS_Dashboards_Contracts.Widget, source: WidgetSource) => IPromise<TFS_Dashboards_Contracts.Widget>;
}

/** Options to pass to WidgetCatalogControlller constructor */
export interface WidgetCatalogControllerOptions {
    /** Callback to fire when a widget is selected or deselected */
    widgetSelectionCallback: (selected: boolean) => void;

    /** Callback to fire when widget is confirmed, after selection */
    widgetConfirmedCallback?: () => void;

    /** Widget catalog scope */
    scope: TFS_Dashboards_Contracts.WidgetScope;

    /** REST client */
    client?: TFS_Dashboards_RestClient.DashboardHttpClient;

}

/** Business logic controller for WidgetCatalogControl, separating logic from presentation */
export class WidgetCatalogController {
    private options: WidgetCatalogControllerOptions;
    private widgetCatalog: TFS_Dashboards_Contracts.WidgetMetadata[];
    private galleryUrl: string;
    private client: TFS_Dashboards_RestClient.DashboardHttpClient;

    constructor(options: WidgetCatalogControllerOptions) {
        this.widgetCatalog = [];
        this.options = options;
        if (options.client) {
            this.client = options.client;
        }
        else {
            this.client = TFS_Dashboards_Common.DashboardHttpClientFactory.getClient();
        }
    }

    private _selectedWidgetIDList: string[];

    public getMarketplaceUrl(): string {
        return this.galleryUrl;
    }

    /** Return widgets that are currently selected
    * @return {TFS_Dashboards_Contracts.WidgetMetadata[] } array of selected widgets
    */
    public getSelectedWidgetList(): TFS_Dashboards_Contracts.WidgetMetadata[] {

        var selectedWidgets: TFS_Dashboards_Contracts.WidgetMetadata[] = [];

        this._selectedWidgetIDList.forEach((selectedWidgetContributionID) => { // loop over selected widgets, as that list is smaller than whole list
            var filteredList = this.widgetCatalog
                .filter((widget) => { return widget.contributionId === selectedWidgetContributionID; })
                .forEach((value) => selectedWidgets.push(value));
        });

        return selectedWidgets;
    }

    /** Check if there's at least one widget selected
    * @return {boolean} true if there's at least one selected widget, false otherwise
    */
    public isWidgetSelected(): boolean {
        return this._selectedWidgetIDList.length > 0;
    }

    /** Load data from backend, returned promise is resolved when data is ready
    * @return {IPromise<void>} promise that gets resolved when data is loaded
    */
    public loadData(): IPromise<void> {
        this._selectedWidgetIDList = [];
        const projectId = TFS_Host_TfsContext.TfsContext.getDefault().contextData.project.id;
        var dataPromise = this.client.getWidgetTypes(this.options.scope, projectId);

        return dataPromise.then<void>(
            (typesResponse: TFS_Dashboards_Contracts.WidgetTypesResponse) => {
                // Casting server data to a larger client side interface
                this.widgetCatalog = typesResponse.widgetTypes;
                if (typesResponse._links && typesResponse._links["web"]) {
                    this.galleryUrl = typesResponse._links["web"].href;
                }
            }
        );
    }

    /** Toggle selection state of a widget
    * @param {string} id - type id of the widget to toggle.
    */
    public changeSelection(id: string): void {
        var that = this;
        var found = that._selectedWidgetIDList.indexOf(id);
        if (found >= 0) {
            that._selectedWidgetIDList.splice(found, 1);
        } else {
            that._selectedWidgetIDList.push(id);
        }
        that.options.widgetSelectionCallback(that._selectedWidgetIDList.length >= 1);
    }

    /** Toggle off all selections */
    public clearSelections(): void {
        this._selectedWidgetIDList.forEach((value) => this.changeSelection(value));
    }

    /** Check if string matches another string (i.e. text search)
    * @param {string} matchString - string to search in
    * @param {string} value - string to search for
    * @return {boolean} true if it is a match, false otherwise
    */
    public widgetMatchSearchCriteria(matchString: string, value: string): boolean {
        return (value.toLowerCase().lastIndexOf(matchString.toLowerCase()) >= 0);
    }

    /** Return all widgets available (selected or not)
    * @return {TFS_Dashboards_Contracts.WidgetMetadata[]} array of widgets available in the catalog
    */
    public getAllWidgets(): TFS_Dashboards_Contracts.WidgetMetadata[] {
        return this.widgetCatalog;
    }

    /** Search and sort widgets
    * @param {string} filter - string to search in
    * @param {WidgetCatalogSortOrder} orderBy - sort order to return in
    * @return {TFS_Dashboards_Contracts.WidgetMetadata[]} array of matching widgets
    */
    public search(filter: string = null, orderBy: WidgetCatalogSortOrder = WidgetCatalogSortOrder.Alphabetical):
        TFS_Dashboards_Contracts.WidgetMetadata[] {
        var widgetArray: TFS_Dashboards_Contracts.WidgetMetadata[] = [];
        var that = this;
        this.widgetCatalog.forEach(function (arg) {
            if (!filter || that.widgetMatchSearchCriteria(filter, arg.name) || that.widgetMatchSearchCriteria(filter, arg.description)) {
                widgetArray.push(arg);
            }
        });
        if (orderBy) {
            widgetArray.sort((v1: TFS_Dashboards_Contracts.WidgetMetadata, v2: TFS_Dashboards_Contracts.WidgetMetadata): number => {
                var orderRelation = Utils_String.localeIgnoreCaseComparer(v1.name, v2.name);
                if (orderBy === WidgetCatalogSortOrder.ReverseAlphabetical) {
                    orderRelation *= -1;
                }
                return orderRelation;
            });
        }
        if (filter) {
            let announcement;
            if (widgetArray.length === 1) {
                announcement = Utils_String.format(TFS_Dashboards_Resources.WidgetCatalog_AnnounceSingleSearchResultFormat, filter);
            } else {
                announcement = Utils_String.format(TFS_Dashboards_Resources.WidgetCatalog_AnnouncePluralSearchResultFormat, widgetArray.length, filter);
            }
            Utils_Accessibility.announce(announcement, false /*assertive*/);
        }
        return widgetArray;
    }

    public widgetConfirmed() {
        if ($.isFunction(this.options.widgetConfirmedCallback)) {
            this.options.widgetConfirmedCallback();
        }
    }
}

/** Sort order types */
export enum WidgetCatalogSortOrder {
    Alphabetical = 1,
    ReverseAlphabetical = 2
}

/** Widget Catalog visual control, separating presentation from logic */
export class WidgetCatalogControl extends Controls.Control<WidgetCatalogControlOptions> {
    public _$itemListContainer: JQuery;
    public _itemList: WidgetCatalogItemControl[];
    public _$widgetFilterBox: JQuery;
    public _statusControl: Controls_StatusIndicator.StatusIndicator;
    public widgetCatalogController: WidgetCatalogController;
    public _$noResultsMessage: JQuery;
    public _errorControl: ErrorMessageControl;

    constructor(options: WidgetCatalogControlOptions) {
        super(options);
        this.widgetCatalogController = options.widgetCatalogController;
    }

    public focus(): void {
        // we need to delay triggering the focus. This needs to happen because if we switch between the config and the catalog, focusing too early is causing
        // the catalog to shift the entire grid. This typically happens if the control inside the blade tries to nab focus a little too early
        // when the blade switch is animating in.
        Utils_Core.delay(this, 50, () => { this._$widgetFilterBox.focus(); });
    }

    public initialize() {
        super.initialize();

        var catalogOpen: Performance.IScenarioDescriptor = Performance.getScenarioManager().startScenario(
            TFS_Dashboards_Telemetry.DashboardsTelemetryConstants.Area,
            TFS_Dashboards_Telemetry.DashboardScenarios.CatalogOpen);

        this._errorControl = <ErrorMessageControl>Controls.BaseControl.createIn(
            ErrorMessageControl, this.getElement(), {});

        this._addFilterControl();
        // Disable text box until data loads
        this._$widgetFilterBox.attr("disabled", "disabled");

        this._statusControl = <Controls_StatusIndicator.StatusIndicator>Controls.BaseControl.createIn(
            Controls_StatusIndicator.StatusIndicator,
            this.getElement(),
            {
                center: true,
                imageClass: "big-status-progress",
                message: TFS_Dashboards_Resources.LoadingMessage
            });

        this._itemList = [];

        this._statusControl.start();
        this.widgetCatalogController.loadData().then(() => {
            const widgets = this.widgetCatalogController.search() || [];

            this._$widgetFilterBox.removeAttr("disabled");

            this._$noResultsMessage = $("<div />")
                .text(TFS_Dashboards_Resources.BladeCatalog_NoResultsFound)
                .addClass("widget-list-noresults")
                .appendTo(this.getElement());

            this._$itemListContainer = $("<div />")
                .addClass("widget-list-container")
                .attr("role", "grid")
                .attr("aria-rowcount", widgets.length)
                .attr("tabindex", "-1") // In Firefox, the container gets tab focus because overflow-y is set to 'scroll'. This line explicitly removes that tab stop to make the user experience better.
                .appendTo(this.getElement());

            var galleryUrl = this.widgetCatalogController.getMarketplaceUrl();

            if (galleryUrl) {
                var galleryLink = $("<div />")
                    .addClass("extension-gallery-marketing")
                    .appendTo(this.getElement());

                // Hardcoded to filter to widgets targeting VSTS extensions only
                // Tracking bug to fix https://mseng.visualstudio.com/VSOnline/Dashboards/_workitems?id=570477&fullScreen=false&_a=edit
                if (TFS_Host_TfsContext.TfsContext.getDefault().isHosted) {
                    galleryUrl = Utils_File.combinePaths(galleryUrl, "search?term=tag%3A%22Dashboard%20Widgets%22&target=VSTS&sortBy=Rating");
                    galleryUrl += "&utm_source=vstsproduct&utm_medium=WidgetGallery";
                }

                var linkContainer =
                    $("<div />").
                        append(
                        $("<a />")
                            .attr("href", galleryUrl)
                            .attr("target", "_blank")
                            .text(TFS_Dashboards_Resources.WidgetCatalog_GalleryLinkText)
                        );

                // Populate the text template with generated link's html
                galleryLink.html(
                    Utils_String.format(
                        TFS_Dashboards_Resources.WidgetCatalog_GalleryLink,
                        linkContainer.html()
                    )
                );
            }

            this._loadPublisherFromGallery(this.widgetCatalogController);
            this.render(widgets);

            this.focus();
            catalogOpen.end();
        },
            () => {
                this._errorControl.setErrorMessage(TFS_Dashboards_Resources.WidgetCatalog_NetworkError);
                this._errorControl.showElement();
                catalogOpen.abort();
            }
        );
    }

    /**
     * Load publisher display name as a best effort call, can be removed in the future when data is provided on the server side.
     * @param controller
     */
    private _loadPublisherFromGallery(controller: WidgetCatalogController): void {

        var extensionService = Service.getService(Contribution_Services.ExtensionService);

        // map publishers to one of their contributions.
        var publisherToContributions: IDictionaryStringTo<string> = {};
        var contributionsForSearching: string[] = [];
        controller.getAllWidgets().forEach((metaData: TFS_Dashboards_Contracts.WidgetMetadata) => {
            if (!publisherToContributions[metaData.publisherName]) {
                publisherToContributions[metaData.publisherName] = metaData.contributionId;
                contributionsForSearching.push(metaData.contributionId);
            }
        });

        // call the extension service for the contributions we are using as search filters to get extension data.
        // note that the gallery apis dont allow non publishers to access publishers data client side, so we need to proxy through the
        // EMS/Contribution service cache to get this data instead.

        extensionService.getContributions(
            contributionsForSearching,
            true/*includeRootItems*/,
            false/*includeChildren*/,
            false/*recursive*/).then((contributions: Contribution_Contracts.Contribution[]) => {

                // despite the double loop, note that the number of unique publishers are expected to be extremely low (microsoft only in most cases),
                // so the O factor x asymptomatically would be O(NLOGN)<< x < O(N).
                controller.getAllWidgets().forEach((metaData: TFS_Dashboards_Contracts.WidgetMetadata) => {
                    contributions.forEach((contribution: Contribution_Contracts.Contribution) => {
                        const publisherId = Contribution_Services.ExtensionHelper.getPublisherId(contribution);
                        if (publisherId === metaData.publisherName) {
                            // extension publisher name is its display name. Naming conventions between EMS and gallery are kind of a mess right now.
                            var providerDisplayName = extensionService.getProviderDisplayName(contribution);
                            metaData.publisherName = providerDisplayName || publisherId;
                        }
                    });

                    this._itemList.forEach((control: WidgetCatalogItemControl) => {
                        control.refreshPublisher();
                    });
                });
            });
    }

    /** Render a list of widgets
     * @param { TFS_Dashboards_Contracts.WidgetMetadata[] } array of widgets
     */
    public render(data: TFS_Dashboards_Contracts.WidgetMetadata[]): void {

        // If the list container is not initialized yet (loadData is still running), this is invalid sequence
        if (!this._$itemListContainer) {
            return;
        }
        this._itemList.forEach((control) => { control.dispose() });

        this._$itemListContainer.empty();
        this._itemList = [];

        if (data.length === 0) {
            this._$itemListContainer.hide();
            this._$noResultsMessage.show();
        }
        else {
            this._$itemListContainer.show();
            this._$noResultsMessage.hide();
            data.forEach((widget, index) => {
                this._itemList.push(<WidgetCatalogItemControl>Controls.Control.createIn<WidgetCatalogItemControlOptions>(WidgetCatalogItemControl, this._$itemListContainer,
                        <WidgetCatalogItemControlOptions>{
                            onselect: (control: WidgetCatalogItemControl) => { this.selectionChangedHandler(control) },
                            onGridNavigate: (control: WidgetCatalogItemControl, keyCode: number) => this.gridNavigationHandler(control, keyCode),
                            widget: widget,
                            index: index + 1,
                            onconfirm: () => { this.widgetCatalogController.widgetConfirmed(); },
                            addWidgetCallback: this._options.addWidgetCallback
                        }));
            });
            this._itemList[0].getElement().attr("tabindex", 0);

            this.widgetCatalogController.clearSelections();
        }

        this._statusControl.complete();
    }

    /** Handler to toggle widget selection
     * @param WidgetCatalogItemControl control that was clicked on
     */
    public selectionChangedHandler(control: WidgetCatalogItemControl): void {
        var selectedContributionId = control.getWidget().contributionId;
        this.widgetCatalogController.clearSelections();
        this.widgetCatalogController.changeSelection(selectedContributionId);
        this._itemList.forEach((listcontrol) => {
            if (listcontrol.getWidget().contributionId === selectedContributionId) {
                listcontrol.select();
            }
            else {
                listcontrol.deselect();
            }
        });
    }

    /**
     * Handler to support keyboard navigation within grid.
     * @param control
     */
    public gridNavigationHandler(control: WidgetCatalogItemControl, keyCode: number): void {
        let controlIndex = this._itemList.indexOf(control);
        let target: WidgetCatalogItemControl;
        let listEnd: number = this._itemList.length - 1;

        if (keyCode === Utils_UI.KeyCode.UP && controlIndex > 0) {
            target = this._itemList[controlIndex - 1];
        }
        else if (keyCode === Utils_UI.KeyCode.DOWN && controlIndex < listEnd) {
            target = this._itemList[controlIndex + 1];
        }
        else if (keyCode === Utils_UI.KeyCode.HOME && controlIndex > 0) {
            target = this._itemList[0];
        }
        else if (keyCode === Utils_UI.KeyCode.END && controlIndex < listEnd) {
            target = this._itemList[listEnd];
        }


        if (target != null) {
            control.deselect();
            this.selectionChangedHandler(target);
        }
    }

    private searchTimeoutHandle: number;

    /** Trigger search timeout and wait, then search. If less than 500ms passed between calls, wait another 500ms before searching.
    */
    public searchWidgetsDelayed(): void {
        var that = this;
        // Reset previous timer if there is any.
        if (that.searchTimeoutHandle != null) {
            window.clearTimeout(that.searchTimeoutHandle);
            that.searchTimeoutHandle = null;
        }

        that.searchTimeoutHandle = window.setTimeout(function () {
            that.searchWidgets();
        }, 500);
    }

    /** Do the search and render results
    */
    public searchWidgets(): void {
        var filter: string;
        filter = this._$widgetFilterBox.val();
        this.render(this.widgetCatalogController.search(filter));
    }

    /**
     * Resets the control to initial state
     */
    public reset(): void {
        this._$widgetFilterBox.val("");
        this.render(this.widgetCatalogController.search());
    }

    /** Draw search control
    */
    private _addFilterControl(): void {

        var container = $("<div />")
            .addClass("icon-input-container")
            .addClass("widget-searchterm-container");

        let searchIcon = $("<span/>")
            .addClass("bowtie-icon")
            .addClass("bowtie-search");

        this._$widgetFilterBox = $(Utils_UI.domElem("input",
            TFS_Dashboards_Constants.DomClassNames.WidgetSearchTermInput));

        this._$widgetFilterBox
            .attr({
                "type": "text",
                "maxlength": 60,
                "role": "search",
                "aria-label": TFS_Dashboards_Resources.AddWidgetDialogSearchBoxWatermark
            })
            .addClass("input-icon-right")
            .focusin(() => {
                container.addClass("focus");
            })
            .focusout(() => {
                container.removeClass("focus");
            })
            .keyup((event: JQueryEventObject) => {
                event.preventDefault();
                var keycode = event.keyCode || event.which;
                // We are skipping those special key to make the tabbing experience more user friendly and not reset the selection
                if (keycode != Utils_UI.KeyCode.TAB && keycode != Utils_UI.KeyCode.SPACE && keycode != Utils_UI.KeyCode.SHIFT) {
                    this.searchWidgetsDelayed();
                }
            });

        Utils_UI.Watermark(this._$widgetFilterBox, { watermarkText: TFS_Dashboards_Resources.AddWidgetDialogSearchBoxWatermark });

        this._$widgetFilterBox.appendTo(container);
        searchIcon.appendTo(container);

        this.getElement().append(container);
    }
}