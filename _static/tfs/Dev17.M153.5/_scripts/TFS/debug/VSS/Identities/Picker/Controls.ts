/// <reference types="jquery" />

/// <amd-dependency path="jQueryUI/core"/>
/// <amd-dependency path="jQueryUI/button"/>
/// <amd-dependency path="jQueryUI/dialog"/>

import * as React from "react";
import * as ReactDOM from "react-dom";

import Constants_Platform = require("VSS/Common/Constants/Platform");
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";

import Context = require("VSS/Context");
import Controls = require("VSS/Controls");
import Dialogs = require("VSS/Controls/Dialogs");
import Diag = require("VSS/Diag");
import Events_Services = require("VSS/Events/Services");
import Identities_Picker_Common = require("VSS/Identities/Picker/Common");
import Identities_Picker_Constants = require("VSS/Identities/Picker/Constants");
import Identities_Picker_RestClient = require("VSS/Identities/Picker/RestClient");
import Identities_Picker_Services = require("VSS/Identities/Picker/Services");
import Identities_Picker_Cache = require("VSS/Identities/Picker/Cache");
import Notifications = require("VSS/Controls/Notifications");
import PersonaCard_Lazy = require("VSS/Identities/Picker/PersonaCard");
import Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import Service = require("VSS/Service");
import StatusIndicator = require("VSS/Controls/StatusIndicator");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import Telemetry = require("VSS/Telemetry/Services");
import VSS = require("VSS/VSS");
import Q = require("q");
import { RichContentTooltip } from "VSS/Controls/PopupContent";
/**
 * Identity picker common control
 **/

var domElem = Utils_UI.domElem;
var delegate = Utils_Core.delegate;
var keyCode = Utils_UI.KeyCode;

enum DropdownSelectionIndexType {
    SelectNone = -1,
    SelectFirstItem = 0
}

interface IUsageException {
    message: string;
    source: string;
    parameter?: string;
    details?: any;
}

interface IArgumentException {
    message: string;
    source: string;
    parameter?: string;
    details?: any;
}

export interface IControlAlignmentOptions {
    /**
    *   the vertex of the dropdown which coincides with the baseAlign (horizontal-vertical). See UI.Positioning for details. Default is "left-top"
    **/
    elementAlign?: string;
    /**
    *   the vertex of the base element used as a reference for positioning (horizontal-vertical). See UI.Positioning for details. Default is "left-bottom"
    **/
    baseAlign?: string;
    /**
    *   an element, or a function which returns an element, to be used for determining the alignment and width of the dropdown control.
    *   Refer to the width, elementAlign, and baseAlign options. Default is the container
    **/
    positioningElement?: JQuery | (() => JQuery);
}

interface ShowDropdownEventData {
    uniqueId: string;
}

interface HideDropdownEventData {
    uniqueId: string;
}

export interface UpdateActiveDescendantEventData {
    activeDescendantId: string;
    uniqueId: string;
}

export interface IIdentityPickerDropdownOptions extends
    Identities_Picker_Services.IIdentityServiceOptions,
    Identities_Picker_Services.IIdentityPickerExtensionOptions {
    /**
    *   restrict displayed identities in dropdown
    **/
    pageSize?: number;
    /**
    *   what action (usually in parent) should execute when an item in this dropdown is selected
    **/
    onItemSelect?: (identity: Identities_Picker_RestClient.IEntity) => any;
    /**
    *   a pre-render hook that takes in the list of identities that would otherwise have been displayed and rearranges or adds to them prior to returning the new list
    **/
    preDropdownRender?: (entityList: Identities_Picker_RestClient.IEntity[], isDirectorySearchEnabled?: boolean) => Identities_Picker_RestClient.IEntity[];
    /**
    *   callback allowing to peek at the search results (after rendering). Will not get executed for MRU-only searches. The callback function should not alter the rendered list
    **/
    onDirectorySearchFinished?: (identityList: Identities_Picker_RestClient.IEntity[]) => void;
    /**
    *   DEPRECATED: the minimum length of the prefix to start searching the directories - in the absence of an MRU - default 3
    **/
    minimumPrefixSize?: number;
    /**
    *   whether to display the contact card icon for each identity in the dropdown. Default false.
    **/
    showContactCard?: boolean;
    /**
    *   whether to display the MRU with the search button or just search directories directly. Default false.
    **/
    showMru?: boolean;
    /**
    *   whether to preload (e.g. the MRU identities) on control creation.
    **/
    loadOnCreate?: boolean;
    /**
    *   the width of the dropdown control. Default is max(positioningElement width, 300px)
    **/
    width?: number;
    coreCssClass?: string;
    /**
    *   the size of the control elements (Medium - most elements are 24px, Large - 32px). Default: Large
    **/
    size?: IdentityPickerControlSize;
    /**
    *   Specify the base element, and the relative alignment of the element and base
    **/
    alignment?: IControlAlignmentOptions;
    /**
    *   what action should execute when identity dropdown is hidden
    **/
    onHide?: (event?: JQueryEventObject) => void;
    /**
    *   An element that will receive focus when the contact card for an item in the dropdown is closed
    **/
    focusElementOnContactCardClose?: JQuery;
    /**
    *   Specifies whether or not the dropdown will try to use all remaining space below the positioning element.
    *   For internal use only, this is specifically for the mobile work item form where we want to show the picker in a
    *   full screen view and the behavior may change over time.
    **/
    useRemainingSpace?: boolean;
    /**
    *   Optimizations for small screen (mobile) which renders controls with additional icons and
    *   text information suitable for small screens.
    */
    smallScreenRender?: boolean;
    /**
    *   Event callback options (making sure the events from the correct instance of the dropdown are listened to)
    **/
    eventOptions?: IIdentityPickerDropdownEventOptions;
    /**
    *   (optional) JQuery selector string which specifies a DOM element to render all JQueryUI dialogs in.
    *   Currently the only dialog which is displayed is IdCardDialog, but this should be used for any future
    *   dialogs as well, in order to work with Fabric's dialog model.
    *   If this is not specified, JQueryUI's default is to append the dialog element to the <body> element.
    **/
    dialogAppendTo?: string;
    /**
     *  (optional) When turned on, the "No identities found" dropdown message will not be displayed.
     *  Default is true
    **/
    showNoIdentitiesFound?: boolean;
}

export interface IIdentityPickerDropdownEventOptions {
    /**
    *   Unique identifier that will be sent as data in events generated by this instance to distinguish it from other instances of this control
    **/
    uniqueId: string;
}

export class IdentityPickerDropdownControl extends Controls.Control<IIdentityPickerDropdownOptions> {
    //EVENTS
    /**
    *   This is intended for usage by unit tests only
    **/
    public static SHOW_DROPDOWN_EVENT_INTERNAL: string = "identity-picker-dropdown-show";
    public static HIDE_DROPDOWN_EVENT_INTERNAL: string = "identity-picker-dropdown-hide";
    public static UPDATE_ACTIVE_DESCENDANT_ID: string = "identity-picker-dropdown-update-active-descendant-id";

    public static DROPDOWN_BASE_CLASS: string = 'identity-picker-dropdown';
    public static IMAGE_MARGINS_PX: number = 8;

    private static MIN_WIDTH = 300;
    private static MAX_HEIGHT = 240;

    private static DROPDOWN_BORDER_PX: number = 2;

    private static IP_AUTHORIZATION_EXCEPTION_DETAILS_LINK = "https://aka.ms/c0eo4d";

    private static AVATAR_CLASS: string = 'identity-picture';

    private _displayedEntities: Identities_Picker_RestClient.IEntity[];
    private _mruEntities: Identities_Picker_RestClient.IEntity[];
    private _isSearchActive: boolean;
    private _isDirectorySearchEnabled: boolean;
    private _showOnlyMruIdentities: boolean;
    private _$suggestedPeople: JQuery;
    private _$itemsContainer: JQuery;
    private _$searchResultStatus: JQuery;
    private _$liveStatus: JQuery;
    private _selectedIndex: number;
    private _numItemsDisplayed: number = 0;
    private _scrollTimeout: number = 100;
    private _indexedEntityMap: IDictionaryNumberTo<JQuery>;
    private _prefix: string;
    private _isVisible: boolean;
    private _identityType: Identities_Picker_Services.IEntityType;
    private _operationScope: Identities_Picker_Services.IOperationScope;
    private _preDropdownRender: (entityList: Identities_Picker_RestClient.IEntity[], isDirectorySearchEnabled?: boolean) => Identities_Picker_RestClient.IEntity[];
    private _onDirectorySearchFinished: (identityList: Identities_Picker_RestClient.IEntity[]) => void;
    private _controlLoaded: Q.Deferred<boolean>;
    private _loadOnCreate: boolean = false;
    private _size: IdentityPickerControlSize;
    private _baseAlign: string;
    private _elementAlign: string;
    private _positioningElement: JQuery | (() => JQuery);
    private _eventOptions: IIdentityPickerDropdownEventOptions;
    private _showContactCard: boolean;
    private _isDropdownVisibleInitially: boolean;
    private _entityOperationsFacade: EntityOperationsFacade;
    private _isFiltered: boolean = true;
    private _isRepositioning: boolean = false;

    constructor(options?: IIdentityPickerDropdownOptions) {
        super(options);

        if (!('eventOptions' in options) || !options.eventOptions) {
            options.eventOptions = {
                uniqueId: ControlHelpers.getRandomString(),
            };
        }

        this.initializeOptionsInternal(options);
    }

    /**
    *   For internal / unit testing use only
    **/
    public initializeOptionsInternal(options?: IIdentityPickerDropdownOptions) {
        this._identityType = options.identityType ? options.identityType : { User: true }; //default User only
        this._operationScope = options.operationScope ? options.operationScope : { IMS: true }; //default IMS only
        this._size = (options.size !== null && options.size !== undefined) ? options.size : IdentityPickerControlSize.Large;

        if (!this._options.getFilterByScope) {
            this._options.getFilterByScope = () => null;
        }

        this._showContactCard = this._options.showContactCard;

        this._displayedEntities = [];
        this._showOnlyMruIdentities = false;
        this._enableDirectorySearch();
        if (this._options.showMru) {
            this._disableDirectorySearch();
        }
        this._isSearchActive = false;

        this._preDropdownRender = options.preDropdownRender ? options.preDropdownRender : null;
        this._onDirectorySearchFinished = options.onDirectorySearchFinished ? options.onDirectorySearchFinished : null;
        this._loadOnCreate = options.loadOnCreate ? options.loadOnCreate : false;

        this._elementAlign = this._options.alignment && this._options.alignment.elementAlign ? this._options.alignment.elementAlign : "left-top",
            this._baseAlign = this._options.alignment && this._options.alignment.baseAlign ? this._options.alignment.baseAlign : "left-bottom",
            this._positioningElement = this._options.alignment && this._options.alignment.positioningElement ? this._options.alignment.positioningElement : null;
        this._prefix = "";

        if (!Identities_Picker_Services.ServiceHelpers.isAuthenticatedMember()) {
            this._showContactCard = false;
            this._disableDirectorySearch();
            this._options.showMru = false;
            this._loadOnCreate = false;
        }

        this._controlLoaded = null;
        if (this._loadOnCreate) {
            this.load();
        }

        if (options.eventOptions) {
            this._eventOptions = options.eventOptions;
        }
    }

    public initializeOptions(options?: IIdentityPickerDropdownOptions) {
        var dropdownClass = IdentityPickerDropdownControl.DROPDOWN_BASE_CLASS + ' ' + ControlHelpers.FIXED_POSTIION_CLASS;

        super.initializeOptions(<IIdentityPickerDropdownOptions>$.extend(<IIdentityPickerDropdownOptions>{
            coreCssClass: dropdownClass,
            pageSize: options.pageSize ? options.pageSize : 10,
        }, options));
    }

    public initialize() {
        super.initialize();

        var dropdownControlMousedownDelegate = (event) => {
            event.preventDefault();
        };
        this._element.on("mousedown.identityPickerDropdown", delegate(this, dropdownControlMousedownDelegate));

        var onScrollDelegate = (e?) => {
            if (this._scrollTimeout !== null) {
                clearTimeout(this._scrollTimeout);
                this._scrollTimeout = null;
            };
            this._scrollTimeout = setTimeout(
                delegate(this, this._loadNextPage),
                100);

            return false;
        };

        if (this._options.smallScreenRender) {
            this._$suggestedPeople = $("<div>")
                .addClass("search");

            $("<span>").addClass("status-message").text(Resources_Platform.IdentityPicker_SuggestedPeople).appendTo(this._$suggestedPeople);
            this._$suggestedPeople.appendTo(this._element);
        }

        //auto scroll will not activate if all items fit into the dropdown's height
        var maxHeight = this._options.useRemainingSpace ? "" :
            Math.min((ControlHelpers.getSizePx(this._size) + IdentityPickerDropdownControl.IMAGE_MARGINS_PX) * this._options.pageSize - 10, IdentityPickerDropdownControl.MAX_HEIGHT) + 'px';

        this._$itemsContainer = $('<ul>')
            .addClass('items')
            .attr({
                'role': 'listbox',
                'id': Controls.getId().toString()
            })
            .css({
                'max-height': maxHeight
            });

        this._$liveStatus = $('<div>')
            .addClass('visually-hidden')
            .attr('aria-live', 'polite');

        this._element
            .append(this._$itemsContainer)
            .append(this._$liveStatus);
        this._$itemsContainer.scroll(delegate(this, onScrollDelegate));
    }

    public getItemsListId(): string {
        return this._$itemsContainer.length ? this._$itemsContainer.attr('id') : '';
    }

    public load(): IPromise<boolean> {
        return this._getEntityOperationsFacade().load({ loadMru: this._options.showMru, filterByScope: this._options.getFilterByScope() });
    }

    /**
    * Adds the identity to the querying identity's MRU
    **/
    public addIdentitiesToMru(localIds: string[]): void {
        if (!Identities_Picker_Services.ServiceHelpers.isAuthenticatedMember()) {
            return;
        }

        try {
            if (!localIds || localIds.length == 0) {
                return;
            }
            var validLocalIds = localIds.filter((id: string, index: number, array: string[]) => {
                if (!EntityFactory.isStringPrefixedLocalId(id)) {
                    return true;
                }
            });

            if (!validLocalIds || validLocalIds.length == 0) {
                return;
            }

            var addIdentitiesToMruSuccessCallback = (patchResult: boolean) => {
                if (this._element && patchResult == true) {
                    this._getEntityOperationsFacade().refreshUserMru(this._options.getFilterByScope());
                }
            };
            var addIdentitiesToMruFailureCallback = (errorData: any) => {
                // fail silently
            };
            var mruService = Service.getService(Identities_Picker_Services.MruService);
            mruService.addMruIdentities(validLocalIds,
                { IMS: true } as Identities_Picker_Services.IOperationScope,
                Identities_Picker_Services.MruService.DEFAULT_IDENTITY_ID,
                Identities_Picker_Services.MruService.DEFAULT_FEATURE_ID,
                { httpClient: this._options.httpClient } as Identities_Picker_Services.IMruServiceOptions,
                { consumerId: this._options.consumerId } as Identities_Picker_Services.IIdentityPickerExtensionOptions)
                .then(addIdentitiesToMruSuccessCallback, addIdentitiesToMruFailureCallback);
            this._disableDirectorySearch();
        }
        catch (e) {
            if (e === Object(e) && 'source' in e && e['source'] == "MruService") {
                //do nothing
            }
            else {
                throw e;
            }
        }
    }

    /**
    * Returns true if the dropdown is currently being shown
    **/
    public isVisible(): boolean {
        return this._isVisible;
    }

    /**
    * Returns true if the prefix was used for filtering the identities in the dropdown
    **/
    public isFiltered(): boolean {
        return this._isVisible && this._isFiltered;
    }

    public showAllMruIdentities(selectFirstByDefault: boolean = true): IPromise<Identities_Picker_RestClient.IEntity[]> {
        if (!this._options.showMru) {
            var exp: IUsageException = {
                source: "showAllMruIdentities",
                message: "The showMru option needs to be enabled to call showAllMruIdentities"
            };
            throw exp;
        }

        return this.load().then(delegate(this, (loadResult: boolean) => {
            return this._getUserMruEntitiesPostLoad(selectFirstByDefault);
        }),
            delegate(this, (loadResult: boolean) => {
                return this._getUserMruEntitiesPostLoad(selectFirstByDefault);
            }));
    }

    /**
    * Get Identities
    */
    public getIdentities(prefix: string, selectFirstByDefault: boolean = true): IPromise<Identities_Picker_RestClient.IEntity[]> {
        return this.load().then(delegate(this, (loadResult: boolean) => {
            return this._getIdentitiesPostLoad(prefix, selectFirstByDefault);
        }),
            delegate(this, (loadResult: boolean) => {
                return this._getIdentitiesPostLoad(prefix, selectFirstByDefault);
            }));
    }

    /**
    * Show the dropdown
    **/
    public show(): void {
        this.load().then(delegate(this, (loadResult: boolean) => {
            this._showPostLoad();
        }),
            delegate(this, (loadResult: boolean) => {
                this._showPostLoad();
            }));
    }

    /**
    * Hide the dropdown
    **/
    public hide(e?: JQueryEventObject, suppressHideEvent: boolean = false) {
        this._isVisible = false;

        if (this._element) {
            this._element.hide();
            this._element.parents().off(".identityPickerDropdown");
            ['scroll', 'resize'].map((event: string, index: number, array: string[]) => {
                document.removeEventListener(event, delegate(this, this._handleScrollAndResize));
            });

            this._isRepositioning = false;
        }

        if (!suppressHideEvent && this._options.onHide) {
            this._options.onHide(e);
        }

        var eventData: HideDropdownEventData = {
            uniqueId: this._eventOptions ? this._eventOptions.uniqueId : null,
        };
        Events_Services.getService().fire(IdentityPickerDropdownControl.HIDE_DROPDOWN_EVENT_INTERNAL, eventData);
    }

    public getSelectedIndex(): number {
        if (this._selectedIndex == -1) {
            return null;
        }
        return this._selectedIndex < (this._displayedEntities.length - 1) ? this._selectedIndex : this._displayedEntities.length - 1;
    }

    public getSelectedItem(): Identities_Picker_RestClient.IEntity {
        if (this._selectedIndex == -1 || this._selectedIndex > (this._displayedEntities.length - 1)) {
            return null;
        }
        return this._displayedEntities[this._selectedIndex];
    }

    public handleKeyEvent(e: JQueryEventObject): boolean {
        if (!e || !e.keyCode) {
            return true;
        }

        switch (e.keyCode) {
            case keyCode.UP:
                if (this.isVisible()) {
                    return this._prevItem();
                }
                return true;
            case keyCode.DOWN:
                if (this.isVisible()) {
                    return this._nextItem();
                }
                else {
                    this.show();
                }
                return true;
            case keyCode.PAGE_UP:
                if (this.isVisible()) {
                    return this._prevPage();
                }
                return true;
            case keyCode.PAGE_DOWN:
                if (this.isVisible()) {
                    return this._nextPage();
                }
                return true;
            case keyCode.ENTER:
                if (this.isVisible()) {
                    this._searchButtonClickDelegate();
                }
                return true;
            case keyCode.ESCAPE:
                if (this.isVisible()) {
                    this.hide(e);
                    e.stopPropagation();
                    return false;
                }
                return true;
            case keyCode.RIGHT:
                if (this.isVisible() && this._showContactCard && this._selectedIndex != -1) {
                    e.stopPropagation();
                    $('.identity-picker-contact-card-icon', this._indexedEntityMap[this._selectedIndex]).click();
                    return false;
                }
                return true;
            case keyCode.DELETE:
                if (this.isVisible() && this._options.showMru) {
                    var item = this.getSelectedItem();
                    if (item && item.isMru && EntityHelpers.isDirectoryEntityType(item)) {
                        e.stopPropagation();
                        $('.identity-picker-delete-icon', this._indexedEntityMap[this._selectedIndex]).click();
                        return false;
                    }
                    return true;
                }
                return true;
            default:
                return true;
        }
    }

    public getPrefix(): string {
        return this._prefix;
    }

    /**
    * Set the prefix but does not update the list
    **/
    public updatePrefix(prefix: string): void {
        this._prefix = prefix ? prefix.toLowerCase().trim() : "";

        if (!this._prefix) {
            this._isSearchActive = false;
            this._disableDirectorySearch();
        }
    }

    public dispose() {
        if (this._element) {
            this._element.off(".identityPickerDropdown");
            this._element.parents().off(".identityPickerDropdown");
        }
        super.dispose();
    }

    public reset() {
        this._resetSearchStatuses();
        this._prefix = "";
        this._enableDirectorySearch();
        this._displayedEntities = [];
        this._alterStateAndRender(false, false);
        this._disableDirectorySearch();
    }

    private static getClassSelector(className: string): string {
        return '.' + className;
    }

    private _getEntityOperationsFacade(): EntityOperationsFacade {
        if (!this._entityOperationsFacade) {
            this._entityOperationsFacade = Service.getService(EntityOperationsFacade);
        }

        return this._entityOperationsFacade;
    }

    private _getUserMruEntitiesPostLoad(selectFirstByDefault: boolean = true): IPromise<Identities_Picker_RestClient.IEntity[]> {
        this._isFiltered = false;
        this._showOnlyMruIdentities = true;
        this._isDropdownVisibleInitially = this._isVisible; // checking if the dropdown state changes while waiting for the response, in which case we don't reopen it forcefully
        if (!this._getEntityOperationsFacade().isUserMruReady(this._options.getFilterByScope())) {
            this._alterStateAndRender(true, false, selectFirstByDefault);
        }
        return this.load().then(delegate(this,
            (mruIdentities: Identities_Picker_RestClient.IEntity[]) => {
                return this.getIdentities(this._prefix, selectFirstByDefault);
            }));
    }

    private _enableDirectorySearch(): void {
        //expectation: once enabled directory search wont be disabled till the MRU changes, or the prefix is programmatically changed
        this._isDirectorySearchEnabled = true;
    }

    private _disableDirectorySearch(): void {
        this._isDirectorySearchEnabled = false;
    }

    private _resetSearchStatuses(): void {
        this._isSearchActive = false;
        this._disableDirectorySearch();
    }

    private _getIdentitiesPostLoad(prefix: string, selectFirstByDefault: boolean = true): IPromise<Identities_Picker_RestClient.IEntity[]> {
        var deferred = Q.defer<Identities_Picker_RestClient.IEntity[]>();
        if (!this._element) {
            deferred.reject(null);
            return deferred.promise;
        }
        this._showLoading();
        this._isDropdownVisibleInitially = this._isVisible; // checking if the dropdown state changes while waiting for the response, in which case we don't reopen it forcefully
        this._isSearchActive = false;
        this._displayedEntities = [];
        if (this._options.showMru) {
            this._mruEntities = this._getEntityOperationsFacade().getMruEntitiesUnchecked(this._options.getFilterByScope());
            var identityTypes = Identities_Picker_Services.ServiceHelpers.getIdentityTypeList(this._identityType);
            this._mruEntities = this._mruEntities.filter((identity: Identities_Picker_RestClient.IEntity) => {
                return (identityTypes.indexOf(identity.entityType.trim().toLowerCase()) >= 0);
            });
        }
        if ((!prefix || prefix.trim().length === 0) && !this._options.smallScreenRender) {
            this._resetSearchStatuses();
            //if nothing, get empty list
            if (!this._showOnlyMruIdentities) {
                this._prefix = prefix;
                this._enableDirectorySearch();
                this._alterStateAndRender(true, true);
                this._disableDirectorySearch();
                deferred.resolve([]);
                return deferred.promise;
            }
        }

        prefix = prefix.toLowerCase().trim();
        //we need to search either the MRU or DDS
        this._prefix = prefix;

        if (this._showOnlyMruIdentities) {
            //all MRU entities
            this._displayedEntities = this._mruEntities ? this._mruEntities : [];
            this._alterStateAndRender(false, false, selectFirstByDefault);
            this._showOnlyMruIdentities = false;
            this._getImagesForDisplayedEntities();
            deferred.resolve(this._displayedEntities);

            return deferred.promise;
        }

        if (this._options.showMru) {
            this._displayedEntities = EntityOperationsFacade.filterEntities(this._mruEntities, prefix);
        }
        this._isFiltered = true;

        if (this._options.showMru && !this._isDirectorySearchEnabled) {
            this._alterStateAndRender(true, false, selectFirstByDefault);
            this._getImagesForDisplayedEntities();
            deferred.resolve(this._displayedEntities);

            return deferred.promise;
        }

        return this._getDirectoryEntitiesWithRender(prefix, deferred);
    }

    private _getDirectoryEntitiesWithRender(
        prefix: string,
        entityDeferred: Q.Deferred<Identities_Picker_RestClient.IEntity[]>): IPromise<Identities_Picker_RestClient.IEntity[]> {
        this._isSearchActive = true;
        this._alterStateAndRender(true);
        return this._getDirectoryEntities(prefix, entityDeferred);
    }

    private _checkIfServerException(exceptionData: any): boolean {
        if (!exceptionData
            || !('serverError' in exceptionData)
            || !exceptionData['serverError']
            || !('typeKey' in exceptionData['serverError'])) {
            return false;
        }

        return true;
    }

    private _getMessageForIpsAuthorizationException(exceptionData: any): string {
        if (exceptionData['serverError']['typeKey'].trim() == "IdentityPickerAuthorizationException"
            && exceptionData['serverError']['customProperties'] != null) {
            var exceptionType = exceptionData['serverError']['customProperties'].identityPickerAuthorizationExceptionType;
            var exceptionMsg = Resources_Platform.IdentityPicker_ErrorAuthorizationException;

            if (exceptionType == IdentityPickerAhthorizationExceptionType.IsGuestUser) {
                exceptionMsg = Resources_Platform.IdentityPicker_GuestUserException;
            }

            return exceptionMsg;
        }

        return null;
    }

    private _getDirectoryEntities(
        prefix: string,
        entityDeferred: Q.Deferred<Identities_Picker_RestClient.IEntity[]>,
        quickSearch: boolean = false): IPromise<Identities_Picker_RestClient.IEntity[]> {

        var getIdentitiesSuccessCallback = (queryResults: Identities_Picker_RestClient.QueryTokenResultModel) => {
            if (this._element) {
                this._isSearchActive = false;
                if (prefix === this._prefix && prefix.length >= 1) {
                    this._displayedEntities = queryResults ? queryResults.identities : [];
                    this._alterStateAndRender(true);
                }
                if (this._onDirectorySearchFinished) {
                    this._onDirectorySearchFinished(this._displayedEntities);
                }
                entityDeferred.resolve(this._displayedEntities);
            }
        };

        var getIdentitiesErrorCallback = (errorData?: any) => {
            if (errorData) {
                Diag.logError("_getDirectoryEntities/getIdentitiesErrorCallback:" + JSON.stringify(errorData));
            }

            if (prefix === this._prefix) {
                if (this._checkIfServerException(errorData)) {
                    var exceptionMessage = this._getMessageForIpsAuthorizationException(errorData);
                    if (exceptionMessage) {
                        this._showError($('<span>')
                            .text(exceptionMessage + ' [')
                            .append($('<a></a>')
                                .attr('href', IdentityPickerDropdownControl.IP_AUTHORIZATION_EXCEPTION_DETAILS_LINK)
                                .text(Resources_Platform.IdentityPicker_ErrorMoreDetails)
                                .attr('target', '_blank'))
                            .append($('<span>').text(']')));
                    }
                }
                else {
                    this._showError(Resources_Platform.IdentityPicker_ErrorLoadingIdentities);
                }
            }

            this._isSearchActive = false;
            entityDeferred.reject(errorData ? errorData : null);
        };

        const filterByScope = this._options.getFilterByScope();
        //If the scope to be filtered is empty, we don't need to send requests
        if (Identities_Picker_Common.FilterByScope.isFilterByScopeEmpty(filterByScope)) {
            getIdentitiesSuccessCallback(null);
        } else {
            var entityOperationsFacadeRequest: IEntityOperationsFacadeRequest = {
                identityServiceOptions: {
                    operationScope: this._operationScope,
                    identityType: this._identityType,
                    httpClient: this._options.httpClient,
                    extensionData: this._options.extensionData,
                },
                identityExtensionOptions: {
                    consumerId: this._options ? this._options.consumerId : Identities_Picker_Constants.ConsumerId.UnknownConsumer,
                },
                prefix: prefix,
                sources: this._options.showMru ? [SourceId.Directory, SourceId.Mru] : [SourceId.Directory],
                filterByScope: filterByScope,
            };

            var response = this._getEntityOperationsFacade().search(entityOperationsFacadeRequest)
                .then(
                    (response: IEntityOperationsFacadeResponse) => {
                        for (var key in response.queryTokenResponse) {
                            response.queryTokenResponse[key].then(
                                delegate(this, getIdentitiesSuccessCallback),
                                delegate(this, getIdentitiesErrorCallback));
                        }
                    },
                    getIdentitiesErrorCallback
                );
        }

        return entityDeferred.promise;
    }

    private _getImagesForDisplayedEntities(): void {
        var getIdentityImagesSuccessCallback = (entityIdUrlMap: IDictionaryStringTo<string>) => {
            if (this._element) {
                if (!entityIdUrlMap) {
                    return;
                }

                this._displayedEntities.forEach(delegate(this, (entity: Identities_Picker_RestClient.IEntity) => {
                    if (entityIdUrlMap.hasOwnProperty(entity.entityId) && entityIdUrlMap[entity.entityId]) {
                        entity.image = entityIdUrlMap[entity.entityId];
                        //set displayed item

                        $(IdentityPickerDropdownControl.getClassSelector(IdentityPickerDropdownControl.AVATAR_CLASS), this._$itemsContainer).each((index, element) => {
                            if (element.hasAttribute("data-objectid") && (element.getAttribute("data-objectid") === entity.entityId)) {
                                element.setAttribute("src", entityIdUrlMap[entity.entityId]);
                            }
                        });
                    }
                }));
            }
        };
        var getIdentityImagesErrorCallback = (errorData?: any) => {
            //fail silently
            if (errorData) {
                Diag.logError("_getImagesForDisplayedEntities/getIdentityImagesErrorCallback:" + JSON.stringify(errorData));
            }
        };

        var entityOperationsFacadeRequest: IEntityOperationsFacadeRequest = {
            identityServiceOptions: {
                operationScope: this._operationScope,
                identityType: this._identityType,
                httpClient: this._options.httpClient,
                extensionData: this._options.extensionData,
            },
            identityExtensionOptions: {
                consumerId: this._options ? this._options.consumerId : Identities_Picker_Constants.ConsumerId.UnknownConsumer,
            },
            sources: [SourceId.Directory]
        };

        this._getEntityOperationsFacade().getImagesForEntities(this._displayedEntities, entityOperationsFacadeRequest)
            .then(getIdentityImagesSuccessCallback, getIdentityImagesErrorCallback);
    }

    private _showPostLoad(): void {
        if (this._element) {
            this._isVisible = true;
            this._element.show();
            this._setPosition();

            this._element.parents().on("scroll.identityPickerDropdown resize.identityPickerDropdown", delegate(this, this._handleScrollAndResize));
            ['scroll', 'resize'].map((event: string, index: number, array: string[]) => {
                document.addEventListener(event, delegate(this, this._handleScrollAndResize));
            });

            this._isRepositioning = false;

            var eventData: ShowDropdownEventData = {
                uniqueId: this._eventOptions ? this._eventOptions.uniqueId : null,
            };

            Events_Services.getService().fire(IdentityPickerDropdownControl.SHOW_DROPDOWN_EVENT_INTERNAL, eventData);
        }
    }

    private _handleScrollAndResize(event) {
        if (!this._isRepositioning) {
            this._isRepositioning = true;

            Utils_Core.delay(this, 500, delegate(this, () => {
                this._isRepositioning = false;
                this._setPosition();
            }));
        }
    }

    private _constructDropdown(keepIndex: boolean = false,
        setupDom: boolean = true,
        selectFirstByDefault: boolean = true): void {

        this._indexedEntityMap = {};

        if (setupDom) {
            this._setupDom();
        }

        if (!keepIndex) {
            this._selectedIndex = DropdownSelectionIndexType.SelectNone;
            if (selectFirstByDefault && this._numItemsDisplayed > 0) {
                this._setSelectedIndex(DropdownSelectionIndexType.SelectFirstItem, false);
            } else {
                this._setSelectedIndex(DropdownSelectionIndexType.SelectNone, false);
            }
        } else {
            this._setSelectedIndex(
                this._selectedIndex < this._displayedEntities.length ? this._selectedIndex : (this._isSearchActive ? this._displayedEntities.length - 1 : -1),
                true,
                Utils_UI.Positioning.VerticalScrollBehavior.Top);
        }
    }

    /**
    * Removes the identity from the querying identity's MRU
    **/
    private _removeIdentityFromMru(localId: string): void {
        try {
            if (EntityFactory.isStringPrefixedLocalId(localId)) {
                return;
            }

            var removeIdentityFromMruSuccessCallback = (patchResult: boolean) => {
                if (this._element && patchResult == true) {
                    this._getEntityOperationsFacade().refreshUserMru(this._options.getFilterByScope());
                }
            };

            var removeIdentityFromMruFailureCallback = (errorData: any) => {
                // fail silently
            };

            var mruService = Service.getService(Identities_Picker_Services.MruService);
            mruService.removeMruIdentities([localId],
                { IMS: true } as Identities_Picker_Services.IOperationScope,
                Identities_Picker_Services.MruService.DEFAULT_IDENTITY_ID,
                Identities_Picker_Services.MruService.DEFAULT_FEATURE_ID,
                { httpClient: this._options.httpClient } as Identities_Picker_Services.IMruServiceOptions,
                { consumerId: this._options.consumerId } as Identities_Picker_Services.IIdentityPickerExtensionOptions)
                .then(removeIdentityFromMruSuccessCallback, removeIdentityFromMruFailureCallback);

            this._disableDirectorySearch();
        }
        catch (e) {
            if (e === Object(e) && 'source' in e && e['source'] == "MruService") {
                //do nothing
            }
            else {
                throw e;
            }
        }
    }

    /**
    *   keepIndex: Keep the index of the selected identity at the current location
    **/
    private _alterStateAndRender(showDropDown?: boolean, keepIndex: boolean = false, selectFirstByDefault: boolean = true) {
        if (!this._element) {
            return;
        }

        //todo: potential variation here
        if (!showDropDown) {
            this.hide(void 0, true);
        }

        //no longer searching
        if (!this._prefix || this._prefix.trim().length == 0) {
            this._isSearchActive = false;
        }

        this._displayedEntities = this._displayedEntities || [];

        //change what is displayed
        if (this._preDropdownRender) {
            this._displayedEntities = this._preDropdownRender(this._displayedEntities, this._isDirectorySearchEnabled);
        }

        this._constructDropdown(keepIndex, true, selectFirstByDefault);

        if (!this._isSearchActive && !this._prefix && this._displayedEntities.length == 0) {
            this.hide();
            return;
        }

        if (showDropDown && (!this._isDropdownVisibleInitially || this._isVisible)) {
            this.show();
        }
    }

    private _fireActiveDescendantUpdate(id: string): void {
        var eventData: UpdateActiveDescendantEventData = {
            activeDescendantId: id,
            uniqueId: this._eventOptions ? this._eventOptions.uniqueId : null,
        };
        Events_Services.getService().fire(IdentityPickerDropdownControl.UPDATE_ACTIVE_DESCENDANT_ID, eventData);
    }

    /**
    * Scroll to selected item
    **/
    private _setSelectedIndex(
        newSelectedIndex: number,
        scrollIntoView: boolean,
        position: Utils_UI.Positioning.VerticalScrollBehavior = Utils_UI.Positioning.VerticalScrollBehavior.Bottom) {
        var shouldSwitchSelectedItem = newSelectedIndex !== null
            && newSelectedIndex !== undefined
            && this._indexedEntityMap && this._indexedEntityMap[newSelectedIndex]
            && (this._selectedIndex !== newSelectedIndex
                || !this._indexedEntityMap[this._selectedIndex].hasClass("selected"))
        if (shouldSwitchSelectedItem) {
            this._selectedIndex = newSelectedIndex;
            this._clearItemsSelection(this._element.find(".search"));
            this._clearItemsSelection(this._$itemsContainer.find("li"));
            this._selectItem(this._indexedEntityMap[this._selectedIndex]);

            if (scrollIntoView) {
                this._scrollItemIntoView(this._selectedIndex, position);
            }
        } else if ($.isNumeric(newSelectedIndex)) {
            this._selectedIndex = newSelectedIndex;
        }
    }

    private _scrollItemIntoView(index: number, position: Utils_UI.Positioning.VerticalScrollBehavior): void {
        if (index === null || index === undefined) {
            return;
        }

        Utils_UI.Positioning.scrollIntoViewVertical(this._indexedEntityMap[index], position);
    }

    /**
    * Set the position of this control with respect to its parent
    **/
    private _setPosition() {
        if (!this._element) {
            return;
        }

        var positioningElement = this._getPositioningElement();

        if (this._options.width) {
            this._element.width(this._options.width);
        } else {
            var width = positioningElement.outerWidth() - IdentityPickerDropdownControl.DROPDOWN_BORDER_PX;
            this._element.width((width < IdentityPickerDropdownControl.MIN_WIDTH) ? IdentityPickerDropdownControl.MIN_WIDTH : width);
        }

        if (positioningElement.is(":visible")) {
            Utils_UI.Positioning.position(this.getElement(), positioningElement, {
                elementAlign: this._elementAlign,
                baseAlign: this._baseAlign,
                overflow: "fit-flip"
            });
        }

        // for high-zoom and small window height set-ups the dropdown can still be cut at the bottom - let's reduce the height of the items list:
        const windowElement = $(window);
        const overflow = this._element.offset().top + this._element.height() - windowElement.height() - windowElement.scrollTop();
        if (overflow > 0) {
            const maxHeight = parseInt(this._$itemsContainer.css('max-height'));

            this._$itemsContainer.css('max-height', maxHeight - overflow + "px");
        }

        if (this._options.useRemainingSpace) {
            // Clear the width and left styles, they are part of the use-remaining-space class
            this._element.width("");
            this._element.css("left", "");
            this._element.addClass("use-remaining-space");

            var top = this._element.position().top;
            var maxHeight = "calc(100% - " + top + "px)";
            this._element.css("max-height", maxHeight);
        }

        if (this._options.smallScreenRender) {
            this._element.addClass("small-screen");
        }
    }

    private _getPositioningElement(): JQuery {
        var positioningElement = this._positioningElement;
        if ($.isFunction(positioningElement)) {
            positioningElement = (<() => JQuery>positioningElement)();
        }
        if (!positioningElement) {
            positioningElement = this.getElement().parent();
        }
        return <JQuery>positioningElement;
    }

    /**
    * Show the status indicator till all users are loaded
    **/
    private _showLoading() {
        this._$liveStatus.detach();
        this._$itemsContainer.detach();
        this._element.empty();

        this._$liveStatus.appendTo(this._element);

        this._$liveStatus.text(Resources_Platform.IdentityPicker_LoadingIdentities);

        this._$itemsContainer
            .empty()
            .attr("aria-busy", "true")
            .appendTo(this._element);

        var $search: JQuery = $("<div>").addClass("search").appendTo(this._element);

        var statusIndicator = <StatusIndicator.StatusIndicator>Controls.BaseControl.createIn(StatusIndicator.StatusIndicator, $search, { center: false, message: Resources_Platform.IdentityPicker_LoadingIdentities });
        statusIndicator.start();
    }

    /**
    * Show error message in case of non-2xx response
    **/
    private _showError(errorMsg: string | JQuery) {
        const message = typeof errorMsg === 'string' || errorMsg instanceof String ? $("<span>").text(<string>errorMsg) : errorMsg;

        this._$liveStatus.text(message.text());

        var $search = $(".search", this._element).empty().addClass("search-error");
        var errorMessage = <Notifications.MessageAreaControl>Controls.BaseControl.createIn(Notifications.MessageAreaControl, $search, {
            closeable: false,
            message: {
                header: message,
                type: Notifications.MessageAreaType.Error,
            },
            showIcon: false
        });
    }

    private _nextPage(): boolean {
        var nextIndex: number = -1;
        this._loadNextPage(true);

        if (this._selectedIndex < this._displayedEntities.length - 1 && this._selectedIndex !== -1) {
            nextIndex = this._selectedIndex + this._options.pageSize;
        }
        this._setSelectedIndex(nextIndex < this._displayedEntities.length ? nextIndex : this._displayedEntities.length - 1, true, Utils_UI.Positioning.VerticalScrollBehavior.Top);
        return false;
    }

    private _prevPage(): boolean {
        var nextIndex: number = 0;
        if (this._selectedIndex === -1) {
            nextIndex = this._displayedEntities.length - this._options.pageSize;
        }
        else if (this._selectedIndex > 0) {
            nextIndex = this._selectedIndex - this._options.pageSize;
        }
        this._setSelectedIndex(nextIndex >= 0 ? nextIndex : DropdownSelectionIndexType.SelectFirstItem, true, Utils_UI.Positioning.VerticalScrollBehavior.Top);
        return false;
    }

    private _nextItem(): boolean {
        if (this._selectedIndex === this._displayedEntities.length - 1) {
            const search = this._element.find(".search");
            if (search.is(':visible')) {
                this._selectedIndex = DropdownSelectionIndexType.SelectNone;
                this._clearItemsSelection(this._$itemsContainer.find("li"));
                this._selectItem(search);
            }
            else {
                this._setSelectedIndex(DropdownSelectionIndexType.SelectFirstItem, true);
            }
        }
        else if (this._selectedIndex < this._displayedEntities.length - 1) {
            this._setSelectedIndex(this._selectedIndex + 1, true);
        }

        return false;
    }

    private _prevItem(): boolean {
        if (this._selectedIndex === -1 && this._displayedEntities && this._displayedEntities.length) {
            this._clearItemsSelection(this._element.find(".search"));
            this._setSelectedIndex(this._displayedEntities.length - 1, true);
        }
        else if (this._selectedIndex > 0) {
            this._setSelectedIndex(this._selectedIndex - 1, true, Utils_UI.Positioning.VerticalScrollBehavior.Top);
        }
        return false;
    }

    private _selectItem(item: JQuery): void {
        var newId = item.attr("id") ? item.attr("id") : Controls.getId().toString();
        item.addClass("selected")
            .attr({
                "id": newId,
                "aria-selected": "true"
            });

        this._fireActiveDescendantUpdate(newId);
    }

    private _clearItemsSelection(items: JQuery): void {
        items.removeClass("selected")
            .attr("aria-selected", "false");
    }

    /**
    * Create the li that shall represent an user item
    **/
    private _createItem(index: number): JQuery {
        var callBacks: IEntityListBuilderCallbacks = {
            deleteIconClickDelegate: delegate(this, (entity: Identities_Picker_RestClient.IEntity, entityListItem: JQuery) => {
                var itemIndex = this._mruEntities.indexOf(entity);
                if (itemIndex >= 0) {
                    this._mruEntities.splice(itemIndex, 1);
                }
                itemIndex = this._displayedEntities.indexOf(entity);
                if (itemIndex >= 0) {
                    this._displayedEntities.splice(itemIndex, 1);
                }
                entityListItem.remove();
                if (entity.localId && entity.localId.trim()) {
                    this._removeIdentityFromMru(entity.localId);
                }

                this._numItemsDisplayed = Math.min(this._displayedEntities.length, Math.max(this._options.pageSize, this._numItemsDisplayed));

                this._$searchResultStatus.remove();
                this._$searchResultStatus = this._constructSearchResultStatus();
                this._showAdditionalInformation();
            }),
            entityListItemClickDelegate: delegate(this, (entity: Identities_Picker_RestClient.IEntity) => {
                this._logSelectedEntity(entity);
                if ($.isFunction(this._options.onItemSelect)) {
                    this._options.onItemSelect(entity);
                }
            })
        };

        var identityServiceOptions: Identities_Picker_Services.IIdentityServiceOptions = {
            operationScope: this._operationScope,
            identityType: this._identityType,
            httpClient: this._options.httpClient ? this._options.httpClient : null
        };

        var identityExtensionOptions: Identities_Picker_Services.IIdentityPickerExtensionOptions = {
            consumerId: this._options.consumerId,
        };

        var entityListItem: Identities_Picker_RestClient.IEntity = this._displayedEntities[index];
        var newItem = new EntityListBuilder()
            .withIdentityServiceOptions(identityServiceOptions)
            .withIdentityExtensionOptions(identityExtensionOptions)
            .withPrefix(this._prefix && this._prefix.trim() && !this._showOnlyMruIdentities ? this._prefix : "")
            .withEntity(entityListItem)
            .forControlOfSize(this._size)
            .registerCallbacks(callBacks)
            .withContactCard(this._showContactCard, this._options.focusElementOnContactCardClose)
            .withHoverSupport(!this._options.useRemainingSpace)
            .withSmallScreenRender(this._options.smallScreenRender)
            .withDialogAppendTo(this._options.dialogAppendTo)
            .build();

        this._indexedEntityMap[index] = newItem;

        return newItem;
    }

    private _logSelectedEntity(selectedItem: Identities_Picker_RestClient.IEntity): void {
        var isMaterialized: boolean = false;
        var isMru: boolean = false;
        try {

            var feature: string = Identities_Picker_Constants.Telemetry.Feature_DropdownControl;
            if (selectedItem.originDirectory.toLowerCase().trim() == Identities_Picker_Services.ServiceHelpers.VisualStudioDirectory
                || selectedItem.localDirectory.toLowerCase().trim() == Identities_Picker_Services.ServiceHelpers.VisualStudioDirectory) {
                isMaterialized = true;
            }

            if (selectedItem.isMru) {
                isMru = true;
            }

            if (this._prefix) {
                if (this._options.showMru) {
                    if (this._isDirectorySearchEnabled) {
                        feature = Identities_Picker_Constants.Telemetry.Feature_Select_Mru_Dir
                    } else {
                        feature = Identities_Picker_Constants.Telemetry.Feature_Select_Mru_Prefix;
                    }
                }
                else {
                    if (this._isDirectorySearchEnabled) {
                        feature = Identities_Picker_Constants.Telemetry.Feature_Select_Dir;
                    }
                }
            }
            else {
                if (this._options.showMru) {
                    feature = Identities_Picker_Constants.Telemetry.Feature_Select_Mru_NoPrefix;
                }
            }

            var properties: IDictionaryStringTo<any> = {};
            properties[Identities_Picker_Constants.TelemetryProperties.prefixType] = Identities_Picker_Services.ServiceHelpers.getPrefixTypeForTelemetry(this._prefix);
            properties[Identities_Picker_Constants.TelemetryProperties.prefixLength] = this._prefix.length;
            properties[Identities_Picker_Constants.TelemetryProperties.consumerId] = this._options && this._options.consumerId ? this._options.consumerId : null;
            properties[Identities_Picker_Constants.TelemetryProperties.extensionId] = this._options && this._options.extensionData && this._options.extensionData.extensionId ? this._options.extensionData.extensionId : null;
            properties[Identities_Picker_Constants.TelemetryProperties.identityTypes] = Identities_Picker_Services.ServiceHelpers.getIdentityTypeList(this._options.identityType);
            properties[Identities_Picker_Constants.TelemetryProperties.operationScopes] = Identities_Picker_Services.ServiceHelpers.getOperationScopeList(this._options.operationScope);
            properties[Identities_Picker_Constants.TelemetryProperties.isMru] = isMru;
            properties[Identities_Picker_Constants.TelemetryProperties.isNonMaterialized] = !isMaterialized;
            properties[Identities_Picker_Constants.TelemetryProperties.maxResults] = this._options && this._options.maxResults ? this._options.maxResults : Identities_Picker_Services.IdentityService.MAX_RESULTS;
            properties[Identities_Picker_Constants.TelemetryProperties.minResults] = this._options && this._options.minResults ? this._options.minResults : Identities_Picker_Services.IdentityService.MIN_RESULTS;
            properties[Identities_Picker_Constants.TelemetryProperties.entityId] = selectedItem.entityType.toLowerCase().trim() == EntityFactory.STRING_ENTITY_TYPE ? EntityFactory.STRING_ENTITY_TYPE : selectedItem.entityId;
            properties[Identities_Picker_Constants.TelemetryProperties.consumerId] = this._options.consumerId;

            var identityService = Service.getService(Identities_Picker_Services.IdentityService);
            properties = Identities_Picker_Services.ServiceHelpers.addScenarioProperties
                (Service.getService(Identities_Picker_Services.IdentityService),
                properties);

            Telemetry.publishEvent(
                new Telemetry.TelemetryEventData(
                    Identities_Picker_Constants.Telemetry.Area,
                    feature,
                    properties
                ));
        }
        catch (e) {
            //do  nothing
        }
    }

    private _setupDom(): void {
        this._$liveStatus
            .text("")
            .detach();

        this._$itemsContainer
            .empty()
            .removeAttr("aria-busy")
            .detach();

        this._element.empty();

        this._$liveStatus.appendTo(this._element);

        this._setupEntitiesInDom();

        let showSearchButton = false;
        //set search button if MRU search enabled, non-zero length prefix and not searching directories
        if (!this._isDirectorySearchEnabled && this._options.showMru && this._prefix && !this._showOnlyMruIdentities) {
            let searchButton = this._constructSearchButton().appendTo(this._element);
            this._$itemsContainer.attr("aria-owns", searchButton.attr("id"));
            showSearchButton = true;

            if (!this._displayedEntities || !this._displayedEntities.length) {
                this._selectedIndex = DropdownSelectionIndexType.SelectNone;
                this._selectItem(searchButton);
            }
        }

        if (this._displayedEntities && this._displayedEntities.length > 0) {
            this._$searchResultStatus = this._constructSearchResultStatus();
        }

        //updating it after the items are displayed in order to keep the number of items shown in the message
        if (showSearchButton) {
            const previousMessage = this._$liveStatus.text();
            this._$liveStatus.text((previousMessage ? previousMessage + ". " : "") + Resources_Platform.IdentityPicker_SearchButtonShownInDropdown);
        }

        //if no identities found - message
        this._showAdditionalInformation();
    }

    private _showAdditionalInformation() {
        if (this._displayedEntities.length === 0) {
            if (this._isSearchActive || (this._options.showMru && !this._getEntityOperationsFacade().isUserMruReady(this._options.getFilterByScope()))) {
                this._showLoading();
            } else {
                if (!this._options.showMru || (this._isDirectorySearchEnabled && this._prefix) || this._showOnlyMruIdentities) {
                    this._$liveStatus.text(Resources_Platform.IdentityPicker_NoResult);

                    if (this._options.showNoIdentitiesFound || this._options.showNoIdentitiesFound === undefined || this._options.showNoIdentitiesFound === null) {
                        this._constructInformativeMessage(Resources_Platform.IdentityPicker_NoResult).appendTo(this._element);
                    }
                }
            }
        }
        if (this._$suggestedPeople) {
            if (this._displayedEntities.length > 0) {
                this._$suggestedPeople.show();
            } else {
                this._$suggestedPeople.hide();
            }
        }
    }

    private _setupEntitiesInDom(): void {
        if (this._options.smallScreenRender) {
            this._$suggestedPeople.appendTo(this._element);
        }
        this._$itemsContainer.empty().appendTo(this._element);

        if (this._displayedEntities.length == 0) {
            this._numItemsDisplayed = 0;
        }
        else {
            this._numItemsDisplayed = Math.min(this._displayedEntities.length, Math.max(this._options.pageSize, this._numItemsDisplayed));

            for (var i = 0; i < this._numItemsDisplayed; i++) {
                if (i > this._displayedEntities.length - 1) {
                    continue;
                }

                var newItem = this._createItem(i);
                if (newItem) {
                    this._$itemsContainer.append(newItem);
                    if (!this._options.smallScreenRender) {
                        newItem.height(newItem.height() + IdentityPickerDropdownControl.IMAGE_MARGINS_PX);
                    }
                }
            }
        }
    }

    private _constructSearchResultStatus(): JQuery {
        var $searchStatus = $("<div>").addClass("search-result-status").appendTo(this._element);

        if (this._displayedEntities.length == 1 && this._numItemsDisplayed == this._displayedEntities.length) {
            const status = Utils_String.format(Resources_Platform.IdentityPicker_SingleResultStatus, this._displayedEntities.length);
            this._$liveStatus.text(status);
            $searchStatus.text(status);
        }
        else if (this._displayedEntities.length > 1 && this._numItemsDisplayed <= this._displayedEntities.length) {
            const status = Utils_String.format(Resources_Platform.IdentityPicker_MultipleResultStatus, this._displayedEntities.length);
            this._$liveStatus.text(status);
            $searchStatus.text(status);
        }
        else {
            $searchStatus.hide();
        }
        return $searchStatus;
    }

    private _constructSearchButton(): JQuery {
        let $search = $("<div>")
            .addClass("search")
            .attr({
                'role': 'button option',
                'aria-label': Resources_Platform.IdentityPicker_SearchButtonLabel,
                'tabindex': '0',
                'id': Controls.getId().toString()
            });

        let $icon = $("<span>")
            .addClass("bowtie-icon bowtie-search identity-picker-search-icon");

        let $statusMessage = $("<span>")
            .addClass("status-message")
            .text(Resources_Platform.IdentityPicker_SearchButton);

        $search.append($icon).append($statusMessage);

        $search.click(delegate(this, this._searchButtonClickDelegate));

        return $search;
    }

    private _constructInformativeMessage(errorMessageText: string): JQuery {
        var $errMessage = $("<div>").addClass("no-result").append($("<span>").addClass("status-message").text(errorMessageText).attr("role", "alert"));
        return $errMessage;
    }

    private _loadNextPage(force: boolean = false) {
        var isCloseToBottom: boolean = this._$itemsContainer.scrollTop() + this._$itemsContainer.outerHeight() >= this._$itemsContainer[0].scrollHeight - 5;

        if (force || isCloseToBottom) {
            for (var i = this._numItemsDisplayed; i < this._numItemsDisplayed + Math.min(this._displayedEntities.length - this._numItemsDisplayed, this._options.pageSize); i++) {
                var newItem = this._createItem(i);
                if (newItem) {
                    this._$itemsContainer.append(newItem);
                    newItem.height(newItem.height() + IdentityPickerDropdownControl.IMAGE_MARGINS_PX);
                }
            }

            this._numItemsDisplayed += Math.min(this._displayedEntities.length - this._numItemsDisplayed, this._options.pageSize);
            this._$searchResultStatus.remove();
            this._$searchResultStatus = this._constructSearchResultStatus();
        }

        if (this._scrollTimeout !== null) {
            clearTimeout(this._scrollTimeout);
            this._scrollTimeout = null;
        }
    }

    private _searchButtonClickDelegate(): void {
        this._enableDirectorySearch();
        this.getIdentities(this._prefix);
    }
}

export interface IIdentityPickerIdCardDialogOptions extends
    Identities_Picker_Services.IIdentityServiceOptions,
    Identities_Picker_Services.IIdentityPickerExtensionOptions {
    /**
    *   an identity to initialize with (and to avoid a call to the identity picker service API)
    **/
    identity?: Identities_Picker_RestClient.IEntity;
    /**
    *   the uniqueIdentifier of the identity which shall be used for resolving the IdCardDialog - signInAddress or entityId for users and entityId for other kinds of entities
    **/
    uniqueIdentifier?: string;
    /**
    *   The left positioning offset of the dialog
    **/
    leftValue?: number;
    /**
    *   The top positioning offset of the dialog
    **/
    topValue?: number;
    /**
    *   A base element which shall be used as reference for positioning the dialog
    **/
    anchor?: JQuery;
    /**
    *   An optional container of the anchor to be considered. Passing an iframe allows for positioning over an anchor in an other frame.
    **/
    anchorContainer?: JQuery;
    /**
    *   An element that will receive focus when the contact card is closed. If unset, the focus will go to the previously active element
    **/
    focusElementOnClose?: JQuery;
    /**
    *   Defined by JQueryUI.DialogOptions -- optional JQuery selector string for element to append dialog to, instead of DOM root
    **/
    appendTo?: string;
    /**
    *   (optional) Determines whether the new profile card should be used. Requires a dependency on Office Fabric.
    *   Default is false inside extensions, otherwise true.
    **/
    useOfficeFabricProfileCard?: boolean;
}

export class IdCardDialog extends Controls.Control<IIdentityPickerIdCardDialogOptions> {

    public static IDCARD_LOADED_EVENT: string = "idcard-finished-loading";
    private static MAX_HEIGHT = 240;
    private static IMAGE_MARGINS_PX: number = 8;
    private static MEMBERS_TAB_LEFT_PADDING_PX: number = 11;

    private static ID_CARD_LIST_CLASS = 'identity-picker-idcard-list';
    private static ID_CARD_MEMBERS_DROPDOWN_CLASS = IdentityPickerDropdownControl.DROPDOWN_BASE_CLASS;
    private static JQUERY_UI_DIALOG_CLASS = '.ui-dialog';
    private static ID_CARD_DIALOG_ID = 'idcard-dialog';

    private _identityType: Identities_Picker_Services.IEntityType;
    private _operationScope: Identities_Picker_Services.IOperationScope;
    private _identity: Identities_Picker_RestClient.IEntity;
    private _$idCardDialog: JQuery;
    private _scrollTimeout: number = 100;
    private _numItemsDisplayed: number;
    private _groupMembers: Identities_Picker_RestClient.IEntity[];
    private _$groupMembersContainer: JQuery;
    private _pageSize: number = 10;
    private _$loading: JQuery;
    private _$liveStatus: JQuery;
    private _entityOperationsFacade: EntityOperationsFacade;
    private _previousFocusedElement: JQuery;
    private _selectedIndex: number = DropdownSelectionIndexType.SelectNone;

    constructor(options?: IIdentityPickerIdCardDialogOptions) {
        super(options);

        this._identityType = options.identityType ? options.identityType : { User: true }; //default User only
        this._operationScope = options.operationScope ? options.operationScope : { IMS: true }; //default IMS only
    }

    public initializeOptions(options?: IIdentityPickerIdCardDialogOptions) {
        super.initializeOptions($.extend({
            width: 402,
            height: 70,
            resizable: false,
            modal: false,
            draggable: true,
            autoOpen: true,
            closeOnEscape: false,
            cssClass: 'idcard-dialog-content',
            closeText: Resources_Platform.CloseButtonLabelText
        }, options));
    }

    public initialize() {
        super.initialize();

        this._previousFocusedElement = $(document.activeElement);
        this._element.dialog(this._options);
        this._$idCardDialog = this._element.closest(IdCardDialog.JQUERY_UI_DIALOG_CLASS).addClass('idcard-dialog').attr('visibility', 'hidden');

        this._$idCardDialog.on("dialogclose.contactCard", delegate(this, this._onIdCardClose));
        this._$idCardDialog.on("keydown.contactCard", delegate(this, this._onKeyDown));

        this._$idCardDialog.css("z-index", IdCardDialog._getHigherZIndex("div" + IdCardDialog.JQUERY_UI_DIALOG_CLASS));
        $('.ui-icon-closethick', this._$idCardDialog).addClass('bowtie-icon bowtie-navigate-close');
        this._repositionDialog();
        this._$idCardDialog.hide(); //hide for now and show only after the data is loaded successfully
        $('.ui-dialog-content', $('.idcard-dialog:visible')).dialog("close"); // remove all other contact cards (it's a singleton on the page)
        this._$idCardDialog.attr("id", IdCardDialog.ID_CARD_DIALOG_ID);

        if (this._options.identity) {
            var identity: Identities_Picker_RestClient.IEntity = this._options.identity;
            if (!EntityHelpers.isDirectoryEntityType(identity)) {
                var exp: IUsageException = {
                    source: "IdCardDialog initialize",
                    message: "The IdCardDialog can only be initialized with a user or group IEntity"
                };
                throw exp;
            }
            var dataId = EntityHelpers.getUniqueIdentifierForDisambiguation(identity);
            this._$idCardDialog.attr('data-prefix', dataId.toLowerCase());
            this._getIdentitiesSuccess({ queryToken: null, identities: [identity] });
            if (!ControlHelpers.isOnPremiseEnvironment()
                && identity.localDirectory
                && identity.localDirectory.toLowerCase().trim() == Identities_Picker_Services.ServiceHelpers.VisualStudioDirectory
                && this._operationScope
                && (this._operationScope.AAD || this._operationScope.Source)) {
                this._getDirectoryEntities(identity.entityId);
            }
        }
        else {
            this._$idCardDialog.attr('data-prefix', this._options.uniqueIdentifier.toLowerCase());
            this._getDirectoryEntities(this._options.uniqueIdentifier);
        }
    }

    private _getEntityOperationsFacade(): EntityOperationsFacade {
        if (!this._entityOperationsFacade) {
            this._entityOperationsFacade = Service.getService(EntityOperationsFacade);
        }

        return this._entityOperationsFacade;
    }

    private static _getHigherZIndex(jQueryFilter: string): number {
        var thisZ, maxZ = 1001;
        $(jQueryFilter).each((index: number, item: Element) => {
            thisZ = $(item).css("z-index");
            if (!isNaN(thisZ) && (thisZ > maxZ)) {
                maxZ = thisZ;
            }
        });
        return ++maxZ;
    }

    private _repositionDialog() {
        // aligning the card using elementAlign "left-top" and baseAlign "left-bottom", unless we experience an overflow
        var positionOptions: Utils_UI.Positioning.IPositionOptions = {
            elementAlign: "left-top",
            baseAlign: "left-bottom",
            overflow: "none-none",
        };

        var baseOffset;
        if (this._options.anchorContainer) {
            baseOffset = $(this._options.anchorContainer).offset();
            positionOptions.leftOffsetPixels = baseOffset.left;
            positionOptions.topOffsetPixels = baseOffset.top;
            positionOptions.skipZIndexSetting = true;
        } else {
            baseOffset = this._options.anchor.offset();
        }

        Utils_UI.Positioning.position(this._$idCardDialog, this._options.anchor, positionOptions);

        // The current UI.Positioning.position() code for horizontal overflow seems incorrect, so we are doing all positioning explicitly here.
        // In case of horizontal overflow we are now flipping the card with elementAlign "right-*" and baseAlign "right-*"
        var leftOffset = (this._options.leftValue && this._options.leftValue > 0) ? this._options.leftValue : baseOffset.left;
        if (leftOffset + this._$idCardDialog.outerWidth() < ($(window).width() + $(window).scrollLeft())) {
            this._$idCardDialog.css("left", leftOffset);
        } else {
            this._$idCardDialog.css("left", leftOffset - this._$idCardDialog.outerWidth() + this._options.anchor.outerWidth());
        }
        // In case of vertical overflow we are now flipping the card with elementAlign "*-bottom" and baseAlign "*-top"
        var topOffset = (this._options.topValue && this._options.topValue > 0) ? this._options.topValue : (baseOffset.top + this._options.anchor.outerHeight());
        if (topOffset + this._$idCardDialog.outerHeight() < ($(window).height() + $(window).scrollTop())) {
            this._$idCardDialog.css("top", topOffset);
        } else {
            this._$idCardDialog.css("top", topOffset - this._$idCardDialog.outerHeight() - this._options.anchor.outerHeight());
        }
    }

    private _getDirectoryEntities(searchTerm: string): void {
        var queryTypeHint: Identities_Picker_Services.IQueryTypeHint = {
            UID: true,
        };

        var entityOperationsFacadeRequest: IEntityOperationsFacadeRequest = {
            identityServiceOptions: {
                operationScope: this._operationScope,
                identityType: this._identityType,
                httpClient: this._options.httpClient,
                extensionData: this._options.extensionData,
            },
            identityExtensionOptions: {
                consumerId: this._options ? this._options.consumerId : Identities_Picker_Constants.ConsumerId.UnknownConsumer,
            },
            prefix: searchTerm,
            queryTypeHint: queryTypeHint,
            sources: [SourceId.Directory],
        };

        var response = this._getEntityOperationsFacade().search(entityOperationsFacadeRequest)
            .then(
                (response: IEntityOperationsFacadeResponse) => {
                    for (var key in response.queryTokenResponse) {
                        response.queryTokenResponse[key].then(
                            delegate(this, this._getIdentitiesSuccess),
                            delegate(this, this._getIdentitiesFailure));
                    }
                },
                this._getIdentitiesFailure
            );
    }

    private _getIdentitiesFailure(data) {
        // fail silently - don't show the IdCard
        Events_Services.getService().fire(IdCardDialog.IDCARD_LOADED_EVENT);
    }

    private _getIdentitiesSuccess(data: Identities_Picker_RestClient.QueryTokenResultModel) {
        if (!data || !data.identities || data.identities.length < 1) {
            this._getIdentitiesFailure(data);
            return;
        }

        this._identity = data.identities[0];

        const isReactProfileCardFeatureEnabled = FeatureAvailabilityService.isFeatureEnabled(Constants_Platform.WebPlatformFeatureFlags.ReactProfileCard);
        const isUser = this._identity.entityType.trim().toLowerCase() == Identities_Picker_Services.ServiceHelpers.UserEntity;
        const isExtension = window.top !== window.self;

        // If no value is specified for useOfficeFabricProfileCard, then only show the new card outside of extensions (Office Fabric may not be available in an extension)
        const useOfficeFabricProfileCard = this._options.useOfficeFabricProfileCard !== null && this._options.useOfficeFabricProfileCard !== undefined
            ? this._options.useOfficeFabricProfileCard
            : !isExtension;

        if (isReactProfileCardFeatureEnabled && useOfficeFabricProfileCard && isUser) {
            this._displayReactIdCard();
        } else {
            if (!Identities_Picker_Services.ServiceHelpers.isAuthenticatedMember()) {
                return;
            }

            var dataId = EntityHelpers.getUniqueIdentifierForDisambiguation(this._identity);
            var signInAddress = EntityHelpers.getSignInAddress(this._identity);
            if (this._$idCardDialog.attr('data-prefix')
                && (dataId.toLowerCase().indexOf(this._$idCardDialog.attr('data-prefix').toLowerCase()) === 0)
                || (signInAddress.toLowerCase().indexOf(this._$idCardDialog.attr('data-prefix').toLowerCase()) === 0)) {
                if (this._element) {
                    this._displayIdCard();
                }
            }
        }
        Events_Services.getService().fire(IdCardDialog.IDCARD_LOADED_EVENT);
    }

    private _displayReactIdCard() {
        // Get location to render
        const $body = $("body").eq(0);
        let $cardsContainer = $body.find('.cards-container');
        if ($cardsContainer.length === 0) {
            $cardsContainer = $("<div class='cards-container' />")
                .appendTo($body);
        }

        // Get the anchor for the card
        let $anchor = this._options.anchor;
        if ($anchor && $anchor.attr("role") === "row") {
            $anchor = $anchor.children();
        }

        let positioningTarget: HTMLElement | Identities_Picker_Common.IPoint = $anchor[0];

        if (this._options.leftValue !== undefined && this._options.topValue !== undefined
            && this._options.leftValue !== null && this._options.topValue !== null) {
            positioningTarget = { x: this._options.leftValue, y: this._options.topValue } as Identities_Picker_Common.IPoint;
        }

        // Build and render the component
        const personaCardElementProperties = {
            identity: this._identity,
            target: positioningTarget,
            entityOperationsFacade: this._getEntityOperationsFacade(),
            consumerId: this._options ? this._options.consumerId : Identities_Picker_Constants.ConsumerId.UnknownConsumer,
            onDismissCallback: () => {
                ReactDOM.unmountComponentAtNode($cardsContainer[0]);
                $('.ui-dialog-content', $('.idcard-dialog')).dialog("close");
            }
        };

        VSS.using(["VSS/Identities/Picker/PersonaCard"], (module: typeof PersonaCard_Lazy) => {
            const personaCardElement = React.createElement(module.PersonaCard, personaCardElementProperties);
            ReactDOM.render(
                personaCardElement,
                $cardsContainer[0]
            );
        });
    }

    private _displayIdCard() {
        this._$idCardDialog.attr("data-objectid", this._identity.entityId);
        //binding it on mousedown instead of click, since some handlers don't propagate the event after handling it
        $("body").on("mousedown.contactCard", delegate(this, this._onIdCardBlur));
        $(".ui-dialog-buttonpane", this._$idCardDialog).hide();

        this._element.empty();
        $(".identity-picker-idcard-header").empty();
        var imageAndBasicInfoContainer = $("<div>").addClass("identity-picker-idcard-header")
            .prependTo($(".ui-dialog-titlebar", this._$idCardDialog));
        var imageContainer = $("<div>").addClass("identity-picker-idcard-image")
            .appendTo(imageAndBasicInfoContainer);
        var textContainer = $("<div>").addClass("identity-picker-idcard-basicinfo")
            .appendTo(imageAndBasicInfoContainer);

        var displayName = EntityHelpers.getDisplayName(this._identity);
        var defaultImage = Identities_Picker_Services.ServiceHelpers.getDefaultIdentityImage(this._identity);
        var userImage = ControlHelpers.createImgElement(defaultImage, this._identity.image ? this._identity.image : "", "user-picture-card");
        userImage.attr("alt", displayName).appendTo(imageContainer);

        var signInAddress = EntityHelpers.getSignInAddress(this._identity);
        if (!signInAddress.trim()) {
            if (this._options.uniqueIdentifier && ControlHelpers.isValidEmail(this._options.uniqueIdentifier)) {
                signInAddress = this._options.uniqueIdentifier;
            }
        }

        let displayNameContainer = $("<div>").addClass("identity-picker-idcard-basicinfo-name")
            .appendTo(textContainer)
            .text(displayName);
        RichContentTooltip.addIfOverflow(displayName,
            displayNameContainer,
            { menuContainer: displayNameContainer }); // adding the menuContainer option to overcome the issue of z-index computation

        var signInAddressRow = $("<div>")
            .addClass("identity-picker-idcard-ellipsis-overflow")
            .appendTo(textContainer);
        if (ControlHelpers.isValidEmail(signInAddress)) {
            $("<a>")
                .attr({
                    "aria-label": Resources_Platform.IdentityPicker_IdCardSendEmail,
                    "href": "mailto:" + signInAddress,
                    "tabindex": "0"
                })
                .text(signInAddress)
                .appendTo(signInAddressRow);
        } else {
            signInAddressRow.text(signInAddress);
        }

        this._$liveStatus = $('<div>')
            .addClass('visually-hidden')
            .attr('aria-live', 'polite')
            .appendTo(this._$idCardDialog);

        $(".ui-dialog-title", this._$idCardDialog).text(Utils_String.format(Resources_Platform.IdentityPicker_ContactCardInformation, displayName));

        this._$idCardDialog.attr('name', displayName);

        var attributes = new IdentityAttributesFactory().getIdentityAttributes(this._identity);
        if (this._identity.entityType.trim().toLowerCase() == Identities_Picker_Services.ServiceHelpers.UserEntity) {
            var rows = attributes.toRows();
            for (var rowIndex in rows) {
                this._element.append(rows[rowIndex]);
            }
        } else if (this._identity.entityType.trim().toLowerCase() == Identities_Picker_Services.ServiceHelpers.GroupEntity) {
            let menuTabs = $("<div>")
                .addClass("identity-picker-idcard-row")
                .attr("role", "tablist")
                .appendTo(this._element);

            let infoTab = $("<span>")
                .addClass("identity-picker-idcard-tab")
                .text(Resources_Platform.IdentityPicker_IdCardInfo)
                .attr({
                    "tabindex": "0",
                    "id": "identity-picker-idcard-tab-info",
                    "role": "tab",
                    "aria-selected": "true"
                })
                .appendTo(menuTabs);

            let membersTab = $("<span>")
                .addClass("identity-picker-idcard-tab identity-picker-idcard-unselected-tab")
                .text(Resources_Platform.IdentityPicker_IdCardMembers)
                .attr({
                    "tabindex": "0",
                    "id": "identity-picker-idcard-tab-members",
                    "role": "tab",
                    "aria-selected": "false"
                })
                .appendTo(menuTabs);

            // Construct content. GroupEntityTypeAttributes have only 1 info tab content as return
            let infoTabContent = attributes.toRows()[0]
                .attr({
                    "role": "tabpanel",
                    "aria-labelledby": "identity-picker-idcard-tab-info"
                });
            this._element.append(infoTabContent);
            this._constructMemberTabContent().appendTo(this._element);
            this._getDirectoryMemberEntities(this._identity);

            infoTab.click(delegate(this, (e) => {
                if (infoTab.hasClass("identity-picker-idcard-unselected-tab")) {
                    infoTab.removeClass("identity-picker-idcard-unselected-tab");
                    infoTab.attr("aria-selected", "true");

                    membersTab.attr("aria-selected", "false");
                    membersTab.addClass("identity-picker-idcard-unselected-tab");

                    this._$groupMembersContainer.parent().hide();
                    infoTabContent.show();
                    this._element.css("height", "auto");
                    this._$idCardDialog.css("height", "auto");
                }
            }));

            membersTab.click(delegate(this, (e) => {
                if (membersTab.hasClass("identity-picker-idcard-unselected-tab")) {
                    membersTab.removeClass("identity-picker-idcard-unselected-tab");
                    membersTab.attr("aria-selected", "true");

                    infoTab.attr("aria-selected", "false");
                    infoTab.addClass("identity-picker-idcard-unselected-tab");

                    infoTabContent.hide();
                    this._setSelectedIndex(DropdownSelectionIndexType.SelectFirstItem, Utils_UI.Positioning.VerticalScrollBehavior.Top);
                    this._$groupMembersContainer.parent().show();
                    this._element.css("height", "auto");
                    this._$idCardDialog.css("height", "auto");

                    if (!this._groupMembers.length) {
                        this._$liveStatus.text(Resources_Platform.IdentityPicker_NoMembers);
                    } else if (this._groupMembers.length == 1) {
                        this._$liveStatus.text(Resources_Platform.IdentityPicker_MembersSingleResultStatus);
                    } else {
                        this._$liveStatus.text(Utils_String.format(Resources_Platform.IdentityPicker_MembersMultipleResultStatus, this._groupMembers.length));
                    }
                }
            }));
        }

        if (!attributes.isEmpty()) {
            $('.ui-dialog-titlebar', this._$idCardDialog).removeClass('no-content');
        } else {
            $('.ui-dialog-titlebar', this._$idCardDialog).addClass('no-content');
        }

        this._element.css("height", "auto");
        this._repositionDialog();
        this._$idCardDialog.show();
        this._$idCardDialog.attr('visibility', '');
        this._$idCardDialog.attr('tabindex', '-1');
        this._$idCardDialog.focus();
    }

    private _constructMemberTabContent(): JQuery {
        let membersTabContent = $("<div>")
            .addClass(IdCardDialog.ID_CARD_MEMBERS_DROPDOWN_CLASS + ' ' + IdCardDialog.ID_CARD_LIST_CLASS)
            .attr({
                "role": "tabpanel",
                "aria-busy": "true",
                "aria-labelledby": "identity-picker-idcard-tab-members"
            }).hide();

        this._$groupMembersContainer = $("<ul>")
            .attr({
                "role": "list",
                "aria-labelledby": "identity-picker-idcard-tab-members",
                "tabindex": "0"
            })
            .appendTo(membersTabContent)
            .css({
                //40 is the size of an item in the list, auto scroll will not activate if all items fit into the element's height
                'max-height': Math.min(
                    (ControlHelpers.getSizePx(IdentityPickerControlSize.Large) + IdCardDialog.IMAGE_MARGINS_PX) * this._pageSize - 10,
                    IdCardDialog.MAX_HEIGHT)
                    + "px"
            });

        let descriptionElement = $('#identity-picker-idcard-tab-members-description.visually-hidden');
        if (!descriptionElement.length) {
            descriptionElement = $('<div>')
                .text(Resources_Platform.IdentityPicker_IdCardMembersTabDescription)
                .attr('id', 'identity-picker-idcard-tab-members-description')
                .addClass('visually-hidden')
                .appendTo('<body>');
        }

        this._$groupMembersContainer.attr("aria-describedby", 'identity-picker-idcard-tab-members-description');

        this._$loading = $("<div>").addClass("identity-picker-idcard-word-wrap identity-picker-idcard-error")
            .text(Resources_Platform.IdentityPicker_IdCardLoadingMembers).appendTo(membersTabContent);
        return membersTabContent;
    }

    private _getDirectoryMemberEntities(identity: Identities_Picker_RestClient.IEntity): void {
        var identityService = Service.getService(Identities_Picker_Services.IdentityService);
        var connectionType: Identities_Picker_Services.IConnectionType = {
            successors: true
        };

        var getIdentityImagesSuccessCallback = (entityIdThumbnailMap: IDictionaryStringTo<string>) => {
            if (this._element) {
                if (!entityIdThumbnailMap) {
                    return;
                }

                this._groupMembers.forEach(delegate(this, (entity: Identities_Picker_RestClient.IEntity) => {
                    if (entityIdThumbnailMap.hasOwnProperty(entity.entityId) && entityIdThumbnailMap[entity.entityId]) {
                        entity.image = entityIdThumbnailMap[entity.entityId];
                        //set displayed item

                        $(".identity-picture", this._$groupMembersContainer).each((index, element) => {
                            if (element.hasAttribute("data-objectid") && (element.getAttribute("data-objectid") === entity.entityId)) {
                                element.setAttribute("src", entityIdThumbnailMap[entity.entityId]);
                                element.setAttribute("class", "identity-picture small");
                            }
                        });
                    }
                }));
            }
        };
        var getIdentityImagesErrorCallback = (errorData?: any) => {
            //fail silently
            if (errorData) {
                Diag.logError("_getDirectoryMemberEntities/getIdentityImagesErrorCallback:" + JSON.stringify(errorData));
            }
        };

        var getConnectionsSuccessCallback = (connectionsResponse: Identities_Picker_RestClient.IdentitiesGetConnectionsResponseModel) => {
            if (this._element) {
                if (!connectionsResponse || !connectionsResponse.successors) {
                    delegate(this, getConnectionsErrorCallback)();
                    return;
                }

                this._groupMembers = connectionsResponse.successors;
                if (this._groupMembers && this._groupMembers.length > 0) {
                    this._groupMembers = ControlHelpers.sortGroupMembersByName(this._groupMembers);
                    this._groupMembers.forEach((identity: Identities_Picker_RestClient.IEntity,
                        index: number,
                        array: Identities_Picker_RestClient.IEntity[]) => {
                        if (!identity.image || identity.image.trim()) {
                            identity.image = Identities_Picker_Services.ServiceHelpers.getDefaultIdentityImage(identity);
                        }
                    });

                    var entityOperationsFacadeRequest: IEntityOperationsFacadeRequest = {
                        identityServiceOptions: {
                            operationScope: this._operationScope,
                            identityType: { User: true, Group: true },
                            httpClient: this._options.httpClient,
                            extensionData: this._options.extensionData,
                        },
                        identityExtensionOptions: {
                            consumerId: this._options.consumerId,
                        },
                        sources: [SourceId.Directory],
                    };
                    this._getEntityOperationsFacade().getImagesForEntities(this._groupMembers, entityOperationsFacadeRequest)
                        .then(getIdentityImagesSuccessCallback, getIdentityImagesErrorCallback);

                    this._$loading.hide();
                    this._renderMembersList();
                } else {
                    this._$loading.text(Resources_Platform.IdentityPicker_IdCardNoMembers);
                }
                this._$groupMembersContainer.parent().removeAttr("aria-busy");
            }
        };

        var getConnectionsErrorCallback = (errorData?: any) => {
            if (this._element) {
                this._$groupMembersContainer.parent().removeAttr("aria-busy");
                this._$loading.text(Resources_Platform.IdentityPicker_IdCardErrorLoadingMembers);
            }
            if (errorData) {
                Diag.logError(`_displayIdCard/getConnectionsErrorCallback:${JSON.stringify(errorData)}`);
            }
        };

        var membersIdentityType = { User: true, Group: true };
        identityService.getIdentityConnections(
            identity,
            this._operationScope,
            membersIdentityType,
            connectionType,
            { httpClient: this._options.httpClient },
            { consumerId: this._options.consumerId })
            .then(delegate(this, getConnectionsSuccessCallback), delegate(this, getConnectionsErrorCallback));
    }

    private _isMembersListVisible(): boolean {
        return this._$groupMembersContainer
            && this._$groupMembersContainer.length
            && this._$groupMembersContainer.parent()
            && this._$groupMembersContainer.parent().is(':visible');
    }

    private _onIdCardBlur(e?: JQueryEventObject) {
        if (this._element.hasClass("ui-dialog-content")
            && e
            && !$(e.target).closest("#" + IdCardDialog.ID_CARD_DIALOG_ID).length
            && !$(e.target).is("#" + IdCardDialog.ID_CARD_DIALOG_ID)) {
            this._element.dialog("close");
        }
    }

    private _onIdCardClose(e: Event, ui: Object) {
        if (this._options.focusElementOnClose && this._options.focusElementOnClose.is(':visible')) {
            this._options.focusElementOnClose.focus();
        } else {
            this._previousFocusedElement.focus();
        }
        $("body").off("mousedown.contactCard");
        this._$idCardDialog.off(".contactCard");
        this._element.dialog("destroy");
    }

    private _onKeyDown(e: JQueryEventObject): boolean {
        if (!e || !e.keyCode) {
            return true;
        }

        switch (e.keyCode) {
            case keyCode.UP:
                if (this._isMembersListVisible()) {
                    return this._prevItem();
                }
                return true;
            case keyCode.DOWN:
                if (this._isMembersListVisible()) {
                    return this._nextItem();
                }
                return true;
            case keyCode.PAGE_UP:
                if (this._isMembersListVisible()) {
                    return this._prevPage();
                }
                return true;
            case keyCode.PAGE_DOWN:
                if (this._isMembersListVisible()) {
                    return this._nextPage();
                }
                return true;
            case keyCode.ENTER:
            case keyCode.SPACE:
                if ($(document.activeElement).hasClass("identity-picker-idcard-tab")) {
                    if ($(document.activeElement).hasClass("identity-picker-idcard-unselected-tab")) {
                        e.stopPropagation();
                        $(document.activeElement).click();
                        return false;
                    }
                }

                if ($(document.activeElement).hasClass("ui-dialog-titlebar-close")) {
                    e.stopPropagation();
                    this._element.dialog("close");
                    return false;
                }

                if (this._isMembersListVisible() && this._selectedIndex != DropdownSelectionIndexType.SelectNone) {
                    e.stopPropagation();
                    $("li", this._$groupMembersContainer).eq(this._selectedIndex).click();
                    return false;
                }
                return true;
            // we need to handle ESCAPE by ourselves as opposed to relying on the JQuery UI Dialog option 'closeOnEscape',
            // which propagates the event further and causes the visible dropdown to be closed as well if the card is opened from the dropdown
            case keyCode.ESCAPE:
            case keyCode.LEFT:
                e.stopPropagation();
                this._element.dialog("close");
                return false;
            case keyCode.TAB:
                var tabbables = $(':tabbable', this._$idCardDialog);
                var first = tabbables.filter(':first');
                var last = tabbables.filter(':last');

                if (last.length && e.target === last[0] && !e.shiftKey) {
                    first.focus();
                    return false;
                } else if (first.length && e.target === first[0] && e.shiftKey) {
                    last.focus();
                    return false;
                }
                return true;
            default:
                return true;
        }
    }

    private _createItem(item: Identities_Picker_RestClient.IEntity): JQuery {
        if (!item) {
            return null;
        }

        var userImage: string;
        var defaultImage = Identities_Picker_Services.ServiceHelpers.getDefaultIdentityImage(item);
        if (item.image) {
            userImage = item.image;
        }

        var displayName = EntityHelpers.getDisplayName(item);
        var subtitle = EntityHelpers.getSignInAddress(item);
        subtitle = Utils_String.isGuid(subtitle) ? "" : subtitle;
        let itemUI = $("<li>")
            .attr("role", "listitem")
            .attr("id", Controls.getId().toString())
            .height(40);
        RichContentTooltip.addIfOverflow(displayName,
            itemUI,
            { menuContainer: itemUI }); // adding the menuContainer option to overcome the issue of z-index computation

        ControlHelpers.createImgElement(defaultImage, userImage, "identity-picture small", item.entityId)
            .addClass((userImage && userImage.trim()) ? "" : "hidden")
            .appendTo(itemUI);
        var textContainer = $("<div>").addClass("item-text-container")
            .append($("<div>").addClass("title large").text(displayName))
            .append($("<div>").addClass("subtitle large").text(subtitle))
            .appendTo(itemUI);
        textContainer.css('max-width',
            this._element.width()
            - IdCardDialog.MEMBERS_TAB_LEFT_PADDING_PX
            - IdCardDialog.IMAGE_MARGINS_PX
            - ControlHelpers.getSizePx(IdentityPickerControlSize.Large)
            - ControlHelpers.IDENTITY_ITEM_BUFFER_WIDTH_PX);

        itemUI.click(delegate(this, (e) => {
            e.stopPropagation();
            var idCardOptions: IIdentityPickerIdCardDialogOptions = {
                identity: item,
                anchor: itemUI,
                leftValue: e.pageX !== undefined ? e.pageX : itemUI.offset().left,
                topValue: e.pageY !== undefined ? e.pageY : itemUI.offset().top,
                operationScope: this._operationScope,
                identityType: this._identityType,
                httpClient: this._options.httpClient ? this._options.httpClient : null,
                focusElementOnClose: (this._options.focusElementOnClose && this._options.focusElementOnClose.is(':visible'))
                    ? this._options.focusElementOnClose
                    : this._previousFocusedElement,
                appendTo: this._options.appendTo,
                consumerId: this._options.consumerId
            };

            Controls.Enhancement.enhance(IdCardDialog, "<div/>", idCardOptions);
        }));
        return itemUI;
    }

    private _renderMembersList(): void {
        var onScroll = (e?) => {
            if (this._scrollTimeout !== null) {
                clearTimeout(this._scrollTimeout);
                this._scrollTimeout = null;
            };
            this._scrollTimeout = setTimeout(delegate(this, this._loadNextPage), 100);

            return false;
        };
        this._$groupMembersContainer.empty();

        this._$groupMembersContainer.addClass('items');
        this._$groupMembersContainer.scroll(delegate(this, onScroll));

        if (this._groupMembers.length == 0) {
            this._numItemsDisplayed = 0;
        }
        else {
            this._numItemsDisplayed = Math.min(this._groupMembers.length, this._pageSize);
            for (var i = 0; i < Math.min(this._groupMembers.length, this._pageSize); i++) {
                var newItem = this._createItem(this._groupMembers[i]);
                if (newItem) {
                    this._$groupMembersContainer.append(newItem);
                }
            }
        }
    }

    private _loadNextPage() {
        var isCloseToBottom: boolean = this._$groupMembersContainer.scrollTop() + this._$groupMembersContainer.outerHeight() >= this._$groupMembersContainer[0].scrollHeight - 5;

        if (isCloseToBottom) {
            for (var i = this._numItemsDisplayed; i < this._numItemsDisplayed + Math.min(this._groupMembers.length - this._numItemsDisplayed, this._pageSize); i++) {
                this._$groupMembersContainer.append(this._createItem(this._groupMembers[i]));
            }

            this._numItemsDisplayed += Math.min(this._groupMembers.length - this._numItemsDisplayed, this._pageSize);
        }

        if (this._scrollTimeout !== null) {
            clearTimeout(this._scrollTimeout);
            this._scrollTimeout = null;
        }
    }

    private _nextItem(): boolean {
        if (this._selectedIndex === this._groupMembers.length - 1) {
            this._setSelectedIndex(DropdownSelectionIndexType.SelectFirstItem);
        } else if (this._selectedIndex < this._groupMembers.length - 1) {
            this._setSelectedIndex(this._selectedIndex + 1);
        }

        return false;
    }

    private _prevItem(): boolean {
        if (this._selectedIndex === -1 && this._groupMembers && this._groupMembers.length) {
            this._setSelectedIndex(this._groupMembers.length - 1);
        } else if (this._selectedIndex > 0) {
            this._setSelectedIndex(this._selectedIndex - 1, Utils_UI.Positioning.VerticalScrollBehavior.Top);
        }
        return false;
    }

    private _nextPage(): boolean {
        var nextIndex: number = -1;
        this._loadNextPage();

        if (this._selectedIndex < this._groupMembers.length - 1 && this._selectedIndex !== -1) {
            nextIndex = this._selectedIndex + this._pageSize;
        }
        this._setSelectedIndex(
            nextIndex < this._groupMembers.length
                ? nextIndex
                : this._groupMembers.length - 1,
            Utils_UI.Positioning.VerticalScrollBehavior.Top);
        return false;
    }

    private _prevPage(): boolean {
        var nextIndex: number = 0;
        if (this._selectedIndex === -1) {
            nextIndex = this._groupMembers.length - this._pageSize;
        }
        else if (this._selectedIndex > 0) {
            nextIndex = this._selectedIndex - this._pageSize;
        }
        this._setSelectedIndex(
            nextIndex >= 0
                ? nextIndex
                : DropdownSelectionIndexType.SelectFirstItem,
            Utils_UI.Positioning.VerticalScrollBehavior.Top);
        return false;
    }

    private _setSelectedIndex(
        newSelectedIndex: number,
        position: Utils_UI.Positioning.VerticalScrollBehavior = Utils_UI.Positioning.VerticalScrollBehavior.Bottom) {
        let itemsList = $("li", this._$groupMembersContainer);

        let shouldSwitchSelectedItem = newSelectedIndex !== null
            && newSelectedIndex !== undefined
            && itemsList.length
            && itemsList.eq(newSelectedIndex).length
            && (this._selectedIndex !== newSelectedIndex
                || !itemsList.eq(this._selectedIndex).hasClass("selected"));

        if (shouldSwitchSelectedItem) {
            this._selectedIndex = newSelectedIndex;

            itemsList.removeClass("selected")
                .attr("aria-selected", "false")
                .removeAttr("id");

            let selectedItem = itemsList.eq(this._selectedIndex);
            let newId = selectedItem.attr("id") ? selectedItem.attr("id") : Controls.getId().toString();
            selectedItem.addClass("selected")
                .attr({
                    "id": newId,
                    "aria-selected": "true"
                });

            this._$liveStatus.text(Utils_String.format(Resources_Platform.IdentityPicker_SelectedMember, EntityHelpers.getDisplayName(this._groupMembers[newSelectedIndex])));

            Utils_UI.Positioning.scrollIntoViewVertical(selectedItem, position);
        } else if ($.isNumeric(newSelectedIndex)) {
            this._selectedIndex = newSelectedIndex;
        }
    }
}

export interface ISearchControlCallbackOptions {
    /**
    *   action that should execute when an item in this dropdown is selected. This action, if supplied, shall be called after the dropdown's default onItemSelect action has executed
    **/
    onItemSelect?: (item: Identities_Picker_RestClient.IEntity) => any;
    /**
    *   action that should execute when the input field loses focus. This action, if supplied, shall be called after the control's default onInputBlur action has executed
    **/
    onInputBlur?: () => any;
    /**
    *   action that should execute when a key is pressed. This action, if supplied, shall be called before the dropdown's default onKeyPress action has executed to allow for overrides
    **/
    onKeyPress?: (keyCode: number) => any;
    /**
    *   a pre-render hook that takes in the list of identities that would otherwise have been displayed and rearranges or adds to them prior to returning the new list
    **/
    preDropdownRender?: (entityList: Identities_Picker_RestClient.IEntity[], isDirectorySearchEnabled?: boolean) => Identities_Picker_RestClient.IEntity[];
    /**
    *   callback for a custom tooltip to be displayed for the single-select search control instead of the display name and sign-in address of the resolved identity
    **/
    getCustomTooltip?: () => string;
    /**
    *   callback allowing to peek at the search results (after rendering). Will not get executed for MRU-only searches. The callback function should not alter the rendered list
    **/
    onDirectorySearchFinished?: (identityList: Identities_Picker_RestClient.IEntity[]) => void;
}

export interface IIdentityPickerSearchOptions extends
    Identities_Picker_Services.IIdentityServiceOptions,
    Identities_Picker_Services.IIdentityPickerExtensionOptions {
    /**
    *   default identities to initialize the search control with - if you are constructing the IEntity objects, their identifiers (such as entityId, localId etc.) have to be valid;
    *   alternatively the input can be a semi-colon separated sequence of unique identifiers (such as sign-in addresses, vsIds, entityIds or SubjectDescriptors).
    *   We also support the format "DisplayName <UniqueIdentifier>" (see the option showTemporaryDisplayName for details)
    **/
    items?: string | Identities_Picker_RestClient.IEntity[];
    /**
    *   restrict displayed identities in dropdown
    **/
    pageSize?: number;
    /**
    *   DEPRECATED: the minimum length of the prefix to start searching the directories - in the absence of an MRU - default 3
    **/
    minimumPrefixSize?: number;
    /**
    *   whether the search and dropdown controls should handle multiple identities
    **/
    multiIdentitySearch?: boolean;
    /**
    *   whether to display the contact card icon for each identity in the dropdown and for resolved identities. Default false.
    **/
    showContactCard?: boolean;
    /**
    *   whether to style the search control with a triangle that displays the MRU on click or not. Default false. Setting this will also enable the MRU on the dropdown.
    **/
    showMruTriangle?: boolean;
    /**
    *   whether the dropdown should display the MRU with the search button or just search directories directly.
    *   Default false.
    **/
    showMru?: boolean;
    /**
    *   whether to preload (e.g. the MRU identities) on control creation.
    **/
    loadOnCreate?: boolean;
    /**
    *   whether for a single-select control a click on the resolved item highlights the text (true) or opens the contact card (false - default)
    **/
    highlightResolved?: boolean;
    /**
    *   the size of the search control elements (Small - most elements are 16px in height, Medium - 24px, Large - 32px). Default: Medium
    **/
    size?: IdentityPickerControlSize;
    /**
    *   the size of the dropdown control elements (Medium - most elements are 24px, Large - 32px). Default: Large
    **/
    dropdownSize?: IdentityPickerControlSize;
    /**
    *   custom value for the placeholder attribute of the input element.
    *   Defaults to "Search {identity type(s)}", where {identity type(s)} can be "users", "groups" or "users and groups".
    **/
    placeholderText?: string;
    /**
    *   custom value for the aria-label attribute of the input element.
    *   Defaults to the placeholder value if not set (see option placeholderText for details)
    **/
    ariaLabel?: string;
    /**
    *   Don't include aria label regardless if aria label is set or is the default (the place holder value).
    *   Defaults to false, which is to include.
    **/
    excludeAriaLabel?: boolean;
    /**
     * Use this to mark the input as required in the DOM
     */
    required?: boolean;
    /**
     * Use this to announce some help text
     */
    ariaDescribedby?: string;
    /**
    *   a custom id for the input element
    **/
    elementId?: string;
    /**
    *   an IEntity to be displayed by default instead of the empty input element
    **/
    watermark?: Identities_Picker_RestClient.IEntity;
    /**
    *   the width of the dropdown control. Default is max(positioningElement width, 300px)
    **/
    dropdownWidth?: number;
    /**
    *   Callbacks supported by the search control
    **/
    callbacks?: ISearchControlCallbackOptions;
    /**
    *   in case the control gets initialized with items in the format "DisplayName <UniqueIdentifier>",
    *   whether to show the DisplayName until the UniqueIdentifier gets resolved to an IEntity. Default false
    **/
    showTemporaryDisplayName?: boolean;
    /**
    *   Specifies whether or not the dropdown will be forced open and not closable until the control is destroyed.
    *   This is specifically for the mobile work item form where we want to show the picker in a full screen view
    *   and we do not want the dropdown to close.
    **/
    forceOpen?: boolean;
    /**
    *   Specifies whether or not the dropdown will try to use all remaining space below the positioning element.
    *   For internal use only, this is specifically for the mobile work item form where we want to show the picker in a
    *   full screen view and the behavior may change over time.
    **/
    useRemainingSpace?: boolean;
    /**
    *   Optimizations for small screen (mobile) which renders controls with additional icons and
    *   text information suitable for small screens.
    */
    smallScreenRender?: boolean;
    /**
    *   (optional) JQuery selector string which specifies a DOM element to render all JQueryUI dialogs in.
    *   Currently the only dialog which is displayed is IdCardDialog, but this should be used for any future
    *   dialogs as well, in order to work with Fabric's dialog model.
    *   If this is not specified, JQueryUI's default is to append the dialog element to the <body> element.
    **/
    dialogAppendTo?: string;
    /**
    *   (optional) Determines whether the new profile card should be used. Requires a dependency on Office Fabric.
    *   Default is false inside extensions, otherwise true.
    **/
    useOfficeFabricProfileCard?: boolean;

    /**
     * (optional) Specifies whether to enforce the rendering of search results in multi-select versions of the control in the same order as 
     * the provided input tokens.
     * 
     * Limitation: 
     * The order is not guaranteed to be preserved when the input exceeds 50 tokens (page size), due to the paging logic. 
     * Within the page, the results will be ordered.
     * 
     * Defaults to false.
     */
    retainInputIdentitiesSequenceWithinPage?: boolean;
    /**
     * (optional) When turned on, the MRU list will be displayed when a user first clicks into the input.
     * Default is false
     */
    showMruOnClick?: boolean;
    /**
     * (optional) When turned on, the "No identities found" dropdown message will not be displayed.
     * Default is true
     */
    showNoIdentitiesFound?: boolean;
}

/**
 * @exemptedapi
 * For internal unit testing use only
 */
export interface IIdentityPickerSearchTestOptions {
    /**
    *   Return the container that is to be used for the dropdown - default is body
    **/
    dropdownContainer?: (container?: JQuery) => JQuery;
}

/**
 * @exemptedapi
 * For internal unit testing use only
 */
export interface IIdentityPickerSearchOptionsInternal extends
    IIdentityPickerSearchOptions,
    IIdentityPickerSearchTestOptions {
}

export interface IIdentityPickerControlInteractable {
    enableReadOnlyMode();
    disableReadOnlyMode();
}

export class IdentityPickerSearchControl extends Controls.Control<IIdentityPickerSearchOptions>
    implements IdentityPickerSearchControl {
    //Fired when the input starts with a semicolon, the service returned 0 results, there were unresolved items from string resolution, or the search control was cleared
    public static INVALID_INPUT_EVENT: string = "identity-picker-search-invalid-input";
    //Fired when the there are no unresolved items, there is at least 1 resolve item, and there are no unresolved strings in the text box; also emitted when the service errors on a search, to avoid false negatives.
    public static VALID_INPUT_EVENT: string = "identity-picker-search-valid-input";
    //Fired when a resolved input is removed from the control
    public static RESOLVED_INPUT_REMOVED_EVENT: string = "identity-picker-resolved-input-removed";
    public static SEARCH_STARTED_EVENT: string = "identity-picker-search-started";
    public static SEARCH_FINISHED_EVENT: string = "identity-picker-search-finished";
    public static DIALOG_MOVE_EVENT: string = "dialog-move";

    public static readonly SEQUENCED_IDENTITIES_IN_PAGE_RESOLVED_EVENT_INTERNAL = "identity-picker-sequenced-identities-in-page-resolved-internal";

    public static SEARCH_MRU_TRIANGLE_CLASS = 'identity-picker-search-drop-icon';

    private static DEFAULT_WIDTH: number = 140;
    private static OUTER_PADDING_PX: number = 2; // total vertical or horizontal padding of resolved elements and input
    private static TRIANGLE_WIDTH_PX: number = 19; // triangle icon width and margins
    private static NAME_PADDING_PX: number = 8; // total horizontal padding of resolved items or watermark display name

    //for handling inactive identities in the look-up
    private static INACTIVE_ENTITY_TYPE = "inactive_entitytype";
    private static INACTIVE_ENTITY_ID_PREFIX = "INACTIVE_ENTITY_ID";
    private static INACTIVE_ORIGIN_ID_PREFIX = "INACTIVE_ORIGIN_ID";

    private _identityPickerDropdown: IdentityPickerDropdownControl;
    private _identityPickerDropdownUniqueId: string;
    private _identityType: Identities_Picker_Services.IEntityType;
    private _operationScope: Identities_Picker_Services.IOperationScope;
    private _selectedItems: Identities_Picker_RestClient.IEntity[];
    private _unresolvedItems: string[];
    private _$input: JQuery;
    private _$closeInput: JQuery;
    private _$container: JQuery;
    private _$mruTriangle: JQuery;
    private _$currentlyFocusedItem: JQuery;
    private _controlWidth: number;
    private _resolvedIEntity: Identities_Picker_RestClient.IEntity = null;
    private _preDropdownRender: (entityList: Identities_Picker_RestClient.IEntity[]) => Identities_Picker_RestClient.IEntity[];
    private _onDirectorySearchFinished: (identityList: Identities_Picker_RestClient.IEntity[]) => void;
    private _placeholderText: string;
    private _controlLoaded: Q.Deferred<boolean>;
    private _loadOnCreate: boolean = false;
    private _size: IdentityPickerControlSize;
    private _dropdownShowEventDelegate: Function;
    private _dropdownHideEventDelegate: Function;
    private _updateActiveDescendantIdEventDelegate: Function;
    private _previousInput: string = "";
    private _externalEventDelegate: Function;
    private _showContactCard: boolean;
    private _dropdownContainerDelegate: (container?: JQuery) => JQuery;
    private _isSearchEverIssued: boolean = false;
    private _readOnlyMode: boolean = false;
    private _showMruExpander: boolean = false;
    private _trackTabKeyDown: boolean = false;
    private _queryTokensRequested: IDictionaryStringTo<boolean> = {};
    private _entityOperationsFacade: EntityOperationsFacade;

    constructor(options?: IIdentityPickerSearchOptions, testUse: boolean = false) {
        //let this._options be the non-test options
        super(options);
        if (!testUse) {
            var internalOptions = <IIdentityPickerSearchOptionsInternal>options;
            if (!internalOptions.dropdownContainer) {
                internalOptions.dropdownContainer = delegate(this, () => {
                    return $('body');
                });
            }
            this.initializeOptionsInternal(internalOptions);
        }
    }

    /**
    *   To be used only by unit tests
    **/
    public initializeOptionsInternal(options: IIdentityPickerSearchOptionsInternal): void {
        this._identityType = options.identityType ? options.identityType : { User: true }; //default User only
        this._operationScope = options.operationScope ? options.operationScope : { IMS: true }; //default IMS only
        this._size = (options.size !== null && options.size !== undefined) ? options.size : IdentityPickerControlSize.Medium; //with enums, 0 is a valid value

        this._dropdownContainerDelegate = options.dropdownContainer;

        this._preDropdownRender = this._options.callbacks && options.callbacks.preDropdownRender ? options.callbacks.preDropdownRender : null;
        this._onDirectorySearchFinished = this._options.callbacks && options.callbacks.onDirectorySearchFinished ? options.callbacks.onDirectorySearchFinished : null;
        this._loadOnCreate = options.loadOnCreate ? options.loadOnCreate : false;
        if (options.placeholderText && options.placeholderText.trim()) {
            this._placeholderText = options.placeholderText;
        }
        else {
            var identityTypeList: string[] = Identities_Picker_Services.ServiceHelpers.getIdentityTypeList(this._identityType);
            this._placeholderText = this._generatePlaceHolder(identityTypeList);
        }

        this._controlLoaded = null;
    }

    private _onDocumentLoad = () => {
        if (this._$container.is(':visible')) {
            this._recalculateInputWidth();
        } else {
            setTimeout(this._onDocumentLoad, 50);
        }
    };

    public initialize() {
        super.initialize();

        var items = this._options.items;
        this._selectedItems = [];
        this._unresolvedItems = [];
        this._$currentlyFocusedItem = null;

        this._$container = this._element.parent();
        this._controlWidth = Math.max(this._$container.innerWidth(), IdentityPickerSearchControl.DEFAULT_WIDTH);
        this._element.addClass("identity-picker-search-box");
        if (this._options.smallScreenRender) {
            this._element.addClass("small-screen");
        }
        this._element.height(ControlHelpers.getSizePx(this._size) + IdentityPickerSearchControl.OUTER_PADDING_PX);

        var searchControlClickDelegate = (event) => {
            if (!$(event.target).hasClass("identity-picker-input") && !$(event.target).hasClass('identity-picker-search-multiple-name') && !$(event.target).hasClass(IdentityPickerSearchControl.SEARCH_MRU_TRIANGLE_CLASS)) {
                this.focusOnSearchInput();
            }
        };
        this._element.on("click.identityPicker", delegate(this, searchControlClickDelegate));
        this._element.on("remove.identityPicker", delegate(this, this.dispose));

        this._$input = $("<input>")
            .attr("type", "text")
            .attr("spellcheck", "false")
            .attr("autocomplete", "off")
            .attr('placeholder', this._placeholderText)
            .addClass("identity-picker-input")
            .attr("role", "combobox")
            .attr("aria-autocomplete", "list");

        if (!!this._options.required) {
            this._$input.attr("required", "true");
        }
        if (!!this._options.ariaDescribedby) {
            this._$input.attr('aria-describedby', this._getAriaDescribedby(this._options.ariaDescribedby));
        }
        if (!this._options.excludeAriaLabel) {
            this._$input.attr("aria-label", this._options.ariaLabel ? this._options.ariaLabel : this._placeholderText);
        }
        if (this._options.elementId) {
            this._$input.attr("id", this._options.elementId);
        }
        this._$input.appendTo(this._element);
        ControlHelpers.styleElementBySize(this._$input, this._size, true);

        let ariaDescribedBy: JQuery;
        if (this._options.multiIdentitySearch) {
            let ariaDescribedById = Controls.getId().toString();

            ariaDescribedBy = $('<label>')
                .addClass('visually-hidden')
                .attr('id', ariaDescribedById)
                .appendTo(this._element);

            this._$input.attr('aria-describedby', this._getAriaDescribedby(ariaDescribedById));
        }

        if (this._options.smallScreenRender) {
            this._$closeInput = this._createCloseButton();
            ControlHelpers.styleElementBySize(this._$closeInput, this._size, false);
            this._$closeInput.hide();
            this._$closeInput.appendTo(this._element);

            this._$closeInput.mousedown(delegate(this, (e) => {
                this._setInputText("");
                this.focusOnSearchInput();
                this._recalculateInputWidth();
                e.preventDefault();
                this._$closeInput.hide();
            }));
        }

        this._options.showMruTriangle = this._options.forceOpen ? false : this._options.showMruTriangle;
        this._showMruExpander = this._options.showMruTriangle ? true : false;
        if (this._isReadOnly()) {
            this._showMruExpander = false;
        }
        if (this._showMruExpander) {
            this._$mruTriangle = $('<span>').addClass(IdentityPickerSearchControl.SEARCH_MRU_TRIANGLE_CLASS).addClass("bowtie-icon bowtie-triangle-down").appendTo(this._element);
            this._$mruTriangle.on("mousedown.identityPicker", delegate(this, (e) => { this._onMruTriangleMousedown(e); }));
            this._$mruTriangle.on("click.identityPicker", delegate(this, (e) => { this._onMruTriangleClick(e); }));
        }
        this._recalculateInputWidth();

        $(window).on("resize.identityPicker", delegate(this, (e) => { this._recalculateInputWidth(); }));

        this._$input.on("focus.identityPicker", delegate(this, (e) => {
            this._$currentlyFocusedItem = null;

            if (this._options.multiIdentitySearch) {
                if (this._selectedItems.length || this._unresolvedItems.length) {
                    ariaDescribedBy.text(Utils_String.format(Resources_Platform.IdentityPicker_SelectedIdentities, this._selectedItems.length + this._unresolvedItems.length));
                }
                else{
                    if (ariaDescribedBy) {
                        ariaDescribedBy.text("");
                    }
                }
            }
            

            this._$container.triggerHandler("focus"); // some consumers have events that depend on the container focus
        }));

        if (this._options.showMruOnClick && this._options.showMru) {
            this._$input.on("mouseup.identityPicker", delegate(this, (e) => {
                if (this._identityPickerDropdown && !this._identityPickerDropdown.isVisible() && e.button === 0) {
                    this._showAllMruInDropdown(false, true);
                }
            }));
        }

        if (this._options.multiIdentitySearch) {
            // can't have them all at the same time
            this._options.highlightResolved = false;
            this._options.watermark = null;
        }
        if (!this._options.highlightResolved) {
            this._options.watermark = null;
        }

        if (this._options.watermark) {
            this._showWatermark();
        }

        if (!this._options.getFilterByScope) {
            this._options.getFilterByScope = () => null;
        }

        this._showContactCard = this._options.showContactCard == false ? false : true;

        if (!Identities_Picker_Services.ServiceHelpers.isAuthenticatedMember()) {

            this._showContactCard = false;
            this._loadOnCreate = false;
            this._options.showMru = false;
            this._options.forceOpen = false;
            this.enableReadOnlyMode();

        } else {

            this._element.on("keydown.identityPicker", delegate(this, this._onInputKeyDown));
            this._$input.on("keyup.identityPicker", delegate(this, this._onInputKeyUp));
            this._$input.on("blur.identityPicker", delegate(this, this._onInputBlur));
            this._$input.on("input.identityPicker", delegate(this, this._onInputChange));
            this._$input.on("click.identityPicker", delegate(this, this._onInputClick));

            this._externalEventDelegate = delegate(this, this._onInputBlur);
            this._dropdownShowEventDelegate = delegate(this, this._attachHandlersOnShowDropdown);
            this._dropdownHideEventDelegate = delegate(this, this._detachHandlersOnHideDropdown);
            this._updateActiveDescendantIdEventDelegate = delegate(this, this._updateActiveDescendantId);

            var $dropdownContainer = this._dropdownContainerDelegate();
            this._identityPickerDropdownUniqueId = ControlHelpers.getRandomString();

            Events_Services.getService().attachEvent(IdentityPickerDropdownControl.SHOW_DROPDOWN_EVENT_INTERNAL, this._dropdownShowEventDelegate);
            Events_Services.getService().attachEvent(IdentityPickerDropdownControl.HIDE_DROPDOWN_EVENT_INTERNAL, this._dropdownHideEventDelegate);
            Events_Services.getService().attachEvent(IdentityPickerDropdownControl.UPDATE_ACTIVE_DESCENDANT_ID, this._updateActiveDescendantIdEventDelegate);

            var dropdownOptions: IIdentityPickerDropdownOptions = {
                pageSize: this._options.pageSize,
                useRemainingSpace: this._options.useRemainingSpace,
                smallScreenRender: this._options.smallScreenRender,
                dialogAppendTo: this._options.dialogAppendTo,
                onItemSelect: delegate(this, (item: Identities_Picker_RestClient.IEntity) => {
                    this._resolveItem(item);
                    this.focusOnSearchInput();

                    if (this._options.callbacks && this._options.callbacks.onItemSelect) {
                        this._options.callbacks.onItemSelect(item);
                    }
                }),
                identityType: this._identityType,
                operationScope: this._operationScope,
                httpClient: this._options.httpClient ? this._options.httpClient : null,
                showContactCard: this._showContactCard,
                showMru: this._isShowMruEnabledInDropdown(),
                showNoIdentitiesFound: this._options.showNoIdentitiesFound,
                getFilterByScope: this._options.getFilterByScope,
                preDropdownRender: this._preDropdownRender,
                onDirectorySearchFinished: this._onDirectorySearchFinished,
                loadOnCreate: this._loadOnCreate,
                extensionData: this._options.extensionData,
                size: (this._options.dropdownSize !== null && this._options.dropdownSize !== undefined)
                    ? this._options.dropdownSize
                    : IdentityPickerControlSize.Large,
                width: this._options.dropdownWidth,
                focusElementOnContactCardClose: this._$input,
                eventOptions: {
                    uniqueId: this._identityPickerDropdownUniqueId
                },
                alignment: {
                    positioningElement: this._$container,
                },
                consumerId: this._options.consumerId
            };

            this._identityPickerDropdown = Controls.create(
                IdentityPickerDropdownControl,
                $dropdownContainer,
                dropdownOptions);

            this._attachHandlersOnShowDropdown({
                uniqueId: this._identityPickerDropdownUniqueId,
            });
        }

        if (items) {
            if ((typeof (items) === "string" || items instanceof String) && items) {
                this.setEntities([], (<string>items).trim().split(';'));
            }
            else if (items instanceof Array && items.length > 0) {
                this.setEntities(<Identities_Picker_RestClient.IEntity[]>items, []);
            }
        }

        if (this._loadOnCreate) {
            this.load();
        }

        if (this._options.forceOpen) {
            this._showAllMruInDropdownWithoutDefaultSelection();
        }

        $(this._onDocumentLoad);
    }

    public load(): IPromise<boolean> {
        if (this._controlLoaded) {
            return this._controlLoaded.promise;
        }
        else {
            this._controlLoaded = Q.defer<boolean>();
            return this._identityPickerDropdown.load().then(
                delegate(this, (loadResult: boolean) => {
                    this._controlLoaded.resolve(true);
                }),
                delegate(this, (errorData: any) => {
                    this._controlLoaded.resolve(false);
                }));
        }
    }

    public getIdentitySearchResult(): IdentitySearchResult {
        var idr: IdentitySearchResult = { resolvedEntities: this._selectedItems, unresolvedQueryTokens: this._unresolvedItems };
        return idr;
    }

    public clear() {
        if (!this._element) {
            return;
        }

        this._clearSearchControl();
        //single select show watermark
        if (!this._options.multiIdentitySearch && this._options.watermark) {
            this._showWatermark();
        }
    }

    public isDropdownVisible(): boolean {
        return this._identityPickerDropdown && this._identityPickerDropdown.isVisible();
    }

    public isDropdownFiltered(): boolean {
        return this._identityPickerDropdown && this._identityPickerDropdown.isFiltered();
    }

    public addIdentitiesToMru(identities: Identities_Picker_RestClient.IEntity[]): void {
        if (!Identities_Picker_Services.ServiceHelpers.isAuthenticatedMember()) {
            return;
        }

        var localIds = identities.map((identity: Identities_Picker_RestClient.IEntity, index: number, identities: Identities_Picker_RestClient.IEntity[]): string => {
            if (EntityHelpers.isDirectoryEntityType(identity)) {
                return identity.localId;
            }
        });
        this._identityPickerDropdown.addIdentitiesToMru(localIds);
    }

    /**
    * Appends to the search control's entities - this expects valid IEntity objects or valid query tokens - such as unique email addresses - entity objects must have been retrieved at some point from the control or DDS, or created using EntityFactory
    **/
    public setEntities(
        entities: Identities_Picker_RestClient.IEntity[],
        queryTokens: string[],
        operationScope?: Identities_Picker_Services.IOperationScope): void {
        var entitiesLength = entities ? entities.length : 0;
        var queryTokensLength = queryTokens ? queryTokens.length : 0;

        if (entitiesLength + queryTokensLength == 0) {
            return;
        }
        if (!this._options.multiIdentitySearch && (entitiesLength + queryTokensLength > 1)) {
            var exp: IUsageException = {
                source: "setEntities",
                message: "Can't set more than one entity for a single select control"
            };
            throw exp;
        }

        var queryTypeHint: Identities_Picker_Services.IQueryTypeHint = {
            UID: true,
        };
        if (queryTokensLength > 0) {
            var inactiveFallbackDisplayName: string = "";
            if (!this._options.multiIdentitySearch) {
                // store the display name in case we can't resolve the identity. We'll display it as string constant in that case
                inactiveFallbackDisplayName = queryTokens[0] ? queryTokens[0].trim() : inactiveFallbackDisplayName;
            }

            if (this._options.showTemporaryDisplayName) {
                if (this._options.watermark) {
                    $('.identity-picker-resolved:has(> .identity-picker-watermark-name)', this._element).off(".identityPicker").remove();
                }
                var tmpQueryTokens: string[] = [];
                for (var index in queryTokens) {
                    var token = queryTokens[index].trim();
                    if (token.charAt(token.length - 1) == '>' && token.indexOf('<') >= 0) {
                        var displayName = token.substring(0, token.indexOf('<') - 1).trim();
                        var identifier = token.substring(token.indexOf('<') + 1, token.length - 1).trim();
                        tmpQueryTokens.push(identifier);
                        this._createTemporaryItem(displayName, identifier.toLowerCase());

                        if (!this._options.multiIdentitySearch) {
                            inactiveFallbackDisplayName = displayName;
                        }
                    } else {
                        tmpQueryTokens.push(token);
                    }
                }
                queryTokens = tmpQueryTokens;
            }
            this._resolveInputToIdentities(
                queryTokens.join(';'),
                queryTypeHint,
                operationScope,
                inactiveFallbackDisplayName);
        }
        if (entitiesLength > 0) {
            for (var index in entities) {
                if (entities[index]) {
                    this._resolveItem(entities[index]);
                }
            }
        }
    }

    public getDropdownPrefix(): string {
        return this._identityPickerDropdown ? this._identityPickerDropdown.getPrefix() : "";
    }

    public showMruDropdown() {
        if (this._showMruExpander) {
            this._$mruTriangle.trigger("click");
        }
    }

    /**
    * Focuses on the visible input element or on an available resolved/unresolved item if the input is hidden. It also triggers the focus event on the container element for eventual styling
    **/
    public focusOnSearchInput(): void {
        this._$currentlyFocusedItem = null;
        if (this._$input.is(':visible')) {
            this._$input.focus();
        }
        else {
            var resolvedItems = $('.identity-picker-resolved:visible', this._element);
            if (resolvedItems.length <= 0) {
                this._$input.show();
                this._$input.focus();
            }
            else {
                $(resolvedItems[0]).focus();
                this._$currentlyFocusedItem = $(resolvedItems[0]);
            }
        }
        this._$container.triggerHandler("focus"); // some consumers have events that depend on the container focus
    }

    public enableReadOnlyMode(): void {
        this._readOnlyMode = true;

        this._showMruExpander = false;
        this._hideMruTriangle();

        this._$container.addClass("identity-picker-readonly");

        $('.identity-picker-resolved-name', this._element).removeAttr("tabindex");
        $('.identity-picker-watermark-name', this._element).removeAttr("tabindex");
        $('.identity-picker-resolved-close', this._element).hide();
        $('.identity-picker-resolved-name', this._element).attr("aria-label", Utils_String.format(Resources_Platform.ReadOnlyPrefix, this._options.ariaLabel ? this._options.ariaLabel : this._placeholderText));
        this._element.removeAttr("aria-label");
        const $resolvedIdentity = $('.identity-picker-resolved', this._element);

        $resolvedIdentity.removeAttr("aria-describedby");
        $resolvedIdentity.attr("tabindex", "-1");
        $resolvedIdentity.attr("aria-disabled", "true");

        $('visually-hidden', $resolvedIdentity).remove();

        this._$input.attr("disabled", "");
        this._$input.removeAttr("role");
        this._$input.removeAttr("aria-expanded");
    }

    public disableReadOnlyMode(): void {
        this._readOnlyMode = false;

        this._showMruExpander = this._options.showMruTriangle ? true : false;
        this._showMruTriangle();

        this._$container.removeClass("identity-picker-readonly");
        this._element.attr("aria-label", this._options.ariaLabel ? this._options.ariaLabel : this._placeholderText);
        $('.identity-picker-watermark-name', this._element).attr("tabindex", "0");

        const $resolvedIdentity = $('.identity-picker-resolved', this._element);
        const $resolvedIdentityName = $('.identity-picker-resolved-name', this._element);

        if ($resolvedIdentityName.length) {
            if (this._options.highlightResolved) {
                $resolvedIdentityName.attr("tabindex", "0");
            }
            $resolvedIdentityName.removeAttr("aria-label");
            this._element.find(".identity-picker-resolved-close").show();

            if (this._showContactCard && !this._options.highlightResolved) {
                $resolvedIdentity.attr("aria-haspopup", "true");
            }
        }

        this._$input.removeAttr("disabled");
        this._$input.attr("role", "combobox");
        this._$input.attr("aria-expanded", "false");

        if (!this._options.highlightResolved) {
            $resolvedIdentity.attr("tabindex", "0");
        }

        this._setResolvedItemRole($resolvedIdentity, $resolvedIdentityName.text());
    }

    /**
     * getValue returns "" while an identity is being resolved, but we need to know
     * if the control is actually empty vs temporarily empty.
     */
    public hasPendingRequests(): boolean {
        return this._queryTokensRequested && Object.keys(this._queryTokensRequested).length > 0;
    }

    public dispose() {
        this._detachHandlersOnHideDropdown({
            uniqueId: this._identityPickerDropdownUniqueId
        });

        if (this._dropdownShowEventDelegate) {
            Events_Services.getService().detachEvent(IdentityPickerDropdownControl.SHOW_DROPDOWN_EVENT_INTERNAL, this._dropdownShowEventDelegate);
        }

        if (this._dropdownHideEventDelegate) {
            Events_Services.getService().detachEvent(IdentityPickerDropdownControl.HIDE_DROPDOWN_EVENT_INTERNAL, this._dropdownHideEventDelegate);
        }

        if (this._updateActiveDescendantIdEventDelegate) {
            Events_Services.getService().detachEvent(IdentityPickerDropdownControl.UPDATE_ACTIVE_DESCENDANT_ID, this._updateActiveDescendantIdEventDelegate);
        }

        if (this._identityPickerDropdown) {
            this._identityPickerDropdown.dispose();
        }

        if (this._$input) {
            this._$input.off(".identityPicker");
        }

        if (this._showMruExpander && this._$mruTriangle) {
            this._$mruTriangle.off(".identityPicker");
        }

        if (this._element) {
            this._element.off(".identityPicker");
        }

        $(window).off("resize.identityPicker");

        super.dispose();
    }

    private _getEntityOperationsFacade(): EntityOperationsFacade {
        if (!this._entityOperationsFacade) {
            this._entityOperationsFacade = Service.getService(EntityOperationsFacade);
        }

        return this._entityOperationsFacade;
    }

    private _isReadOnly(): boolean {
        return this._readOnlyMode || !Identities_Picker_Services.ServiceHelpers.isAuthenticatedMember();
    }

    private _hideMruTriangle() {
        if (this._$mruTriangle) {
            this._$mruTriangle.addClass("identity-picker-element-hide");
        }
    }

    private _showMruTriangle() {
        if (this._showMruExpander && this._$mruTriangle) {
            this._$mruTriangle.removeClass("identity-picker-element-hide");
        }
    }

    private _getAriaDescribedby(ariaDescribedby: string): string {
        let ariaDescribedbyValue: string = this._$input.attr('aria-describedby');
        return ariaDescribedbyValue ? ariaDescribedbyValue.concat(" " + ariaDescribedby) : ariaDescribedby;
    }

    private _resetSearchControl(withWatermark: boolean = true, focus: boolean = true): void {
        if (this._options.watermark && !this._options.forceOpen) {
            if (withWatermark) {
                this._showWatermark();
            } else {
                this._clearWatermark();
            }
        } else {
            this._$input.show();
            this._recalculateInputWidth();
        }
        this._showMruTriangle();
        if (focus) {
            this.focusOnSearchInput();
        }
    }

    /**
    *   Clears but does not recreate the watermark
    **/
    private _clearSearchControl(): void {
        $('.identity-picker-resolved', this._element).off(".identityPicker").remove();
        this._queryTokensRequested = {};
        if (!this._options.multiIdentitySearch) {
            this._resetSearchControl(
                false,
                false);
        }
        this._selectedItems = [];
        this._unresolvedItems = [];
        this._$currentlyFocusedItem = null;
        this._resolvedIEntity = null;
        this._setInputText("");
        this._fireInvalidInput();
    }

    private _showAllMruInDropdownWithoutDefaultSelection(showDropdownIfNoMruEntities: boolean = true): void {
        this._showAllMruInDropdown(showDropdownIfNoMruEntities, false);
    }

    private _showAllMruInDropdown(showDropdownIfNoMruEntities: boolean = true, selectFirstByDefault: boolean = true): void {
        var mruIdentitiesSuccessCallback = (identities: Identities_Picker_RestClient.IEntity[]) => {
            if (this._element) {
                if ((identities && identities.length > 0) || showDropdownIfNoMruEntities) {
                    this._showDropdown();
                }

                // Unbind and rebind because IE11 fires input event on focus. Delay the binding to make sure onInputChange won't be triggered.
                // https://connect.microsoft.com/IE/feedback/details/810538/ie-11-fires-input-event-on-focus
                this._$input.off("input.identityPicker");
                this.focusOnSearchInput();
                Utils_Core.delay(this, 0, () => {
                    this._$input.on("input.identityPicker", delegate(this, this._onInputChange));
                });
            }
        };

        this._isSearchEverIssued = true;
        this._identityPickerDropdown.showAllMruIdentities(selectFirstByDefault).then(mruIdentitiesSuccessCallback);
    }

    private _showProgressCursor() {
        this._fire(IdentityPickerSearchControl.SEARCH_STARTED_EVENT, null);
        $(".identity-picker-input", this._element).css("cursor", "progress");
    }

    private _stopProgressCursor() {
        this._fire(IdentityPickerSearchControl.SEARCH_FINISHED_EVENT, null);
        $(".identity-picker-input", this._element).css("cursor", "text");
    }

    private _fireInvalidInput() {
        this._fire(IdentityPickerSearchControl.INVALID_INPUT_EVENT, null);
    }

    private _fireValidInput() {
        this._fire(IdentityPickerSearchControl.VALID_INPUT_EVENT, null);
    }

    private _fireRemoveResolvedInput(removedByClose: boolean) {
        this._fire(IdentityPickerSearchControl.RESOLVED_INPUT_REMOVED_EVENT, removedByClose ? true : null);
    }

    private _updateActiveDescendantId(data: UpdateActiveDescendantEventData) {
        if (data && data.uniqueId && this._identityPickerDropdownUniqueId && this._identityPickerDropdownUniqueId === data.uniqueId) {
            this._$input.attr("aria-activedescendant", data.activeDescendantId);
        }
    }

    private _isShowMruEnabledInDropdown(): boolean {
        return this._options.showMru || this._showMruExpander;
    }

    private _attachHandlersOnShowDropdown(data: IIdentityPickerDropdownEventOptions) {
        if (data && data.uniqueId && this._identityPickerDropdownUniqueId && this._identityPickerDropdownUniqueId === data.uniqueId) {
            if (this._element) {
                this._element.parents().on("scroll.identityPicker resize.identityPicker", delegate(this, this._onInputBlur));
            }
            if (this.isDropdownVisible()) {
                this._$input.attr("aria-expanded", "true");
                this._$input.attr("aria-owns", this._identityPickerDropdown.getItemsListId());
            }

            Events_Services.getService().attachEvent(IdentityPickerSearchControl.DIALOG_MOVE_EVENT, this._externalEventDelegate);
        }
    }

    private _detachHandlersOnHideDropdown(data: IIdentityPickerDropdownEventOptions) {
        if (data && data.uniqueId && this._identityPickerDropdownUniqueId && this._identityPickerDropdownUniqueId === data.uniqueId) {
            if (this._element) {
                this._element.parents().off("scroll.identityPicker resize.identityPicker");
            }

            this._$input.attr("aria-expanded", "false");
            this._$input.removeAttr("aria-activedescendant");

            Events_Services.getService().detachEvent(IdentityPickerSearchControl.DIALOG_MOVE_EVENT, this._externalEventDelegate);
        }
    }

    private _hideDropdown(e?: JQueryEventObject): void {
        if (!this._identityPickerDropdown || this._options.forceOpen) {
            return;
        }

        this._detachHandlersOnHideDropdown({
            uniqueId: this._identityPickerDropdownUniqueId
        });
        this._identityPickerDropdown.hide(e);
        this._$input.removeAttr("aria-activedescendant");
    }

    private _showDropdown(e?: JQueryEventObject): void {
        this._attachHandlersOnShowDropdown({
            uniqueId: this._identityPickerDropdownUniqueId
        });
        this._identityPickerDropdown.show();
    }

    private _compareInputOnInputChangeEvent(input: string): boolean {
        input = !input ? "" : input;
        return this._previousInput == input;
    }

    private _setInputText(input: string) {
        input = !input ? "" : input;
        this._$input.val(input);
        this._previousInput = input;
        if (this._options.smallScreenRender && input) {
            this._$closeInput.show();
        }
    }
    private _resetPreviousInput() {
        this._previousInput = "";
    }

    private _onInputChange(e?: JQueryEventObject) {
        var inputText = this.getInputText();

        if (this._options.smallScreenRender) {
            if (inputText) {
                this._$closeInput.show();
            }
            else {
                this._$closeInput.hide();
            }
        }
        // If the input is not actually changed, do nothing and return. Added because IE is firing input change event on focus changes.
        if (this._compareInputOnInputChangeEvent(inputText)) {
            return true;
        }
        inputText = !inputText ? "" : inputText;
        this._previousInput = inputText;

        this._resolvedIEntity = null;
        this._recalculateInputWidth();
        if (inputText && inputText.indexOf(";") <= 0) {
            this._fireInvalidInput();
        } else {
            this._fireInputValidityEvent();
        }
        if (!inputText || !this._options.multiIdentitySearch || inputText.indexOf(";") < 0) {
            this._isSearchEverIssued = true;

            if (inputText && !this._options.multiIdentitySearch) {
                var queryTokens = inputText.split(";");
                var validToken = "";
                for (var index in queryTokens) {
                    var token = queryTokens[index] ? queryTokens[index].trim() : "";
                    if (token) {
                        validToken = token;
                        break;
                    }
                }
                inputText = validToken;
            }

            this._identityPickerDropdown.getIdentities(inputText);
            return true;
        } else {
            this._resolveInputToIdentities(this.getInputText());
        }
        e.stopPropagation();
    }

    private _onInputClick(e?: JQueryEventObject) {
        var inputText = this.getInputText();
        if (inputText) {
            if (this._isSearchEverIssued) {
                this._showDropdown(e);
            }
            else if (this._options.showMru) {
                this._showAllMruInDropdown(false);
            }
        }
    }

    private _onMruTriangleMousedown(e: JQueryEventObject) {
        e.preventDefault(); // this prevents the blur on the input element to be fired
        e.stopPropagation(); // this prevents the JQuery UI dialog default onmousedown handler to be fired
    }

    private _onMruTriangleClick(e: JQueryEventObject) {
        if (this._isReadOnly()) {
            return false;
        }

        if (this.isDropdownVisible()) {
            this._hideDropdown(e);
        } else {
            this._showAllMruInDropdownWithoutDefaultSelection();
        }
        this.focusOnSearchInput();
        e.stopPropagation();
    }

    private _isDropdownHovered(): boolean {
        return (this._identityPickerDropdown.getElement()
            && $(this._identityPickerDropdown.getElement()).filter(':hover').length > 0);
    }

    private _isContactCardHovered(): boolean {
        return ($(".idcard-dialog").length > 0
            && $(".idcard-dialog").filter(':hover').length > 0);
    }

    private _onInputBlur(e?: JQueryEventObject) {
        if (this._identityPickerDropdown && !this._isDropdownHovered()
            && !($(".idcard-dialog").length || $(".idcard-dialog-content").length)
            && this._$input.is(':visible')) {

            let itemResolved = false;
            if (this._trackTabKeyDown) {
                if (this.isDropdownVisible() && this._identityPickerDropdown.getSelectedItem()) {
                    this._resolveSelectedItem(true); // if we have a selection in the dropdown, resolve it when we tab out of the input
                    itemResolved = true;
                }

                this._trackTabKeyDown = false;
            }

            if (this._options.highlightResolved && !itemResolved) {
                if (this._resolvedIEntity) {
                    this._resolveItem(this._resolvedIEntity);
                } else if (this._options.watermark && !this.getInputText()) {
                    this._showWatermark();
                    this._showMruTriangle();
                }
            }

            if (this.isDropdownVisible()) {
                this._hideDropdown(e);
            }

            if (this._options.callbacks && this._options.callbacks.onInputBlur) {
                this._options.callbacks.onInputBlur();
            }
        }
    }

    private _focusOnResolvedItem(item: JQuery) {
        if (item.is(':visible')) {
            item.focus();
            this._$container.triggerHandler("focus"); // some consumers have events that depend on the container focus
        }
        else {
            this.focusOnSearchInput();
        }
    }

    private _onInputKeyDown(e?: JQueryEventObject): boolean {
        if (!e) {
            return true;
        }

        if (this._isReadOnly()) {
            return true;
        }

        if (e.keyCode === keyCode.ESCAPE) {
            if (this.isDropdownVisible()) {
                // If dropdown is visible, stop propagtion the event, it will handle it on keyUp, otherwise allow the propagation
                e.stopPropagation();
            }
        }

        if (e.keyCode === keyCode.UP) {
            if (this.isDropdownVisible()) {
                this._identityPickerDropdown.handleKeyEvent(e);
            }

            e.preventDefault();
            return true;
        }

        if (e.keyCode === keyCode.DOWN) {
            if (this._identityPickerDropdown) {
                if (!this._identityPickerDropdown.isVisible()) {
                    if (this._isShowMruEnabledInDropdown()) {
                        this._showAllMruInDropdown();
                    } else {
                        this._showDropdown(e);
                    }
                } else {
                    this._identityPickerDropdown.handleKeyEvent(e);
                }
            }

            e.preventDefault();
            return true;
        }

        if (e.keyCode === keyCode.TAB) {
            this._trackTabKeyDown = true;
            return true;
        }

        if (e.keyCode === keyCode.ENTER) {
            if (this.isDropdownVisible()) {
                this.focusOnSearchInput();
                this._resolveSelectedItem();
                return false;
            } else if (this._options.multiIdentitySearch && this._$currentlyFocusedItem) {
                this._$currentlyFocusedItem.click();
                return false;
            }
            return true;
        }

        if (e.keyCode === keyCode.RIGHT
            && this._showContactCard
            && this.isDropdownVisible()
            && this._identityPickerDropdown.getSelectedItem()
            && (<HTMLInputElement>this._$input[0]).selectionEnd == this._$input.val().length) {
            this._identityPickerDropdown.handleKeyEvent(e);
            e.preventDefault();
            return false;
        }

        if (e.keyCode === keyCode.DELETE
            && this._isShowMruEnabledInDropdown()
            && this.isDropdownVisible()) {
            var item = this._identityPickerDropdown.getSelectedItem();
            if (item && item.isMru && EntityHelpers.isDirectoryEntityType(item)) {
                this._identityPickerDropdown.handleKeyEvent(e);
                e.preventDefault();
                return false;
            }
        }

        if (!this._$currentlyFocusedItem && this._$input[0] === document.activeElement && (<HTMLInputElement>this._$input[0]).selectionStart > 0) {
            return true;
        }

        if (this._options.callbacks && this._options.callbacks.onKeyPress) {
            this._options.callbacks.onKeyPress(e.keyCode);
        }

        switch (e.keyCode) {
            case keyCode.LEFT:
                if (!this._options.multiIdentitySearch) {
                    return true;
                }
                if (this._$currentlyFocusedItem && this._$currentlyFocusedItem.prev('.identity-picker-resolved')[0]) {
                    this._$currentlyFocusedItem.blur();
                    this._$currentlyFocusedItem = this._$currentlyFocusedItem.prev('.identity-picker-resolved');
                    this._focusOnResolvedItem(this._$currentlyFocusedItem);
                    return false;
                }
                if (!this._$currentlyFocusedItem
                    && ((this._selectedItems && this._selectedItems.length > 0) || (this._unresolvedItems && this._unresolvedItems.length > 0))
                    && this._$input[0] === document.activeElement && !(<HTMLInputElement>this._$input[0]).selectionStart) {
                    this._$currentlyFocusedItem = this._$input.prev('.identity-picker-resolved');
                    this._focusOnResolvedItem(this._$currentlyFocusedItem);
                    return false;
                }
                return true;
            case keyCode.RIGHT:
                if (!this._options.multiIdentitySearch) {
                    return true;
                }
                if (this._$currentlyFocusedItem) {
                    this._$currentlyFocusedItem.blur();
                    if (this._$currentlyFocusedItem.next('.identity-picker-resolved')[0]) {
                        this._$currentlyFocusedItem = this._$currentlyFocusedItem.next('.identity-picker-resolved');
                        this._focusOnResolvedItem(this._$currentlyFocusedItem);
                    } else {
                        this.focusOnSearchInput();
                    }
                    return false;
                }
                return true;
            case keyCode.BACKSPACE:
                if (!this._options.multiIdentitySearch) {
                    if (this._selectedItems && this._selectedItems.length > 0) {
                        this._removeFromResolved(this._$input.prev('.identity-picker-resolved').attr('data-signin'));
                        this._$input.prev('.identity-picker-resolved').off(".identityPicker").remove();
                        this._resetSearchControl();
                        return false;
                    }
                    return true;
                }
                if (this._$currentlyFocusedItem) {
                    var temp = this._$currentlyFocusedItem;
                    if (this._$currentlyFocusedItem.prev('.identity-picker-resolved')[0]) {
                        this._$currentlyFocusedItem = this._$currentlyFocusedItem.prev('.identity-picker-resolved');
                        this._focusOnResolvedItem(this._$currentlyFocusedItem);
                    } else if (this._$currentlyFocusedItem.next('.identity-picker-resolved')[0]) {
                        this._$currentlyFocusedItem = this._$currentlyFocusedItem.next('.identity-picker-resolved');
                        this._focusOnResolvedItem(this._$currentlyFocusedItem);
                    } else {
                        this.focusOnSearchInput();
                    }
                    this._removeFromResolved(temp.attr('data-signin'));
                    this._removeFromUnresolved(temp.attr('data-signin'));
                    temp.off(".identityPicker").remove();
                    this._recalculateInputWidth();
                    return false;
                } else if (((this._selectedItems && this._selectedItems.length > 0) || (this._unresolvedItems && this._unresolvedItems.length > 0))
                    && this._$input[0] === document.activeElement && !(<HTMLInputElement>this._$input[0]).selectionStart) {
                    this._removeFromResolved(this._$input.prev('.identity-picker-resolved').attr('data-signin'));
                    this._removeFromUnresolved(this._$input.prev('.identity-picker-resolved').attr('data-signin'));
                    this._$input.prev('.identity-picker-resolved').off(".identityPicker").remove();
                    this._recalculateInputWidth();
                    return false;
                }
                return true;
            case keyCode.DELETE:
                if (!this._options.multiIdentitySearch) {
                    if (this._selectedItems && this._selectedItems.length > 0) {
                        this._removeFromResolved(this._$input.prev('.identity-picker-resolved').attr('data-signin'));
                        this._$input.prev('.identity-picker-resolved').off(".identityPicker").remove();
                        this._resetSearchControl();
                        return false;
                    }
                    return true;
                }
                if (this._$currentlyFocusedItem) {
                    var temp = this._$currentlyFocusedItem;
                    if (this._$currentlyFocusedItem.next('.identity-picker-resolved')[0]) {
                        this._$currentlyFocusedItem = this._$currentlyFocusedItem.next('.identity-picker-resolved');
                        this._focusOnResolvedItem(this._$currentlyFocusedItem);
                    } else {
                        this.focusOnSearchInput();
                    }
                    this._removeFromResolved(temp.attr('data-signin'));
                    this._removeFromUnresolved(temp.attr('data-signin'));
                    temp.off(".identityPicker").remove();
                    this._recalculateInputWidth();
                    return false;
                }
                return true;
            case keyCode.SPACE:
                if (this._options.multiIdentitySearch && this._$currentlyFocusedItem) {
                    this._$currentlyFocusedItem.click();
                    return false;
                }
                return true;
            default:
                return true;
        }
    }

    private _fireInputValidityEvent(): void {
        if (!this.getInputText().length && this._selectedItems && this._selectedItems.length > 0 && (!this._unresolvedItems || !this._unresolvedItems.length)) {
            this._fireValidInput();
        } else {
            this._fireInvalidInput();
        }
    }

    private _resolveSelectedItem(resolveByTab: boolean = false) {
        if (this.isDropdownVisible()) {
            var selectedItem = this._identityPickerDropdown.getSelectedItem();
            if (selectedItem) {
                this._resolveItem(selectedItem, true, null, resolveByTab);
                if (this._options.callbacks && this._options.callbacks.onItemSelect) {
                    this._options.callbacks.onItemSelect(selectedItem);
                }
            }
        }
    }

    private _onInputKeyUp(e?: JQueryEventObject): boolean {
        if (e && e.keyCode !== keyCode.DOWN && e.keyCode !== keyCode.UP && e.keyCode !== keyCode.RIGHT && this._identityPickerDropdown) {
            this._identityPickerDropdown.handleKeyEvent(e);
        }

        return true;
    }

    private _removeFromUnresolved(item: string) {
        var parsedItem = this._getSearchPrefix(item).toLowerCase();
        var index = this._unresolvedItems.indexOf(parsedItem);
        while (index >= 0) {
            this._unresolvedItems.splice(index, 1);
            index = this._unresolvedItems.indexOf(parsedItem);
        }
        this._fireInputValidityEvent();
    }

    private _removeFromResolved(item: string, removedByClose?: boolean) {
        function doesntContain(entity: Identities_Picker_RestClient.IEntity, index: number, arr: Identities_Picker_RestClient.IEntity[]) {
            var dataId = EntityHelpers.getUniqueIdentifierForDisambiguation(entity);
            if (dataId.toLowerCase() === item.toLowerCase()) {
                $('.idcard-dialog').each(function () {
                    if ($(this).is(':visible')
                        && $(this).attr('data-prefix')
                        && item.toLowerCase().indexOf($(this).attr('data-prefix').toLowerCase()) === 0) {
                        $('.ui-dialog-content', $(this)).dialog("close");
                        return false;
                    }
                });
                return false;
            }
            return true;
        }
        var newSelectedItems = this._selectedItems.filter(doesntContain);
        // Only update the selecteItems and fire input validaity event when there`s a change
        if (newSelectedItems.length != this._selectedItems.length) {
            this._selectedItems = newSelectedItems;
            this._fireInputValidityEvent();
            this._fireRemoveResolvedInput(removedByClose);
        }
    }

    public getInputText(): string {
        return this._$input.val().trim();
    }

    private _resolveInputToIdentities(
        input: string,
        queryTypeHint?: Identities_Picker_Services.IQueryTypeHint,
        operationScope?: Identities_Picker_Services.IOperationScope,
        inactiveFallbackDisplayName?: string): void {
        const getIdentitiesSuccessCallback = (queryResults: Identities_Picker_RestClient.QueryTokenResultModel) => {
            if (this._element) {
                if (!queryResults || !queryResults.queryToken || !queryResults.identities) {
                    getIdentitiesErrorCallback();
                    return;
                }

                if (queryResults.identities.length != 1) {
                    if (queryTypeHint && queryTypeHint.UID) {
                        var encodedToken = Utils_String.htmlEncode(queryResults.queryToken);
                        var entity: Identities_Picker_RestClient.IEntity = {
                            entityId: IdentityPickerSearchControl.INACTIVE_ENTITY_ID_PREFIX + '_' + encodedToken,
                            entityType: IdentityPickerSearchControl.INACTIVE_ENTITY_TYPE,
                            originDirectory: ControlHelpers.VisualStudioDirectory,
                            originId: IdentityPickerSearchControl.INACTIVE_ORIGIN_ID_PREFIX + '_' + encodedToken,
                            isMru: false,
                            active: false,
                            displayName: inactiveFallbackDisplayName ? inactiveFallbackDisplayName : queryResults.queryToken,
                            signInAddress: queryResults.queryToken,
                            samAccountName: ControlHelpers.isOnPremiseEnvironment() && queryResults.queryToken.indexOf('\\') >= 0 ? queryResults.queryToken.split('\\', 2)[1] : "",
                            scopeName: ControlHelpers.isOnPremiseEnvironment() && queryResults.queryToken.indexOf('\\') >= 0 ? queryResults.queryToken.split('\\', 1)[0] : "",
                        };
                        entity.image = Identities_Picker_Services.ServiceHelpers.getDefaultIdentityImage(entity);

                        this._resolveItem(entity, false, queryResults.queryToken);
                    } else {
                        this._fireInvalidInput();
                    }
                } else {
                    if (queryResults.queryToken.toLowerCase().trim() in this._queryTokensRequested) {
                        this._resolveItem(queryResults.identities[0], false, queryResults.queryToken);
                    }
                }

                this._hideDropdown();
                this._stopProgressCursor();
            }
        }

        const getIdentitiesErrorCallback = (errorData?: any) => {
            if (this._element) {
                this._stopProgressCursor();
                this._fireValidInput();
            }
            if (errorData) {
                Diag.logError("_resolveInputToIdentities/getIdentitiesErrorCallback:" + JSON.stringify(errorData));
            }
        }

        var queryTokens = input.split(Identities_Picker_Services.ServiceHelpers.GetIdentities_Prefix_Separator);
        var cleanedQueryTokens: string[] = [];
        for (var index in queryTokens) {
            var token: string = queryTokens[index] ? queryTokens[index].trim() : "";
            if (token.length > 0) {
                cleanedQueryTokens.push(token);
                this._unresolveItem(token);
            }
        }

        if (!this._options.multiIdentitySearch) {
            this._queryTokensRequested = {};
        }
        for (var index in cleanedQueryTokens) {
            this._queryTokensRequested[cleanedQueryTokens[index].toLowerCase().trim()] = true;
        }

        var tokenCount = cleanedQueryTokens.length;
        if (tokenCount) {
            this._showProgressCursor();
            //sending at most 50 emails to resolve from the service - AAD currently supports at most 10 clauses - so this might take 5 calls itself
            for (var i = 0; i <= (tokenCount) / 50; i++) {
                let tokensToFetch = cleanedQueryTokens.slice(50 * i, 50 * i + 50);
                var entityOperationsFacadeRequest: IEntityOperationsFacadeRequest = {
                    identityServiceOptions: {
                        operationScope: (operationScope ? operationScope : this._operationScope),
                        identityType: this._identityType,
                        httpClient: this._options.httpClient,
                        extensionData: this._options.extensionData,
                    },
                    identityExtensionOptions: {
                        consumerId: this._options ? this._options.consumerId : Identities_Picker_Constants.ConsumerId.UnknownConsumer,
                    },
                    prefix: tokensToFetch.join(";"),
                    queryTypeHint: queryTypeHint,
                    sources: [SourceId.Directory],
                    filterByScope: this._options.getFilterByScope()
                };

                var response = this._getEntityOperationsFacade().search(entityOperationsFacadeRequest).then(
                    (response: IEntityOperationsFacadeResponse) => {
                        if (!this._options.retainInputIdentitiesSequenceWithinPage) {
                            // Default behavior
                            for (var key in response.queryTokenResponse) {
                                response.queryTokenResponse[key].then(
                                    getIdentitiesSuccessCallback,
                                    getIdentitiesErrorCallback);
                            }
                        }
                        else {
                            // Retain sequence within a page.
                            this._resolveIdentityResponseInSequence(
                                response,
                                tokensToFetch,
                                getIdentitiesSuccessCallback,
                                getIdentitiesErrorCallback);
                        }
                    },
                    getIdentitiesErrorCallback);
            }
        }
    }

    private _resolveIdentityResponseInSequence(
        response: IEntityOperationsFacadeResponse,
        tokenRequestSequence: string[],
        successCallback: (result: Identities_Picker_RestClient.QueryTokenResultModel) => void,
        errorCallback: (error: any) => void): void {

        let tokenResponsePromises: IPromise<Identities_Picker_RestClient.QueryTokenResultModel>[] = [];
        for (let key in response.queryTokenResponse) {
            if (response.queryTokenResponse.hasOwnProperty(key)) {
                tokenResponsePromises.push(response.queryTokenResponse[key]);
            }
        }

        Q.allSettled(tokenResponsePromises).then(
            (results) => {

                let tokenResults: Identities_Picker_RestClient.QueryTokenResultModel[] = [];
                let failedReasons: any[] = [];

                // Separate out valid tokens and failures.
                for (const result of results) {
                    if (result.state === Identities_Picker_Constants.PromiseResultStatus.Fulfilled) {
                        tokenResults.push(result.value);
                    }
                    else if (result.state === Identities_Picker_Constants.PromiseResultStatus.Rejected) {
                        failedReasons.push(result.reason);
                    }
                }

                let tokenToResultMap: IDictionaryStringTo<Identities_Picker_RestClient.QueryTokenResultModel> = {};
                tokenResults.forEach((tokenResult) => tokenToResultMap[tokenResult.queryToken] = tokenResult);

                // Handle all valid tokens in the sequence in which they were queried. 
                for (const token of tokenRequestSequence) {
                    const result = tokenToResultMap[token];
                    if (result) {
                        successCallback(result);
                    }
                }

                // Handle all errors
                for (const error of failedReasons) {
                    errorCallback(error);
                }

                Events_Services.getService().fire(IdentityPickerSearchControl.SEQUENCED_IDENTITIES_IN_PAGE_RESOLVED_EVENT_INTERNAL, this);
            },
            errorCallback);
    }

    private _recalculateInputWidth = () => {
        if (this._$input) {
            this._controlWidth = Math.max(this._$container.width(), IdentityPickerSearchControl.DEFAULT_WIDTH);

            if (this._$input.prev('.identity-picker-resolved')[0]) {
                let previousResolvedItem = this._$input.prev('.identity-picker-resolved');
                let hasScrollbar = this._$container[0].scrollHeight > this._$container.innerHeight();

                let freeSpace = this._$container.offset().left + Math.max(this._$container.outerWidth(), IdentityPickerSearchControl.DEFAULT_WIDTH)
                    - previousResolvedItem.offset().left - previousResolvedItem.outerWidth() - parseInt(previousResolvedItem.css("margin-right"))
                    - parseInt(this._$container.css("padding-right")) - parseInt(this._$container.css("border-right-width"))
                    - (hasScrollbar ? ControlHelpers.SCROLL_BAR_WIDTH_PX : 0)
                    - (this._showMruExpander ? IdentityPickerSearchControl.TRIANGLE_WIDTH_PX : 0)
                    - 1; // being conservative since the width of resolved items can be in fractional pixels (it's a span)

                let placeholderLength = this._$input.attr('placeholder').length;
                if (freeSpace > (placeholderLength ? placeholderLength : 15) * 6) { // just an approximation, taking 6 px per character (considering large upper-case letters)
                    this._$input.outerWidth(freeSpace);
                } else {
                    this._$input.outerWidth(this._controlWidth - ControlHelpers.SCROLL_BAR_WIDTH_PX - (this._showMruExpander ? IdentityPickerSearchControl.TRIANGLE_WIDTH_PX : 0));
                }
            } else {
                this._$input.outerWidth(this._controlWidth - (this._showMruExpander ? IdentityPickerSearchControl.TRIANGLE_WIDTH_PX : 0) - (this._options.smallScreenRender ? this._$closeInput.outerWidth() : 0));
            }
        }
    };

    private _replaceAndCleanup(token: string): boolean {
        var found = false;
        var regex = new RegExp("(( *;+ *)+|^ *)(" + token.replace(/[.^$*+?()[{\\|\]-]/g, '\\$&') + ")(( *;+ *)+| *$)", "gi");
        while (this.getInputText().search(regex) >= 0) {
            this._setInputText(this.getInputText().replace(regex, ";"));
            found = true;
        }
        regex = new RegExp("^( *;+ *)+$"); //remove eventual semicolons at the beginning
        if (!this.getInputText().search(regex)) {
            this._setInputText("");
        }
        return found;
    }

    private _findInSelectedItems(object: Identities_Picker_RestClient.IEntity): number {
        var result = -1;

        if (!object) {
            return result;
        }

        for (var i = 0, len = this._selectedItems.length; i < len; i++) {
            if (this._selectedItems[i].entityId === object.entityId) {
                result = i;
                break;
            }
        }
        return result;
    }

    private _showIdCardDialog(args: IIdentityPickerIdCardDialogOptions) {
        if (!this._showContactCard || !Identities_Picker_Services.ServiceHelpers.isAuthenticatedMember()) return;

        var idcardOptions: IIdentityPickerIdCardDialogOptions = {
            identity: args.identity,
            anchor: args.anchor,
            leftValue: args.leftValue,
            topValue: args.topValue,
            operationScope: this._operationScope,
            identityType: this._identityType,
            httpClient: this._options.httpClient ? this._options.httpClient : null,
            consumerId: this._options.consumerId,
            appendTo: this._options.dialogAppendTo,
            useOfficeFabricProfileCard: this._options.useOfficeFabricProfileCard,
        };

        Controls.Enhancement.enhance(IdCardDialog, "<div/>", idcardOptions);
    }

    private _clearWatermark(): void {
        if (this.isDropdownVisible()) {
            this._hideDropdown();
        }

        if (!this._options.forceOpen && this._identityPickerDropdown) {
            this._identityPickerDropdown.reset();
        }

        this._$input.hide();
        if (this._options.smallScreenRender) {
            this._$closeInput.hide();
        }
        this._setInputText("");
    }

    private _showWatermark() {
        var controlHasFocus = this._isControlInFocus();

        this._controlWidth = Math.max(this._$container.width(), IdentityPickerSearchControl.DEFAULT_WIDTH);
        this._clearWatermark();
        var item = this._options.watermark;

        var watermark = $('<span>')
            .addClass('identity-picker-resolved')
            .addClass("identity-picker-resolved-single-search");

        watermark.attr('tabindex', '-1');
        watermark.blur(delegate(this, (e) => {
            if (this._identityPickerDropdown && !this._isDropdownHovered()
                && !this._isContactCardHovered()
                && watermark.is(':visible')) {
                if (this.isDropdownVisible()) {
                    this._hideDropdown(e);
                }
                if (this._options.callbacks && this._options.callbacks.onInputBlur) {
                    this._options.callbacks.onInputBlur();
                }
            }
        }));

        ControlHelpers.styleElementBySize(watermark, this._size, true);
        var $precedingImage;
        if (!this._options.smallScreenRender) {
            var image: string;
            var defaultImage = Identities_Picker_Services.ServiceHelpers.getDefaultIdentityImage(item);
            if (item.image) {
                image = item.image;
            }
            $precedingImage = ControlHelpers.createImgElement(defaultImage, image, "user-picture-resolved", item.entityId);
        } else {
            $precedingImage = $("<span>")
                .addClass("icon identity-picker-text-search-icon bowtie-icon bowtie-search");
        }
        ControlHelpers.styleElementBySize($precedingImage, this._size, false);
        var displayValue = EntityHelpers.getDisplayName(item);
        var nameContainer = $('<span>')
            .addClass('identity-picker-watermark-name')
            .addClass('text-cursor')
            .text(displayValue);
        watermark.append($precedingImage).append(nameContainer).insertBefore(this._$input);
        watermark.width(this._controlWidth - IdentityPickerSearchControl.OUTER_PADDING_PX - (this._showMruExpander ? IdentityPickerSearchControl.TRIANGLE_WIDTH_PX : 0));
        nameContainer.attr('tabindex', '0');

        var focusOrClickOnWatermark = (e) => {
            e.stopPropagation();

            watermark.off(".identityPicker").remove();
            this._$input.show();
            this._showMruTriangle();
            this._recalculateInputWidth();
            this.focusOnSearchInput();
            this._setInputText("");
        };

        nameContainer.on("focus.identityPicker", delegate(this, (e) => {
            if (this._isReadOnly()) {
                return false;
            }

            focusOrClickOnWatermark(e);
        }));
        // Use mouse down event to make sure this handler is triggered before the "focus" one.
        watermark.on("mousedown.identityPicker", delegate(this, (e) => {
            if (this._isReadOnly()) {
                return false;
            }

            e.preventDefault();
            focusOrClickOnWatermark(e);

            // For watermark(nothing in the input box), show all mru in the dropdown
            this._showAllMruInDropdown(false);
        }));

        if (controlHasFocus) {
            this.focusOnSearchInput();
        }

        // moving tooltip creation at the end to avoid it being set off by the call above to refocus
        if (this._options.callbacks && this._options.callbacks.getCustomTooltip) {
            let tooltip = ControlHelpers.createTooltip(item, this._options.callbacks.getCustomTooltip());
            RichContentTooltip.add(tooltip, nameContainer, { showOnFocus: !this._options.smallScreenRender });
        }
    }

    private _createTemporaryItem(displayName: string, identifier: string) {
        var tmpItem = $('<span>').addClass('identity-picker-resolved identity-picker-temp')
            .attr('data-signin', ControlHelpers.replaceBackslash(identifier))
            .attr('tabindex', '-1');

        ControlHelpers.styleElementBySize(tmpItem, this._size, true);
        var defaultImage = ControlHelpers.createImgElement(Identities_Picker_Services.ServiceHelpers.DefaultUserImage, "", 'user-picture-resolved');
        ControlHelpers.styleElementBySize(defaultImage, this._size, false);
        var nameContainer = $('<span>').addClass('identity-picker-resolved-name').text(displayName);

        if (this._options.multiIdentitySearch) {
            tmpItem.addClass('identity-picker-resolved-bg');
            nameContainer.addClass('identity-picker-search-multiple-name')
                .css('max-width', this._getItemNameContainerMaxWidth([]));
        } else {
            tmpItem.addClass("identity-picker-resolved-single-search");
            if (!this._options.highlightResolved) {
                tmpItem.attr('tabindex', '0');
                tmpItem.addClass('identity-picker-resolved-single-bg');
            }

            $('.identity-picker-resolved', this._element).off(".identityPicker").remove();
        }

        if (this._options.highlightResolved) {
            nameContainer.addClass('text-cursor');
        }

        tmpItem.append(defaultImage).append(nameContainer).insertBefore(this._$input);

        if (this._options.multiIdentitySearch) {
            this._recalculateInputWidth();
        } else {
            this._$input.hide();
            if (this._options.smallScreenRender) {
                this._$closeInput.hide();
            }
        }

        if (this._isControlInFocus()) {
            this.focusOnSearchInput();
        }

        // moving tooltip creation at the end to avoid it being set off by the call above to refocus
        if (this._options.callbacks && this._options.callbacks.getCustomTooltip) {
            RichContentTooltip.add(displayName, nameContainer, { showOnFocus: !this._options.smallScreenRender });
        }
    }

    // Check if either the search control or any of its children currently has focus
    private _isControlInFocus(): boolean {
        var currentActiveElement = $(document.activeElement);
        return currentActiveElement.length > 0 && (this._element.is(currentActiveElement[0]) || this._element.has(currentActiveElement[0]).length > 0);
    }

    private _createResolvedItem(dataAttribute: string): JQuery {
        let resolvedInput = $('<span>')
            .addClass('identity-picker-resolved')
            .attr('data-signin', ControlHelpers.replaceBackslash(dataAttribute));

        if (!this._isReadOnly()) {
            resolvedInput.attr('tabindex', '-1');
        }

        if (this._options.multiIdentitySearch) {
            resolvedInput.addClass('identity-picker-resolved-bg');
        } else {
            resolvedInput.addClass("identity-picker-resolved-single-search");

            if (this._showMruExpander && this._options.highlightResolved) {
                resolvedInput.addClass("identity-picker-drop-icon-padding");
            }

            if (!this._options.highlightResolved) {
                resolvedInput.attr('tabindex', '0');
                if (!!this._options.ariaDescribedby) {
                    resolvedInput.attr('aria-describedby', this._getAriaDescribedby(this._options.ariaDescribedby));
                }
                resolvedInput.addClass('identity-picker-resolved-single-bg');
            }
        }

        return resolvedInput;
    }

    private _setResolvedItemRole(element: JQuery, displayValue?: string) {
        element.attr("role", "button")
            .attr("aria-disabled", "false")
            .attr("aria-label", Utils_String.format(Resources_Platform.IdentityPicker_ButtonResolvedItemLabel, Utils_String.htmlEncodeJavascriptAttribute(displayValue)));

        let newId = Controls.getId().toString();
        let descriptionElement = $('<div>')
            .attr('id', newId)
            .addClass('visually-hidden')
            .appendTo(element);

        element.attr("aria-describedby", this._getAriaDescribedby(newId));

        if (this._options.highlightResolved) {
            descriptionElement.text(Resources_Platform.IdentityPicker_FocusChangeValue);
        } else {
            descriptionElement.text(Utils_String.format(Resources_Platform.IdentityPicker_ButtonResolvedItemDescription, Utils_String.htmlEncodeJavascriptAttribute(displayValue))
                + ". " + (this._showContactCard && !this._options.highlightResolved ?
                    (Resources_Platform.IdentityPicker_EnterSpaceMessage + ". ") : "")
                + Resources_Platform.IdentityPicker_DeleteBackspaceMessage);
        }
    }

    private _resolveItem(
        item: Identities_Picker_RestClient.IEntity,
        clearInput: boolean = true,
        prefix: string = null,
        resolveByTab: boolean = false) {
        this._controlWidth = Math.max(this._$container.width(), IdentityPickerSearchControl.DEFAULT_WIDTH);
        if (item) {
            var controlHasFocus = this._isControlInFocus();

            if (!this._options.multiIdentitySearch && this._selectedItems && this._selectedItems.length > 0) {
                this._clearSearchControl();
            }

            if (this.isDropdownVisible()) {
                this._hideDropdown();
            }
            //if its single select and highlight resolved - do not reset because they might continue typing
            if (!this._options.forceOpen && (this._options.multiIdentitySearch || !this._options.highlightResolved) && this._identityPickerDropdown) {
                this._identityPickerDropdown.reset();
            }

            this._resetPreviousInput();
            if (clearInput) {
                this._setInputText("");
            }

            var searchPrefix = prefix ? this._getSearchPrefix(prefix) : "";
            if (searchPrefix) {
                this._replaceAndCleanup(searchPrefix.toLowerCase());
                this._removeFromUnresolved(searchPrefix.toLowerCase());
                this._element.find('.identity-picker-resolved[data-signin="' + ControlHelpers.replaceBackslash(searchPrefix.toLowerCase()) + '"][data-unresolved="true"]').off(".identityPicker").remove();
            }

            if (this._options.showTemporaryDisplayName) {
                if (!this._options.multiIdentitySearch) {
                    $('.identity-picker-temp', this._element).remove();
                } else {
                    this._element.find('.identity-picker-temp[data-signin="' + ControlHelpers.replaceBackslash(searchPrefix.toLowerCase()) + '"]').remove();
                }
            }

            if (this._findInSelectedItems(item) != -1) { //duplicate items
                this._fireInputValidityEvent();
                return;
            }

            this._selectedItems.push(item);
            $('.ui-dialog-content', $('.idcard-dialog:visible')).dialog("close");

            var dataId = EntityHelpers.getUniqueIdentifierForDisambiguation(item);
            this._$input.width(10);

            var resolvedInput = this._createResolvedItem(dataId.toLowerCase());

            ControlHelpers.styleElementBySize(resolvedInput, this._size, true);
            var image: string;
            var defaultImage = Identities_Picker_Services.ServiceHelpers.getDefaultIdentityImage(item);
            if (item.image) {
                image = item.image;
            }
            var userImage = ControlHelpers.createImgElement(defaultImage, image, 'user-picture-resolved', item.entityId);
            ControlHelpers.styleElementBySize(userImage, this._size, false);
            var displayValue = EntityHelpers.getDisplayName(item);

            if (this._options.smallScreenRender) {
                this._$closeInput.hide();
            }

            var closeElement = this._createCloseButton();
            if (this._options.multiIdentitySearch) {
                closeElement.addClass('identity-picker-resolved-bg');
            } if (!this._options.highlightResolved) {
                closeElement.addClass('identity-picker-resolved-single-bg');
            }

            ControlHelpers.styleElementBySize(closeElement, this._size, false);

            closeElement.click(delegate(this, (e) => {
                this._removeFromResolved(dataId.toLowerCase(), /*removedByClose*/ true);
                resolvedInput.off(".identityPicker").remove();

                if (this._identityPickerDropdown) {
                    this._identityPickerDropdown.updatePrefix("");
                }
                this._resolvedIEntity = null;

                if (!this._options.multiIdentitySearch) {
                    this._resetSearchControl();
                    return;
                }

                this._recalculateInputWidth();
                this.focusOnSearchInput();
                e.stopPropagation();
            }));

            resolvedInput.append(userImage).append(closeElement).insertBefore(this._$input);

            var nameContainer = $('<span>')
                .addClass('identity-picker-resolved-name')
                .text(displayValue);

            if (this._readOnlyMode) {
                nameContainer.attr("aria-label", Utils_String.format(Resources_Platform.ReadOnlyPrefix, this._options.ariaLabel ? this._options.ariaLabel : this._placeholderText));
            }

            if (this._options.multiIdentitySearch) {
                nameContainer.addClass('identity-picker-search-multiple-name')
                    .css('max-width', this._getItemNameContainerMaxWidth([userImage, closeElement]));
            }

            if (this._options.highlightResolved) {
                nameContainer.addClass('text-cursor');
            } else if (EntityHelpers.isDirectoryEntityType(item)) {
                nameContainer.addClass('pointer-cursor');
            }

            if (item.active === false && !EntityHelpers.isAadGroup(item)) {
                nameContainer.addClass('identity-picker-inactive-name');
            }

            if (this._isReadOnly()) {
                closeElement.hide();
            } else {
                this._setResolvedItemRole(resolvedInput, displayValue);
            }
            resolvedInput.append(nameContainer);

            if (this._options.multiIdentitySearch) {
                this._recalculateInputWidth();
            } else {
                this._$input.hide();
                if (this._options.smallScreenRender) {
                    this._$closeInput.hide();
                }
                if (this._showMruExpander) {
                    this._hideMruTriangle();
                }
                if (this._options.watermark) {
                    $('.identity-picker-resolved:has(> .identity-picker-watermark-name)', this._element).off(".identityPicker").remove();
                }
                if (this._options.highlightResolved && !this._isReadOnly()) {
                    nameContainer.attr('tabindex', '0');
                }
            }

            var unresolveIdentity = (e) => {
                e.stopPropagation();

                this._resolvedIEntity = item;
                this._removeFromResolved(dataId.toLowerCase());
                resolvedInput.off(".identityPicker").remove();
                this._$input.show();
                this._showMruTriangle();

                this._recalculateInputWidth();
                this.focusOnSearchInput();
                this._setInputText(displayValue);
                if (this._identityPickerDropdown) {
                    this._identityPickerDropdown.updatePrefix(displayValue);
                }
                this._$input.select();
            };

            // Tab through, unresolve the identity
            if (this._options.highlightResolved) {
                nameContainer.on("focus.identityPicker", delegate(this, (e) => {
                    if (this._isReadOnly()) {
                        return false;
                    }

                    unresolveIdentity(e);
                }));
            }

            var clickOnResolvedIdentityHandler = (e) => {
                if ($.contains(closeElement[0], e.target) || closeElement[0] === e.target) {
                    return true;
                }

                if (this._isReadOnly()) {
                    return false;
                }

                // Click event order: mousedown -> focus -> mouseup -> click
                // Prevent the sub-sequent "focus" event to fire, which will set focus to resovled input and trigger input box to blur
                // Don`t run the click event if the mousedown event is already fired
                if (mousedownAlreadyTriggered) {
                    mousedownAlreadyTriggered = false;
                    return false;
                }
                mousedownAlreadyTriggered = true;
                e.preventDefault();

                if (this._options.highlightResolved) {
                    unresolveIdentity(e);
                } else {
                    e.stopPropagation();

                    if (EntityHelpers.isDirectoryEntityType(item)) {
                        this._showIdCardDialog({
                            anchor: resolvedInput,
                            identity: item,
                            leftValue: 0,
                            consumerId: this._options.consumerId
                        });

                        // The PersonaCard uses Office Fabric's Callout control, but the OF Callout
                        // uses a global click handler to handle dismissal (if you click outside the card).
                        // This causes the card to appear on mousedown, but disappear during the click event.
                        // We add an event handler here to intercept the click event here and prevent it from
                        // propagating up to the document, then immediately remove the event handler to
                        // prevent further click disruption.
                        var clickCanceler = (e) => {
                            e.stopPropagation();
                            resolvedInput.off("click.identityPicker", clickCanceler);
                        }
                        resolvedInput.on("click.identityPicker", clickCanceler);
                    }
                }

                // For resolved identity, show the mru in the dropdown
                if (this._options.highlightResolved) {
                    this._showAllMruInDropdownWithoutDefaultSelection(false);
                }
            }

            var mousedownAlreadyTriggered = false;
            resolvedInput.on("mousedown.identityPicker", delegate(this, (e) => {
                clickOnResolvedIdentityHandler(e);
            }));

            // As some outside consumers(WIT) are triggering click event, we need to bind click also
            resolvedInput.on("click.identityPicker", delegate(this, (e) => {
                clickOnResolvedIdentityHandler(e);
            }));

            // For vanilla single-select, bind on Enter as well
            if (!this._options.multiIdentitySearch && !this._options.highlightResolved) {
                resolvedInput.on("keypress.identityPicker", delegate(this, (e) => {
                    if (e && e.keyCode === keyCode.ENTER) {
                        clickOnResolvedIdentityHandler(e);
                    }
                }));
            }

            resolvedInput.blur(delegate(this, (e) => {
                if (this._identityPickerDropdown && !this._isDropdownHovered()
                    && !this._isContactCardHovered()
                    && resolvedInput.is(':visible')) {
                    if (this.isDropdownVisible()) {
                        this._hideDropdown(e);
                    }
                    if (this._options.callbacks && this._options.callbacks.onInputBlur) {
                        this._options.callbacks.onInputBlur();
                    }
                }
            }));

            if (!this._isReadOnly() && this._showContactCard && !this._options.highlightResolved) {
                resolvedInput.attr("aria-haspopup", "true");
            }

            this._fireInputValidityEvent();
            this._$container[0].scrollTop = this._$container[0].scrollHeight; // for scrolling to the bottom of the search box in case of multi-select (webkit issue)

            // Reset focus to the search input if the control has focus before, and it's not a resolve by tab and go to next element action
            if (controlHasFocus && !resolveByTab) {
                this.focusOnSearchInput();
            }

            // only showing the tooltip for the highlightResolved case, all others will get the contact card 
            if (this._options.highlightResolved && Identities_Picker_Services.ServiceHelpers.isAuthenticatedMember()) {
                // moving tooltip creation at the end to avoid it being set off by the call above to refocus
                RichContentTooltip.add(ControlHelpers.createTooltip(item), nameContainer, { showOnFocus: !this._options.smallScreenRender });
            }
        }
    }

    private _getItemNameContainerMaxWidth(otherElementsInItemSpan: JQuery[]): number {
        var maxNameContainerWidth = this._controlWidth - ControlHelpers.SCROLL_BAR_WIDTH_PX;
        for (var elementsIndex in otherElementsInItemSpan) {
            if (otherElementsInItemSpan.hasOwnProperty(elementsIndex)) {
                maxNameContainerWidth -= parseInt(otherElementsInItemSpan[elementsIndex].css('width'), 10);
            }
        }
        return maxNameContainerWidth;
    }

    private _createCloseButton(): JQuery {
        const $icon = $('<span>')
            .addClass('identity-picker-resolved-close-icon bowtie-icon');

        $icon.addClass(this._options.smallScreenRender ? 'bowtie-edit-remove' : 'bowtie-edit-delete');

        var closeElement = $('<span>')
            .addClass('identity-picker-resolved-close')
            .append($icon);

        return closeElement;
    }

    private _getSearchPrefix(input: string): string {
        var re = /^.*[(<{\[]\s*([^\s]+@[^\s]+\.[^\s]+[^)>}\]])\s*[)>}\]]+\s*$/;
        var result = re.exec(input);
        if (result && result[0] === input) {
            return result[1];
        }
        return input;
    }

    private _unresolveItem(token: string) {
        this._controlWidth = Math.max(this._$container.width(), IdentityPickerSearchControl.DEFAULT_WIDTH);
        this._resetPreviousInput();
        if (token) {
            var searchPrefix = this._getSearchPrefix(token);
            if (this._unresolvedItems.indexOf(searchPrefix.toLowerCase()) != -1) { //duplicate items
                this._replaceAndCleanup(token.toLowerCase());
                return;
            }
            if (!this._replaceAndCleanup(token.toLowerCase())) {
                return;
            }

            if (this._options.showTemporaryDisplayName) {
                if (!this._options.multiIdentitySearch) {
                    $('.identity-picker-temp', this._element).remove();
                } else {
                    this._element.find('.identity-picker-temp[data-signin="' + ControlHelpers.replaceBackslash(searchPrefix.toLowerCase()) + '"]').remove();
                }
            }

            this._fireInvalidInput();
            this._unresolvedItems.push(searchPrefix.toLowerCase());

            this._$input.width(10);
            var resolvedInput = this._createResolvedItem(searchPrefix.toLowerCase())
                .attr('data-unresolved', 'true');

            ControlHelpers.styleElementBySize(resolvedInput, this._size, true);

            const $icon = $('<span>').addClass('identity-picker-resolved-close-icon bowtie-icon bowtie-edit-delete');
            $icon.addClass(this._options.smallScreenRender ? 'bowtie-edit-remove' : 'bowtie-edit-delete');
            var closeElement = $('<span>')
                .addClass('identity-picker-resolved-close')
                .append($icon);
            if (this._options.multiIdentitySearch) {
                closeElement.addClass('identity-picker-resolved-bg');
            } else if (!this._options.highlightResolved) {
                closeElement.addClass('identity-picker-resolved-single-bg');
            }

            ControlHelpers.styleElementBySize(closeElement, this._size, false);
            closeElement.click(delegate(this, (e) => {
                this._removeFromUnresolved(token.toLowerCase());
                resolvedInput.off(".identityPicker").remove();
                this._recalculateInputWidth();
                this.focusOnSearchInput();
            }));
            resolvedInput.append(closeElement).insertBefore(this._$input);

            var nameContainer = $('<span>')
                .addClass('identity-picker-unresolved-name')
                .text(Utils_String.decodeHtmlSpecialChars(token));
            if (this._options.multiIdentitySearch) {
                nameContainer.addClass('identity-picker-search-multiple-name')
                    .css('max-width', this._getItemNameContainerMaxWidth([closeElement]));
            }

            resolvedInput.attr("role", "button")
                .attr("aria-label", Utils_String.format(Resources_Platform.IdentityPicker_ButtonUnresolvedItemLabel, token));

            let newId = Controls.getId().toString();
            let descriptionElement = $('<div>')
                .attr('id', newId)
                .addClass('visually-hidden')
                .appendTo(resolvedInput);

            descriptionElement.text(Utils_String.format(Resources_Platform.IdentityPicker_ButtonUnresolvedItemDescription, token)
                + ". " + Resources_Platform.IdentityPicker_DeleteBackspaceMessage);

            resolvedInput.attr("aria-describedby", newId);

            resolvedInput.append(nameContainer);
            this._recalculateInputWidth();
            this.focusOnSearchInput();
            this._$container[0].scrollTop = this._$container[0].scrollHeight; // for scrolling to the bottom of the search box in case of multi-select (webkit issue)

            // moving tooltip creation at the end to avoid it being set off by the call above to refocus
            RichContentTooltip.add(Resources_Platform.IdentityPicker_UnresolvedIdentity + ": " + token, nameContainer, { showOnFocus: !this._options.smallScreenRender });
        }
    }

    private _generatePlaceHolder(identityTypeList: string[]): string {
        if (this._isInArray(Identities_Picker_Services.ServiceHelpers.UserEntity, identityTypeList) && this._isInArray(Identities_Picker_Services.ServiceHelpers.GroupEntity, identityTypeList)) {
            return Resources_Platform.IdentityPicker_PlaceholderTextUserGroup;
        } else if (this._isInArray(Identities_Picker_Services.ServiceHelpers.UserEntity, identityTypeList) && !this._isInArray(Identities_Picker_Services.ServiceHelpers.GroupEntity, identityTypeList)) {
            return Resources_Platform.IdentityPicker_PlaceholderTextUser;
        } else if (!this._isInArray(Identities_Picker_Services.ServiceHelpers.UserEntity, identityTypeList) && this._isInArray(Identities_Picker_Services.ServiceHelpers.GroupEntity, identityTypeList)) {
            return Resources_Platform.IdentityPicker_PlaceholderTextGroup;
        } else {
            return Resources_Platform.IdentityPicker_PlaceholderTextPrefix;
        }
    }

    private _isInArray(s: string, a: string[]): boolean {
        return a.indexOf(s) >= 0;
    }
}

export interface IdentitySearchResult {
    resolvedEntities: Identities_Picker_RestClient.IEntity[];
    unresolvedQueryTokens: string[];
}

export enum IdentityPickerControlSize { Small, Medium, Large };

export interface IIdentityDisplayOptions extends
    Identities_Picker_Services.IIdentityServiceOptions,
    Identities_Picker_Services.IIdentityPickerExtensionOptions {
    /**
    *   the identity to be displayed - if you are constructing the IEntity object, its identifiers (such as entityId, localId etc.) have to be valid;
    *   alternatively the input can be a unique identifier (such as a sign-in address or alias)
    **/
    item: string | Identities_Picker_RestClient.IEntity;
    /**
    *   the size of the control elements (Small - most elements are 16px in height, Medium - 24px, Large - 32px). Default: Medium
    **/
    size?: IdentityPickerControlSize;
    /**
    *   Determines what is shown in the control
    **/
    displayType?: EDisplayControlType;
    /**
    *   the string to be shown before the IEntity gets resolved
    **/
    friendlyDisplayName?: string;
    /**
    *   Turn off the hover effect. Default: false
    **/
    turnOffHover?: boolean;
    /**
    *   (optional) JQuery selector string which specifies a DOM element to render all JQueryUI dialogs in.
    *   Currently the only dialog which is displayed is IdCardDialog, but this should be used for any future
    *   dialogs as well, in order to work with Fabric's dialog model.
    *   If this is not specified, JQueryUI's default is to append the dialog element to the <body> element.
    **/
    dialogAppendTo?: string;
}

export enum EDisplayControlType {
    AvatarText,
    AvatarOnly,
    TextOnly,
}

enum IdentityPickerAhthorizationExceptionType {
    ExpiredAccessToken,
    IsGuestUser
}

export class IdentityDisplayControl extends Controls.Control<IIdentityDisplayOptions>{
    private static DEFAULT_HOVER_WAIT_ENTER_INTERVAL: number = 800;
    private static DEFAULT_HOVER_WAIT_EXIT_INTERVAL: number = 200;
    private static MIN_WIDTH: number = 100;
    private static OUTER_PADDING_PX: number = 2; // total vertical or horizontal padding of resolved elements
    private _identityType: Identities_Picker_Services.IEntityType;
    private _operationScope: Identities_Picker_Services.IOperationScope;
    private _size: IdentityPickerControlSize;
    private _displayType: EDisplayControlType;
    private _hoverIdCardEnterTimer: Utils_Core.DelayedFunction;
    private _hoverIdCardExitTimer: Utils_Core.DelayedFunction;
    private _displayedEntity: Identities_Picker_RestClient.IEntity = null;
    private _turnOffHover: boolean;
    private _showIdCard: boolean;
    private _entityOperationsFacade: EntityOperationsFacade;

    constructor(options?: IIdentityDisplayOptions) {
        super(options);

        this._identityType = options.identityType ? options.identityType : { User: true }; //default User only
        this._operationScope = options.operationScope ? options.operationScope : { IMS: true }; //default IMS only
        this._size = (options.size !== null && options.size !== undefined) ? options.size : IdentityPickerControlSize.Medium; //with enums, 0 is a valid value
        this._turnOffHover = options.turnOffHover ? options.turnOffHover : false; // default turn on hover
    }

    public initialize() {
        super.initialize();

        if (!Identities_Picker_Services.ServiceHelpers.isAuthenticatedMember()) {
            this._turnOffHover = true;
        }

        var item = this._options.item;
        if (!item || ((typeof (item) === "string" || item instanceof String) && !(<string>item).trim())) {
            var exp: IArgumentException = {
                source: "IdentityDisplayControl.initialize()",
                message: "The item argument to the IdentityDisplayControl cannot be null or empty"
            };
            throw exp;
        }

        this._displayType = this._options.displayType ? this._options.displayType : EDisplayControlType.AvatarText;

        if ((typeof (item) === "string" || item instanceof String) && item) {
            item = (<string>item).trim();
            this._displayString(<string>item);
            this._resolveStringToEntity(<string>item);
        } else {
            this._displayEntity(<Identities_Picker_RestClient.IEntity>item, "");
        }
    }

    public getDisplayedEntity(): Identities_Picker_RestClient.IEntity {
        if (this._displayedEntity) {
            return this._displayedEntity;
        }

        var ex: IUsageException = {
            source: "getResolvedEntity",
            message: "No resolved entity found.",
        };

        throw ex;
    }

    private _getEntityOperationsFacade(): EntityOperationsFacade {
        if (!this._entityOperationsFacade) {
            this._entityOperationsFacade = Service.getService(EntityOperationsFacade);
        }

        return this._entityOperationsFacade;
    }

    private _resolveStringToEntity(input: string) {
        var getIdentitiesSuccessCallback = (queryResults: Identities_Picker_RestClient.QueryTokenResultModel) => {
            if (this._element) {
                if (!queryResults || !queryResults.queryToken || !queryResults.identities) {
                    return;
                }

                if (queryResults.identities.length != 1) {
                    return;
                } else {
                    this._getEntityOperationsFacade().queryTokenEntityImageCache.set(input, queryResults.identities[0].image);
                    this._displayEntity(queryResults.identities[0], input);
                }
            }
        };
        var getIdentitiesErrorCallback = (errorData?: any) => {
            //fail silently
            if (errorData) {
                Diag.logWarning("_resolveStringToEntity/getIdentitiesErrorCallback:" + JSON.stringify(errorData));
            }
        };

        var queryTypeHint: Identities_Picker_Services.IQueryTypeHint = {
            UID: true,
        };

        var entityOperationsFacadeRequest: IEntityOperationsFacadeRequest = {
            identityServiceOptions: {
                operationScope: this._operationScope,
                identityType: this._identityType,
                httpClient: this._options.httpClient,
                extensionData: this._options.extensionData,
            },
            identityExtensionOptions: {
                consumerId: this._options ? this._options.consumerId : Identities_Picker_Constants.ConsumerId.UnknownConsumer,
            },
            prefix: input,
            queryTypeHint: queryTypeHint,
            sources: [SourceId.Directory],
        };

        var response = this._getEntityOperationsFacade().search(entityOperationsFacadeRequest)
            .then(
                (response: IEntityOperationsFacadeResponse) => {
                    for (var key in response.queryTokenResponse) {
                        response.queryTokenResponse[key].then(
                            delegate(this, getIdentitiesSuccessCallback),
                            delegate(this, getIdentitiesErrorCallback));
                    }
                },
                getIdentitiesErrorCallback
            );
    }

    private _showIdCardDialog(args: IIdentityPickerIdCardDialogOptions) {
        if (!Identities_Picker_Services.ServiceHelpers.isAuthenticatedMember()) {
            return;
        }

        Controls.Enhancement.enhance(IdCardDialog, "<div/>", <IIdentityPickerIdCardDialogOptions>{
            identity: args.identity,
            anchor: args.anchor,
            leftValue: args.leftValue,
            operationScope: this._operationScope,
            identityType: this._identityType,
            httpClient: this._options.httpClient ? this._options.httpClient : null,
            consumerId: this._options.consumerId,
            appendTo: this._options.dialogAppendTo,
        });
    }

    private _displayString(item: string) {
        let resolvedInput = $('<span>').addClass('identity-picker-display')
            .attr('data-item', item)
            .attr('tabindex', '-1');
        if (!this._turnOffHover) {
            RichContentTooltip.add(this._options.friendlyDisplayName
                ? this._options.friendlyDisplayName + " <" + item + ">"
                : item, resolvedInput);
        }
        ControlHelpers.styleElementBySize(resolvedInput, this._size, true);

        var userImage: JQuery = null;
        if (this._displayType != EDisplayControlType.TextOnly) {
            var cachedEntityImage: string = this._getEntityOperationsFacade().queryTokenEntityImageCache.get(item);
            var defaultImage = cachedEntityImage ? cachedEntityImage : Identities_Picker_Services.ServiceHelpers.DefaultUserImage;
            userImage = ControlHelpers.createImgElement(defaultImage, "", "user-picture-resolved");
            ControlHelpers.styleElementBySize(userImage, this._size, false);
            resolvedInput.append(userImage);
        }

        if (this._displayType != EDisplayControlType.AvatarOnly) {
            var nameContainer = $('<span>').addClass('identity-picker-resolved-name')
                .text(this._options.friendlyDisplayName ? this._options.friendlyDisplayName : item);
            resolvedInput.append(nameContainer);
        } else {
            userImage.attr("alt", this._options.friendlyDisplayName ? this._options.friendlyDisplayName + " <" + item + ">" : item);
        }

        resolvedInput.appendTo(this._element);
    }

    private _displayEntity(entity: Identities_Picker_RestClient.IEntity, prefix: string) {
        if (!entity) {
            Diag.Debug.assertParamIsNotNull(entity, "entity");
            return;
        }
        this._displayedEntity = entity;
        var displayValue = EntityHelpers.getDisplayName(this._displayedEntity);
        var dataId = EntityHelpers.getUniqueIdentifierForDisambiguation(this._displayedEntity);
        var resolvedInput = $('<span>')
            .addClass('identity-picker-display')
            .attr('data-signin', ControlHelpers.replaceBackslash(dataId.toLowerCase()))
            .attr('tabindex', '-1');
        ControlHelpers.styleElementBySize(resolvedInput, this._size, true);

        var userImage: JQuery = null;
        var nameContainer: JQuery = null;

        if (this._displayType != EDisplayControlType.TextOnly) {
            var defaultImage = Identities_Picker_Services.ServiceHelpers.getDefaultIdentityImage(this._displayedEntity);
            userImage = ControlHelpers.createImgElement(defaultImage, this._displayedEntity.image ? this._displayedEntity.image : "",
                "user-picture-resolved", this._displayedEntity.entityId);
            ControlHelpers.styleElementBySize(userImage, this._size, false);
            resolvedInput.append(userImage);
        }

        if (this._displayType != EDisplayControlType.AvatarOnly) {
            nameContainer = $('<span>').addClass('identity-picker-resolved-name').text(displayValue);
            $('.identity-picker-display[data-item="' + prefix + '"]', this._element).remove();
            resolvedInput.append(nameContainer);
        } else {
            var signInAddress = EntityHelpers.getSignInAddress(this._displayedEntity);
            userImage.attr("alt", displayValue !== signInAddress ? displayValue + " <" + signInAddress + ">" : displayValue);
        }

        var removeIdCard = () => {
            var idCard = $('.idcard-dialog[data-objectid="' + this._displayedEntity.entityId + '"]');
            if (idCard.length) {
                $('.ui-dialog-content', idCard).dialog("close");
            }
        };
        var setHoverCardEntryTimer = () => {
            this._hoverIdCardEnterTimer = new Utils_Core.DelayedFunction(this, IdentityDisplayControl.DEFAULT_HOVER_WAIT_ENTER_INTERVAL, "showDisplayControlContactCard", () => {
                if (this._element.parent().length > 0 && this._element.is(":visible")) {
                    this._showIdCardDialog({
                        anchor: resolvedInput,
                        identity: this._displayedEntity,
                        leftValue: 0,
                        consumerId: this._options.consumerId
                    });
                }
            });
        };
        if (!this._turnOffHover
            && EntityHelpers.isDirectoryEntityType(this._displayedEntity)) {
            resolvedInput.hover(
                (e: JQueryEventObject) => {
                    if (this._hoverIdCardEnterTimer) {
                        this._hoverIdCardEnterTimer.reset();
                    } else {
                        setHoverCardEntryTimer();
                        this._hoverIdCardEnterTimer.start();
                    }
                },
                (e) => {
                    if (this._hoverIdCardEnterTimer) {
                        this._hoverIdCardEnterTimer.cancel();
                    }
                    var idCard = $(".idcard-dialog[data-objectid=\"" + this._displayedEntity.entityId + "\"]");
                    var startExitTimer = () => {
                        if (!this._hoverIdCardExitTimer) {
                            this._hoverIdCardExitTimer = new Utils_Core.DelayedFunction(
                                this, IdentityDisplayControl.DEFAULT_HOVER_WAIT_EXIT_INTERVAL,
                                "closeDisplayControlContactCard",
                                removeIdCard);
                            this._hoverIdCardExitTimer.start();
                        } else {
                            this._hoverIdCardExitTimer.reset();
                        }
                    };
                    if (idCard && idCard.length) {
                        idCard.mouseenter((g) => {
                            this._hoverIdCardExitTimer.cancel();
                            idCard.mouseleave((g) => {
                                startExitTimer();
                            });
                        });
                    }
                    startExitTimer();
                });
        }

        this._element.empty();
        resolvedInput.appendTo(this._element);
    }
}

class ControlHelpers {
    //Match with EntityType in IEntity results
    public static UserEntityType: string = Identities_Picker_Services.ServiceHelpers.UserEntity;
    public static GroupEntityType: string = Identities_Picker_Services.ServiceHelpers.GroupEntity;
    //Match with Origin and local directories in IEntity results
    public static VisualStudioDirectory: string = Identities_Picker_Services.ServiceHelpers.VisualStudioDirectory;
    public static AzureActiveDirectory: string = Identities_Picker_Services.ServiceHelpers.AzureActiveDirectory;
    public static SourceDirectory: string = Identities_Picker_Services.ServiceHelpers.SourceDirectory;

    public static FIXED_POSTIION_CLASS: string = 'identity-picker-fixed-position';

    public static SCROLL_BAR_WIDTH_PX: number = 20; // scroll bar width
    public static IDENTITY_ITEM_BUFFER_WIDTH_PX: number = 18; // This is the buffer width that includes the width of scroll bar.

    //a more accurate, much less performant regex for email validation more compliant with the RFC would be RegExp("^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$", 'i');

    public static styleElementBySize(element: JQuery, controlSize: IdentityPickerControlSize, heightOnly: boolean = true) {
        switch (controlSize) {
            case IdentityPickerControlSize.Small:
                if (heightOnly) {
                    element.addClass('element-height-small');
                } else {
                    element.addClass('element-2d-small');
                }

                if (element.hasClass('identity-picker-resolved-single-search')) {
                    element.addClass('element-height-small-compensate-padding');
                }
                break;
            case IdentityPickerControlSize.Medium:
                if (heightOnly) {
                    element.addClass('element-height-medium');
                } else {
                    element.addClass('element-2d-medium');
                }

                if (element.hasClass('identity-picker-resolved-single-search')) {
                    element.addClass('element-height-medium-compensate-padding');
                }
                break;
            case IdentityPickerControlSize.Large:
                if (heightOnly) {
                    element.addClass('element-height-large');
                } else {
                    element.addClass('element-2d-large');
                }

                if (element.hasClass('identity-picker-resolved-single-search')) {
                    element.addClass('element-height-large-compensate-padding');
                }
                break;
        }
    }

    public static createImgElement(defaultImage: string, src: string = "", elementClass: string = "", objectId: string = ""): JQuery {
        var img = $("<img>")
            .css("background", `url('${defaultImage}') no-repeat`).css("background-size", "100%")
            .attr("src", src ? src : defaultImage).attr("alt", "")
            .attr("draggable", "false") // this is to prevent img from being draggable
            .on("dragstart", () => { return false; });

        img.on("error", () => {
            if (img.attr("src") && img.attr("src") === defaultImage) {
                img.off("error");
                img.css("background-color", "#7d7d7d")
                    .css("background-size", "100%");
            } else {
                img.attr("src", defaultImage);
            }
        });

        // From standard and tested in IE, Edge, Chrome, Firefox,
        // When cannot get custom avatar, load() will not be called.
        // and will not be called before error handler in this situation
        img.load(() => {
            if (img.attr("src") && img.attr("src") !== defaultImage) {
                img.css("background-image", "none");
            }
        });

        if (elementClass) {
            img.addClass(elementClass);
        }
        if (objectId) {
            img.attr("data-objectid", objectId);
        }
        return img;
    }

    public static getRandomString() {
        return Math.random().toString(36).substring(5);
    }

    public static getSizePx(controlSize: IdentityPickerControlSize): number {
        switch (controlSize) {
            case IdentityPickerControlSize.Small:
                return 16;
            case IdentityPickerControlSize.Medium:
                return 24;
            case IdentityPickerControlSize.Large:
                return 32;
        }
    }

    /**
    *   Validates emails
    **/
    public static isValidEmail(input: string) {
        var emailComponents = input.split("@");
        if (emailComponents.length === 2
            && emailComponents[0].length >= 1
            && emailComponents[1].length >= 1) {
            return true;
        }

        return false;;
    }

    public static isOnPremiseEnvironment(): boolean {
        return !Context.getPageContext().webAccessConfiguration.isHosted === true;
    }

    /**
    *   Sort all type of group members by display name.
    **/
    public static sortGroupMembersByName(members: Identities_Picker_RestClient.IEntity[]): Identities_Picker_RestClient.IEntity[] {
        return members.sort((member1, member2) => {
            if (!member1 || !member1.displayName) {
                return -1;
            }
            if (!member2 || !member2.displayName) {
                return 1;
            }

            return member1.displayName.toLocaleLowerCase().localeCompare(member2.displayName.toLocaleLowerCase());
        });
    }

    /**
    *   Based on the display name and signInAddress/samAccountName, it creates a tooltip to be shown on hover of the resolved identity
    **/
    public static createTooltip(entity: Identities_Picker_RestClient.IEntity, customTooltip?: string) {
        if (customTooltip) {
            return customTooltip;
        }

        if (!entity) {
            return "";
        }

        var displayNamePart = entity.displayName && entity.displayName.trim() ? entity.displayName : "";
        var disambiguationPart = "";
        if (ControlHelpers.isOnPremiseEnvironment()) {
            if (entity.samAccountName && entity.samAccountName.trim()) {
                disambiguationPart = "(" + (entity.scopeName && entity.scopeName.trim() ? entity.scopeName + "\\" : "") + entity.samAccountName + ")";
            }
        } else if (entity.signInAddress && entity.signInAddress.trim()) {
            var disambiguationPart = "<" + entity.signInAddress + ">";
        }
        var inactiveState = "";
        if (entity.active === false && !EntityHelpers.isAadGroup(entity)) {
            inactiveState = " - " + (entity.entityType.toLowerCase().trim() == Identities_Picker_Services.ServiceHelpers.UserEntity
                ? Resources_Platform.IdentityPicker_InactiveUser
                : (entity.entityType.toLowerCase().trim() == Identities_Picker_Services.ServiceHelpers.GroupEntity
                    ? Resources_Platform.IdentityPicker_InactiveGroup
                    : Resources_Platform.IdentityPicker_InactiveIdentity));
        }

        return (displayNamePart ? displayNamePart : "") + (disambiguationPart ? " " + disambiguationPart : "") + inactiveState;
    }

    public static replaceBackslash(input: string): string {
        return input.replace(/\\/g, '%');
    }
}

/**
*   Contruct an IEntity from a string.
*   Creation is only intended to be called by the controls here, public due to lack of internal-like keywords in ts.
*   isStringEntity and isStringEntityId are publicly supported.
**/
export class EntityFactory {
    public static STRING_ENTITY_TYPE: string = "string_entitytype";
    private static STRING_ENTITY_ID_PREFIX: string = "STRING_ENTITYID";
    private static STRING_DIRECTORY: string = "STRING_DIRECTORY";
    private static STRING_ORIGIN_ID_PREFIX: string = "STRING_ORIGINID";
    private static STRING_LOCAL_ID_PREFIX: string = "STRING_LOCALID";

    public static createStringEntity(displayName: string, imageUrl?: string): Identities_Picker_RestClient.IEntity {
        var encodedDisplayName = Utils_String.htmlEncode(displayName);
        var entity: Identities_Picker_RestClient.IEntity = {
            entityId: EntityFactory.STRING_ENTITY_ID_PREFIX + '_' + encodedDisplayName,
            entityType: EntityFactory.STRING_ENTITY_TYPE,
            originDirectory: EntityFactory.STRING_DIRECTORY,
            originId: EntityFactory.STRING_ORIGIN_ID_PREFIX + '_' + encodedDisplayName,
            localDirectory: EntityFactory.STRING_DIRECTORY,
            localId: EntityFactory.STRING_LOCAL_ID_PREFIX + '_' + encodedDisplayName,
            isMru: false,
            displayName: encodedDisplayName,
        };
        entity.image = imageUrl || Identities_Picker_Services.ServiceHelpers.getDefaultIdentityImage(entity);
        return entity;
    }

    public static isStringEntityId(entityId: string): boolean {
        if (!entityId || !entityId.trim()) {
            return false;
        }

        if (entityId.indexOf(EntityFactory.STRING_ENTITY_ID_PREFIX) == 0) {
            return true;
        }

        return false;
    }

    public static isStringPrefixedLocalId(localId: string): boolean {
        if (!localId || !localId.trim()) {
            return false;
        }

        return localId.indexOf(EntityFactory.STRING_LOCAL_ID_PREFIX) == 0;
    }
}

/**
 * @exemptedapi
 */
class EntityHelpers {
    public static isDirectoryEntityType(entity: Identities_Picker_RestClient.IEntity): boolean {
        if (entity.entityType) {
            return entity.entityType.toLowerCase().trim() == Identities_Picker_Services.ServiceHelpers.UserEntity ||
                entity.entityType.toLowerCase().trim() == Identities_Picker_Services.ServiceHelpers.GroupEntity;
        }

        return false;
    }

    public static isAadGroup(entity: Identities_Picker_RestClient.IEntity): boolean {
        return entity.entityType
            && entity.entityType.toLowerCase().trim() == Identities_Picker_Services.ServiceHelpers.GroupEntity
            && entity.originDirectory.toLowerCase().trim() == Identities_Picker_Services.ServiceHelpers.AzureActiveDirectory;
    }

    public static getUniqueIdentifierForDisambiguation(entity: Identities_Picker_RestClient.IEntity) {
        if (!ControlHelpers.isOnPremiseEnvironment()
            && entity.entityType.toLowerCase().trim() == Identities_Picker_Services.ServiceHelpers.UserEntity) {
            var key = entity.signInAddress && ControlHelpers.isValidEmail(entity.signInAddress)
                ? entity.signInAddress : entity.entityId;
            return key;
        } else {
            return entity.entityId;
        }
    }

    public static getDisplayName(entity: Identities_Picker_RestClient.IEntity): string {
        return entity.displayName && entity.displayName.trim() ? entity.displayName : EntityHelpers.getSignInAddress(entity);
    }

    public static getNonDiacriticDisplayName(entity: Identities_Picker_RestClient.IEntity): string {
        return this.replaceDiacriticCharacters(this.getDisplayName(entity));
    }

    public static replaceDiacriticCharacters(original: string): string {
        if(original) {
            let unaccented = original;
            for (var pos = 0; pos < unaccented.length; pos++) {
                let character = unaccented.charAt(pos);
                if(character in Identities_Picker_Constants.diacriticsRemovalMap)
                    unaccented = unaccented.replace(character, Identities_Picker_Constants.diacriticsRemovalMap[character]);
            }
            return unaccented;
        }
        else
            return original;
    }

    public static getSignInAddress(entity: Identities_Picker_RestClient.IEntity): string {
        if (ControlHelpers.isOnPremiseEnvironment() && entity.samAccountName && entity.samAccountName.trim()) {
            return (entity.scopeName && entity.scopeName.trim() ? entity.scopeName + "\\" : "") + entity.samAccountName;
        }
        return entity.signInAddress && entity.signInAddress.trim() ? entity.signInAddress :
            (entity.mail && entity.mail.trim() ? entity.mail :
                (entity.mailNickname && entity.mailNickname.trim() ? entity.mailNickname : ""));
    }
}

/**
 * @exemptedapi
 */
class IdentityAttributesFactory {
    public getIdentityAttributes(identity: Identities_Picker_RestClient.IEntity): IEntityTypeIdCardAttribute {
        if (identity.entityType.trim().toLowerCase() == Identities_Picker_Services.ServiceHelpers.UserEntity) {
            return new UserEntityTypeAttributes(identity);
        } else if (identity.entityType.trim().toLowerCase() == Identities_Picker_Services.ServiceHelpers.GroupEntity) {
            return new GroupEntityTypeAttributes(identity);
        } else {
            var exp: IUsageException = {
                source: "getIdentityAttributes",
                message: "identity entityType do not match existing type"
            };
            throw exp;
        }
    }
}

/**
 * @exemptedapi
 */
class EntityIdCardAttribute {
    private _displayTitle: string;
    private _displayContent: string;
    private _needWordWrap: boolean;

    public constructor(displayTitle: string, displayContent: string, needWordWrap?: boolean) {
        this._displayTitle = displayTitle;
        this._displayContent = displayContent;
        this._needWordWrap = needWordWrap ? needWordWrap : false;
    }

    public getDisplayTitle(): string {
        return this._displayTitle;
    }

    public getDisplayContent(): string {
        return this._displayContent;
    }

    public constructAttribute(idCardAttributeCounter: number): Array<JQuery> {
        let titleDiv = $("<div>").addClass("identity-picker-idcard-attribute-name")
            .attr("id", "identity-picker-idcard-attribute-name_" + idCardAttributeCounter)
            .text(this.getDisplayTitle());

        let content = this.getDisplayContent();
        let contentDiv = $("<div>")
            .addClass("identity-picker-idcard-ellipsis-overflow");
        RichContentTooltip.addIfOverflow(content,
            contentDiv,
            { menuContainer: contentDiv }); // adding the menuContainer option to overcome the issue of z-index computation

        if (this._isValidSendEmailAttribute()) {
            var anchorElement = $("<a>")
                .attr({
                    "aria-labelledby": "identity-picker-idcard-attribute-name_" + idCardAttributeCounter,
                    "href": "mailto:" + content,
                    "tabindex": "0"
                })
                .text(content)
                .appendTo(contentDiv);
        }
        else {
            contentDiv.text(this.getDisplayContent());
        }

        if (this._needWordWrap) {
            contentDiv.addClass("identity-picker-idcard-word-wrap");
        }
        return [titleDiv, contentDiv];
    }

    /**
    *   Check whether the attribute name equals with Resources_Platform.IdentityPicker_IdCardMail and the content is a valid email address.
    **/
    private _isValidSendEmailAttribute(): boolean {
        return Resources_Platform.IdentityPicker_IdCardMail.toLowerCase() == this.getDisplayTitle().toLowerCase().trim() && ControlHelpers.isValidEmail(this.getDisplayContent());
    }
}


/**
 * @exemptedapi
 */
interface IEntityListBuilderCallbacks {
    deleteIconClickDelegate: (entity: Identities_Picker_RestClient.IEntity, entityListItem: JQuery) => void;
    entityListItemClickDelegate: (entity: Identities_Picker_RestClient.IEntity) => void;
}

/**
 * @exemptedapi
 */
class EntityListBuilder {
    private _entity: Identities_Picker_RestClient.IEntity;
    private _withContactCard: boolean = false;
    private _focusElementOnContactCardClose: JQuery;
    private _size: IdentityPickerControlSize;
    private _identityServiceOptions: Identities_Picker_Services.IIdentityServiceOptions;
    private _identityExtensionOptions: Identities_Picker_Services.IIdentityPickerExtensionOptions;
    private _supportsHover: boolean;
    private _callbacks: IEntityListBuilderCallbacks;
    private _prefix: string;
    private _dialogAppendTo: string;
    private _smallScreenRender: boolean = false;

    constructor() {
        this._withContactCard = true;
        this._focusElementOnContactCardClose = null;
    }

    public withPrefix(prefix: string): EntityListBuilder {
        this._prefix = prefix;
        return this;
    }

    public withEntity(entity: Identities_Picker_RestClient.IEntity): EntityListBuilder {
        this._entity = entity;
        return this;
    }

    public withContactCard(withContactCard: boolean, focusElementOnContactCardClose: JQuery): EntityListBuilder {
        this._withContactCard = withContactCard;
        if (this._withContactCard) {
            this._focusElementOnContactCardClose = focusElementOnContactCardClose;
        }
        return this;
    }

    public forControlOfSize(size: IdentityPickerControlSize): EntityListBuilder {
        this._size = size;
        return this;
    }

    public withIdentityServiceOptions(options: Identities_Picker_Services.IIdentityServiceOptions): EntityListBuilder {
        this._identityServiceOptions = options;
        return this;
    }

    public withIdentityExtensionOptions(options: Identities_Picker_Services.IIdentityPickerExtensionOptions): EntityListBuilder {
        this._identityExtensionOptions = options;
        return this;
    }

    public withHoverSupport(supportsHover: boolean): EntityListBuilder {
        this._supportsHover = supportsHover;
        return this;
    }

    public withSmallScreenRender(smallScreenRender: boolean): EntityListBuilder {
        this._smallScreenRender = smallScreenRender;
        return this;
    }

    public withDialogAppendTo(dialogAppendTo: string): EntityListBuilder {
        this._dialogAppendTo = dialogAppendTo;
        return this;
    }

    //all callbacks must be bound to the caller
    public registerCallbacks(callbacks: IEntityListBuilderCallbacks): EntityListBuilder {
        this._callbacks = callbacks;
        return this;
    }

    public build(): JQuery {
        if (!this._entity
            || this._size === null // 0 is a valid enum value, so we have to check for null & undefined explicitly instead
            || this._size === undefined
            || !this._identityServiceOptions
            || !this._identityServiceOptions.identityType
            || !this._identityServiceOptions.operationScope
            || !this._callbacks) {
            return null;
        }

        let itemUI = $("<li>").attr("role", "option");

        if (this._smallScreenRender) {
            const $icon = $("<i>")
                .addClass("ms-Icon ms-Icon--CheckMark");
            const $checkMark = $("<span>")
                .addClass("container");
            $icon.appendTo($checkMark);
            const $selectedFade = $("<span>")
                .addClass("selected-fade");
            $checkMark.appendTo($selectedFade);
            $selectedFade.appendTo(itemUI);
        }
        ControlHelpers.styleElementBySize(itemUI, this._size, true);

        EntityListBuilder._appendImage(this._entity, itemUI, this._size);

        var showContactCard = this._withContactCard && EntityHelpers.isDirectoryEntityType(this._entity);

        if (this._entity.isMru &&
            EntityHelpers.isDirectoryEntityType(this._entity)) {
            let deleteIcon = $("<div>")
                .addClass("bowtie-icon bowtie-edit-delete bowtie-icon-small identity-picker-delete-icon")
                .attr('role', 'button')
                .appendTo(itemUI);
            RichContentTooltip.add(Resources_Platform.IdentityPicker_RemoveFromMru,
                deleteIcon,
                { menuContainer: deleteIcon }); // adding the menuContainer option to overcome the issue of z-index computation

            ControlHelpers.styleElementBySize(deleteIcon, this._size, false);
            if (showContactCard) {
                deleteIcon.addClass("with-idcard");
            }
            deleteIcon.hide();

            var deleteIconClickDelegate = delegate(this, (e?) => {

                var properties: IDictionaryStringTo<string> = {};
                properties[Identities_Picker_Constants.TelemetryProperties.entityId] = this._entity.entityId;
                properties[Identities_Picker_Constants.TelemetryProperties.consumerId]
                    = this._identityExtensionOptions ? this._identityExtensionOptions.consumerId : Identities_Picker_Constants.ConsumerId.UnknownConsumer;

                Telemetry.publishEvent(
                    new Telemetry.TelemetryEventData(
                        Identities_Picker_Constants.Telemetry.Area,
                        Identities_Picker_Constants.Telemetry.Feature_Click_Remove_Mru,
                        properties
                    ));

                this._callbacks.deleteIconClickDelegate(this._entity, itemUI);
            });
            if (this._callbacks.deleteIconClickDelegate) {
                deleteIcon.click(deleteIconClickDelegate);
            }
        }

        if (showContactCard) {
            EntityListBuilder._appendIdCard(
                this._entity,
                itemUI,
                this._size,
                this._identityServiceOptions,
                this._identityExtensionOptions,
                this._callbacks,
                this._focusElementOnContactCardClose,
                this._dialogAppendTo);
        }

        let textContainer = EntityListBuilder._appendTextContainer(this._entity, itemUI, this._size, this._prefix, this._smallScreenRender);
        if (this._size == IdentityPickerControlSize.Small) {
            let tooltip = (this._entity.entityType.toLowerCase().trim() == EntityFactory.STRING_ENTITY_TYPE)
                ? this._entity.displayName
                : EntityHelpers.getSignInAddress(this._entity);
            RichContentTooltip.add(tooltip,
                textContainer,
                { menuContainer: textContainer }); // adding the menuContainer option to overcome the issue of z-index computation
        }

        var entityListItemClickDelegate = (e?: JQueryEventObject) => {
            if (this._smallScreenRender) {
                const TICK = 17;
                Utils_Core.delay(null, TICK, () => {
                    itemUI.children('.selected-fade').attr("class", "selected-fade-active");
                });
                const timeOut = 400;
                Utils_Core.delay(null, TICK + timeOut, () => {
                    itemUI.children('.selected-fade').attr("class", "selected-fade");
                });
            }
            this._callbacks.entityListItemClickDelegate(this._entity);
        };

        if (this._callbacks.entityListItemClickDelegate) {
            itemUI.click(entityListItemClickDelegate);
        }

        if (this._entity.isMru && this._supportsHover) {
            itemUI.hover(
                delegate(this, (e) => {
                    itemUI.children('.identity-picker-delete-icon').show();
                }),
                delegate(this, (e) => {
                    itemUI.children('.identity-picker-delete-icon').hide();
                })
            );
        }
        return itemUI;
    }

    private static _appendTextContainer(
        entity: Identities_Picker_RestClient.IEntity,
        entityListItem: JQuery,
        size: IdentityPickerControlSize,
        prefix: string,
        smallScreenRender: boolean = false): JQuery {
        var textContainer = $("<div>")
            .addClass("item-text-container")
            .append($("<div>")
                .addClass("title")
                .addClass(size == IdentityPickerControlSize.Large ? "large" : "")
                .append(EntityListBuilder._highlightPrefix(EntityHelpers.getDisplayName(entity), prefix, true)));


        var subtitle = EntityHelpers.getSignInAddress(entity);
        subtitle = Utils_String.isGuid(subtitle) ? "" : subtitle;

        if (size != IdentityPickerControlSize.Small) {
            textContainer
                .append($("<div>")
                    .addClass("subtitle")
                    .addClass(size == IdentityPickerControlSize.Large ? "large" : "")
                    .append(EntityListBuilder._highlightPrefix(subtitle, prefix)));
        }

        textContainer.appendTo(entityListItem);

        if (!smallScreenRender) {
            textContainer.height(ControlHelpers.getSizePx(size) + IdentityPickerDropdownControl.IMAGE_MARGINS_PX);
        }

        return textContainer;
    }

    private static _appendImage(
        entity: Identities_Picker_RestClient.IEntity,
        entityListItem: JQuery,
        size: IdentityPickerControlSize): void {
        var defaultImage = Identities_Picker_Services.ServiceHelpers.getDefaultIdentityImage(entity);
        var userImage: string;
        if (entity.image) {
            userImage = entity.image;
        }

        var img = ControlHelpers
            .createImgElement(defaultImage, userImage, (userImage && userImage.trim()) ? "identity-picture" : "identity-picture hidden", entity.entityId)
            .appendTo(entityListItem);
        ControlHelpers.styleElementBySize(img, size, false);
    }

    private static _appendIdCard(
        entity: Identities_Picker_RestClient.IEntity,
        entityListItem: JQuery,
        size: IdentityPickerControlSize,
        identityServiceOptions: Identities_Picker_Services.IIdentityServiceOptions,
        identityExtensionOptions: Identities_Picker_Services.IIdentityPickerExtensionOptions,
        callbacks: IEntityListBuilderCallbacks,
        focusElementOnClose: JQuery,
        dialogAppendTo?: string): void {
        let idCardButton = $("<div>")
            .addClass("bowtie-icon bowtie-contact-card identity-picker-contact-card-icon")
            .attr('role', 'button')
            .appendTo(entityListItem);
        RichContentTooltip.add(Resources_Platform.IdentityPicker_ShowContactCardTitle,
            idCardButton,
            { menuContainer: idCardButton }); // adding the menuContainer option to overcome the issue of z-index computation

        ControlHelpers.styleElementBySize(idCardButton, size, false);

        var itemUIIdCardClickDelegate = delegate(this, (e) => {
            e.stopPropagation();

            var idCardOptions: IIdentityPickerIdCardDialogOptions = {
                identity: entity,
                anchor: idCardButton,
                operationScope: identityServiceOptions.operationScope,
                identityType: identityServiceOptions.identityType,
                httpClient: identityServiceOptions.httpClient ? identityServiceOptions.httpClient : null,
                focusElementOnClose: focusElementOnClose,
                leftValue: idCardButton.offset().left,
                topValue: idCardButton.offset().top + idCardButton.outerHeight(),
                consumerId: identityExtensionOptions.consumerId,
                appendTo: dialogAppendTo,
            };

            var properties: IDictionaryStringTo<string> = {};
            properties[Identities_Picker_Constants.TelemetryProperties.entityId] = entity.entityId;
            properties[Identities_Picker_Constants.TelemetryProperties.consumerId]
                = identityExtensionOptions ? identityExtensionOptions.consumerId : Identities_Picker_Constants.ConsumerId.UnknownConsumer;

            Telemetry.publishEvent(
                new Telemetry.TelemetryEventData(
                    Identities_Picker_Constants.Telemetry.Area,
                    Identities_Picker_Constants.Telemetry.Feature_Click_IdCard,
                    properties
                ));

            Controls.Enhancement.enhance(IdCardDialog, "<div/>", idCardOptions);
        });

        idCardButton.click(itemUIIdCardClickDelegate);
    }

    private static _highlightPrefix(
        textValue: string,
        prefix: string,
        canHighlightAfterSpace: boolean = false): JQuery {
        if (!textValue) {
            return null;
        }
        let unaccentedTextValue = EntityHelpers.replaceDiacriticCharacters(textValue);
        let unaccentedPrefix = EntityHelpers.replaceDiacriticCharacters(prefix);
        var firstOccurence = unaccentedTextValue.toLowerCase().indexOf(unaccentedPrefix.toLowerCase());
        var buildDisplayElement = (input: string, prefixLength: number, occurenceIndex: number) => {
            return $("<span>").append(Utils_String.htmlEncode(input.substring(0, occurenceIndex)))
                .append($("<b>").text(input.substr(occurenceIndex, prefixLength)))
                .append(Utils_String.htmlEncode(input.substr(occurenceIndex + prefixLength)));
        }

        var findPrefixAfterCharacter = (input: string, prefix: string, occurenceIndex: number, character: string) => {
            let unaccentedInput = EntityHelpers.replaceDiacriticCharacters(input);
            let unaccentedPrefix = EntityHelpers.replaceDiacriticCharacters(prefix);
            while (occurenceIndex > 0 && unaccentedInput.charAt(occurenceIndex - 1) != character) {
                occurenceIndex = unaccentedInput.toLowerCase().indexOf(unaccentedPrefix.toLowerCase(), occurenceIndex + 1);
            }
            if (occurenceIndex > 0) {
                return buildDisplayElement(input, prefix.length, occurenceIndex);
            }
            return null;
        }

        if (!firstOccurence) {
            return buildDisplayElement(textValue, prefix.length, firstOccurence);
        } else if (firstOccurence > 0) {
            if (canHighlightAfterSpace) {
                var result = findPrefixAfterCharacter(textValue, prefix, firstOccurence, ' ');
                if (result) {
                    return result;
                }
            }
            if (ControlHelpers.isOnPremiseEnvironment() && prefix.indexOf("\\") < 0) {
                var result = findPrefixAfterCharacter(textValue, prefix, firstOccurence, '\\');
                if (result) {
                    return result;
                }
            }
        } else if (ControlHelpers.isOnPremiseEnvironment() && prefix.indexOf("\\") > 0) {
            prefix = prefix.substring(prefix.indexOf("\\") + 1);
            firstOccurence = unaccentedTextValue.toLowerCase().indexOf(unaccentedPrefix.toLowerCase());
            if (!firstOccurence) {
                return buildDisplayElement(textValue, prefix.length, firstOccurence);
            } else if (canHighlightAfterSpace) {
                var result = findPrefixAfterCharacter(textValue, prefix, firstOccurence, ' ');
                if (result) {
                    return result;
                }
            }
        }
        return $("<span>").text(textValue);
    }
}

/**
 * @exemptedapi
 * Each registered source for entity retrieval
 */
export class SourceId {
    //Used + Reserved by IPS
    public static Directory: string = "Directory";
    public static Mru: string = "Mru";
    //Reserved by IPS
    public static Persistent: string = "Persistent";
    public static String: string = "String";
    //Other sources - please use strings of the form - {use-case}_{new-guid} to be unique
}

/**
 * @exemptedapi
 */
export enum SourceType {
    Sync,
    Async
}

/**
 * @exemptedapi
 */
export interface ISource {
    //one of SourceId
    id: string;
    sortRank: number;
    sourceType: SourceType;
}

/**
 * @exemptedapi
 */
export interface ISyncSource extends ISource {
    getEntities(currentEntitySet: Identities_Picker_RestClient.IEntity[], request: IEntityOperationsFacadeRequest): Identities_Picker_RestClient.IEntity[];
}

/**
 * @exemptedapi
 */
export interface IEntityOperationsFacadeResponse {
    queryTokenResponse?: IDictionaryStringTo<IPromise<Identities_Picker_RestClient.QueryTokenResultModel>>;
    entityResponse?: Identities_Picker_RestClient.IEntity[];
}

/**
 * @exemptedapi
 */
export interface IEntityOperationsFacadeRequest {
    sources: string[];
    identityServiceOptions: Identities_Picker_Services.IIdentityServiceOptions;
    identityExtensionOptions?: Identities_Picker_Services.IIdentityPickerExtensionOptions;
    prefix?: string;
    queryTypeHint?: Identities_Picker_Services.IQueryTypeHint;
    filterByScope?: Identities_Picker_Common.FilterByScope;
}

/**
 * @exemptedapi
 */
export interface IEntityOperationsFacadeOptions {
    loadMru?: boolean;
    filterByScope?: Identities_Picker_Common.FilterByScope;
}

/**
 * @exemptedapi
 */
class EntityMergeOptions {
    public static PreferFirst: string = "preferfirst";
    public static PreferSecond: string = "prefersecond";
}

/**
 * @exemptedapi
 */
export class EntityOperationsFacade extends Service.VssService {
    //MRU state
    private _entityRetrieverPrepComplete: IDictionaryNumberTo<Q.Deferred<boolean>>;
    private _mruEntitiesPromise: IDictionaryNumberTo<IPromise<boolean>>;
    private _userMruReady: IDictionaryNumberTo<boolean>;

    //data
    private _mruEntities: IDictionaryNumberTo<Identities_Picker_RestClient.IEntity[]> = {};
    private _syncSources: IDictionaryNumberTo<ISyncSource> = {};

    private _requestStack: IEntityOperationsFacadeRequest[][] = [];
    private _deferredStack: Q.Deferred<IEntityOperationsFacadeResponse>[][] = [];

    public queryTokenEntityImageCache: Identities_Picker_Cache.HashCache<string>;

    constructor() {
        super();
        this._userMruReady = {};
        this._entityRetrieverPrepComplete = {};
        this._mruEntitiesPromise = {};
        this._mruEntities = {};
        this.registerSyncSource({
            id: SourceId.Mru,
            sourceType: SourceType.Sync,
            getEntities: this._mruSourceGetEntitiesHandler,
            sortRank: 10,
        });

        //temporary cache primarily used by the display control
        this.queryTokenEntityImageCache = new Identities_Picker_Cache.HashCache<string>();
    }

    //currently there is no need for async sources
    public registerSyncSource(source: ISyncSource) {
        if (source.id in this._syncSources) {
            return;
        }

        for (var key in this._syncSources) {
            if (this._syncSources[key].sortRank == source.sortRank) {
                return;
            }
        }

        this._syncSources[source.id] = source;
    }

    public search(request: IEntityOperationsFacadeRequest): IPromise<IEntityOperationsFacadeResponse> {
        if (!request.sources || request.sources.length == 0 || !request.identityServiceOptions) {
            var exp: IArgumentException = {
                source: "EntityOperationsFacade: search",
                message: "missing arguments",
            };

            throw exp;
        }

        var deferred: Q.Deferred<IEntityOperationsFacadeResponse> = Q.defer<IEntityOperationsFacadeResponse>();
        var promise = deferred.promise;

        var filterByScopeHash = Identities_Picker_Common.FilterByScope.GetHashCode(request.filterByScope);

        if (typeof this._requestStack[filterByScopeHash] === "undefined") {
            this._requestStack[filterByScopeHash] = [];
        }
        this._requestStack[filterByScopeHash].push(request);

        if (typeof this._deferredStack[filterByScopeHash] === "undefined") {
            this._deferredStack[filterByScopeHash] = [];
        }
        this._deferredStack[filterByScopeHash].push(deferred);

        var executeRetrieval = delegate(this, () => {
            while (this._requestStack[filterByScopeHash].length > 0) {
                let requestInstance = this._requestStack[filterByScopeHash].pop();
                let deferredInstance = this._deferredStack[filterByScopeHash].pop();

                var resultEntities: Identities_Picker_RestClient.IEntity[] = [];
                var validSources = this._getRegisteredSyncSourcesSorted().filter((source: string) => {
                    return requestInstance.sources.indexOf(source) != -1;
                });

                if (validSources) {
                    validSources.forEach(delegate(this, (sourceId: string) => {
                        var getEntitiesDelegate = this._syncSources[sourceId].getEntities.bind(this);
                        var entities = getEntitiesDelegate(resultEntities, requestInstance);
                        resultEntities = EntityOperationsFacade.mergeEntities(entities, resultEntities);
                    }));
                }

                var response: IEntityOperationsFacadeResponse = {
                    entityResponse: [],
                    queryTokenResponse: {},
                };

                if (requestInstance.sources.indexOf(SourceId.Directory) != -1) {
                    response.queryTokenResponse = this._directorySourceGetEntities(resultEntities, requestInstance);
                }

                if (resultEntities.length > 0) {
                    this.getImagesForEntities(resultEntities, requestInstance).then((entityIdUrlMap: IDictionaryStringTo<string>) => {
                        resultEntities.forEach(delegate(this, (entity: Identities_Picker_RestClient.IEntity) => {
                            if (entityIdUrlMap.hasOwnProperty(entity.entityId)) {
                                entity.image = entityIdUrlMap[entity.entityId];
                            }
                        }));

                        response.entityResponse = resultEntities;
                        deferredInstance.resolve(response);
                    });
                }
                else {
                    deferredInstance.resolve(response);
                }
            }
        });

        var mruPromise = this.load({ loadMru: request.sources.indexOf(SourceId.Mru) != -1, filterByScope: request.filterByScope });

        if (mruPromise.isFulfilled()) {
            executeRetrieval();
        }
        else {
            mruPromise.then(executeRetrieval, executeRetrieval);
        }

        return promise;
    }

    public isUserMruReady(filterByScope: Identities_Picker_Common.FilterByScope) {
        return this._userMruReady[Identities_Picker_Common.FilterByScope.GetHashCode(filterByScope)];
    }

    //WARNING: this should only be called once load has completed
    public getMruEntitiesUnchecked(filterByScope: Identities_Picker_Common.FilterByScope) {
        return this._mruEntities[Identities_Picker_Common.FilterByScope.GetHashCode(filterByScope)];
    }

    public refreshUserMru(filterByScope: Identities_Picker_Common.FilterByScope): IPromise<boolean> {
        return this._getUserMruEntities(null, null, filterByScope);
    }

    public load(options?: IEntityOperationsFacadeOptions): Q.Promise<boolean> {
        var filterByScopeHash = Identities_Picker_Common.FilterByScope.GetHashCode(options.filterByScope);

        if (this._entityRetrieverPrepComplete[filterByScopeHash]
            && (!options.loadMru || this._userMruReady[filterByScopeHash])) {
            return this._entityRetrieverPrepComplete[filterByScopeHash].promise;
        } else {
            this._entityRetrieverPrepComplete[filterByScopeHash] = Q.defer<boolean>();
            if (options.loadMru) {
                if (this._mruEntitiesPromise[filterByScopeHash]) {
                    this._mruEntitiesPromise[filterByScopeHash].then(
                        delegate(this, (mruLoadResult: boolean) => {
                            this._entityRetrieverPrepComplete[filterByScopeHash].resolve(true);
                        }),
                        delegate(this, (errorData: any) => {
                            this._entityRetrieverPrepComplete[filterByScopeHash].resolve(false);
                        })
                    );
                } else {
                    this._mruEntitiesPromise[filterByScopeHash] = this._getUserMruEntities(null, null, options.filterByScope);
                    this._mruEntitiesPromise[filterByScopeHash].then(
                        delegate(this, (mruLoadResult: boolean) => {
                            this._entityRetrieverPrepComplete[filterByScopeHash].resolve(true);
                        }),
                        delegate(this, (errorData: any) => {
                            this._entityRetrieverPrepComplete[filterByScopeHash].resolve(false);
                        }));
                }
            } else {
                this._entityRetrieverPrepComplete[filterByScopeHash].resolve(true);
            }
        }

        return this._entityRetrieverPrepComplete[filterByScopeHash].promise;
    }

    /**
    *   Return only the MRU users or groups that have the prefix
    **/
    public static filterEntities(identities: Identities_Picker_RestClient.IEntity[], prefix: string): Identities_Picker_RestClient.IEntity[] {
        if (!identities || identities.length == 0) {
            return [];
        }

        return identities.filter((identity: Identities_Picker_RestClient.IEntity) => {
            // remove diacritic marks from both display name and prefix to guarentee accent (diacritic) invariant search
            if (identity.displayName && EntityHelpers.getNonDiacriticDisplayName(identity).toLowerCase().indexOf(EntityHelpers.replaceDiacriticCharacters(prefix)) == 0) {
                    return true;
            } else if (ControlHelpers.isOnPremiseEnvironment() && identity.samAccountName && identity.samAccountName.trim().toLowerCase().indexOf(prefix) == 0) {
                return true;
            } else if (ControlHelpers.isOnPremiseEnvironment() && identity.scopeName && identity.samAccountName && (identity.scopeName + "\\" + identity.samAccountName).trim().toLowerCase().indexOf(prefix) == 0) {
                return true;
            } else if (identity.signInAddress && identity.signInAddress.trim().toLowerCase().indexOf(prefix) == 0) {
                return true;
            } else if (!identity.signInAddress && identity.mail && identity.mail.trim().toLowerCase().indexOf(prefix) == 0) {
                return true;
            } else if (!identity.signInAddress && !identity.mail && identity.mailNickname && identity.mailNickname.trim().toLowerCase().indexOf(prefix) == 0) {
                return true;
            }
            return false;
        });
    }

    /**
    *   This is the default way the controls internally merge MRU and DDS entities entities.
    *   Assumes that list1 and list2 are lists of distinct entities.
    *   Use-cases apart from calls by the controls here are not supported; provided as a example of merging logic.
    **/
    public static mergeEntities(list1: Identities_Picker_RestClient.IEntity[], list2: Identities_Picker_RestClient.IEntity[], mergePreference: string = EntityMergeOptions.PreferFirst): Identities_Picker_RestClient.IEntity[] {
        var mergeDict: IDictionaryStringTo<Identities_Picker_RestClient.IEntity> = {};
        var mergedList: Identities_Picker_RestClient.IEntity[] = [];

        if (!list1 && !list2) {
            return [];
        }
        if (!list2 || list2.length == 0) {
            return list1 ? list1 : [];
        }
        if (!list1 || list1.length == 0) {
            return list2 ? list2 : [];
        }

        list1.forEach((identity: Identities_Picker_RestClient.IEntity, index: number, identities: Identities_Picker_RestClient.IEntity[]) => {
            var key = EntityOperationsFacade._getMergingKeyFromEntity(identity);
            if (mergeDict.hasOwnProperty(key)) {
                mergeDict[key] = EntityOperationsFacade._mergeSimilarEntities(mergeDict[key], identity, mergePreference);
            }
            else {
                mergeDict[key] = identity;
            }
        });
        list2.forEach((identity: Identities_Picker_RestClient.IEntity, index: number, identities: Identities_Picker_RestClient.IEntity[]) => {
            var key = EntityOperationsFacade._getMergingKeyFromEntity(identity);
            if (key in mergeDict) {
                var result = EntityOperationsFacade._mergeSimilarEntities(mergeDict[key], identity, mergePreference);
                mergeDict[key] = result;
            }
            else {
                mergeDict[key] = identity;
            }
        });
        for (var key in mergeDict) {
            if (!mergeDict[key].isMru) {
                mergedList.push(mergeDict[key]);
            }
            else {
                mergedList.unshift(mergeDict[key]);
            }
        }
        return mergedList;
    }

    public getImagesForEntities(entities: Identities_Picker_RestClient.IEntity[], request?: IEntityOperationsFacadeRequest): IPromise<IDictionaryStringTo<string>> {
        var entityImageUrlMapDeferred = Q.defer<IDictionaryStringTo<string>>();
        var entityImageUrlMapPromise = entityImageUrlMapDeferred.promise;

        var entityIdImageUrlMap: IDictionaryStringTo<string> = {};

        var identityService = Service.getService(Identities_Picker_Services.IdentityService);
        try {
            var promises = identityService.getIdentityImages(
                entities,
                { httpClient: request && request.identityServiceOptions && request.identityServiceOptions.httpClient ? request.identityServiceOptions.httpClient : null } as Identities_Picker_Services.IIdentityServiceOptions);

            var linearizedPromises: IPromise<IDictionaryStringTo<string>>[] = [];
            for (var key in promises) {
                linearizedPromises.push(promises[key]);
            }

            Q.allSettled(linearizedPromises).then((promiseStates: Q.PromiseState<IDictionaryStringTo<string>>[]) => {
                promiseStates.forEach((promiseState: Q.PromiseState<IDictionaryStringTo<string>>) => {
                    //callback for each image - populate the aggregate
                    if (promiseState.state == Identities_Picker_Constants.PromiseResultStatus.Fulfilled) {
                        if (!promiseState.value
                            || Object.keys(promiseState.value).length != 1
                            || !Object.keys(promiseState.value)[0]
                            || !Object.keys(promiseState.value)[0].trim()) {
                            return;
                        }
                        var entityId = Object.keys(promiseState.value)[0];
                        var thumbnail = promiseState.value[entityId];

                        if (!thumbnail || !thumbnail.trim()) {
                            return;
                        }
                        entityIdImageUrlMap[entityId] = thumbnail;
                    }
                    else if (promiseState.state == Identities_Picker_Constants.PromiseResultStatus.Rejected) {
                        if (promiseState.reason) {
                            Diag.logError("_getImagesForEntities/_getImagesForEntitiesErrorCallback:" + JSON.stringify(promiseState.reason));
                        }
                    }
                });

                entityImageUrlMapDeferred.resolve(entityIdImageUrlMap);
            },
                (reason: any) => {
                    if (reason) {
                        Diag.logError("_getImagesForEntities/_getImagesForEntitiesErrorCallback:" + JSON.stringify(reason));
                    }

                    entityImageUrlMapDeferred.reject(reason);
                });
        }
        catch (e) {
            if (e === Object(e) && 'source' in e && e['source'] == "IdentityService") {
                //do nothing
            }
            else {
                throw e;
            }
        }

        return entityImageUrlMapPromise;
    }

    /**
    *   This is the default way the controls internally fetch the key for disambiguating entities.
    *   Use-cases apart from calls by the controls here are not supported; provided as an example of merging logic.
    **/
    private static _getMergingKeyFromEntity(entity: Identities_Picker_RestClient.IEntity) {
        if (ControlHelpers.isOnPremiseEnvironment()) {
            if (entity
                && entity.entityType
                && entity.localId
                && entity.localDirectory.toLowerCase().trim() == Identities_Picker_Services.ServiceHelpers.VisualStudioDirectory
                && (entity.entityType.toLowerCase().trim() == Identities_Picker_Services.ServiceHelpers.UserEntity
                    || entity.entityType.toLowerCase().trim() == Identities_Picker_Services.ServiceHelpers.GroupEntity)) {
                return entity.localId;
            }
        }
        if (entity.entityType.toLowerCase().trim() == Identities_Picker_Services.ServiceHelpers.UserEntity) {
            var signInAddress = EntityHelpers.getSignInAddress(entity);
            var key = signInAddress ? signInAddress : entity.entityId;
            return key;
        }
        else if (entity.entityType.toLowerCase().trim() == Identities_Picker_Services.ServiceHelpers.GroupEntity) {
            if (entity.displayName && entity.displayName.trim()) {
                if (entity.mailNickname && entity.mailNickname.trim()) {
                    var key = entity.displayName + entity.mailNickname;
                    return key;
                }
                if (entity.mail && entity.mail.trim()) {
                    var key = entity.displayName + entity.mail;
                    return key;
                }
                return entity.displayName;
            }
            return entity.entityId;
        }
        else if (entity.entityType.toLowerCase().trim() == EntityFactory.STRING_ENTITY_TYPE) {
            return entity.entityId;
        }
    }

    private static _mergeSimilarEntities(x: Identities_Picker_RestClient.IEntity, y: Identities_Picker_RestClient.IEntity, mergePreference: string = EntityMergeOptions.PreferFirst): Identities_Picker_RestClient.IEntity {
        if (x == null) return y;
        if (y == null) return x;

        var entity: Identities_Picker_RestClient.IEntity = {
            entityId: EntityOperationsFacade._computeValue("entityId", x, y, mergePreference),
            entityType: EntityOperationsFacade._computeValue("entityType", x, y, mergePreference),
            originDirectory: EntityOperationsFacade._computeValue("originDirectory", x, y, mergePreference),
            originId: EntityOperationsFacade._computeValue("originId", x, y, mergePreference),
            localDirectory: EntityOperationsFacade._computeValue("localDirectory", x, y, mergePreference),
            localId: EntityOperationsFacade._computeValue("localId", x, y, mergePreference)
        };
        var entityKeys = ["displayName", "scopeName", "department", "jobTitle", "mail", "mailNickname", "physicalDeliveryOfficeName", "signInAddress", "surname", "guest", "description", "image", "isMru", "samAccountName", "active", "telephoneNumber"];
        for (var index in entityKeys) {
            entity[entityKeys[index]] = EntityOperationsFacade._computeValue(entityKeys[index], x, y, mergePreference);
        }
        return entity;
    }

    private static _computeValue(key: string, x: Identities_Picker_RestClient.IEntity, y: Identities_Picker_RestClient.IEntity, mergePreference: string = EntityMergeOptions.PreferFirst) {
        var value = mergePreference == EntityMergeOptions.PreferFirst ?
            (x[key] ? ((typeof (x[key]) === "string" || x[key] instanceof String) ? ((<string>x[key]).trim() ? x[key] : y[key]) : x[key]) : y[key]) :
            (y[key] ? ((typeof (y[key]) === "string" || y[key] instanceof String) ? ((<string>y[key]).trim() ? y[key] : x[key]) : y[key]) : x[key]);
        return value
    }

    private static _filterMruEntitiesByIdentityType(request: IEntityOperationsFacadeRequest, mruEntities: Identities_Picker_RestClient.IEntity[]) {
        if (!request.identityServiceOptions || !request.identityServiceOptions.identityType) {
            return mruEntities;
        }

        var identityTypes = Identities_Picker_Services.ServiceHelpers.getIdentityTypeList(request.identityServiceOptions.identityType);
        mruEntities = mruEntities.filter((entity: Identities_Picker_RestClient.IEntity) => {
            return (identityTypes.indexOf(entity.entityType.trim().toLowerCase()) >= 0);
        });

        return mruEntities;
    }

    private _mruSourceGetEntitiesHandler(currentEntitySet: Identities_Picker_RestClient.IEntity[], request: IEntityOperationsFacadeRequest): Identities_Picker_RestClient.IEntity[] {
        var filteredMruEntities = EntityOperationsFacade._filterMruEntitiesByIdentityType(request, this._mruEntities[Identities_Picker_Common.FilterByScope.GetHashCode(request.filterByScope)]);
        if (request.prefix) {
            filteredMruEntities = EntityOperationsFacade.filterEntities(filteredMruEntities, request.prefix);
        }

        return filteredMruEntities;
    }

    private _directorySourceGetEntities(
        currentEntities: Identities_Picker_RestClient.IEntity[],
        request: IEntityOperationsFacadeRequest):
        IDictionaryStringTo<IPromise<Identities_Picker_RestClient.QueryTokenResultModel>> {
        if (!request || !request.prefix) {
            return {};
        }

        var queryTokenQtrDeferreds: IDictionaryStringTo<Q.Deferred<Identities_Picker_RestClient.QueryTokenResultModel>> = {};
        var queryTokenQtrPromises: IDictionaryStringTo<IPromise<Identities_Picker_RestClient.QueryTokenResultModel>> = {};

        var identityService = Service.getService(Identities_Picker_Services.IdentityService);
        try {
            const options: Identities_Picker_Services.IIdentityServiceOptions = {
                httpClient: request.identityServiceOptions.httpClient,
                minResults: request.identityServiceOptions.minResults ? request.identityServiceOptions.minResults : (currentEntities ?
                    (currentEntities.length > Identities_Picker_Services.IdentityService.MIN_RESULTS ?
                        0 : Identities_Picker_Services.IdentityService.MIN_RESULTS - currentEntities.length)
                    : Identities_Picker_Services.IdentityService.MIN_RESULTS),
                maxResults: request.identityServiceOptions.minResults ? request.identityServiceOptions.minResults : Identities_Picker_Services.IdentityService.MAX_RESULTS,
                extensionData: request.identityServiceOptions.extensionData,
                getFilterByScope: () => request.filterByScope
            };
            var promises = identityService.getIdentities(
                request.prefix,
                request.identityServiceOptions.operationScope,
                request.identityServiceOptions.identityType,
                options,
                request.queryTypeHint,
                request.identityExtensionOptions
            );
            for (var key in promises) {
                var keyedPromiseHandler = delegate(this, (promiseKey) => {
                    promises[promiseKey].then(
                        delegate(this, (qtr: Identities_Picker_RestClient.QueryTokenResultModel) => {
                            if (request.prefix && request.prefix.length >= 1) {
                                qtr.identities = (qtr && qtr.identities) ? EntityOperationsFacade.mergeEntities(qtr.identities, currentEntities) : currentEntities;
                            }

                            if (qtr.identities.length > 0) {
                                this.getImagesForEntities(qtr.identities, request).then((entityIdUrlMap: IDictionaryStringTo<string>) => {
                                    qtr.identities.forEach((entity: Identities_Picker_RestClient.IEntity) => {
                                        if (entityIdUrlMap.hasOwnProperty(entity.entityId)) {
                                            entity.image = entityIdUrlMap[entity.entityId];
                                        }
                                    });

                                    queryTokenQtrDeferreds[promiseKey].resolve(qtr);
                                });
                            } else {
                                queryTokenQtrDeferreds[promiseKey].resolve(qtr);
                            }
                        }),
                        delegate(this, (errorData?: any) => {
                            if (errorData) {
                                Diag.logWarning("_directorySourceGetEntities/getIdentitiesErrorCallback:" + JSON.stringify(errorData));
                            }
                            queryTokenQtrDeferreds[promiseKey].reject(errorData ? errorData : null);
                        }));
                });
                keyedPromiseHandler(key);

                queryTokenQtrDeferreds[key] = Q.defer<Identities_Picker_RestClient.QueryTokenResultModel>();
                queryTokenQtrPromises[key] = queryTokenQtrDeferreds[key].promise;
            }
        }
        catch (e) {
            if (e === Object(e) && 'source' in e && e['source'] == "IdentityService") {
                //do nothing
            }
            else {
                throw e;
            }
        }

        return queryTokenQtrPromises;
    }

    private _getRegisteredSyncSourcesSorted() {
        var keys = Object.keys(this._syncSources);
        //highest sortRank first- will have least index when merged
        keys.sort((a, b) => {
            if (this._syncSources[a].sortRank > this._syncSources[b].sortRank) {
                return 1;
            }
            //we know they cant be the same
            return -1;
        });
        return keys;
    }

    /**
    * Get the querying identity's MRU
    **/
    private _getUserMruEntities(
        identityServiceOptions?: Identities_Picker_Services.IIdentityServiceOptions,
        extensionOptions?: Identities_Picker_Services.IIdentityPickerExtensionOptions,
        filterByScope?: Identities_Picker_Common.FilterByScope): IPromise<boolean> {
        var deferred: Q.Deferred<boolean> = Q.defer<boolean>();
        var promise = deferred.promise;
        var filterByScopeHash = Identities_Picker_Common.FilterByScope.GetHashCode(filterByScope);

        try {
            this._userMruReady[filterByScopeHash] = false;
            var getMruIdentitiesSuccessCallback = delegate(this, (mruIdentities: Identities_Picker_RestClient.IEntity[]) => {
                this._userMruReady[filterByScopeHash] = true;

                this._mruEntities[filterByScopeHash] = mruIdentities.filter((entity: Identities_Picker_RestClient.IEntity) => {
                    return (entity.active !== false); //filtering out inactive MRU identities
                });

                this._mruEntities[filterByScopeHash].forEach((entity: Identities_Picker_RestClient.IEntity) => {
                    entity.image = Identities_Picker_Services.ServiceHelpers.getDefaultIdentityImage(entity);
                });

                deferred.resolve(true);
            });

            var getMruIdentitiesErrorCallback = delegate(this, (errorData?: any) => {
                this._mruEntities[filterByScopeHash] = [];
                deferred.resolve(false);
            });

            //If the scope to be filtered is empty, we don't need to send requests
            if (Identities_Picker_Common.FilterByScope.isFilterByScopeEmpty(filterByScope)) {
                return Q(getMruIdentitiesSuccessCallback([]));
            }

            var mruService = Service.getService(Identities_Picker_Services.MruService);
            //only need to search IMS for MRU entities - also guaranteed to be in MRU
            return mruService.getMruIdentities(
                { IMS: true } as Identities_Picker_Services.IOperationScope,
                Identities_Picker_Services.MruService.DEFAULT_IDENTITY_ID,
                Identities_Picker_Services.MruService.DEFAULT_FEATURE_ID,
                {
                    httpClient: (identityServiceOptions ? identityServiceOptions.httpClient : null),
                    filterByScope: filterByScope
                } as Identities_Picker_Services.IMruServiceOptions,
                {
                    consumerId: extensionOptions ? extensionOptions.consumerId : Identities_Picker_Constants.ConsumerId.UnknownConsumer
                } as Identities_Picker_Services.IIdentityPickerExtensionOptions).then(getMruIdentitiesSuccessCallback, getMruIdentitiesErrorCallback);
        }
        catch (e) {
            if (e === Object(e) && 'source' in e && e['source'] == "MruService") {
                //do nothing
            }
            else {
                throw e;
            }
        }

        return promise;
    }
}

/**
 * @exemptedapi
 */
interface IEntityTypeIdCardAttribute {
    isEmpty(): boolean;
    toRows(): Array<JQuery>;
}

/**
 * @exemptedapi
 */
class UserEntityTypeAttributes implements IEntityTypeIdCardAttribute {
    private _attributes: Array<EntityIdCardAttribute>;
    private static _idCardEntityAttributeCounter: number = 0;

    public constructor(identity: Identities_Picker_RestClient.IEntity) {
        this._attributes = this._mapEntityPropertiesToAttributes(identity);
    }

    private _mapEntityPropertiesToAttributes(identity: Identities_Picker_RestClient.IEntity): Array<EntityIdCardAttribute> {
        var attributes = new Array<EntityIdCardAttribute>();
        // display the attributes in the order of importance
        if (identity.jobTitle) {
            attributes.push(new EntityIdCardAttribute(Resources_Platform.IdentityPicker_IdCardJobTitle, identity.jobTitle));
        }

        if (identity.mailNickname && !Utils_String.isGuid(identity.mailNickname)) {
            attributes.push(new EntityIdCardAttribute(Resources_Platform.IdentityPicker_IdCardAlias, identity.mailNickname));
        }

        //todo: enable once manager is enabled
        //if (identity.manager && identity.manager.displayName) {
        //   attributes.push(new EntityIdCardAttribute(Resources_Platform.IdentityPicker_IdCardManager, identity.manager.displayName));
        //}

        if (identity.physicalDeliveryOfficeName) {
            attributes.push(new EntityIdCardAttribute(Resources_Platform.IdentityPicker_IdCardOffice, identity.physicalDeliveryOfficeName));
        }

        if (identity.department) {
            attributes.push(new EntityIdCardAttribute(Resources_Platform.IdentityPicker_IdCardDepartment, identity.department));
        }
        return attributes;
    }

    public isEmpty(): boolean {
        return !(this._attributes.length > 0);
    }

    private _appendAttributeBlock(index: number, appendee: JQuery): void {
        var divs = this._attributes[index].constructAttribute(UserEntityTypeAttributes._idCardEntityAttributeCounter++);
        for (var i in divs) {
            divs[i].appendTo(appendee);
        }
    }

    public toRows(): Array<JQuery> {
        var rows = new Array<JQuery>();
        var currentRow: JQuery;
        for (var i in this._attributes) {
            let index = parseInt(i);
            if (this._isEven(index)) {
                if (currentRow) {
                    rows.push(currentRow);
                }
                currentRow = $("<div>").addClass("identity-picker-idcard-row");
                var leftAttribute = $("<div>").addClass("identity-picker-idcard-left-attribute").appendTo(currentRow);
                this._appendAttributeBlock(index, leftAttribute);
            } else {
                var rightAttribute = $("<div>").addClass("identity-picker-idcard-right-attribute").appendTo(currentRow);
                this._appendAttributeBlock(index, rightAttribute);
            }
        }
        if (currentRow) {
            rows.push(currentRow);
        }
        return rows;
    }

    private _isEven(value: number): boolean {
        return value % 2 === 0;
    }
}

/**
 * @exemptedapi
 */
class GroupEntityTypeAttributes implements IEntityTypeIdCardAttribute {
    private _attributes: Array<EntityIdCardAttribute>;
    private static _idCardEntityAttributeCounter: number = 0;

    public constructor(identity: Identities_Picker_RestClient.IEntity) {
        this._attributes = this._mapEntityPropertiesToAttributes(identity);
    }

    private _mapEntityPropertiesToAttributes(identity: Identities_Picker_RestClient.IEntity): Array<EntityIdCardAttribute> {
        var attributes = new Array<EntityIdCardAttribute>();
        var idCardDescription = new EntityIdCardAttribute(
            Resources_Platform.IdentityPicker_IdCardDescription,
            identity.description ? identity.description : "", true);
        attributes.push(idCardDescription);
        if (identity.scopeName) {
            attributes.push(
                new EntityIdCardAttribute(
                    Resources_Platform.IdentityPicker_IdCardGroupSource,
                    this._getScopeNameByDirectoryType(identity)));
        }

        if (identity.mail) {
            attributes.push(new EntityIdCardAttribute(Resources_Platform.IdentityPicker_IdCardMail, identity.mail));
        }

        if (identity.mailNickname && !Utils_String.isGuid(identity.mailNickname)) {
            attributes.push(new EntityIdCardAttribute(Resources_Platform.IdentityPicker_IdCardAlias, identity.mailNickname));
        }
        return attributes;
    }

    private _getScopeNameByDirectoryType(identity: Identities_Picker_RestClient.IEntity): string {
        var formatString = identity.originDirectory.trim().toLowerCase() == Identities_Picker_Services.ServiceHelpers.VisualStudioDirectory ?
            Resources_Platform.IdentityPicker_IdCardImsGroupSource : Resources_Platform.IdentityPicker_IdCardAadGroupSource;
        return Utils_String.format(formatString, identity.scopeName);
    }

    public isEmpty(): boolean {
        return !(this._attributes.length > 0);
    }

    private _appendAttributeBlock(index: number, appendee: JQuery): void {
        var divs = this._attributes[index].constructAttribute(GroupEntityTypeAttributes._idCardEntityAttributeCounter++);
        for (var i in divs) {
            divs[i].appendTo(appendee);
        }
    }

    public toRows(): Array<JQuery> {
        var infoTabContent = $("<div>").addClass("identity-picker-idcard-info");
        if (this._isValidIndex(1)) {
            var firstAttributeColumn = $("<div>").addClass("identity-picker-idcard-column").appendTo(infoTabContent);
            var i = 1;
            while (this._isValidIndex(i)) {
                var attributeRow = $("<div>").addClass("identity-picker-idcard-row").appendTo(firstAttributeColumn);
                var attribute = $("<div>").addClass("identity-picker-idcard-left-attribute").appendTo(attributeRow);
                this._appendAttributeBlock(i, attribute);
                i++;
            }
        }

        if (this._attributes[0].getDisplayContent()) {
            var secondAttributeColumn = $("<div>").addClass("identity-picker-idcard-column").appendTo(infoTabContent);
            var descriptionAttribute = $("<div>").addClass("identity-picker-idcard-left-attribute").appendTo(secondAttributeColumn);
            this._appendAttributeBlock(0, descriptionAttribute);
        }
        var rows = new Array<JQuery>();
        rows.push(infoTabContent);

        return rows;
    }

    private _isValidIndex(index: number): boolean {
        return (typeof this._attributes[index] !== "undefined");
    }
}
