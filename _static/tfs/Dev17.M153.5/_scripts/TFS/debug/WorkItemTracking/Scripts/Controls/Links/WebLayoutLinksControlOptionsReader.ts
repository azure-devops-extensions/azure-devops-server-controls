
import {
    WebLayoutLinksControlViewMode, WebLayoutLinksControlZeroDataExperience, WebLayoutLinksControlColumnTruncation, WebLayoutLinksControlLinkFilterKind,
    IWebLayoutLinksControlLinkColumns, IWebLayoutLinksControlListViewOptions, WebLayoutLinksControlXmlValues,
    IWebLayoutLinksControlOptions, IWebLayoutLinksControlLinkFilter
} from "WorkItemTracking/Scripts/Controls/Links/Interfaces";
import Utils_String = require("VSS/Utils/String");


class WebLayoutLinksControlXmlAttributeNames {
    public static ViewMode = "ViewMode";
    public static ZeroDataExperience = "ZeroDataExperience";
    public static ShowCallToAction = "ShowCallToAction";
    public static FilterType = "Type";
    public static WorkItemType = "WorkItemType";
    public static ColumnName = "Name";
    public static ColumnTruncation = "Truncation";
    public static WorkItemTypeFiltersScope = "WorkItemTypeFiltersScope";
    public static GroupLinks = "GroupLinks";
    public static PageSize = "PageSize";
}

class WebLayoutLinksControlXmlTagNames {
    public static ListViewOptions = "ListViewOptions";
    public static Columns = "Columns";
    public static LinkFilters = "LinkFilters";
    public static WorkItemLinkFilter = "WorkItemLinkFilter";
    public static ExternalLinkFilter = "ExternalLinkFilter";
    public static WorkItemTypeFilters = "WorkItemTypeFilters";
    public static WorkItemTypeFilter = "Filter";
    public static Column = "Column";
}

export class WebLayoutLinksControlParsedDefaultValues {
    public static viewMode = WebLayoutLinksControlViewMode.Dynamic;
    public static zeroDataExperience = WebLayoutLinksControlZeroDataExperience.Default;
    public static groupLinks = true;
    public static pageSize = 6;
    public static showCallToActions = false;
    public static columnTruncation = WebLayoutLinksControlColumnTruncation.Auto;
    public static ColumnNames: string[] = null;
    public static columns: IWebLayoutLinksControlLinkColumns = {
        columnNames: WebLayoutLinksControlParsedDefaultValues.ColumnNames,
        truncation: WebLayoutLinksControlParsedDefaultValues.columnTruncation
    };
    public static LinkFilters = null;  //by default show all 
    public static ListViewOptions = {
        groupLinks: WebLayoutLinksControlParsedDefaultValues.groupLinks,
        pageSize: WebLayoutLinksControlParsedDefaultValues.pageSize
    };
    public static WorkItemTypeFilters = null;
    public static ScopeWorkItemTypeFiltersToProject = false;
}

export class WebLayoutLinksControlOptionsReader {
    /**
     * Parses the LinksControlOptions XML metadata to JSON object
     * @param linksControlOptionsDocument The XMLDocument object containing the metadata
     */
    public static parseLinksControlOptionsXml(linksControlOptionsDocument: Element): IWebLayoutLinksControlOptions {
        let lcOptionsElement = linksControlOptionsDocument;
        let children = lcOptionsElement.childNodes;

        let lcOptions = WebLayoutLinksControlOptionsReader.getDefaultLinksControlOptions();

        //Read nodes
        if (children && children.length) {
            $.each(children, (index, element) => {
                switch (element.nodeName) {
                    case WebLayoutLinksControlXmlTagNames.ListViewOptions:
                        lcOptions.listViewOptions = {
                            groupLinks: WebLayoutLinksControlOptionsReader._convertStringToBoolean(element.getAttribute(WebLayoutLinksControlXmlAttributeNames.GroupLinks), WebLayoutLinksControlParsedDefaultValues.groupLinks),
                            pageSize: Number(element.getAttribute(WebLayoutLinksControlXmlAttributeNames.PageSize)) || WebLayoutLinksControlParsedDefaultValues.pageSize
                        }
                        break;
                    case WebLayoutLinksControlXmlTagNames.Columns:
                        let truncateColumns: string = element.getAttribute(WebLayoutLinksControlXmlAttributeNames.ColumnTruncation);
                        lcOptions.columns = {
                            truncation: WebLayoutLinksControlColumnTruncation[truncateColumns] || WebLayoutLinksControlParsedDefaultValues.columnTruncation,
                            columnNames: WebLayoutLinksControlOptionsReader._getColumnNames(element)
                        }
                        break;
                    case WebLayoutLinksControlXmlTagNames.LinkFilters:
                        lcOptions.linkFilters = WebLayoutLinksControlOptionsReader._parseLinkFilters(element);
                        break;
                    case WebLayoutLinksControlXmlTagNames.WorkItemTypeFilters:
                        lcOptions.workItemTypeFilters = WebLayoutLinksControlOptionsReader._parseWorkItemTypeFilters(element, lcOptions.scopeWorkItemTypesToProject);
                        break;
                }
            });
        }

        const getAttribute = (attributeName: string) => {
            return lcOptionsElement.getAttribute(attributeName);
        };

        // Read attributes
        lcOptions.viewMode = WebLayoutLinksControlViewMode[getAttribute(WebLayoutLinksControlXmlAttributeNames.ViewMode) as string] || WebLayoutLinksControlParsedDefaultValues.viewMode;
        lcOptions.zeroDataExperience = WebLayoutLinksControlOptionsReader._parseZeroDataExperience(getAttribute(WebLayoutLinksControlXmlAttributeNames.ZeroDataExperience) as string);            
        lcOptions.showCallToAction = this._convertStringToBoolean(getAttribute(WebLayoutLinksControlXmlAttributeNames.ShowCallToAction), WebLayoutLinksControlParsedDefaultValues.showCallToActions);
        lcOptions.scopeWorkItemTypesToProject = (Utils_String.ignoreCaseComparer(getAttribute(WebLayoutLinksControlXmlAttributeNames.WorkItemTypeFiltersScope), "project") === 0) || WebLayoutLinksControlParsedDefaultValues.ScopeWorkItemTypeFiltersToProject;
        return lcOptions;
    }

    private static _parseZeroDataExperience(input: string): WebLayoutLinksControlZeroDataExperience {
        const zeroDataExperienceInput: WebLayoutLinksControlZeroDataExperience = WebLayoutLinksControlZeroDataExperience[input];
        
        if (zeroDataExperienceInput != null) {
            return zeroDataExperienceInput;
        }
        
        return WebLayoutLinksControlParsedDefaultValues.zeroDataExperience;
    }

    public static getDefaultLinksControlOptions(): IWebLayoutLinksControlOptions {
        return <IWebLayoutLinksControlOptions>{
            linkFilters: WebLayoutLinksControlParsedDefaultValues.LinkFilters,
            columns: WebLayoutLinksControlParsedDefaultValues.columns,
            workItemTypeFilters: WebLayoutLinksControlParsedDefaultValues.WorkItemTypeFilters,
            listViewOptions: WebLayoutLinksControlParsedDefaultValues.ListViewOptions,
            scopeWorkItemTypesToProject: WebLayoutLinksControlParsedDefaultValues.ScopeWorkItemTypeFiltersToProject,
            showCallToAction: WebLayoutLinksControlParsedDefaultValues.showCallToActions,
            viewMode: WebLayoutLinksControlParsedDefaultValues.viewMode,
            zeroDataExperience: WebLayoutLinksControlParsedDefaultValues.zeroDataExperience
        };
    }

    private static _parseLinkFilters(element): IWebLayoutLinksControlLinkFilter[] {
        let linkFilters: IWebLayoutLinksControlLinkFilter[] = null;
        $.each(element.childNodes, (index, linkFilterNode) => {
            if (linkFilterNode.nodeName === WebLayoutLinksControlXmlTagNames.ExternalLinkFilter || linkFilterNode.nodeName === WebLayoutLinksControlXmlTagNames.WorkItemLinkFilter) {
                let linkValue = $.trim(linkFilterNode.getAttribute(WebLayoutLinksControlXmlAttributeNames.FilterType));
                if (!linkFilters) {
                    linkFilters = [];
                }

                let linkFilter: IWebLayoutLinksControlLinkFilter = <IWebLayoutLinksControlLinkFilter>{
                    linkFilterType: linkValue
                };

                //As the link filters also specify the order we need to keep the links in same order as in xml
                linkFilters.push(linkFilter);

                if (linkFilterNode.nodeName === WebLayoutLinksControlXmlTagNames.ExternalLinkFilter) {
                    linkFilter.linkFilterKind = WebLayoutLinksControlLinkFilterKind.External;
                }
                else {
                    linkFilter.linkFilterKind = WebLayoutLinksControlLinkFilterKind.WorkItem;
                }
            }
        });
        return linkFilters;
    }

    private static _parseWorkItemTypeFilters(element, scopeToProect: boolean): string[] {
        let workItemTypeFilters: string[] = []
        // Checking to see any filter is applied
        if (element.childNodes && element.childNodes.length) {
            $.each(element.childNodes, function (index1, childNode) {
                if (childNode.nodeName === WebLayoutLinksControlXmlTagNames.WorkItemTypeFilter) {
                    // Adding individual filters to the filters collection
                    workItemTypeFilters.push($.trim(this.getAttribute(WebLayoutLinksControlXmlAttributeNames.WorkItemType)));
                }
            });
        }
        return workItemTypeFilters;
    }

    private static _getColumnNames(element): string[] {
        // Creating link columns array
        let columns: string[] = null;

        // Checking to see any link column exists
        if (element.childNodes && element.childNodes.length) {
            $.each(element.childNodes, (index1, childNode) => {
                if (childNode.nodeName === WebLayoutLinksControlXmlTagNames.Column) {
                    if (!columns) {
                        columns = [];
                    }
                    // Adding columns
                    columns.push($.trim(childNode.getAttribute(WebLayoutLinksControlXmlAttributeNames.ColumnName)));
                }
            });
        }

        return columns;
    }

    private static _convertStringToBoolean(value: string, defaultValue: boolean): boolean {
        let retValue = defaultValue;
        if (Utils_String.localeIgnoreCaseComparer(value, "true") === 0) {
            retValue = true;
        }
        else if (Utils_String.localeIgnoreCaseComparer(value, "false") === 0) {
            retValue = false;
        }

        return retValue;
    }
}