import WITResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import Controls = require("VSS/Controls");
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import Utils_String = require("VSS/Utils/String");

import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import { WorkItemControl, IWorkItemControlOptions, ILabelData, ILabelParam } from "WorkItemTracking/Scripts/Controls/WorkItemForm/WorkItemControl";
import { WorkItemChangeType } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import WorkItemTrackingResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import { LinkSetting } from "WorkItemTracking/Scripts/Utils/LinkSetting";

interface ILabelTextControlOptions extends Controls.EnhancementOptions {
    textData: ILabelData;
}
class LabelTextControl extends Controls.Control<ILabelTextControlOptions> {
    public static enhancementTypeName: string = "tfs.labelTextControl";

    private _data: ILabelData;
    private _linkSetting: LinkSetting;
    private _params: {[key: string]: ILabelParam};
    private _a: JQuery;

    /**
     * Creates new text Control. This is the text element portion of a
     * Label.  It can contain a mixture of text and a link.  For example,
     * <Text><Link UrlRoot="@ReportManagerUrl" />ReportManager</Text>
     */
    constructor(options?: ILabelTextControlOptions) {
        super(options);
    }

    public initializeOptions(options?: ILabelTextControlOptions) {
        super.initializeOptions({
            coreCssClass: "label-text-control",
            ...options
        });
    }

    public initialize() {
        this._data = this._options.textData;

        // if the element contains a link then we need to break the out the link
        if (this._data.link) {
            this._linkSetting = new LinkSetting({ link: this._data.link });
            if (Array.isArray(this._data.link.params) && this._data.link.params.length) {
                this._params = {};
                for (const p of this._data.link.params) {
                    this._params[p.value] = p;
                }
            }
        }

        super.initialize();
        this._draw();
    }

    public setUrl(workItem: WITOM.WorkItem, resourceLocations: {[macro: string]: string}) {
        /// Update the url if one exists
        if (this._a) {
            this._a.attr("href", this._linkSetting.getUrl(workItem, resourceLocations));
        }
    }

    public needRefresh(changedFields: {[fieldRef: string]: WITOM.Field}) {
        const that = this;
        let result = false;

        if (this._params) {
            for (const fieldRef in changedFields) {
                const field = changedFields[fieldRef];
                if (field) {
                    const param = that._params[field.fieldDefinition.name] || that._params[field.fieldDefinition.referenceName];
                    if (param && !param.original) {
                        result = true;
                        return false;
                    }
                }
            }
        }

        return result;
    }

    private _draw() {
        // if the label contained a link, then create an anchor tag
        if (this._data.link) {
            this._a = $("<a />").attr("href", "#").attr("target", "_blank").appendTo(this._element);

            // If a label exists, then set that as the text of the tag
            if (this._data.label) {
                this._data.label.appendTo(this._a);
            } else {
                this._a.text(this._data.content);
            }
        } else {
            // If no link is present then just add the text
            $("<span></span>").appendTo(this._element).text(this._data.content);
        }

    }
}

export interface IWorkItemLabelOptions extends IWorkItemControlOptions {
    suppressTooltip?: boolean;
}

export class WorkItemLabel {
    private _labelHost: JQuery;
    private _options: IWorkItemLabelOptions;
    private _workItemType: WITOM.WorkItemType;
    private _textControls: LabelTextControl[];
    private _workItem: WITOM.WorkItem;
    private _workItemChangedDelegate: IEventHandler;
    private _$label: JQuery;
    private _$screenReaderLabel: JQuery;

    constructor(labelHost: JQuery, options?: IWorkItemLabelOptions, workItemType?: WITOM.WorkItemType) {
        this._options = options;
        this._workItemType = workItemType;
        this._labelHost = labelHost;

        this.initialize();
    }

    public initialize() {
        this._textControls = [];

        if (this._shouldCreateLabel()) {
            this._createLabel();
        }

        // If label data is present, then need to break up the data into the
        // individual text elements.  Each element may contain text, a link or both
        if (this._options.labelData) {
            this._labelHost.css("display", "inherit");

            // create control for each part of the label
            for (const labelData of this._options.labelData) {
                if (this._$label) {
                    labelData.label = this._$label;
                }
                const options: ILabelTextControlOptions = {
                    textData: labelData,
                };
                this._textControls.push(<LabelTextControl>Controls.BaseControl.createIn(LabelTextControl, this._labelHost, options));
            }
        }
    }

    public bind(workItem: WITOM.WorkItem) {
        const that = this;
        this._workItem = workItem;

        // only create change listener if we have labelData
        if (this._options.labelData) {
            // We may need to update links depending on what changed in the work item
            this._workItemChangedDelegate = (sender: WITOM.WorkItem, args: WITOM.IWorkItemChangedArgs) => {
                let invalidate = false;

                if (args.change === WorkItemChangeType.Saved) {
                    invalidate = true;
                } else if (args.change === WorkItemChangeType.FieldChange) {
                    for (const textControl of that._textControls) {
                        if (textControl.needRefresh(args.changedFields)) {
                            invalidate = true;
                            break;
                        }
                    }
                }

                if (invalidate) {
                    that.invalidate();
                }
            };

            workItem.attachWorkItemChanged(this._workItemChangedDelegate);
        }
    }

    public unbind() {
        if (this._workItemChangedDelegate) {
            this._workItem.detachWorkItemChanged(this._workItemChangedDelegate);
            delete this._workItemChangedDelegate;
        }
    }

    public invalidate() {
        const that = this;
        const resourceLocations = this._workItem.project.extras.resourceLocations;

        // Need to attempt to update all links
        if (this._workItem && this._textControls) {
            for (const control of this._textControls) {
                control.setUrl(that._workItem, resourceLocations);
            }
        }
    }

    private _shouldCreateLabel(): boolean {
        let labelDataContentExists = false;
        if (this._options.labelData) {
            for (const labelData of this._options.labelData) {
                if (labelData.content) {
                    labelDataContentExists = true;
                    break;
                }
            }
        }

        // if label attribute exist and there is no labelText content (except link), return true
        return this._options.label && this._workItemType && !labelDataContentExists;
    }

    private getLabelData() {
        let label = this._options.label;
        let labelText: string;
        let accessKey: string;
        if (label) {
            const pos = label.indexOf("&");

            if (pos >= 0) {
                accessKey = label.substr(pos + 1, 1);
                labelText = label.replace("&", "");
                label = Utils_String.htmlEncode(label.substr(0, pos)) + "<u>" + Utils_String.htmlEncode(label.substr(pos + 1, 1)) + "</u>" + Utils_String.htmlEncode(label.substr(pos + 2));
            } else {
                labelText = label;
                label = Utils_String.htmlEncode(label);
            }
        }
        return {
            labelText,
            label,
            accessKey
        };
    }

    private _createLabel() {
        let fieldDef: WITOM.FieldDefinition;
        const { labelText, label, accessKey } = this.getLabelData();

        if (this._options.labelData) {
            this._$label = $("<span/>");
        } else {
            this._$label = $("<label/>").addClass("workitemcontrol-label");
        }
        this._$label.attr({
            "for": this._options.controlId + "_txt"
        }).html(label);

        if (this._options.labelFontSize) {
            this._$label.addClass("wit-font-size-" + this._options.labelFontSize);
        }

        if (this._options.fieldName) {
            fieldDef = this._workItemType.getFieldDefinition(this._options.fieldName);

            if (fieldDef && !this._options.suppressTooltip) { // suppressTooltip options specified in WorkItemControlAdapaterComponent for case like on mobile form.
                const tooltip = $("<span/>")
                    .append($("<span/>").text(fieldDef.helpText))
                    .append($("<br>"))
                    .append($("<span/>").text(Utils_String.format(WorkItemTrackingResources.WorkItemFieldLabelTitleFormat, fieldDef.name)));
                RichContentTooltip.add(tooltip, this._$label);
            }
        }

        if (accessKey) {
            this._$label.attr({
                "accesskey": accessKey,
                "aria-label": null
            });
        }
        this._labelHost.append(this._$label);
    }

    public setFieldIsValid(valid: boolean) {
        const { labelText } = this.getLabelData();
        if (this._$screenReaderLabel) {
            if (valid) {
                this._$screenReaderLabel.text(labelText);
            } else {
                const errorLabel = Utils_String.format(WITResources.FieldErrorAriaLabel, labelText);
                this._$screenReaderLabel.text(errorLabel);
            }
        }
    }
}

export class LabelControl extends WorkItemControl {
    constructor(container: JQuery, options?: IWorkItemLabelOptions, workItemType?: WITOM.WorkItemType) {
        super(container, options, workItemType);
    }
}
