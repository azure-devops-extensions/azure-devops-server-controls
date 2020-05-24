import Utils_String = require("VSS/Utils/String");
import Utils_Array = require("VSS/Utils/Array");
import WebLayoutLinksControlOptionsReader = require("WorkItemTracking/Scripts/Controls/Links/WebLayoutLinksControlOptionsReader");
import { IWorkItemControlOptions } from "WorkItemTracking/Scripts/Controls/WorkItemForm/WorkItemControl";
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");

class FormRendererHelpers {
    /// Read control-attributes from controlNode. 
    /// Performing a case-insensitive get for attributes
    public static readControlAttributes(controlNode: any): IWorkItemControlOptions {
        var controlAttributes = controlNode.attributes;
        var options = <IWorkItemControlOptions>{};
        if (controlAttributes && controlAttributes.length) {
            $.each(controlAttributes, function () {
                if (this.name && typeof (this.name) === "string") {
                    switch (this.name.toLowerCase()) {

                        case "type":
                            options.controlType = this.nodeValue;
                            break;

                        case "name":
                            options.instanceName = this.nodeValue;
                            break;

                        case "fieldname":
                            options.fieldName = this.nodeValue;
                            break;

                        case "label":
                            options.label = this.nodeValue;
                            break;

                        case "labelposition":
                            options.labelPosition = this.nodeValue;
                            break;

                        case "dock":
                            options.dock = this.nodeValue;
                            break;

                        case "padding":
                            options.padding = this.nodeValue;
                            break;

                        case "margin":
                            options.margin = this.nodeValue;
                            break;

                        case "readonly":
                            options.readOnly = Utils_String.ignoreCaseComparer(this.nodeValue, "true") ? this.nodeValue : "True";
                            break;

                        case "minimumsize":
                            options.minimumSize = this.nodeValue;
                            break;

                        case "numberformat":
                            options.numberFormat = this.nodeValue;
                            break;

                        case "format":
                            options.format = this.nodeValue;
                            break;

                        case "customformat":
                            options.customFormat = this.nodeValue;
                            break;

                        case "maxlength":
                            options.maxLength = this.nodeValue;
                            break;

                        case "labelfontsize":
                            options.labelFontSize = this.nodeValue;
                            break;

                        case "controlfontsize":
                            options.controlFontSize = this.nodeValue;
                            break;

                        case "emptytext":
                            options.emptyText = this.nodeValue;
                            break;

                        case "refname":
                            options.refName = this.nodeValue;
                            break;

                        case "outputlayout":
                            options.outputLayout = this.nodeValue;
                            break;

                        case "limit":
                            options.limit = this.nodeValue;
                            break;

                        case "height":
                            // Reading height, if specified explicitly
                            if (this.nodeValue) {
                                options.height = this.nodeValue;
                            }
                            break;

                        case "commentheight":
                            options.commentHeight = this.nodeValue;
                            break;
                        case "contributionid":
                            options.contributionId = this.nodeValue;
                            break;

                        default:
                            break;
                    }
                }
            });
        }
        return options;
    }

    /**
     * Determine whether read-only field icon should be shown for a specific control.
     */
    public static isReadOnlyFieldIconHidden(controlType: string): boolean {
        const hiddenControlTypes: string[] = [WITConstants.WellKnownControlNames.WebpageControl, WITConstants.WellKnownControlNames.LabelControl,
            WITConstants.WellKnownControlNames.HtmlControl, WITConstants.WellKnownControlNames.PlainTextControl, WITConstants.WellKnownControlNames.LinksControl,
            WITConstants.WellKnownControlNames.DevelopmentControl, WITConstants.WellKnownControlNames.WorkItemDiscussionControl];

        return Utils_Array.contains(hiddenControlTypes, controlType, Utils_String.ignoreCaseComparer);
    }

    //exposed for unit testing
    public static readControlOptions(controlNode: XMLDocument, options: IWorkItemControlOptions) {
        var children = controlNode.childNodes;
        if (children && children.length) {
            $.each(children, function (this: Element) {
                switch (this.nodeName) {
                    case "LinksControlOptions":
                        if (FormRendererHelpers._isLegacyLinksControlOptions(this)) {
                            FormRendererHelpers._readLegacyLinksControlOptions(this, options);
                        }
                        else {
                            const linksControlOptions = WebLayoutLinksControlOptionsReader.WebLayoutLinksControlOptionsReader.parseLinksControlOptionsXml(this);

                            // For the links control we want to make sure that the XML provided options do not overwrite any options
                            // that have been set before
                            for (let linksControlOption of Object.keys(linksControlOptions)) {
                                if (typeof options[linksControlOption] === "undefined") {
                                    // Option is not yet set in the control options, set the read value
                                    options[linksControlOption] = linksControlOptions[linksControlOption];
                                }
                            }
                        }
                        break;
                    case "WebpageControlOptions":
                        FormRendererHelpers._readWebPageControlOptions(this, options);
                        break;
                    case "CustomControlOptions":
                        FormRendererHelpers._readCustomControlOptions(this, options);
                        break;
                    case "Link":
                        options.labelData = [];
                        options.labelData.push({ link: FormRendererHelpers._readLinkOptions(this, options) });
                        break;
                    case "LabelText":
                        FormRendererHelpers._readLabelTextOptions(this, options);
                        break;
                }
            });
        }
    }

    private static _isLegacyLinksControlOptions(linksControlOptions: Node) {
        let isLegacy = false;
        $.each(linksControlOptions.childNodes, function () {
            if (this.nodeName === "LinkColumns") {
                isLegacy = true;
                return true;
            }
        });
        return isLegacy;
    }

    private static _readLegacyLinksControlOptions(optionsNode, options) {
        var children = optionsNode.childNodes,
            workItemLinkFilters,
            externalLinkFilters,
            workItemTypeFilters,
            linkColumns;

        if (children && children.length) {
            $.each(children, function () {
                switch (this.nodeName) {

                    case "WorkItemLinkFilters":
                        // Creating work item link filters object
                        workItemLinkFilters = {
                            filterType: this.getAttribute("FilterType")
                        };

                        // Checking to see any filter is applied
                        if (this.childNodes && this.childNodes.length) {
                            workItemLinkFilters.filters = [];
                            $.each(this.childNodes, function () {
                                if (this.nodeName === "Filter") {
                                    // Adding individual filters to the filters collection
                                    workItemLinkFilters.filters.push({
                                        linkType: $.trim(this.getAttribute("LinkType")),
                                        filterOn: this.getAttribute("FilterOn")
                                    });
                                }
                            });
                        }
                        // Adding the filter object to options
                        options.workItemLinkFilters = workItemLinkFilters;
                        break;

                    case "ExternalLinkFilters":
                        // Creating external link filters object
                        externalLinkFilters = {
                            filterType: this.getAttribute("FilterType")
                        };

                        // Checking to see any filter is applied
                        if (this.childNodes && this.childNodes.length) {
                            externalLinkFilters.filters = [];
                            $.each(this.childNodes, function () {
                                if (this.nodeName === "Filter") {
                                    // Adding individual filters to the filters collection
                                    externalLinkFilters.filters.push({
                                        linkType: $.trim(this.getAttribute("LinkType"))
                                    });
                                }
                            });
                        }
                        // Adding the filter object to options
                        options.externalLinkFilters = externalLinkFilters;
                        break;

                    case "WorkItemTypeFilters":
                        // Creating work item type filters object
                        workItemTypeFilters = {
                            filterType: this.getAttribute("FilterType"),
                            scope: this.getAttribute("Scope")
                        };

                        // Checking to see any filter is applied
                        if (this.childNodes && this.childNodes.length) {
                            workItemTypeFilters.filters = [];
                            $.each(this.childNodes, function () {
                                if (this.nodeName === "Filter") {
                                    // Adding individual filters to the filters collection
                                    workItemTypeFilters.filters.push({
                                        workItemType: $.trim(this.getAttribute("WorkItemType"))
                                    });
                                }
                            });
                        }
                        // Adding the filter object to options
                        options.workItemTypeFilters = workItemTypeFilters;
                        break;

                    case "LinkColumns":
                        // Creating link columns array
                        linkColumns = [];

                        // Checking to see any link column exists
                        if (this.childNodes && this.childNodes.length) {
                            $.each(this.childNodes, function () {
                                if (this.nodeName === "LinkColumn") {
                                    // Adding columns
                                    linkColumns.push({
                                        linkAttribute: this.getAttribute("LinkAttribute"),
                                        refName: $.trim(this.getAttribute("RefName"))
                                    });
                                }
                            });
                        }
                        // Adding link columns to options
                        options.linkColumns = linkColumns;
                        break;
                }
            });
        }
    }

    private static _readWebPageControlOptions(optionsNode, options) {
        var children = optionsNode.childNodes;

        options.allowScript = optionsNode.getAttribute("AllowScript") === "true"; // default false
        options.reloadOnParamChange = optionsNode.getAttribute("ReloadOnParamChange") !== "false"; // default true

        if (children && children.length) {
            $.each(children, function () {
                switch (this.nodeName) {
                    case "Link":
                        options.link = FormRendererHelpers._readLinkOptions(this, options);
                        break;

                    case "Content":
                        options.content = this.text || this.textContent;
                        break;
                }
            });
        }
    }

    private static _readLinkOptions(linkNode, options) {
        var params,
            link;

        link = {
            urlRoot: linkNode.getAttribute("UrlRoot"),
            urlPath: linkNode.getAttribute("UrlPath")
        };

        // Checking to see any link param exists
        if (linkNode.childNodes && linkNode.childNodes.length) {
            params = [];
            $.each(linkNode.childNodes, function () {
                var index;
                if (this.nodeName === "Param") {
                    // Adding params
                    index = parseInt(this.getAttribute("Index"), 10);
                    if (!isNaN(index)) {
                        params[index] = {
                            value: this.getAttribute("Value"),
                            original: this.getAttribute("Type") === "Original"
                        };
                    }
                }
            });

            link.params = params;
        }

        return link;
    }

    private static _readTextNode(textNode, options) {
        var textData;

        textData = {};
        if (textNode.childNodes && textNode.childNodes.length) {
            $.each(textNode.childNodes, function () {
                if (this.nodeName === "Link") {
                    textData.link = FormRendererHelpers._readLinkOptions(this, options);
                }
                else {
                    textData.content = this.nodeValue;
                }
            });
        }

        return textData;
    }

    private static _readLabelTextOptions(labelTextNode, options) {
        var textNodes = [];
        if (labelTextNode.childNodes && labelTextNode.childNodes.length) {
            $.each(labelTextNode.childNodes, function () {
                textNodes.push(FormRendererHelpers._readTextNode(this, options));
            });

        }
        options.labelData = textNodes;
    }

    private static _readCustomControlOptions(optionsNode, options) {
        // The options are defined by the control itself, cache the options node so custom controls can read them.
        options.customControlOptions = optionsNode.cloneNode(true);
    }
}

export = FormRendererHelpers;
