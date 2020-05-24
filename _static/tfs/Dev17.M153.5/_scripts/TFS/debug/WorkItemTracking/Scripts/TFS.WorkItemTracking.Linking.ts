import VSS = require("VSS/VSS");
import Utils_String = require("VSS/Utils/String");
import Utils_Array = require("VSS/Utils/Array");
import Diag = require("VSS/Diag");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import { RegisteredLinkTypeNames } from "WorkItemTracking/Scripts/RegisteredLinkTypeNames";
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import Controls = require("VSS/Controls");
import Resources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import * as LinkingUtils from "WorkItemTracking/Scripts/TFS.WorkItemTracking.Linking.Utils";

export namespace StyleConstants {
    export const CSS_CLASS_TARGET_ICON = "bowtie-icon bowtie-map-destination-fill target-icon";
}

class LinkVisualization extends Controls.BaseControl {

    constructor(options?) {
        super(options);
    }

    public _createIn(container) {
        return super._createIn(container);
    }

    public update(topology, isForward, isSrcMultiple, isTgtMultiple, srcText, tgtText) {
        let src, tgt, classes = [];

        // Emptying the content and removing classes
        this._element.empty().removeAttr("class");

        // Adding base class for the visualization which sets width and height
        classes.push("link-visualization");

        // Adding the necessary topology class
        classes.push((topology || "").toLocaleLowerCase());

        src = isSrcMultiple === true ? "multiplesrc" : "singlesrc";
        tgt = isTgtMultiple === true ? "multipletgt" : "singletgt";

        // Adding link type specific image class which actually sets the correct background image
        classes.push(isForward ? ["image", tgt, src].join("-") : ["image", src, tgt].join("-"));

        // Settings the classes once for the element
        this._element.addClass(classes.join(" "));

        // Creating text element for the source link
        $("<div />").addClass("text text-forward").text(isForward ? srcText : tgtText).appendTo(this._element);

        // Creating text element for the target link
        $("<div />").addClass("text text-reverse").text(isForward ? tgtText : srcText).appendTo(this._element);
    }

    public disable(message) {
        this._element.addClass("invalid");
    }
}

export class LinkFilterHelper {

    private _options: any;
    private _witLinkTypes: any;
    private _regLinkTypes: any;
    private _contributedLinkTypes: any;
    private _witFiltersProjectScoped: any;
    private _witFilterType: any;
    private _witFilters: any;
    private _witFilterExists: boolean;
    private _linkTypeFilterExists: boolean;
    private _manualLinkingExclusionList: string[];

    constructor(options?) {
        /// <summary>Helper class to apply filtering on links. The filters should be specified
        /// in the options.</summary>
        this._options = options;

        // Initialize the manual linking exclusion list. This will later be exposed in the interface so that extension
        // author will be able to specify whether the link type should be allowed to be manually linked or is it only 
        // allowed in automated linking workflow.
        this._manualLinkingExclusionList = ["Integrated in release environment"];
    }

    public witFilterExists() {
        /// <summary>Gets whether work item type filter exists in the options</summary>
        this._ensureWitFilters();
        return this._witFilterExists;
    }

    public linkTypeFilterExists(store) {
        /// <summary>Gets whether link type filter exists in the options</summary>
        this._ensureLinkTypeFilters(store);
        return this._linkTypeFilterExists;
    }

    public isLinkFilteredOut(link: WITOM.Link, store: WITOM.WorkItemStore): boolean {
        /// <summary>Gets whether the specified link is filtered out by the settings or not</summary>
        /// <param name="link" type="WITOM.Link">Link to check filtered out or not</param>
        /// <param name="store" type="WITOM.WorkItemStore">Work item store to access link types</param>
        /// <returns type="Boolean" />
        this._ensureLinkTypeFilters(store);
        return !this._getValidLinkType(link);
    }

    public isLinkTypeFilteredOut(linkType: any, isWitLink: boolean, store: WITOM.WorkItemStore): boolean {
        /// <summary>Gets whether the specified link type is filtered out by the settings or not</summary>
        /// <param name="linkType" type="Object">Link type to check filtered out or not</param>
        /// <param name="isWitLink" type="Boolean">Specifies whether the link type is wit or not (default false)</param>
        /// <param name="store" type="WITOM.WorkItemStore">Work item store to access link types</param>
        /// <returns type="Boolean" />

        // If not in standard access mode, then only hyperlink link type allowed
        if (!this._options.tfsContext.standardAccessMode && linkType !== RegisteredLinkTypeNames.Hyperlink) {
            return true;
        }

        let lt;
        this._ensureLinkTypeFilters(store);
        if (isWitLink === true) {
            lt = this._witLinkTypes[linkType];
        } else {
            lt = this._regLinkTypes[linkType];

            // Only include those link types which are not excluded form manual linking.
            if (!lt && !Utils_Array.contains(this._manualLinkingExclusionList, linkType, Utils_String.ignoreCaseComparer)) {
                lt = this._contributedLinkTypes[linkType];
            }
        }
        return !lt;
    }

    public isWitFilteredOut(witName: string, projectSameAsOwner: boolean): boolean {
        /// <summary>Gets whether the specified work item type is filtered out by the settings or not</summary>
        /// <param name="witName" type="String">Work item type name to check filtered out or not</param>
        /// <param name="projectSameAsOwner" type="Boolean">witName belongs to same project</param>
        /// <returns type="Boolean" />
        let filterCount;
        let isInclude;
        let isExclude;
        let isInList;
        let filteredOut = false;

        if (this._witFilterType === "includeAll") {
            // If the work item type filter scope is project and work item type belongs to
            // another project, filtering the specified work item type
            filteredOut = this._witFiltersProjectScoped && projectSameAsOwner === false;
        } else {
            // Ensuring the filter values are populated first
            this._ensureWitFilters();

            filterCount = this._witFilters.length;
            isInclude = this._witFilterType === "include";
            isExclude = this._witFilterType === "exclude";
            if (filterCount) {
                isInList = $.inArray(witName, this._witFilters) >= 0;
                if (isInclude) {
                    filteredOut = !isInList;
                } else if (isExclude) {
                    filteredOut = isInList;
                }
            } else if (isInclude) {
                // If there is no valid work item type and filter type is include,
                // filtering out work item type
                filteredOut = true;
            }
        }
        return filteredOut;
    }

    public getValidLinkTypesForWorkItem(workItem: WITOM.WorkItem, prohibitedList?: any[]) {
        /// Description from WIT Client OM
        /// <summary>Retrieves the filtered set of work item link types that are allowed to be added.
        /// If there are 1-many relationships that cannot be added to the specified work item (ie: already has a 'Parent', can't add another one),
        /// it is excluded from the returned list and the 'prohibitedList' parameter is filled with the offending
        /// link types. This will not include types that are 'disabled'.
        /// If connected to V1 server this method will return Related Work Item only. </summary>
        /// <param name="workItem" type="WITOM.WorkItem" />
        /// <param name="prohibitedList" type="any[]" optional="true" />

        const self = this,
            validLinkTypes = [],
            oneToManyTypes = {};

        Diag.Debug.assert(workItem instanceof WITOM.WorkItem, "workItem should be of type VSS.WorkItemTracking.WorkItem");

        // It is assured that all the link types are fetched from the server before linksFilterHelper is initialized.
        // We are safe here to call getLinkTypes directly.
        if (workItem.store.getLinkTypes().length) {
            $.each(workItem.getLinks(), function () {
                const linkTypeEnd = (this instanceof WITOM.WorkItemLink) ? this.getLinkTypeEnd() : null;

                if (linkTypeEnd &&
                    !linkTypeEnd.isForwardLink &&
                    linkTypeEnd.linkType &&
                    linkTypeEnd.linkType.isOneToMany) {
                    oneToManyTypes[linkTypeEnd.immutableName] = true;
                }
            });

            $.each(workItem.store.getLinkTypeEnds(), function () {
                if (this.linkType && this.linkType.isActive) {
                    if (!self.isLinkTypeFilteredOut(this.immutableName, true, workItem.store)) {
                        if (this.immutableName in oneToManyTypes) {
                            if ($.isArray(prohibitedList)) {
                                prohibitedList.push(this.immutableName);
                            }
                        } else {
                            validLinkTypes.push(this.name);
                        }
                    }
                }
            });
        } else {
            validLinkTypes.push(RegisteredLinkTypeNames.Related);
        }

        validLinkTypes.sort(Utils_String.localeIgnoreCaseComparer);

        return validLinkTypes;
    }

    public getValidWitsForProject(project: WITOM.Project, callback: (workItemTypes: string[]) => void, errorCallback?: IErrorCallback) {
        /// <summary>Retrieves the valid work item types for the specified project</summary>
        /// <param name="project" type="WITOM.Project">Project to get the valid work item types</param>
        /// <param name="callback" type="IResultCallback">Callback to be executed when the operation completes successfully</param>
        /// <param name="errorCallback" type="IErrorCallback">Callback to be executed when the operation fails</param>

        const that = this;
        const validWits = [];
        let witFilterType;
        let witFilters;

        Diag.Debug.assert(project instanceof WITOM.Project, "project should be of type VSS.WorkItemTracking.Project");

        function finalize() {
            if ($.isFunction(callback)) {
                validWits.sort(Utils_String.localeIgnoreCaseComparer);
                callback.call(that, validWits);
            }
        }

        if (!this._witFiltersProjectScoped) {
            this._ensureWitFilters();
            witFilterType = this._witFilterType;
            witFilters = {};

            $.each(this._witFilters, function (ind, filter) {
                witFilters[filter] = true;
            });

            project.beginGetVisibleWorkItemTypeNames(function (witNames) {
                $.each(witNames, function (ind, wit) {
                    if (witFilterType === "includeAll") {
                        validWits.push(wit);
                    } else if (wit in witFilters) {
                        if (witFilterType === "include") {
                            validWits.push(wit);
                        }
                    } else if (witFilterType === "exclude") {
                        validWits.push(wit);
                    }
                });

                finalize();
            }, errorCallback);
        } else {
            finalize();
        }
    }

    private _ensureLinkTypeFilters(store) {
        if (!this._witLinkTypes) {
            this._initializeLinkFilters(store);
        }
    }

    private _ensureWitFilters() {
        if (!this._witFilters) {
            this._initializeWitFilters();
        }
    }

    private _initializeLinkFilters(store: WITOM.WorkItemStore) {
        let i;
        let len;
        let lt;
        let ltName;
        let regLinkTypes = [];
        const rlt = store.getRegisteredLinkTypes() || [];
        let witLinkTypes = [];
        const wlt = store.getLinkTypeEnds() || [];
        let contributedLinkTypes = [];
        const clt: WITOM.IContributedLinkTypes = store.getContributedLinkTypes() || {};

        // Populating external link types
        for (const regLink of rlt) {
            ltName = LinkingUtils.getRegisteredLinkName(regLink.name, store);
            if (ltName !== Resources.LinksControlUnknownLinkTypeText) {
                regLinkTypes.push({ refName: regLink.name, name: LinkingUtils.getRegisteredLinkName(regLink.name, store) });
            }
        }

        // Checking to see any external link type filter defined in control settings
        if (this._options.externalLinkFilters) {
            if (this._options.isNewLinksControl) {
                regLinkTypes = this._getFilteredLinkTypes(store, regLinkTypes, { filters: this._options.externalLinkFilters });
            } else {
                // Performing filter on link types
                regLinkTypes = this._getLegacyFilteredLinkTypes(store, regLinkTypes, { filters: this._options.externalLinkFilters });
            }
        }

        // Populating work item link types
        for (i = 0, len = wlt.length; i < len; i++) {
            lt = wlt[i];
            witLinkTypes.push({ refName: lt.immutableName, name: lt.name, isDisabled: !lt.linkType.isActive });
        }

        // Checking to see any work item link type filter defined in control settings
        if (this._options.workItemLinkFilters) {
            if (this._options.isNewLinksControl) {
                witLinkTypes = this._getFilteredLinkTypes(store, witLinkTypes, { filterLinkTypes: true, filters: this._options.workItemLinkFilters });
            } else {
                // Performing filter on link types
                witLinkTypes = this._getLegacyFilteredLinkTypes(store, witLinkTypes, { filterLinkTypes: true, filters: this._options.workItemLinkFilters });
            }
        }

        // Populating contributed link types
        for (lt in clt) {
            const linkTypeData: WITOM.IContributedLinkTypeData = clt[lt];
            if (linkTypeData.linkTypeName) {
                contributedLinkTypes.push({ refName: lt, name: linkTypeData.linkTypeName });
            }
        }

        // Checking to see any external link type filter defined in control settings
        if (this._options.externalLinkFilters) {
            if (this._options.isNewLinksControl) {
                contributedLinkTypes = this._getFilteredLinkTypes(store, contributedLinkTypes, { filters: this._options.externalLinkFilters });
            }
            else {
                // Performing filter on link types
                contributedLinkTypes = this._getLegacyFilteredLinkTypes(store, contributedLinkTypes, { filters: this._options.externalLinkFilters });
            }
        }

        const allLinkTypes = regLinkTypes.concat(witLinkTypes).concat(contributedLinkTypes);
        this._setGroupOrder(allLinkTypes);

        function populate(linkTypes) {
            const hash = {};
            for (i = 0, len = linkTypes.length; i < len; i++) {
                lt = linkTypes[i];
                hash[lt.refName] = lt;
            }
            return hash;
        }

        // Creating hash tables according to link type reference names
        this._regLinkTypes = populate(regLinkTypes);
        this._witLinkTypes = populate(witLinkTypes);
        this._contributedLinkTypes = populate(contributedLinkTypes);
    }

    private _initializeWitFilters() {
        const witFilters = this._options.workItemTypeFilters;

        // Initializing wit filter list
        this._witFilters = [];

        if (witFilters) {
            this._witFiltersProjectScoped = witFilters.scope === "project";
            this._witFilterType = witFilters.filterType || "includeAll";
            if ($.isArray(witFilters.filters)) {
                for (let i = 0, len = witFilters.filters.length; i < len; i++) {
                    const f = witFilters.filters[i];
                    if (f.workItemType) {
                        this._witFilters.push(f.workItemType);
                    }
                }
            }
        } else {
            this._witFiltersProjectScoped = false;
            this._witFilterType = "includeAll";
        }

        this._witFilterExists = this._witFilterType !== "includeAll" || this._witFiltersProjectScoped;
    }

    private _getLegacyFilteredLinkTypes(store, linkTypes, options?) {
        /// <summary>Filters the link types according to the filters specified in the options</summary>
        let i;
        let len;
        let filter;
        let filteredTypes = []; // result list which contains link types after filter applied
        let fTypes; // available link filter hash
        const filterLinkTypes = options && options.filterLinkTypes === true; // option to distinguish wit link types and external link types
        const filters = options && options.filters; // link type filters of the control defined in WITD
        let reverse;
        let forward;
        let include;
        let includeAll;
        let lt;

        if (filters) {
            fTypes = {};
            if (filters.filterType !== "excludeAll") {
                if ($.isArray(filters.filters)) {
                    for (i = 0, len = filters.filters.length; i < len; i++) {
                        filter = filters.filters[i];
                        if (filterLinkTypes) {
                            reverse = !filter.filterOn || filter.filterOn === "reversename";
                            forward = !filter.filterOn || filter.filterOn === "forwardname";

                            try {
                                lt = store.findLinkType(filter.linkType);
                                if (forward) {
                                    fTypes[lt.forwardEnd.immutableName] = true;
                                }
                                if (reverse && lt.isDirectional) {
                                    fTypes[lt.reverseEnd.immutableName] = true;
                                }
                            } catch (ex) {
                                // Link type not found. Skipping.
                            }
                        } else {
                            fTypes[filter.linkType] = true;
                        }
                    }
                }

                includeAll = filters.filterType === "includeAll";
                include = includeAll || filters.filterType === "include";
                for (i = 0, len = linkTypes.length; i < len; i++) {
                    if ((includeAll || linkTypes[i].refName in fTypes) === include) {
                        filteredTypes.push(linkTypes[i]);
                    }
                }
            }

            this._linkTypeFilterExists = this._linkTypeFilterExists || filters.filterType !== "includeAll";
        } else {
            // If no filter exists return the specified link types
            filteredTypes = linkTypes;
        }

        return filteredTypes;
    }

    /**
     * Filters the link types according to the filters specified in the options
     */
    private _getFilteredLinkTypes(store, linkTypes, options?) {

        // Result list which contains link types after filter applied
        let filteredTypes = [];

        // Available link filter hash
        let fTypes: IDictionaryStringTo<boolean>;

        // link type filters of type string[]
        const filters: string[] = options && options.filters;

        if (filters && $.isArray(filters)) {
            fTypes = {};

            for (const filter of filters) {
                fTypes[filter] = true;
            }

            for (const linkType of linkTypes) {
                if (linkType.refName in fTypes) {
                    filteredTypes.push(linkType);
                }
            }
        } else {
            // If no filter exists return the specified link types
            filteredTypes = linkTypes;
        }

        return filteredTypes;
    }

    private _setGroupOrder(allLinkTypes) {
        allLinkTypes.sort(function (lt1, lt2) {
            return Utils_String.localeIgnoreCaseComparer(lt1.name, lt2.name);
        });

        // Setting group order for all link types after sort
        for (let i = 0, len = allLinkTypes.length; i < len; i++) {
            allLinkTypes[i].groupOrder = i;
        }
    }

    private _getGroupOrder(link) {

        Diag.Debug.assert(link instanceof WITOM.Link, "link should be of type VSS.WorkItemTracking.OM.Link");

        const linkType = this._getValidLinkType(link);
        if (linkType) {
            return linkType.groupOrder;
        }

        // If no group order is found for the specified link, placing it at the bottom of the groups
        return this._witLinkTypes.length + this._regLinkTypes.length + this._contributedLinkTypes.length + 1;
    }

    private _getValidLinkType(link) {
        const refName = LinkingUtils.getLinkTypeRefName(link);

        Diag.Debug.assert(link instanceof WITOM.Link, "link should be of type VSS.WorkItemTracking.OM.Link");
        if (link instanceof WITOM.WorkItemLink) {
            return this._witLinkTypes[refName];
        } else {
            return this._regLinkTypes[refName] || this._contributedLinkTypes[refName];
        }
    }
}

VSS.initClassPrototype(LinkFilterHelper, {
    _options: null,
    _witLinkTypes: null,
    _regLinkTypes: null,
    _contributedLinkTypes: null,
    _witFiltersProjectScoped: null,
    _witFilterType: null,
    _witFilters: null,
    _witFilterExists: false,
    _linkTypeFilterExists: false
});

export class LinkColumnHelper {

    public static defaultImageColumnWidth: number = 18;
    public static defaultColumnWidth: number = 75;
    public static defaultDateTimeColumnWidth: number = 120;
    public static defaultDoubleColumnWidth: number = 75;
    public static defaultIdColumnWidth: number = 70;
    public static defaultIntegerColumnWidth: number = 50;
    public static defaultLinkTypeColumnWidth: number = 80;
    public static defaultStringColumnWidth: number = 75;
    public static defaultTagColumnWidth: number = 200;
    public static defaultIdentityColumnWidth: number = 125;
    public static defaultTitleColumnWidth: number = 450;
    public static defaultTreePathColumnWidth: number = 300;
    public static defaultCommentCountWidth: number = 75;

    public static linkImageColumnName: string = "System.LinksControl.ImageColumn";

    public static linkDescriptionColumnName: string = "System.Links.Description";
    public static linkCommentColumnName: string = "System.Links.Comment";
    public static linkTypeColumnName: string = "System.Links.LinkType";

    public static getDefaultColumns() {
        return [{
            name: LinkColumnHelper.linkDescriptionColumnName
        }, {
            name: LinkColumnHelper.linkCommentColumnName
        }
        ];
    }

    public static isIdColumn(column) {
        return column.toLocaleUpperCase() === "System.Id".toLocaleUpperCase();
    }

    public static isLinkTypeColumn(column) {
        return column.toLocaleUpperCase() === LinkColumnHelper.linkTypeColumnName.toLocaleUpperCase();
    }

    public static isDescriptionColumn(column) {
        const columnUpper = column.toLocaleUpperCase();
        return columnUpper === "System.Title".toLocaleUpperCase() ||
            columnUpper === LinkColumnHelper.linkDescriptionColumnName.toLocaleUpperCase();
    }

    public static isCommentColumn(column) {
        return column.toLocaleUpperCase() === LinkColumnHelper.linkCommentColumnName.toLocaleUpperCase();
    }

    public static getColumnIndexByName(columns, name) {
        let i, len, index = -1;
        name = (name || "").toLocaleUpperCase();
        for (i = 0, len = columns.length; i < len; i++) {
            if (columns[i].name.toLocaleUpperCase() === name) {
                index = i;
                break;
            }
        }
        return index;
    }

    public static getFieldColumnWidth(name, store) {

        let width = LinkColumnHelper.defaultColumnWidth;
        const fd = store.getFieldDefinition(name);

        if (fd) {
            if (fd.isIdentity) {
                width = LinkColumnHelper.defaultIdentityColumnWidth;
            } else if (fd.id === WITConstants.CoreField.Title) {
                width = LinkColumnHelper.defaultTitleColumnWidth;
            } else if (fd.id === WITConstants.CoreField.Id) {
                width = LinkColumnHelper.defaultIdColumnWidth;
            } else if (fd.id === WITConstants.CoreField.LinkType) {
                width = LinkColumnHelper.defaultLinkTypeColumnWidth;
            } else if (fd.id === WITConstants.CoreField.Tags) {
                width = LinkColumnHelper.defaultTagColumnWidth;
            } else if (fd.id === WITConstants.CoreField.CommentCount) {
                width = LinkColumnHelper.defaultCommentCountWidth;
            } else {
                switch (fd.type) {
                    case WITConstants.FieldType.String:
                        width = LinkColumnHelper.defaultStringColumnWidth;
                        break;
                    case WITConstants.FieldType.Double:
                        width = LinkColumnHelper.defaultDoubleColumnWidth;
                        break;
                    case WITConstants.FieldType.Integer:
                        width = LinkColumnHelper.defaultIntegerColumnWidth;
                        break;
                    case WITConstants.FieldType.DateTime:
                        width = LinkColumnHelper.defaultDateTimeColumnWidth;
                        break;
                    case WITConstants.FieldType.TreePath:
                        width = LinkColumnHelper.defaultTreePathColumnWidth;
                        break;
                }
            }
        }
        return width;
    }

    private _displayColumns: any;
    private _sortColumns: any;

    public _options: any;

    constructor(options?) {
        /// <summary>Helper class for link display and sort columns.</summary>
        this._options = options;
    }

    public getDisplayColumns(fieldStore) {
        this._ensureDisplayColumns(fieldStore);
        return this._displayColumns;
    }

    public getSortColumns() {
        this._ensureSortColumns();
        return this._sortColumns;
    }

    public setSortColumns(columns) {
        this._sortColumns = columns;
    }

    public sortColumnExists() {
        return this.getSortColumns().length > 0;
    }

    public getWitColumns(fieldStore) {
        let fd;
        const witColumns = [];
        const columns = this.getDisplayColumns(fieldStore);

        $.each(columns, function () {
            if (!Utils_String.startsWith(this.name, "System.Links.")) {
                fd = fieldStore.getFieldDefinition(this.name);
                if (fd) {
                    witColumns.push(this.name);
                }
            }
        });
        return witColumns;
    }

    private _ensureDisplayColumns(fieldStore) {
        if (!this._displayColumns) {
            this._prepareDisplayColumns(fieldStore);
        }
    }

    private _ensureSortColumns() {
        if (!this._sortColumns) {
            // this._prepareSortColumns(fieldStore);
            this._sortColumns = [];
        }
    }

    private _prepareDisplayColumns(fieldStore) {
        let i;
        let l;
        let c;
        let columns;
        const lc = this._options.linkColumns;

        // TODO: Combine saving columns settings in the user profile
        // _options.linkColumns are columns from WITD settings
        if ($.isArray(lc) && lc.length) {
            columns = [];
            for (i = 0, l = lc.length; i < l; i++) {
                // Getting column info
                c = lc[i];

                // Adding to the columns
                columns.push({ name: c.linkAttribute || c.refName });
            }
        } else {
            // Falling to default columns if no column info is specified in WITD
            columns = LinkColumnHelper.getDefaultColumns();
        }

        // Updating display attributes such as width and text for the columns
        this._updateDisplayAttributes(columns, fieldStore);

        this._displayColumns = columns;
    }

    private _updateDisplayAttributes(columns, fieldStore) {
        const self = this;
        $.each(columns, function () {
            const field = fieldStore.getFieldDefinition(this.name);
            this.text = self._getColumnText(this.name, fieldStore);
            this.width = self._getColumnWidth(this.name, fieldStore);
            this.isIdentity = field ? field.isIdentity : false;
        });
    }

    private _getColumnText(name, fieldStore) {
        let text = "";
        if (name === LinkColumnHelper.linkDescriptionColumnName) {
            text = Resources.LinksControlDescriptionColumnText;
        } else if (name === LinkColumnHelper.linkCommentColumnName) {
            text = Resources.LinksControlCommentColumnText;
        } else if (name === LinkColumnHelper.linkTypeColumnName) {
            text = Resources.LinksControlLinkTypeColumnText;
        } else if (name === LinkColumnHelper.linkImageColumnName) {
            text = "";
        } else {
            // If the column is a field, getting the text from field name
            text = this._getFieldColumnText.call(this, name, fieldStore);
        }
        return text;
    }

    private _getFieldColumnText(name, fieldStore) {

        let text = "";
        const fd = fieldStore.getFieldDefinition(name);

        if (fd) {
            text = fd.name;
        }
        return text;
    }

    private _getColumnWidth(name, fieldStore) {
        let width = LinkColumnHelper.defaultColumnWidth;
        if (name === LinkColumnHelper.linkImageColumnName) {
            width = LinkColumnHelper.defaultImageColumnWidth;
        } else if (name === LinkColumnHelper.linkDescriptionColumnName) {
            width = LinkColumnHelper.defaultColumnWidth * 3;
        } else {
            // If the column is a field, getting default field width
            width = LinkColumnHelper.getFieldColumnWidth(name, fieldStore);
        }
        return width;
    }

    private _prepareSortColumns() {
    }
}

VSS.initClassPrototype(LinkColumnHelper, {
    _options: null,
    _displayColumns: null,
    _sortColumns: null
});

VSS.tfsModuleLoaded("TFS.WorkItemTracking.Linking", exports);