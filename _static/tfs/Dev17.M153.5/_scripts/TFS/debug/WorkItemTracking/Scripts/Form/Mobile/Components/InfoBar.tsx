import * as React from "react";

import Controls = require("VSS/Controls");
import { WorkItemBindableComponent } from "WorkItemTracking/Scripts/Form/React/Components/WorkItemBindableComponent";
import StatusIndicator = require("VSS/Controls/StatusIndicator");
import { WorkItemChangeType } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import { isWorkItemInvalidDueToInvisibleField } from "WorkItemTracking/Scripts/Form/Validation";
import { LayoutInformation } from "WorkItemTracking/Scripts/Form/Layout";
import { WorkItemTypeIcon, IWorkItemTypeIconProps } from "Presentation/Scripts/TFS/Components/WorkItemTypeIcon";
import { IWorkItemChangedArgs } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";

export interface IInfoBarPops {
    layout: LayoutInformation;
}

export class InfoBar extends WorkItemBindableComponent<IInfoBarPops, {}> {
    protected _infoTextWrapperElement: HTMLElement;
    protected _resolveInfoTextWrapperElement = (element: HTMLElement) => this._infoTextWrapperElement = element;

    private _statusIndicator: StatusIndicator.StatusIndicator;

    constructor(props: IInfoBarPops, context?: any) {
        super(props, context, {
            eventThrottlingInMs: 200
        });

        this._subscribeToWorkItemChanges();
    }

    protected _workItemChanged(change?: IWorkItemChangedArgs) {
        this.forceUpdate();

        if (change) {
            if (change === WorkItemChangeType.Saving) {
                this._statusIndicator.start();
            }
            else if (change === WorkItemChangeType.SaveCompleted) {
                this._statusIndicator.complete();
            }
        }
    }

    public componentDidMount() {
        let $wrapper = $(this._infoTextWrapperElement);
        this._statusIndicator = Controls.BaseControl.createIn(StatusIndicator.StatusIndicator, $wrapper) as StatusIndicator.StatusIndicator;
    }

    public componentWillUnmount() {
        super.componentWillUnmount();

        if (this._statusIndicator) {
            this._statusIndicator.dispose();
            this._statusIndicator = null;
        }
    }

    public render(): JSX.Element {
        let infoText = this._getInfoText();
        let infobarClasses = "workitem-info-bar workitem-header-bar mobile-info-bar " + (infoText ? "invalid" : "");

        return <div className={infobarClasses}>
            <div className="info-text-wrapper" ref={this._resolveInfoTextWrapperElement}>
                {this._renderWorkItemTypeIcon()}
                <h1 className="caption">{this._getCaption()}</h1>
                {
                    infoText && <span className="info-text" role="alert" >{infoText}</span>
                }
            </div>
        </div>;
    }

    private _renderWorkItemTypeIcon() {
        const props: IWorkItemTypeIconProps = {
            workItemTypeName: this._formContext.workItemType.name,
            projectName: this._formContext.workItemType.project.name,
            iconAccessibilityOptions: {
                suppressTooltip: true
            }
        };

        return <WorkItemTypeIcon {...props} />;
    }

    private _getCaption(): string {
        let workItem = this._formContext.workItem;

        if (workItem) {
            return workItem.getCaption(true, true);
        }

        return "";
    }

    private _getInfoText(): string {
        const workItem = this._formContext.workItem;

        if (workItem) {
            const invalidFields = workItem.getInvalidFields(true);
            if (invalidFields && invalidFields.length) {
                const { layout } = this.props;
                if (!isWorkItemInvalidDueToInvisibleField(layout.layout, workItem)) {
                    // All field errors are displayed inline, do not show any error in header
                    return null;
                }
            }

            const infoText = workItem.getInfoText();
            if (infoText.invalid) {
                return infoText.text;
            }
        }

        return null;
    }
}
