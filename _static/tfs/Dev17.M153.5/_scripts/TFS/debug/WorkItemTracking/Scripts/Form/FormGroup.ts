import * as WITResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import * as UtilsUI from "VSS/Utils/UI";
import * as UtilsString from "VSS/Utils/String";
import * as Controls from "VSS/Controls";
import * as Models from "WorkItemTracking/Scripts/Form/Models";
import * as Panels from "VSS/Controls/Panels";
import { WitFormModeUtility } from "WorkItemTracking/Scripts/Utils/WitControlMode";
import * as WorkItemTrackingResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import { WIFormCIDataHelper } from "WorkItemTracking/Scripts/Utils/WIFormCIDataHelper";
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import { ILayoutControl } from "WorkItemTracking/Scripts/Form/Layout";

const domElem = UtilsUI.domElem;
/**
 * This interface indicates that a workitemcontrol supports the In-Place maximization that the new
 * form groups support. In-Place maximization means that the parent will not be detached from the dom.
 * It will just change its layout to absolute postioning and ask its children to grow with it.
 */
export interface IInPlaceMaximizableControl {
    /**
     * Maximizes a workitem control inside of its parent which is absolutely positioned
     * This is used when the parent FormGroup maximizes and asks its children to match. The child should
     * update its layout to become
     *  { position:absolute; top:top; bottom:0; height:100%; width: 100%; }
     * @param top The top offset of the child to use when absolutely positioning themselves.
     */
    maximizeInPlace(top: number);

    /**
     * Restores a control that was maximized in place
     */
    restoreInPlace();
}

export interface IFormGroupOptions {
    model: Models.IGroup;
    isMaximizable: boolean;
    isCollapsible: boolean;
    hasTooltip: boolean;
    onToggleCallback: IResultCallback;
}

export class FormGroup extends Controls.Control<IFormGroupOptions> {
    private static FORM_GROUP_HEADER_CLASS = "wit-form-group-header";
    private static MAXIMIZE_GROUP_CLASS = "workitem-group-maximize";
    private static RESTORE_GROUP_CLASS = "workitem-group-restore";
    private static MAXIMIZE_ICON_CLASS = "bowtie-view-full-screen";
    private static RESTORE_ICON_CLASS = "bowtie-view-full-screen-exit";
    public static readonly COLLAPSABLE_HEADER_CLASS = "tfs-collapsible-text";

    public model: Models.IGroup;
    private _collapsibleGroup: Panels.CollapsiblePanel;
    private _screenReaderText: JQuery;
    private _collapsibleHeaderText: JQuery;
    private _isMaximized: boolean;
    private _isMaximizable: boolean;
    private _isCollapsible: boolean;
    private _hasTooltip: boolean;
    private _maximizeButton: JQuery;
    private _groupElement: JQuery;
    private _fireToggleEvent: boolean;
    private _headerTitleElement: JQuery;
    private _headerContainer: JQuery;

    constructor(options?: IFormGroupOptions) {
        super(options);
    }

    public initializeOptions(options?: IFormGroupOptions) {
        super.initializeOptions($.extend({
            coreCssClass: "grid-group-container",
        }, options));
    }

    public appendContent(element: string | JQuery | Function) {
        this._collapsibleGroup.appendContent(element);
    }

    public initialize() {
        this.model = this._options.model;
        this._isMaximizable = this._options.isMaximizable;
        this._isCollapsible = this._options.isCollapsible;
        this._hasTooltip = this._options.hasTooltip;
        this._fireToggleEvent = true;

        this._collapsibleGroup = <Panels.CollapsiblePanel>Controls.BaseControl.createIn(Panels.CollapsiblePanel, this._element, {
            cssClass: "grid-group",
            collapsed: false,
            headerCss: FormGroup.FORM_GROUP_HEADER_CLASS,
            iconCollapseCss: "bowtie-icon bowtie-chevron-down",
            iconExpandCss: "bowtie-icon bowtie-chevron-up",
            headerNotFocusable: true,
            onToggleCallback: (isExpanded: boolean) => {
                this._collapsibleHeaderText.attr("aria-expanded", String(isExpanded));
                WIFormCIDataHelper.groupPanelCollapsed(isExpanded, { groupName: this.model.label });
                if ($.isFunction(this._options.onToggleCallback)) {
                    this._options.onToggleCallback(isExpanded);
                }

                if (this._headerTitleElement) {
                    const ariaLabel = UtilsString.format(isExpanded ? WITResources.FormGroupCollapseAriaLabel : WITResources.FormGroupExpandAriaLabel, this.model.label);
                    this._headerTitleElement.attr("aria-label", ariaLabel);
                }

                this._groupElement.toggleClass("collapsed", !isExpanded);
            }
        });

        if (this._isMaximizable) {
            this._collapsibleGroup.prependHeader(this._createMaximizableButton());
        }

        this._collapsibleHeaderText = this._createHeaderElement();
        this._collapsibleGroup.prependHeader(this._collapsibleHeaderText);
        this._collapsibleGroup.setDisabled(!this._isCollapsible);

        // Handling focus events triggered from child control
        this._groupElement = this._element.find(".grid-group");
        this._groupElement.focusin(() => {
            this._groupElement.addClass("focus");
        });
        this._groupElement.focusout(() => {
            this._groupElement.removeClass("focus");
        });

    }

    private _createHeaderElement(): JQuery {
        const options = (this.model.controls && this.model.controls.length) ? (<ILayoutControl>this.model.controls[0]).controlOptions : null;

        this._headerTitleElement = $("<span />")
            .attr({
                "role": "button",
                "aria-label": UtilsString.format(WITResources.FormGroupCollapseAriaLabel, this.model.label)
            })
            .data("wit-options", options)
            .uniqueId()
            .text(this.model.label);

        if (this._hasTooltip) {
            this._headerTitleElement.data("wit-options", options)
                .addClass("headerlabel");
        }

        // headers can't have aria-labels
        this._screenReaderText = $("<div />")
            .attr({
                "role": "heading",
                "aria-level": 2,
                "class": "screenreader"
            })
            .uniqueId()
            .text(this.model.label);

        this._headerContainer = $("<span />")
            .addClass(FormGroup.COLLAPSABLE_HEADER_CLASS)
            .attr({
                "tabIndex": 0,
                "aria-labelledby": this._headerTitleElement.attr("id")
            })
            .focus(() => {
                this._collapsibleHeaderText.closest(".tfs-collapsible-header").addClass("focus");
            })
            .blur(() => {
                this._collapsibleHeaderText.closest(".tfs-collapsible-header").removeClass("focus");
            })
            .keydown((e: JQueryKeyEventObject) => {
                if ((e.keyCode === UtilsUI.KeyCode.ENTER || e.keyCode === UtilsUI.KeyCode.SPACE)
                    && !UtilsUI.KeyUtils.isModifierKey(e)) {
                    return this._collapsibleGroup.toggleExpandedState();
                }
            });

        this._headerContainer.append(this._screenReaderText);
        this._headerContainer.append(this._headerTitleElement);

        return this._headerContainer;
    }

    public setIsValid(valid: boolean) {
        this._headerContainer.toggleClass("invalid", !valid);
        if (valid) {
            this._screenReaderText.text(this.model.label);
        } else {
            const label = UtilsString.format(WITResources.GroupErrorAriaLabel, this.model.label);
            this._screenReaderText.text(label);
        }
    }

    public setIsHidden(hidden: boolean) {
        if (hidden) {
            this._element.hide();
        } else {
            this._element.show();
        }
    }

    public collapse() {
        this._groupElement.addClass("collapsed");

        // since this call is made programatically we suppress the collapse event
        // by setting this flag.
        this._fireToggleEvent = false;
        this._collapsibleGroup.collapse();

        // we reset the flag here, so that when the user clicks on collapse we fire
        // the collapse event
        this._fireToggleEvent = true;
    }

    public expand() {
        this._groupElement.removeClass("collapsed");

        // since this call is made programatically we suppress the collapse event
        // by setting this flag.
        this._fireToggleEvent = false;
        this._collapsibleGroup.expand();

        // we reset the flag here, so that when the user clicks on collapse we fire
        // the collapse event
        this._fireToggleEvent = true;
    }

    public isExpanded(): boolean {
        return this._collapsibleGroup.isExpanded();
    }

    public shouldFireToggleEvent(): boolean {
        return this._fireToggleEvent;
    }

    public getGroupId(): string {
        return this.model.id;
    }

    public maximize(placeFocusOnMaximizeButton: boolean) {
        if (this._isMaximized) {
            return;
        }

        const layoutNode = this._groupElement.parents(".witform-layout");

        layoutNode.addClass("workitem-form-grid-maximized-mode");
        this._groupElement.addClass("maximized-grid-group");

        // Call resize to make sure the responsive layout engine has a chance to react
        layoutNode.resize();

        this._isMaximized = true;

        const restoreText = UtilsString.format(WorkItemTrackingResources.RichEditorRestoreName, this.model.label);
        this._maximizeButton
            .removeClass(FormGroup.MAXIMIZE_GROUP_CLASS)
            .addClass(FormGroup.RESTORE_GROUP_CLASS)
            .attr("aria-label", restoreText);
        RichContentTooltip.add(restoreText, this._maximizeButton);

        this._maximizeButton.find(".bowtie-icon")
            .removeClass(FormGroup.MAXIMIZE_ICON_CLASS)
            .addClass(FormGroup.RESTORE_ICON_CLASS);

        this._collapsibleGroup.expand();
        this._collapsibleGroup.setDisabled(true);

        // Grab the header height and add a couple pixels to ensure proper spacing in full screen mode
        const headerHeight = this._groupElement.find("." + FormGroup.FORM_GROUP_HEADER_CLASS).outerHeight(true) + 5;
        const maximizableControl = <IInPlaceMaximizableControl>this._groupElement.find(".work-item-control:last").data("wit-control");
        if (maximizableControl.maximizeInPlace) {
            maximizableControl.maximizeInPlace(headerHeight);
        }

        // Hide other controls in the group (only label controls allowed)
        this._groupElement.find(".control:not(:last)").hide();
        if (placeFocusOnMaximizeButton) {
            this._maximizeButton.focus();
        }
        
    }

    public restore(placeFocusOnMaximizeButton?: boolean) {
        if (!this._isMaximized) {
            return;
        }

        const layoutNode = this._groupElement.parents(".witform-layout");

        layoutNode.removeClass("workitem-form-grid-maximized-mode"); // Will only be set if not in a dialog
        this._groupElement.removeClass("maximized-grid-group");

        // Call resize to make sure the responsive layout engine has a chance to react
        layoutNode.resize();

        this._isMaximized = false;

        const maximizeText = UtilsString.format(WorkItemTrackingResources.RichEditorMaximizeName, this.model.label);
        this._maximizeButton.removeClass(FormGroup.RESTORE_GROUP_CLASS)
            .addClass(FormGroup.MAXIMIZE_GROUP_CLASS)
            .attr("aria-label", maximizeText);
        RichContentTooltip.add(maximizeText, this._maximizeButton);

        this._maximizeButton.find(".bowtie-icon")
            .removeClass(FormGroup.RESTORE_ICON_CLASS)
            .addClass(FormGroup.MAXIMIZE_ICON_CLASS);

        this._collapsibleGroup.expand();
        this._collapsibleGroup.setDisabled(!this._isCollapsible);

        // When the group is not collapsible, the css style is not been overwritten
        if (this._isCollapsible) {
            // to make sure when restore from the maximize mode, the icons will show up when focused
            const $toggleIcon = this._groupElement.find(".tfs-collapsible-collapse.bowtie-icon");
            // In order not to take "display:none" from css file declaration as priority,
            // this removes the original style from css file
            $toggleIcon.css("display", "");
        }

        const maximizableControl = <IInPlaceMaximizableControl>this._groupElement.find(".work-item-control:last").data("wit-control");
        if (maximizableControl.restoreInPlace) {
            maximizableControl.restoreInPlace();
        }

        // Show other controls in the group (only label controls allowed)
        this._groupElement.find(".control:not(:last)").show();
        if (placeFocusOnMaximizeButton) {
            this._maximizeButton.focus();
        }
    }

    private _toggleMaximized(placeFocus: boolean) {
        if (this._isMaximizable) {
            if (this._isMaximized) {
                this.restore(placeFocus);
            } else {
                this.maximize(placeFocus);
            }
        }
    }

    private _createMaximizableButton(): JQuery {
        const _onClick = (e?: JQueryEventObject) => {
            this._toggleMaximized(false);
            return false;
        };

        const _onKeyPress = (e?: JQueryEventObject) => {
            if (e.keyCode === UtilsUI.KeyCode.ENTER) {
                this._toggleMaximized(true);
                return false;
            }
        };

        // This prevents the rich editor from losing focus
        // and shrinking, moving the maximize button
        // upwards and not triggering the click event
        const _onMouseDown = (e?: JQueryEventObject) => {
            e.preventDefault();
        };

        const maximizeIcon = $(domElem("div", "bowtie-icon " + FormGroup.MAXIMIZE_ICON_CLASS));
        const maximizeButton = $(domElem("button", "richeditor-toolbar-button " + FormGroup.MAXIMIZE_GROUP_CLASS)); // the maximize button is the container element for the icon

        const maximizeText = UtilsString.format(WorkItemTrackingResources.RichEditorMaximizeName, this.model.label);
        maximizeButton
            .bind("mousedown", _onMouseDown)
            .bind("click", _onClick)
            .bind("keypress", _onKeyPress)
            .focus(() => {
                this._groupElement.addClass("focus");
            })
            .blur(() => {
                if (this.isExpanded()) {
                    this._groupElement.removeClass("focus");
                }
            })
            .attr({
                "unselectable": "on",
                "aria-label": maximizeText
            })
            .append(maximizeIcon);
        RichContentTooltip.add(maximizeText, maximizeButton);

        this._maximizeButton = maximizeButton;

        return maximizeButton;
    }
}
