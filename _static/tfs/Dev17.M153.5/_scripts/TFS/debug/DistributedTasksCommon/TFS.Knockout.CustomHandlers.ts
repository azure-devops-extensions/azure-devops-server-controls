import ko = require("knockout");

import Adapters_Knockout = require("VSS/Adapters/Knockout");
import { registerSecureBinding } from "DistributedTasksCommon/TFS.Knockout.Secure";
import * as Tree_NO_REQUIRE from "DistributedTasksCommon/TFS.Knockout.Tree";
import * as TreeView_NO_REQUIRE from "DistributedTasksCommon/TFS.Knockout.Tree.TreeView";
import TaskUtils = require("DistributedTasksCommon/TFS.Tasks.Utils");
import TasksEditor = require("DistributedTasksCommon/TFS.Tasks.TasksEditor");
import Utils_UI = require("VSS/Utils/UI");
import Utils_Html = require("VSS/Utils/Html");
import Controls = require("VSS/Controls");
import VSSControlsCombos = require("VSS/Controls/Combos");
import { RichContentTooltip, IRichContentTooltipOptions } from "VSS/Controls/PopupContent";
import Splitter = require("VSS/Controls/Splitter");
import { format, localeComparer as stringLocaleComparer } from "VSS/Utils/String";
import * as Utils_String from "VSS/Utils/String";
import VSS = require("VSS/VSS");
import Resources = require("DistributedTasksCommon/Resources/TFS.Resources.DistributedTasksLibrary");
import DistributedTaskContracts = require("TFS/DistributedTask/Contracts");
import { FetchingCombo } from "DistributedTasksCommon/TFS.Tasks.Controls";

export class PinPosition {
    public static Left: number = 1;
    public static Right: number = 2;
}

export function initKnockoutHandlers(secure: boolean = true) {
    // To comply with CSP https://vsowiki.com/index.php?title=Content_Security_Policy_(CSP)
    secure && registerSecureBinding();

    /**
     * Applies knockout template
     * templateName - name of the template - script ID
     * viewmodel - Viewmodel to apply bindings for
     * customData - optional - adds the data to viewmodel through new $vmcustom property
     * cssClass - optional - css class for binded element
     * parentIndex - optional - grabs parent from knockout's $parents context at the specified index and adds to viewmodel through $vmparent property
     * By default exposes binding context's root via $vmroot property of viewmodel
     */
    ko.bindingHandlers["applyTemplate"] = {
        init: function (element: JQuery, valueAccessor: () => any, allBindingsAccessor: () => any, viewModel: any, bindingContext: KnockoutBindingContext) {
            return { controlsDescendantBindings: true };
        },
        update: function (element: JQuery, valueAccessor: () => any, allBindingsAccessor: () => any, viewModel: any, bindingContext: KnockoutBindingContext) {
            var control = $(element);
            var value: {
                templateName: string;
                viewModel: any;
                customData?: any;
                cssClass?: string;
                parentIndex?: string;
                fadeIn: any
            } = valueAccessor();

            if (value) {
                // See we have a registered template control to instantiate with the specified template name
                var templateControl = Adapters_Knockout.TemplateControl.applyRegisteredBinding(value.templateName, control, value.viewModel);
                if (!templateControl) {
                    // Fall back to default initialization
                    control.removeAttr("data-bind");
                    var templateName = ko.utils.unwrapObservable(value.templateName);
                    if (templateName) {
                        control.attr("data-bind", "template: { name: '" + templateName + "' }");
                    }

                    if (value.cssClass) {
                        control.addClass(value.cssClass);
                    }

                    var itemVm = value.viewModel;
                    if (value.parentIndex) {
                        // so that parent context can be used if required
                        itemVm.$vmparent = bindingContext.$parents[parseInt(value.parentIndex)];
                    }
                    if (value.customData) {
                        // make the data available to vm through $vmcustom variable
                        itemVm.$vmcustom = value.customData;
                    }
                    itemVm.$vmroot = bindingContext.$root;
                    ko.cleanNode(control[0]);
                    ko.applyBindings(itemVm, control[0]);
                    if (value.fadeIn) {
                        control.hide().fadeIn('slow');
                    }
                }
            }
        }
    };

    /**
     * Shows tooltip
     * text - tooltip text to display - knockoutobservable or just string
     * rootCssClass - optional - root css class that would be used to further determine width and left offset, defaults to  "taskeditor-inputs-grid-table"
     * pivotSiblingCssClass - optional - element for with the pop up would appear, this element has to be a sibling
     * unsetDefaultLeftOffset - optional - defaults to false
     */
    ko.bindingHandlers["showTooltip"] = {
        init: function (element: JQuery, valueAccessor: () => any, allBindingsAccessor: () => any, viewModel: any, bindingContext: KnockoutBindingContext) {
            return { controlsDescendantBindings: true };
        },
        update: function (element: JQuery, valueAccessor: () => any, allBindingsAccessor: () => any, viewModel: any, bindingContext: KnockoutBindingContext) {
            var control = $(element);
            var TIP_DATA_KEY = "TaskEditorToolTipKey";
            var marginTop = 4;
            var value: {
                text: any;
                labelledby?: string;
                rootCssClass?: string;
                pivotSiblingCssClass?: string;
                unsetDefaultLeftOffset?: boolean;
                minWidth?: number;
                pinToPivot?: boolean;
                pinPosition?: number;
                className?: string;
                leftOffset?: number;
            } = valueAccessor();
            if (value && value.text) {
                if (control.data(TIP_DATA_KEY)) {
                    // tip already initialized
                    return;
                }

                var rootCssClass = value.rootCssClass || "taskeditor-inputs-grid-table";
                var text = value.text;
                if (!ko.isObservable(text)) {
                    text = ko.observable(value.text);
                }
                if (!text()) {
                    return;
                }
                var documentClickHandler: JQueryEventHandler;

                var helpSpanElement = $(format(`<span class="{0}"></span>`, value.className ? value.className : "help bowtie-icon bowtie-status-info-outline")).attr({"tabindex": "0", "role": "tooltip"});
                var helpCloseElement = $(format(`<span class="close bowtie-icon bowtie-navigate-close" aria-label="{0}"></span>`, Utils_String.htmlEncode(Resources.CloseTooltipText))).attr({ "tabindex": "0", "role": "button" });
                helpCloseElement.on("keydown", (event: JQueryEventObject) => {
                    return TaskUtils.AccessibilityHelper.triggerClickOnEnterOrSpaceKeyPress(event);
                });

                var tipContentElement = $('<div />').addClass('content').html(Utils_Html.HtmlNormalizer.normalize(text()));

                if(tipContentElement.length > 0 && tipContentElement[0].outerText) {
                    helpSpanElement.attr("aria-label", tipContentElement[0].outerText);
                }

                if (value.labelledby) {
                    helpSpanElement.attr("aria-labelledby", value.labelledby);
                }

                var tipElement = $('<div />').addClass('taskeditor-help-tooltip').append(helpCloseElement).append(tipContentElement);

                var tipElementToHide = $(document).data(TIP_DATA_KEY);
                var hideExistingTip = () => {
                    $(document).off("click.TaskEditorToolTipKey");
                    $(document).on("click.TaskEditorToolTipKey", documentClickHandler = (event: JQueryEventObject) => {
                        hideExistingTip();
                    });
                    var tip = $(document).data(TIP_DATA_KEY);
                    if (tip && tip.length > 0) {
                        tip.hide('fast');
                    }
                };
                var hoverTimeOutSetting;
                let pivotElement: JQuery = null;

                var showToolTip = () => {
                    hoverTimeOutSetting = setTimeout(() => {
                        hideExistingTip();
                        var rootParents = control.parents("." + rootCssClass);
                        var jElement = $(element);
                        var previousSiblings = [];
                        var width = -1;
                        if (value.pivotSiblingCssClass) {
                            pivotElement = jElement.parent().find("." + value.pivotSiblingCssClass);
                            if (pivotElement.length > 0) {
                                previousSiblings = pivotElement.prevAll().toArray();
                                width = pivotElement.width();
                            }
                        }
                        if (previousSiblings.length === 0 && !value.unsetDefaultLeftOffset) {
                            previousSiblings = control.prevAll().toArray();
                        }

                        if (width === -1) {
                            var immediateLeftSibling = previousSiblings.splice(0, 1);
                            // determine width
                            if (immediateLeftSibling && immediateLeftSibling.length > 0) {
                                width = immediateLeftSibling[0].clientWidth;
                            }
                            else {
                                width = 300;
                            }
                        }

                        if (value.minWidth && value.minWidth > width) {
                            width = value.minWidth;
                        }

                        if (value.pinToPivot && pivotElement.length > 0) {
                            if (value.pinPosition === PinPosition.Right) {
                                tipElement.css('right', pivotElement[0].clientLeft + pivotElement[0].clientWidth);
                            }
                            else {
                                tipElement.css('left', pivotElement[0].clientLeft);
                            }
                        }
                        else if (value.leftOffset) {
                            tipElement.css('left', value.leftOffset + 'px');
                            tipElement.css('width', width + 'px');
                        }
                        else {
                            // determine left offset - effectively client widths of all previous siblings excluding the immediateleftsibling
                            var leftOffSet = 0;
                            $.each(previousSiblings, (index, element: Element) => {
                                leftOffSet += element.clientWidth;
                            });

                            // determine margin-top, default to 4, if there this is textarea's tooltip, adjust accordingly
                            var textArea = control.prevAll().find('textarea');
                            if (textArea.length > 0) {
                                marginTop = textArea[0].clientHeight - 15;
                            }
                            // extra offsets to adjust according to padding setting
                            var padding = parseInt(control.css('padding').replace("px", "")) || 0;
                            if (padding === 0) {
                                // in some browsers, css padding just return empty, fall back to the method that works for all if padding is set
                                var controlFullWidth = control.outerWidth(); // width inculuding padding
                                var controlWidth = control.width();
                                if (controlWidth && controlFullWidth) {
                                    padding = (controlFullWidth - controlWidth) / 2; // get one sided padding
                                }
                            }

                            tipElement.css('left', (leftOffSet + padding) + 'px');
                            tipElement.css('width', (width - 2 * padding) + 'px');
                        }

                        tipElement.css('margin-top', marginTop + 'px');
                        tipElement.show("fast");
                        tipElement.find(".content").html(Utils_Html.HtmlNormalizer.normalize(text()));  // update text from observable                      

                        $(document).data(TIP_DATA_KEY, tipElement);

                    }, 450);
                };

                var hideToolTip = () => {
                    clearTimeout(hoverTimeOutSetting);
                    hideExistingTip();
                    helpSpanElement.focus();
                    return false;
                };

                helpCloseElement.click(() => {
                    hideToolTip();
                });

                helpSpanElement.click(() => {
                    showToolTip();
                });

                helpSpanElement.keydown((event: JQueryEventObject) => {
                    return TaskUtils.AccessibilityHelper.triggerClickOnEnterOrSpaceKeyPress(event);
                });

                helpCloseElement.blur(() => {
                    hideToolTip();
                });

                control.append(helpSpanElement).append(tipElement);
                control.data(TIP_DATA_KEY, { text: text });

                ko.utils.domNodeDisposal.addDisposeCallback(control[0], () => {
                    $(document).off("click.TaskEditorToolTipKey");
                });
            }
        }
    };

    ko.bindingHandlers["showRichContentTooltip"] = {
        init: function (element: JQuery, valueAccessor: () => any, allBindingsAccessor: () => any, viewModel: any, bindingContext: KnockoutBindingContext): void {
            return;
        },
        update: function (element: JQuery, valueAccessor: () => any, allBindingsAccessor: () => any, viewModel: any, bindingContext: KnockoutBindingContext) {
            let control = $(element);
            let value: any = valueAccessor();

            if (value && value.text) {
                let text = value.text;
                if (ko.isObservable(text)) {
                    text = text();
                }

                let tooltipOptions: IRichContentTooltipOptions = { popupTag: false, ...value };
                if (value.showTooltipIfOverflowOnly){
                    tooltipOptions = { onlyShowWhenOverflows: control, ...tooltipOptions };
                }

                RmTooltipHost.bindTooltip(control, text, tooltipOptions);
            }
        }
    };
    
    ko.bindingHandlers["dtcCombo"] = {
        init: function (element: JQuery, valueAccessor: () => any, allBindingsAccessor: () => any, viewModel: any, bindingContext: KnockoutBindingContext) {
            let combo = Controls.Control.create(VSSControlsCombos.Combo, $(element), valueAccessor());
            $(element).data("dtcCombo-control", combo);
        },
        update: function (element: JQuery, valueAccessor: () => any, allBindingsAccessor: () => any, viewModel: any, bindingContext: KnockoutBindingContext) {
            let options: VSSControlsCombos.IComboOptions = valueAccessor();
            let combo = <VSSControlsCombos.Combo>$(element).data("dtcCombo-control");
            if (combo && options) {
                combo.setSource(options.source);

                if (options.value) {
                    combo.setInputText(options.value, false);
                }

                combo.setEnabled(options.enabled);
            }
        }
    };

    ko.bindingHandlers["dtcFetchingCombo"] = {
        init: function (element: JQuery, valueAccessor: () => any, allBindingsAccessor: () => any, viewModel: any, bindingContext: KnockoutBindingContext) {
            let fetchingCombo = Controls.Control.create(FetchingCombo, $(element), valueAccessor());
            $(element).data("dtcFetchingCombo-control", fetchingCombo);
        },
        update: function (element: JQuery, valueAccessor: () => any, allBindingsAccessor: () => any, viewModel: any, bindingContext: KnockoutBindingContext) {
            let options: VSSControlsCombos.IComboOptions = valueAccessor();
            let combo = <VSSControlsCombos.Combo>$(element).data("dtcFetchingCombo-control");
            if (combo && options) {
                combo.setSource(options.source);

                if (options.value) {
                    combo.setInputText(options.value, false);
                }

                combo.setEnabled(options.enabled);
            }
        }
    };

    ko.bindingHandlers["taskEditorGroup"] = {
        init: function (element: JQuery, valueAccessor: () => any, allBindingsAccessor: () => any, viewModel: any, bindingContext: KnockoutBindingContext) {
            return { controlsDescendantBindings: true };
        },
        update: function (element: JQuery, valueAccessor: () => any, allBindingsAccessor: () => any, viewModel: any, bindingContext: KnockoutBindingContext) {
            var control = $(element);
            var GROUP_DATA_KEY = "TaskEditorGroupKey";
            var tableCss = ".taskeditor-inputs-grid-table";
            var value: {
                viewModel: TasksEditor.GroupDefinitionVM;
            } = valueAccessor();
            if (value) {
                var groupVM = value.viewModel;

                if (control.data(GROUP_DATA_KEY)) {
                    // group already initialized                    
                    return;
                }

                var varibleSet = control.find(tableCss);
                if (!groupVM.isExpanded.peek()) {
                    // toggle intially to collapse
                    varibleSet.toggle();
                }
                control.find('.fieldset').find("legend").click((event: JQueryEventObject) => {
                    var isExpanded = groupVM.isExpanded;
                    varibleSet.toggle();
                    isExpanded(!isExpanded.peek());
                    if (!!isExpanded()) {
                        var firstFocusable = $(event.target).closest(".taskeditor-group").find(":focusable")[0];
                        if (!!firstFocusable) {
                            firstFocusable.focus();
                        }
                    }
                });

                control.data(GROUP_DATA_KEY, {});
                // apply bindings to child by injecting required $parents
                var injectedVM: any = groupVM;
                injectedVM.$parent = bindingContext.$parent;
                injectedVM.$parents = bindingContext.$parents;
                ko.applyBindingsToDescendants(groupVM, control[0]);
            }
        }
    };

    ko.bindingHandlers["expandGroupOnKeyBoardEvent"] = {
        init: function (element: JQuery, valueAccessor: () => any, allBindingsAccessor: () => any, viewModel: any, bindingContext: KnockoutBindingContext) {
            element = $(element);
            element.keydown((event: JQueryEventObject) => {
                var key = event.which;
                var legend = $(event.target).find('.fieldset').find('legend');
                if (legend.length == 0) {
                    return; //no-op
                }
                if (key === Utils_UI.KeyCode.ENTER || key === Utils_UI.KeyCode.SPACE) {
                    legend.click();
                }
            });
        },
        update: function (element: JQuery, valueAccessor: () => any, allBindingsAccessor: () => any, viewModel: any, bindingContext: KnockoutBindingContext) {

        }
    };

    ko.bindingHandlers["tfsSplitter"] = {
        init: function (element: JQuery, valueAccessor: () => any, allBindingsAccessor: () => any, viewModel: any, bindingContext: KnockoutBindingContext) {
            let value: {
                options: Splitter.ISplitterOptions;
            } = valueAccessor();

            let options = {};
            if (value && value.options) {
                options = value.options;
            }

            <Splitter.Splitter>Controls.Enhancement.enhance(Splitter.Splitter, element, options);
        }
    };

    ko.bindingHandlers["hover"] = {
        init: function (element: JQuery, valueAccessor: () => any, allBindingsAccessor: () => any, viewModel: any, bindingContext: KnockoutBindingContext) {
            var target = $(element);
            var options: any = valueAccessor();
            target.hover(
                (eventObject: JQueryEventObject) => {
                    target.addClass(options.hoverClass);
                },
                (eventObject: JQueryEventObject) => {
                    target.removeClass(options.hoverClass);
                });
        }
    };

    ko.bindingHandlers["renderTreeView"] = {
        init: function (element: HTMLElement, valueAccessor: () => any, allBindingsAccessor: () => any, viewModel: any, bindingContext: KnockoutBindingContext) {
            return { controlsDescendantBindings: true };
        },
        update: function (element: HTMLElement, valueAccessor: () => any, allBindingsAccessor: () => any, viewModel: TreeView_NO_REQUIRE.TreeView, bindingContext: KnockoutBindingContext) {
            let target = $(element);
            let options: ITreeViewOptions = valueAccessor();
            VSS.using(["DistributedTasksCommon/TFS.Knockout.Tree.TreeView"], (_TreeView: typeof TreeView_NO_REQUIRE) => {
                const CONTROL_DATA_KEY = "Knockout_TreeView_Control";
                const SUBSCRIPTION_DATA_KEY = "Knockout_TreeView_Subscription";
                let target = $(element);
                let options: ITreeViewOptions = valueAccessor();
                VSS.using(["DistributedTasksCommon/TFS.Knockout.Tree.TreeView"], (_TreeView: typeof TreeView_NO_REQUIRE) => {
                    const nodes = getTreeViewNodes(ko.utils.unwrapObservable(options.treeNodes));
                    const treeOptions = {
                        nodes: nodes,
                        onClick: (node: TreeView_NO_REQUIRE.KnockoutTreeNode, args: JQueryEventObject) => {
                            // bind viewModel to "this"
                            options.onNodeClick.call(viewModel, node.tag, args);
                        },
                        onItemToggle: (node: TreeView_NO_REQUIRE.KnockoutTreeNode): void => {
                            // If we have an onToggle() callback, invoke it
                            var tag = node.tag;
                            if ($.isFunction(tag.onItemToggle)) {
                                let updated: boolean = <boolean>tag.onItemToggle.call(this);
                                if (updated) {
                                    // The nodes underneath must reflect the latest changes as a result of callback
                                    const inodes = getTreeViewNodes(ko.utils.unwrapObservable(tag.nodes));
                                    node.children = inodes;
                                }
                            }
                        },
                        ...options
                    } as TreeView_NO_REQUIRE.ITreeViewOptions;

                    let treeView: TreeView_NO_REQUIRE.TreeView = target.data(CONTROL_DATA_KEY);
                    if (!treeView) {
                        // ensure we just render it once
                        treeView = <TreeView_NO_REQUIRE.TreeView>Controls.create(_TreeView.TreeView, target, treeOptions);
                        target.data(CONTROL_DATA_KEY, treeView);
                    }

                    let subscription: IDisposable = target.data(SUBSCRIPTION_DATA_KEY);
                    if (!subscription) {
                        // ensure we create subscription only once
                        // react to treeNode observable updates, you would think template "update" gets called as the observable changes..but no
                        // so..hook up to it
                        subscription = options.treeNodes.subscribe((newNodes) => {
                            treeView && treeView.setNodes(getTreeViewNodes(newNodes));
                        });
                        target.data(SUBSCRIPTION_DATA_KEY, subscription)
                    }

                    ko.utils.domNodeDisposal.addDisposeCallback(target[0], () => {
                        const subscription: IDisposable = target.data(SUBSCRIPTION_DATA_KEY);
                        if (subscription) {
                            subscription.dispose();
                        }

                        treeView.dispose();
                    });
                });
            });
        }
    };

}

export interface ITreeViewOptions extends TreeView_NO_REQUIRE.ITreeViewOptions {
    onNodeClick: (target: Tree_NO_REQUIRE.ITreeNode, args: JQueryEventObject) => void;
    treeNodes: KnockoutObservableArray<Tree_NO_REQUIRE.ITreeNode>
}

export function getTreeViewNodes(treeNodes: Tree_NO_REQUIRE.ITreeNode[]): TreeView_NO_REQUIRE.KnockoutTreeNode[] {
    return (treeNodes || []).map((treeNode, index) => {
        let text = treeNode.text.peek();
        let id = treeNode.id ? treeNode.id.peek() : "";
        // fallback logic to get the id, id should never start with a number, id shouldn't contain any colons or periods or spaces
        // id is important for platform control to fire up the popupmenu
        id = id || ("treeNode" + index + text.replace(/[\.\: ]/g, "_"));
        let treeViewNode = new TreeView_NO_REQUIRE.KnockoutTreeNode(id, text, treeNode.cssClass.peek());
        treeViewNode.expanded = treeNode.expanded.peek();
        treeViewNode.selected = treeNode.selected.peek();
        treeViewNode.noTreeIcon = !treeNode.showIcon.peek();
        treeViewNode.icon = treeNode.nodeIconCssClass.peek();
        treeViewNode.tag = treeNode;
        treeViewNode.templateName = treeNode.templateName ? treeNode.templateName.peek() : "";
        treeViewNode.ariaLabel = treeNode.ariaLabel ? treeNode.ariaLabel.peek() : "";

        if (treeNode.getContributionContext) {
            treeViewNode.getContributionContext = treeNode.getContributionContext;
        }

        let childTreeNodes = treeNode.nodes.peek();

        if (childTreeNodes.length > 0) {
            treeViewNode.addRange(getTreeViewNodes(childTreeNodes));
        }

        return treeViewNode;
    });
}

export class RmTooltipHost {
    public static bindTooltip(control: JQuery, text: string, tooltipOptions: IRichContentTooltipOptions){
        if(control) {
            control.on("mouseover focusin", (e) => {
                RmTooltipHost._onMouseOver($(e.currentTarget), text, tooltipOptions);
            });

            control.on("mouseout focusout", (e) => {
                RmTooltipHost._onMouseOut($(e.currentTarget));
            });
        }
    }

    private static _onMouseOver($tooltipElement: JQuery, text: string, tooltipOptions: IRichContentTooltipOptions): any {
        let tooltipText = text;
        if (tooltipText) {
            // Store any existing title to use with tooltip and then remove it
            $tooltipElement.removeAttr("title").data("tooltip-text", tooltipText);
        }

        if ($tooltipElement.length > 0) {
            // Ensure single tooltip
            if (this._tooltip) {
                this._tooltip.dispose();
            }

            this._tooltip = RichContentTooltip.add(tooltipText, $tooltipElement, { ...tooltipOptions});
            this._tooltip.showDelayed();
        }
    }

    private static _onMouseOut(e: JQuery): any {
        if (this._tooltip) {
            this._tooltip.disable();
        }
    }

    private static _tooltip: RichContentTooltip;
}


// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Knockout.CustomHandlers", exports);