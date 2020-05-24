import VSS = require("VSS/VSS");
import Utils_Core = require("VSS/Utils/Core");
import { WorkItemControl, IWorkItemControlOptions } from "WorkItemTracking/Scripts/Controls/WorkItemForm/WorkItemControl";
import { WorkItemChangeType, PageSizes } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import { LinkSetting } from "WorkItemTracking/Scripts/Utils/LinkSetting";
import { IInPlaceMaximizableControl } from "WorkItemTracking/Scripts/Form/FormGroup";

const delegate = Utils_Core.delegate;

export interface IWebPageControlOptions extends IWorkItemControlOptions {
    link?: any;
    content?: any;
    reloadOnParamChange?: any;
}

export class WebpageControl extends WorkItemControl implements IInPlaceMaximizableControl {
    public _options: IWebPageControlOptions;
    private _iframeHost: any;
    private _pageHost: any;
    private _linkSetting: any;
    private _params: any;
    private _workItemChangedDelegate: any;

    constructor(container, options?, workItemType?) {
        super(container, options, workItemType);
    }

    public _init() {
        var i, len, p, link = this._options.link;

        super._init();

        this._linkSetting = new LinkSetting(this._options);

        // Creating host for the iframe
        this._iframeHost = $("<div class='webpagecontrol'>").appendTo(this._container);

        // If height is specified in WITD, applying it on the control
        if (this._options.height) {
            this._iframeHost.height(this._options.height);
        }

        if (link && $.isArray(link.params) && link.params.length) {
            this._params = {};
            for (i = 0, len = link.params.length; i < len; i++) {
                p = link.params[i];
                this._params[p.value] = p;
            }
        }
    }

    public bind(workItem, disabled?: boolean) {
        var self = this,
            params = this._params,
            reload = this._options.reloadOnParamChange;

        if (params) {

            this._workItemChangedDelegate = function (sender, args) {
                var invalidate = false;

                if (args.change === WorkItemChangeType.Saved) {
                    invalidate = true;
                }
                else if (reload && args.change === WorkItemChangeType.FieldChange) {
                    $.each(args.changedFields, function (fieldRef, field) {
                        if (field) {
                            var param = params[field.fieldDefinition.name] || params[field.fieldDefinition.referenceName];
                            if (param && !param.original) {
                                invalidate = true;
                                return false;
                            }
                        }
                    });
                }

                if (invalidate) {
                    self.invalidate(false);
                }
            };

            workItem.attachWorkItemChanged(this._workItemChangedDelegate);
        }

        super.bind(workItem, disabled);
    }

    public unbind() {
        var workItem = this._workItem;

        if (this._workItemChangedDelegate) {
            workItem.detachWorkItemChanged(this._workItemChangedDelegate);
            delete this._workItemChangedDelegate;
        }

        super.unbind();
    }

    public invalidate(flushing) {
        super.invalidate(flushing);

        if (!this._pageHost) {
            // Creating iframe
            this._pageHost = $("<iframe frameborder='0'/>").appendTo(this._iframeHost);
        }

        if (this._workItem) {
            if (this._options.link) {
                this._pageHost.attr("src", this._linkSetting.getUrl(this._workItem, this._workItem.project.extras.resourceLocations));
            }
            else if (this._options.content) {
                $(this._pageHost[0].contentWindow.document).ready(delegate(this, this.onDocumentReady));
            }
        }
    }

    public onDocumentReady() {
        this.setBodyContent();
    }

    public setBodyContent() {
        var $doc = this._pageHost[0].contentWindow.document;

        if ($doc.body) {
            $doc.body.innerHTML = this._options.content;
        }
        else {
            Utils_Core.delay(this, 100, this.setBodyContent);
        }
    }

    public clear() {
        if (this._pageHost) {
            this._pageHost.remove();
            delete this._pageHost;
        }
    }

    public maximizeInPlace(top: number) {
        this._container.find(".webpagecontrol").css("top", top);

    }

    public restoreInPlace() {
        this._container.find(".webpagecontrol").css("top", "");
    }
}

VSS.initClassPrototype(WebpageControl, {
    _iframeHost: null,
    _pageHost: null,
    _linkSetting: null,
    _params: null,
    _workItemChangedDelegate: null
});