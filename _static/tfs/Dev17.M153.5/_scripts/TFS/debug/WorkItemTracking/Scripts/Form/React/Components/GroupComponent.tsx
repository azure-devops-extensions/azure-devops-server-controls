import "VSS/LoaderPlugins/Css!WorkItemTracking/Form/React/Components/GroupComponent";

import * as React from "react";

import { ILayoutControl, GroupOrientation } from "WorkItemTracking/Scripts/Form/Layout";
import { CollapsiblePanel } from "WorkItemTracking/Scripts/Form/React/Components/CollapsiblePanel";
import { isGroupValid } from "WorkItemTracking/Scripts/Form/Validation";
import { isContribution } from "WorkItemTracking/Scripts/Form/Contributions";
import { GroupComponentBase, IGroupComponentBaseProps, IGroupComponentBaseState } from "WorkItemTracking/Scripts/Form/React/Components/GroupComponentBase";
import { css } from "OfficeFabric/Utilities";

export interface IGroupComponentProps extends IGroupComponentBaseProps {
    /** Callback to render controls within group. Must set key */
    renderControl: (pageId: string, control: ILayoutControl) => JSX.Element;
}

export interface IGroupComponentState extends IGroupComponentBaseState {
    isValid?: boolean;
}

// has to match transition duration in GroupComponent.scss
const animationTimeInMs = 300;

export class GroupComponent extends GroupComponentBase<IGroupComponentProps, IGroupComponentState> {
    constructor(props, context) {
        super(props, context);

        // Need to listen to work item changes to update validation state
        super._subscribeToWorkItemChanges();
    }

    protected _getInitialState(): IGroupComponentState {
        return {
            ...super._getInitialState(),
            isValid: true
        };
    }

    public render(): JSX.Element {
        if (this.props.group.hideHeader) {
            return this._renderComponentWithNoHeader();
        }

        const { isExpanded } = this.state;

        return <CollapsiblePanel
            animate={true}
            animateAppear={true}
            animationDurationInMs={animationTimeInMs}
            animateClassName="group"
            headerLabel={this.props.group.label}
            headerClassName={css("wit-form-group-header", {
                "invalid": !this.state.isValid
            })}
            renderContent={this._renderContent}
            isCollapsible={this.props.group.isCollapsible}
            initialIsExpanded={isExpanded}
            onToggle={this._onToggle}
            alwaysRenderContents={this._containsContributions()}
            className={css("work-item-form-group", this.props.group.className)} />;
    }

    protected _bind() {
        this._updateGroupValidity();
    }

    /** @override */
    protected _workItemChanged() {
        this._updateGroupValidity();
    }

    private _updateGroupValidity() {
        const isValid = !this._formContext || !this._formContext.workItem || isGroupValid(this.props.group, this._formContext.workItem);

        if (isValid !== this.state.isValid) {
            this.setState({
                isValid
            });
        }
    }

    private _containsContributions(): boolean {
        if (!this.props.group.controls) {
            return false;
        }

        // Find out if any of the nested controls are contributions
        const groupContainsContributions = this.props.group.controls.some((control: ILayoutControl) => {
            return isContribution(control);
        });

        return groupContainsContributions;
    }

    private _renderComponentWithNoHeader(): JSX.Element {
        return <div className={css("grid-group-container", this.props.group.className)}>
            <div className={css("grid-group", {
                "horizontal": this.props.group.orientation === GroupOrientation.Horizontal,
            })}>
                <div className="tfs-collapsible-content">
                    {this._renderContent()}
                </div>
            </div>
        </div>;
    }

    private _renderContent = (): JSX.Element => {
        return <div className="group-controls">
            {
                this.props.group.controls
                    .filter(control => control.visible)
                    .map(control => this.props.renderControl(this.props.pageId, control))
            }
        </div>;
    }
}