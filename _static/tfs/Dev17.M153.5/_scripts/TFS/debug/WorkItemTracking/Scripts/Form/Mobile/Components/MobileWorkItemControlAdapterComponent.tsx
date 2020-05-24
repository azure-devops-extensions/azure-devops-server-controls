import Q = require("q");
import React = require("react");
import VSS = require("VSS/VSS");
import Diag = require("VSS/Diag");
import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";
import * as WITOM from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import * as WorkItemTrackingResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import { WorkItemControl } from "WorkItemTracking/Scripts/Controls/WorkItemForm/WorkItemControl";
import {
    beginGetWorkItemControl, IWorkItemControlPreview, beginGetPreviewComponent, RenderType
} from "WorkItemTracking/Scripts/ControlRegistration";
import { WitFormModeUtility } from "WorkItemTracking/Scripts/Utils/WitControlMode";
import { autobind, css } from "OfficeFabric/Utilities";
import { IWorkItemControlWrapperProps, WorkItemControlAdapterComponent, ControlWrapperComponent } from "WorkItemTracking/Scripts/Form/React/Components/WorkItemControlAdapterComponent";
import { IOpenFullScreen } from "WorkItemTracking/Scripts/Form/Mobile/Interfaces";
import { FieldErrorTextComponent } from "WorkItemTracking/Scripts/Form/React/Components/FieldErrorTextComponent";

enum PreviewMode {
    NoPreview = 0,
    ReactPreview = 1,
    LegacyPreview = 2
}

enum ViewState {
    NotInitialized = 0,
    Preview = 1,
    Control = 2
}

export interface IPreviewableWorkItemControlWrapperProps extends IWorkItemControlWrapperProps {
    openFullscreen: IOpenFullScreen;
}

/** Mobile work item control wrapper, supporting previews */
export class MobileWorkItemControlAdapterComponent extends WorkItemControlAdapterComponent<IPreviewableWorkItemControlWrapperProps> {
    /** Preview control registration for field */
    private _previewComponent: IWorkItemControlPreview;

    private _previewMode: PreviewMode = PreviewMode.NoPreview;
    private _viewState: ViewState = ViewState.NotInitialized;

    public render(): JSX.Element {
        const isReadOnly = this._isReadOnly();
        const isHidden = this._isHidden();
        const isValid = this._isValid();

        const workItemControlClasses = css("workitemcontrol", "work-item-control");

        let controlContent: JSX.Element;
        if (!isHidden) {
            if (this._canPreview(PreviewMode.ReactPreview)) {
                const control = this._previewComponent.getPreview(
                    this._formContext.workItemType,
                    this._formContext.workItem,
                    this.props.control.controlOptions) as JSX.Element;
                Diag.Debug.assert(
                    !control || React.isValidElement(control),
                    "Work item control preview is registered as supporting React but did not return a valid element");

                const id = this.props.control.controlOptions.controlId + "_txt";

                let ariaLabel = this.props.control.controlOptions.ariaLabel;
                if (!ariaLabel && this.props.control.hideLabel) {
                    // No label exists to have a 'for' tag on, so we must set the aria label to something valid, like the field name.
                    ariaLabel = this._getFieldName();
                }

                // important: make sure we specify the id so the label can point to this button,
                // consume ariaLabel (if it exists, which will override the label),
                // and also make sure the content is read via aria- describedby
                controlContent = <button
                    className={workItemControlClasses}
                    onClick={this._onClick}
                    disabled={isReadOnly}
                    id={id}
                    aria-label={ariaLabel}
                    aria-describedby={id}>
                    {control}
                </button>;
            }

            if (this._previewMode === PreviewMode.NoPreview) {
                const control = this._renderReactControl();
                Diag.Debug.assert(
                    !control || React.isValidElement(control),
                    "Work item control is registered as supporting React but did not return a valid element");

                controlContent = <div className={workItemControlClasses} ref={this._resolveControlElement}>
                    {control}
                </div>;
            }
        }

        return <ControlWrapperComponent isValid={isValid} isReadonly={isReadOnly} isHidden={isHidden}>
            <div className="work-item-labelbtn-wrapper">
                <div className="work-item-labelbtn-left">
                    <div className="left-container-elements">
                        {this._renderLabel()}
                    </div>
                    <div className="left-container-elements">
                        {controlContent}
                    </div>

                    {!isValid && (<div className="left-container-elements">
                        <FieldErrorTextComponent errorText={this._getField().getErrorText()} />
                    </div>)}
                </div>
                {isReadOnly && this._renderReadonlyIndicator()}
            </div>
        </ControlWrapperComponent >;
    }

    private _renderReadonlyIndicator() {
        const fieldName = this._getFieldName();
        return <div className="readonly-indicator">
            <span
                role="text" // Force this element to be read, otherwise iOS doesn't read the aria-label
                aria-label={Utils_String.format(WorkItemTrackingResources.ReadOnlyFieldIconLabel, fieldName)}
                className="icon bowtie-icon bowtie-security-lock" />
        </div>;
    }

    /** @override */
    protected _createWrappedControl() {
        if (!this._controlType) {
            beginGetWorkItemControl({
                controlName: this.props.control.controlType,
                controlOptions: this.props.control.controlOptions,
                workItemType: this._formContext.workItemType
            }, result => {
                this._controlType = result.controlType;
                this._controlRenderType = result.renderType;

                this._createLabelControl({
                    suppressTooltip: WitFormModeUtility.isMobileForm // suppress Tooltip on mobile form, or it can unexpectedly pop-up on scroll
                });

                // Check for a registered preview control
                if (result.previewConfiguration) {

                    if (result.previewConfiguration.renderType === RenderType.React) {
                        this._previewMode = PreviewMode.ReactPreview;
                    }
                    else {
                        this._previewMode = PreviewMode.LegacyPreview;
                    }

                    beginGetPreviewComponent(result.previewConfiguration).then(preview => {
                        this._previewComponent = preview as IWorkItemControlPreview;

                        // Even though we have a preview, it cannot always be shown. Determine current view state,
                        // and set it.
                        const determinedViewState = this._determineViewState();
                        this._setViewState(determinedViewState);
                    }, VSS.handleError);
                } else {
                    // No preview available
                    this._setViewState(ViewState.Control);
                }
            });
        }
    }

    /** Returns a value indicating whether this control can show a preview in the current state (work item type/work item) */
    private _canPreview(desiredMode?: PreviewMode): boolean {
        return this._formContext && this._formContext.workItemType
            && this._previewComponent && (typeof desiredMode === "undefined" || this._previewMode === desiredMode)
            && this._previewComponent.canPreview(this._formContext.workItemType, this.props.control.controlOptions.fieldName, this._formContext.workItem);
    }

    protected _bind(workItem: WITOM.WorkItem, isDisabledView?: boolean) {
        super._bind(workItem, isDisabledView);

        if (this._viewState === ViewState.Preview) {
            this._updatePreview();
        }
    }

    private _determineViewState(): ViewState {
        if (!this._controlType) {
            return ViewState.NotInitialized;
        }

        if (this._canPreview()) {
            return ViewState.Preview;
        }

        return ViewState.Control;
    }

    private _setViewState(desiredViewState: ViewState) {
        switch (desiredViewState) {
            case ViewState.Preview:
                if (this._viewState === ViewState.Control) {
                    // Switching from real control to preview mode, clean up the original control. We have to use a delay, to allow one
                    // final update to the control. It might be in the same event handling cycle as this control.
                    Utils_Core.delay(null, 0, () => {
                        if (this._control) {
                            this._control.unbind();
                            this._control.dispose();
                            this._control = null;
                        }

                        this._viewState = ViewState.Preview;
                        this._updatePreview();
                        this._tryBind();
                    });

                    return;
                } else {
                    this._viewState = ViewState.Preview;
                    this._updatePreview();
                }
                break;

            case ViewState.Control:
                if (this._viewState === ViewState.Preview && this._previewMode === PreviewMode.LegacyPreview) {
                    // Clear out the existing preview
                    $(this._controlElement).empty();
                }

                Diag.Debug.assert(!!this._controlType);
                this._createControl();
                this._viewState = ViewState.Control;
                break;
        }

        this._tryBind();
    }

    private _updatePreview() {
        if (this._viewState !== ViewState.Preview) {
            return;
        }

        if (this._canPreview(PreviewMode.LegacyPreview)) {
            let $controlElement = $(this._controlElement).empty();

            if (!this._isHidden()) {
                $controlElement.append(this._previewComponent.getPreview(
                    this._formContext.workItemType,
                    this._formContext.workItem,
                    this.props.control.controlOptions) as JQuery);
            }
        }

        this.forceUpdate();
    }

    protected _workItemFieldChanged(field: WITOM.Field) {
        super._workItemFieldChanged(field);

        const desiredViewState = this._determineViewState();

        if (this._viewState !== desiredViewState) {
            // Change view state. For example, because allowed values changed
            this._setViewState(desiredViewState);
        } else if (this._viewState === ViewState.Preview) {
            // No view state change, and in preview mode, just update the preview
            this._updatePreview();
        } else {
            // Just force re-render since validation state might have changed. In the future,
            // we could cache and only re-render when it has actually changed, for now and simplicity
            // just re-render.
            this.forceUpdate();
        }
    }

    @autobind
    private _onClick(event: React.MouseEvent<HTMLElement>) {
        // Only react to onClick if we are in preview mode
        if (this._viewState !== ViewState.Preview) {
            return;
        }

        event.preventDefault();

        if (this._isReadOnly()) {
            // don't open full screen for read-only controls
            return;
        }

        const title = this.props.control.controlOptions.label || this._getFieldName();
        const ariaLabel = this.props.control.controlOptions.ariaLabel || title;

        let control: WorkItemControl;
        this.props.openFullscreen(
            title,
            (closeFullscreen: () => void, $container: JQuery): JSX.Element => {
                if (this._controlRenderType === RenderType.React) {
                    // Control supports React
                    return this._renderReactControl({
                        onValueSelected: closeFullscreen,
                        controlOptions: {
                            ariaLabel: ariaLabel
                        }
                    });
                } else {
                    // Control uses the JQuery model
                    let $controlWrapper = $("<div>").addClass("workitemcontrol work-item-control").appendTo($container);

                    // Populate real control in specified container with the 'fullScreen' property set to true
                    control = new this._controlType($controlWrapper, $.extend({
                        fullScreen: true,
                        ariaLabel: ariaLabel
                    }, this.props.control.controlOptions), this._formContext.workItemType, []) as WorkItemControl;
                    Diag.Debug.assert(control instanceof WorkItemControl);

                    if (this._formContext.workItem) {
                        control.bind(this._formContext.workItem);
                    }
                }

                return null;
            },
            () => {
                if (control) {
                    // unbind the control on close.
                    control.unbind();
                    control.dispose();
                }
            });
    }
}
