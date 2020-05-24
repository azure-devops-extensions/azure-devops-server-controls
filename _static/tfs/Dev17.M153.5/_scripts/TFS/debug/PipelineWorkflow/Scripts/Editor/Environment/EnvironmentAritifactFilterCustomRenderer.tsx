import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { Collapsible, ICollapsibleProps, ICollapsibleState } from "DistributedTaskControls/SharedControls/Collapsible/Collapsible";

import { CommandButton } from "OfficeFabric/Button";
import { css } from "OfficeFabric/Utilities";
import { KeyCode } from "VSS/Utils/UI";
import * as Utils from "OfficeFabric/Utilities";
import * as Utils_String from "VSS/Utils/String";

import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import * as DtcResources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Editor/Environment/EnvironmentAritifactFilterCustomRenderer";

export interface ICollapsibleCustomRendererProps extends ICollapsibleProps {
    numberOfFilters?: number;
    accordionIndex?: number;
    updateExpandedAccordionIndex?: (index: number) => void;
    isExpanded?: boolean;
    showError?: boolean;
    deleteButtonOnClick?: () => void;
}

export class EnvironmentAritifactFilterCustomRenderer extends Base.Component<ICollapsibleCustomRendererProps, ICollapsibleState> {

    public componentWillReceiveProps(props: ICollapsibleCustomRendererProps): void {
        if (this._collapsibleElement) {
            this._collapsibleElement.showContent(!!props.isExpanded);
        }
    }

    public render(): JSX.Element {
        return (<div className="env-artifact-filter-collapsible-container">
            <Collapsible {...this.props}
                ref={this._resolveRef("_collapsibleElement")}
                expanded={this.props.expanded}
                label={this.props.label}
                headingLevel={2}
                addSeparator={false}
                cssClass={this._getCssClass()}
                onRenderHeader={this._getHeader} />
        </div>);
    }

    private _getHeader = (props: ICollapsibleProps, defaultRender?: (props?: ICollapsibleProps) => JSX.Element | null): JSX.Element => {
        let showFilterCount: boolean = false;
        let numberOfFiltersString: string = "";
        let isExpanded: boolean = this.isCollapsibleExpanded();
        const chevronIconClass: string = Utils_String.format("chevron bowtie-icon bowtie-chevron-{0}-light", isExpanded ? "up" : "down");
        const ariaLabel: string = isExpanded ? DtcResources.ExpandText : DtcResources.CollapseText;

        if (this.props.numberOfFilters > 0 && !isExpanded) {
            showFilterCount = true;
            numberOfFiltersString = Utils.format("({0})", this.props.numberOfFilters);
        }

        let bowtieHeaderIconClass: string;

        if (this.props.showError) {
            bowtieHeaderIconClass = Utils.format("env-artifact-filter-section-icon-error bowtie-icon bowtie-status-error-outline");
        } else {
            if (!props.bowtieIconName) {
                bowtieHeaderIconClass = Utils_String.empty;
            } else {
                bowtieHeaderIconClass = Utils.format("env-artifact-filter-section-icon bowtie-icon {0}", props.bowtieIconName);
            }
        }

        return (
            <div className="env-artifact-filter-header">
                <div
                    className="env-artifact-filter-header-description"
                    tabIndex={0}
                    role="button"
                    onClick={this._toggle}
                    onKeyDown={this._handleKeyPress}>

                    <div className={bowtieHeaderIconClass} />

                    <div className="env-artifact-filter-section-name">
                        {props.label}
                    </div>

                    {showFilterCount &&
                        <div className="env-artifact-filter-section-filter-count">
                            {numberOfFiltersString}
                        </div>}

                    <div className={chevronIconClass} aria-label={ariaLabel} />
                </div>

                <div className="environment-artifact-filter-delete-button">
                    <CommandButton
                        ariaLabel={Resources.DeleteBranchFilterForArtifactFilter}
                        className={css("fabric-style-overrides", "delete-button", "bowtie-icon", "bowtie-trash", "filter-row-button")}
                        onClick={() => this.props.deleteButtonOnClick()}
                        onKeyDown={(event) => {
                            if (event.keyCode === KeyCode.SPACE || event.keyCode === KeyCode.ENTER) {
                                this.props.deleteButtonOnClick();
                                event.preventDefault();
                                event.stopPropagation();
                            }
                        }}
                    />
                </div>
            </div>
        );
    }

    private _toggle = (): void => {
        const toggledState: boolean = !this.isCollapsibleExpanded();
        let state = { expanded: toggledState };
        if (!!this.props.updateExpandedAccordionIndex && toggledState) {
            this.props.updateExpandedAccordionIndex(this.props.accordionIndex);
        } else {
            this.props.updateExpandedAccordionIndex(-1);
        }

        this.setState(state);
    }

    private _handleKeyPress = (event: React.KeyboardEvent<HTMLDivElement>): void => {
        if (event.keyCode === KeyCode.SPACE || event.keyCode === KeyCode.ENTER) {
            this._toggle();
            event.preventDefault();
            event.stopPropagation();
        }
    }

    private _getCssClass = (): string => {
        let cssClass = !!this.props && !!this.props.cssClass ? this.props.cssClass : Utils_String.empty;
        cssClass = this.isCollapsibleExpanded() ? cssClass + " env-artifact-filter-highlight" : cssClass;
        return cssClass;
    }

    private isCollapsibleExpanded = (): boolean => {
        // when collapsible is loaded for first time then state.expanded will be undefined 
        // so we will pick the value from props.initiallyExpanded
        return this._collapsibleElement && !!this.state.expanded ? this._collapsibleElement.isExpanded() && this.state.expanded : !!this.props.initiallyExpanded;
    }

    private _collapsibleElement: Collapsible;
}
