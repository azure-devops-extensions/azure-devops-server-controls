/// <reference types="jquery" />

import Bundling = require("VSS/Bundling");
import Context = require("VSS/Context");
import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Events_Services = require("VSS/Events/Services");
import Menus = require("VSS/Controls/Menus");
import PopupContent = require("VSS/Controls/PopupContent");
import Telemetry = require("VSS/Telemetry/Services");
import MultiEntitySearchPreference = require("Presentation/Scripts/TFS/TFS.Host.MultiEntitySearch.Preference");
import { NavigationContextLevels } from "VSS/Common/Contracts/Platform";
import Utils_Core = require("VSS/Utils/Core");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");
import Resources = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation")

import { HubsService, HubEventNames, IHubEventArgs } from "VSS/Navigation/HubsService";

import * as VSSService from "VSS/Service";

var delegate = Utils_Core.delegate;
var domElem = Utils_UI.domElem;
var pageContext = Context.getPageContext();

export enum Entity {
    Code = 0,
    WorkItem = 1,
    Wiki = 2
}

/**
* Search box control with following capabilities
* -- Selectable search entities (Code, workitems for now)
* -- Entity specific help drop down on input focus
*/
export class MultiEntitySearchBox extends Controls.BaseControl {

    private static SEARCH_ADAPTER_CSS_SELECTOR: string = ".global-search-adapter";

    private _searchAdapter: MultiEntitySearchAdapter;
    private _$inputLabel: JQuery;
    private _input: JQuery;
    private _entitySelectorDropdown: Menus.PopupMenu;
    private _$entitySelectorDropdownIcon: JQuery;
    private _$entitySelectorDropdownContainer: JQuery;
    private _entityHelpDropdown: any;
    private _$entityHelpDropdownContainer: JQuery;
    private _isAccountOrCollectionContext: boolean;
    // We already have existing logs with this feature name and area thus, don't change values of these constants
    private static TraceArea: string = "navbar.level1.search";
    private static TraceFeature: string = "Search";

    constructor(options?) {
        super(options);
    }

    public initialize() {
        super.initialize();

        this._element.addClass("noDrop").attr('tabindex', '-1');

        this._isAccountOrCollectionContext = (pageContext.navigation.topMostLevel === NavigationContextLevels.Collection)
            || (pageContext.navigation.topMostLevel === NavigationContextLevels.Application);

        let entitiesAvailable = 0;
        Object.keys(this._options.entitySearchAvail).forEach(entity => {
            if (entity === Entity.WorkItem.toString()) {
                !(this._isAccountOrCollectionContext && !this._options.entitySearchAvail[Entity.WorkItem]) && entitiesAvailable++;
            } else {
                this._options.entitySearchAvail[entity] && entitiesAvailable++;
            }
        });

        if (entitiesAvailable > 0) {
            // Entity dropdown is visible only if number of available entities are more than 1.
            const entitySwitchAvailable: boolean = entitiesAvailable > 1;

            // Add code-search-unavailable class for code search promotion to be shown to the user.
            !this._options.entitySearchAvail[Entity.Code] && this._element.addClass("code-search-unavailable");

            this._input = $(domElem("input", "search-text"))
                .attr("type", "text")
                .attr("id", "multi-entity-search-box")
                .attr("disabled", "disabled")
                .attr("spellcheck", "false")
                .attr('tabindex', '0')
                .attr("role", "combobox")
                .attr("aria-autocomplete", "list")
                .attr("aria-expanded", "false")
                .focus(delegate(this, () => {
                    if (this._input && this._input.parent()) {
                        this._input.parent().addClass("input-focus");
                        // BugID: 634079 In zoom mode the search box is truncated so user is unable to see the multientity dropdown button.
                        // So scrolling to element when in focus.
                        this._input.parent().get(0).scrollIntoView();
                    }
                    // Show the dropdown only if it is not active i.e.already not being shown
                    if (!(this._entityHelpDropdown instanceof Menus.PopupMenu
                        && this._entityHelpDropdown.isActive())) {
                        this.popUpHelpDropdown();
                    }
                    return false;

                }))
                .blur(function () { $(this).parent().removeClass("input-focus"); })
                .keydown(delegate(this, this.onKeyDown, !entitySwitchAvailable))
                .appendTo(this._element);

            // Add entity-dropdown-unavailable class to increase searchbox width when there is no entity switch available.
            !entitySwitchAvailable && this._input.addClass("entity-dropdown-unavailable");

            var _$watchGlass = $(domElem("span", "bowtie-icon bowtie-search"))
                .attr('tabindex', '0')
                .attr("role", "button")
                .attr('aria-label', 'Search')
                .toggleClass("align-right", !entitySwitchAvailable)
                .appendTo(this._element)
                .keydown(delegate(this, (e: JQueryEventObject) => {
                    if (e.keyCode === Utils_UI.KeyCode.ENTER) {
                        // Do search
                        this.doSearch(e);
                        return false;
                    }
                }))
                .click(delegate(this, this.doSearch));

            // Show the entity selector dropdown only when entity switch is available.
            if (entitySwitchAvailable) {
                this._$entitySelectorDropdownIcon = $(domElem("span", "entity-selector-down bowtie-icon bowtie-chevron-down"))
                    .attr('tabindex', '0')
                    .attr("role", "button")
                    .attr('aria-label', Resources.ChangeSearchTypeTooltip)
                    .attr('title', Resources.ChangeSearchTypeTooltip);

                this._$entitySelectorDropdownIcon
                    .appendTo(this._element)
                    .click(delegate(this, this.showEntitySelectorMenu))
                    .keydown(delegate(this, (e: JQueryEventObject) => {
                        if (e.keyCode === Utils_UI.KeyCode.ENTER) {
                            this.showEntitySelectorMenu();
                        }
                    }));

                this._$entitySelectorDropdownContainer = $(domElem("div", "search-popup"))
                    .appendTo(this._element);
            }

            this._$entityHelpDropdownContainer = $(domElem("div", "search-help-popup"))
                .appendTo(this._element);

            // Hide the help drop down when user clicks on page background
            $(document).click(e => {
                // Ignore clicks in search text box
                if (!this._input.is(e.target) &&
                    this._input.has(e.target).length === 0) {

                    // Ignore clicks in help dropdown
                    var _$popupMenuJQuery: JQuery;
                    if (this._entityHelpDropdown instanceof Menus.PopupMenu) {
                        _$popupMenuJQuery = this._entityHelpDropdown.getElement();
                    }
                    else if (this._entityHelpDropdown && this._entityHelpDropdown.getPopup) {
                        _$popupMenuJQuery = this._entityHelpDropdown.getPopup();
                    }

                    if (_$popupMenuJQuery &&
                        !_$popupMenuJQuery.is(e.target)
                        && _$popupMenuJQuery.has(e.target).length === 0) {
                        // Hide help dropdown
                        if (this._entityHelpDropdown instanceof Menus.PopupMenu) {
                            this.resetEntityHelpPopupMenu();
                        }
                        else if (this._entityHelpDropdown) {
                            this._entityHelpDropdown.hide();
                        }
                    }
                }
            });

            let hubsService = <HubsService>VSSService.getLocalService(HubsService);
            this.configureSearchBox(this._options.defaultEntity);

            Events_Services.getService().attachEvent(HubEventNames.SelectedHubChanged,
                delegate(this, (sender: any, args: IHubEventArgs) => {
                    const hub = hubsService.getHubById(args.hubId);
                    if (hub) {
                        this._onHubGroupChanged(hub.groupId);
                    }
                })
            );
        }
    }

    private _onHubGroupChanged(selectedHubGroupId: string) {
        // getSearchEntity gives the default entity for that hub group.
        if (this._options.getSearchEntity) {
            this.configureSearchBox(
                this._options.getSearchEntity(selectedHubGroupId, this._options.entitySearchAvail));
        }
    }

    /**
    * Registers the search adapter based on the user preferences saved locally.
    * In case exception while fetching preferences or when no preferences are saved default adapters are restored.
    */
    private configureSearchBox(defaultEntity: Entity) {
        try {
            var controllerName: string = pageContext.navigation.currentController,
                useProjectScope: boolean = Boolean(pageContext.webContext.project),
                entityName: string = MultiEntitySearchPreference
                    .MultiEntitySearchPreference
                    .getUserPreference(controllerName, useProjectScope),
                // Get the entity to be configured from user preferences only when contextual navigation is disabled.
                entityToBeConfigured: Entity = entityName && !this._options.contextualNavigationEnabled
                    ? this.getEntityBasedOnUserPreference(entityName, this._isAccountOrCollectionContext)
                    : defaultEntity;
        }
        catch (e) {
            entityToBeConfigured = defaultEntity;
        }

        switch (entityToBeConfigured) {
            case Entity.Code:
                this.configureSearchBoxForCodeSearch();
                break;
            case Entity.WorkItem:
                this.configureSearchBoxForWorkItemSearch();
                break;
            case Entity.Wiki:
                this.configureSearchBoxForWikiSearch();
                break;
            default:
                throw new Error("Invalid search entity");
        }
    }

    /**
    * Gets the search adapter based on user preference saved locally with which the search box element needs to be enhanced.
    */
    private getEntityBasedOnUserPreference(entityPreference: string, isAccountOrCollectionContext: boolean): Entity {
        var $searchBoxElement: JQuery = $(MultiEntitySearchBox.SEARCH_ADAPTER_CSS_SELECTOR),
            adapter: any,
            entity: Entity;
        if ($searchBoxElement && $searchBoxElement.length === 1 && this._options) {
            switch (entityPreference.toLowerCase()) {
                case "code":
                    entity = this._options.entitySearchAvail[Entity.Code] ? Entity.Code : Entity.WorkItem;
                    break;

                // Multiple cases being handled here.
                // WIS is saved in preference and WIS is disabled, legacy WIS should be registered if not collection context.
                // WIS is saved in preference and WIS is disabled, CS should be registered in collection context.
                // WIS is saved in preference, both CS and WIS disabled, legacy WIS should be registered if not collection context.
                // WIS is saved in preference, both CS and WIS disabled,
                // in account context nothing will be rendered as this code path won't even be executed.
                case "work items":
                    entity = (this._options.entitySearchAvail[Entity.WorkItem] || !isAccountOrCollectionContext)
                        ? Entity.WorkItem : Entity.Code;
                    break;
                case "wiki":
                    entity = this._options.entitySearchAvail[Entity.Wiki]
                        ? Entity.Wiki : (this._options.entitySearchAvail[Entity.Code] ? Entity.Code : Entity.WorkItem);
                    break;
                default:
                    throw new Error("Invalid search entity.");
            }
            return entity;
        } else {
            throw new Error(".global-search-adapter not found.");
        }
    }

    /**
    * Enhance the search box with code search adapter
    */
    private configureSearchBoxForCodeSearch(): void {
        Bundling.requireModules(["Search/Scripts/Providers/Code/TFS.Search.Registration.SearchAdapters"],
            { excludeOptions: VSS.DynamicModuleExcludeOptions.CommonModules })
            .spread((_SearchAdapters: any) => {
                Controls.Enhancement.enhance(_SearchAdapters.GlobalCodeSearchAdapter,
                    MultiEntitySearchBox.SEARCH_ADAPTER_CSS_SELECTOR, { entitySearchAvail: this._options.entitySearchAvail });
            });
    }

    /**
    * Enhance the search box with work item search adapter.
    */
    private configureSearchBoxForWorkItemSearch(): void {
        Bundling.requireModules(["Search/Scripts/Providers/WorkItem/TFS.Search.Registration.WorkItemSearchAdapter"],
            { excludeOptions: VSS.DynamicModuleExcludeOptions.CommonModules })
            .spread((_SearchAdapters: any) => {
                Controls.Enhancement.registerEnhancement(_SearchAdapters.MultiEntityWorkItemSearchAdapter,
                    MultiEntitySearchBox.SEARCH_ADAPTER_CSS_SELECTOR, { entitySearchAvail: this._options.entitySearchAvail });
            });
    }

    /**
    * Enhance the search box with wiki search adapter.
    */
    private configureSearchBoxForWikiSearch(): void {
        Bundling.requireModules(["Search/Scripts/Providers/Wiki/TFS.Search.Registration.WikiSearchAdapter"],
            { excludeOptions: VSS.DynamicModuleExcludeOptions.CommonModules })
            .spread((_SearchAdapters: any) => {
                Controls.Enhancement.registerEnhancement(_SearchAdapters.MultiEntityWikiSearchAdapter,
                    MultiEntitySearchBox.SEARCH_ADAPTER_CSS_SELECTOR, { entitySearchAvail: this._options.entitySearchAvail });
            });
    }

    public setAdapter(adapter: MultiEntitySearchAdapter) {
        var watermarkText: string;

        this._searchAdapter = adapter;

        watermarkText = adapter.getWatermarkText(this._options.contextualNavigationEnabled, this._isAccountOrCollectionContext);
        Utils_UI.Watermark(this._input, { watermarkText: watermarkText });

        // Enable input now that it is ready
        this._input.removeAttr("disabled");

        // Adding accessibility attributes depending on entity
        this._input.attr("aria-label", watermarkText);

        // Reset the dropdown menu
        this._element.toggleClass("noDrop", !adapter.hasDropdown());
        this.resetEntitySelectorMenu();
        this.resetEntityHelpPopupMenu();

        this._fire("searchEnabled");
    }

    private resetEntitySelectorMenu() {
        this._$entitySelectorDropdownContainer && this._$entitySelectorDropdownContainer.empty();
        this._entitySelectorDropdown = null;
    }

    // Defines behavior for Key down operations in input box
    private onKeyDown(e: any, isMultiEntityDropDownDisabled: boolean) {
        if (e.keyCode === Utils_UI.KeyCode.ENTER) {
            // Do search
            this.doSearch(e);
            return false;
        }
        else if (!isMultiEntityDropDownDisabled && e.keyCode === Utils_UI.KeyCode.PAGE_DOWN) {
            // Show entity selector
            this.resetEntityHelpPopupMenu();
            this.showEntitySelectorMenu();
            return false;
        }
        else if (e.keyCode === Utils_UI.KeyCode.ESCAPE ||
            e.keyCode === Utils_UI.KeyCode.TAB) {
            // Hide all popups
            if (this._entityHelpDropdown instanceof Menus.PopupMenu) {
                this.resetEntityHelpPopupMenu();
            }
            else if (this._entityHelpDropdown) {
                this._entityHelpDropdown.hide();
            }

            if (!isMultiEntityDropDownDisabled) {
                this.resetEntitySelectorMenu();
            }

            // Returning true so that the default event handling of tab key is not suppressed.
            return true;
        }
        else if (e.keyCode === Utils_UI.KeyCode.DOWN &&
            this._entityHelpDropdown &&
            this._entityHelpDropdown.selectFirstItem) {
            // this._entityHelpdropDown can either be a Jquery element or an instance of PoupMenu
            // Checking for nullabiliy of "selectFirstItem" method. Invoke the method only if it exists.
            this._entityHelpDropdown.selectFirstItem();
        }
    }

    private doSearch(e: JQueryEventObject) {
        var searchText = $.trim(this._input.val());
        if (searchText && this._searchAdapter) {
            this._searchAdapter.performSearch(searchText, SearchBoxHelper.openInNewTab(e));
            this.resetEntitySelectorMenu();
            this.resetEntityHelpPopupMenu();
        }
    }

    private popUpHelpDropdown(): void {
        if (!this._entityHelpDropdown && this._searchAdapter) {
            this._searchAdapter.getHelpDropdownMenu(this._input, this._$entityHelpDropdownContainer, this, (helpPopup) => {

                this._entityHelpDropdown = helpPopup;
                if (this._entityHelpDropdown instanceof Menus.PopupMenu) {
                    (<Menus.PopupMenu>this._entityHelpDropdown).getElement().attr("id", "multi-entity-legacy-workitem-dropdown");
                    this._input.attr("aria-owns", "multi-entity-legacy-workitem-dropdown")
                        .attr("aria-controls", "multi-entity-legacy-workitem-dropdown");
                }

                this.showHelpDialog();
            });
        }
        else {
            this.showHelpDialog();
        }
    }

    private showHelpDialog(): void {
        var isPopupMenu = this._entityHelpDropdown instanceof Menus.PopupMenu;
        this._input.attr("aria-expanded", "true");
        if (!isPopupMenu) {
            this._entityHelpDropdown.show();
        }
        // just being defensive adding check for nullability for 'popup' method.
        else if (this._entityHelpDropdown.popup) {
            this._entityHelpDropdown.popup(this._input, this._$entityHelpDropdownContainer);
        }
    }

    private showEntitySelectorMenu(): void {
        if (this._searchAdapter && this._searchAdapter.hasDropdown()) {
            if (!this._entitySelectorDropdown) {
                this._entitySelectorDropdown = <Menus.PopupMenu>Controls.BaseControl.createIn(Menus.PopupMenu, this._$entitySelectorDropdownContainer, {
                    align: "right-bottom",
                    items: [{ childItems: this._searchAdapter.getEntitySelectorDropdownItems }],
                    executeAction: delegate(this, this.onEntitySelectionChange)
                });
            }

            // Passing the focus element as null otherwise both Code and WIS dropdowns
            // appear on entity change due to a race condition.
            this._entitySelectorDropdown.popup(null, this._element);
        }
    }

    private onEntitySelectionChange(e?) {
        var $searchBoxElement: JQuery = $(MultiEntitySearchBox.SEARCH_ADAPTER_CSS_SELECTOR),
            adapter: any = e.get_commandArgument().adapter,
            entitySelected = adapter.prototype.getEntityId();
        Controls.Enhancement.enhance(adapter, $searchBoxElement, { entitySearchAvail: this._options.entitySearchAvail });

        // set entity preference in local storage
        try {
            let controllerName: string = pageContext.navigation.currentController,
                useProjectScope: boolean = Boolean(pageContext.webContext.project);
            MultiEntitySearchPreference.MultiEntitySearchPreference.setUserPreference(controllerName, entitySelected, useProjectScope);
        }
        catch (e) {
            // No-op
        }

        this.resetEntityHelpPopupMenu();

        // Initiate search if user has already typed in an input
        if (this._input.val() !== "") {
            this.doSearch(e);
        }
        else {
            // On entity change, focus input box so that help menu is displayed
            this._input.focus();
        }

        let telemetryData: { [key: string]: any } = { "L1SearchBoxEntitySwitch": entitySelected };
        Telemetry.publishEvent(new Telemetry.TelemetryEventData(MultiEntitySearchBox.TraceArea, MultiEntitySearchBox.TraceFeature, telemetryData));

        return false;
    }

    // Clear help dropdown popup
    private resetEntityHelpPopupMenu(): void {
        this._$entityHelpDropdownContainer && this._$entityHelpDropdownContainer.empty();
        this._entityHelpDropdown = null;
        this._input.attr("aria-expanded", "false");
    }
}

Controls.Enhancement.registerEnhancement(MultiEntitySearchBox, ".multi-entity-search-box");


/**
* Interface that defines a new adapter for entity selectable search box control
*/
export class MultiEntitySearchAdapter extends Controls.Enhancement<any> {

    constructor(options?: any) {
        super(options);
        this._options = options;
    }

    public _enhance(element: JQuery) {
        var searchBox = <MultiEntitySearchBox>Controls.Enhancement.ensureEnhancement(MultiEntitySearchBox, element);
        if (searchBox) {
            searchBox.setAdapter(this);
        }
    }

    public hasDropdown(): boolean {
        return false;
    }

    public getEntitySelectorDropdownItems = (contextInfo, callback, errorCallback): void => {
        this._getEntitySelectorDropdownItems(contextInfo, callback, errorCallback);
    }

    protected _getEntitySelectorDropdownItems(contextInfo, callback, errorCallback): void {
        callback([]);
    }

    public getWatermarkText(isContextualNavigationEnabled: boolean, isCollectionContext: boolean): string {
        return "";
    }

    public getHelpDropdownMenu(inputControl: JQuery, parent: JQuery, triggerSearchContext: any, successCallback): void {
        successCallback($(domElem("div")));
    }

    public performSearch(searchText: string, openInNewTab?: boolean) {
        Diag.Debug.fail("MultiEntitySearchAdapter must override performSearch.");
    }

    public getEntityId(): string {
        return null;
    }
}

export class SearchBoxHelper {
    /**
     * Checks whether user clicked or entered with Ctrl key pressed in an input control
     * @param e User action event in an input control
     */
    public static openInNewTab(e: JQueryEventObject): boolean {
        return (e && (e.ctrlKey && !e.altKey && (e.type === 'click' || e.keyCode === Utils_UI.KeyCode.ENTER)));
    }
}
