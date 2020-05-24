import React = require("react");
import ReactDOM = require("react-dom");

import * as FormLayout from "WorkItemTracking/Scripts/Form/Layout";

import { GroupComponent } from "WorkItemTracking/Scripts/Form/React/Components/GroupComponent";
import { ContributedGroupComponent } from "WorkItemTracking/Scripts/Form/React/Components/ContributedGroupComponent";
import { isContribution } from "WorkItemTracking/Scripts/Form/Contributions";

export interface IPageLayoutProps {
    layout: FormLayout.LayoutInformation;
    page: FormLayout.ILayoutPage;

    /** Callback to render control, must set key */
    renderControl: (pageId: string, control: FormLayout.ILayoutControl) => JSX.Element;
}

export class PageLayoutGridBase extends React.Component<IPageLayoutProps, {}> {
    protected _renderSection(section: FormLayout.ILayoutSection, index: number, additionalAttributes?: React.HTMLAttributes<HTMLElement>): JSX.Element {
        return <div key={section.id} className={`section${index + 1} section`} {...additionalAttributes}>
            {section.groups
                .filter(group => group.calculatedVisible)
                .map(group => this._renderGroup(group))}
        </div>;
    }

    protected _renderGroup(group: FormLayout.ILayoutGroup): JSX.Element {
        if (isContribution(group)) {
            return <ContributedGroupComponent key={group.id} group={group} pageId={this.props.page.id} />
        }
        else {
            return <GroupComponent key={group.id} group={group} pageId={this.props.page.id} renderControl={this.props.renderControl} />;
        }
    }
}

/**
 * Simple one-column grid page layout. All sections are rendered in a single column
 */
export class SingleColumnLayoutGrid extends PageLayoutGridBase {
    public render(): JSX.Element {
        return <div className="form-grid">
            {this.props.page.sections
                .filter(section => section.calculatedVisible)
                .map((section, index) => this._renderSection(section, index))}
        </div>;
    }
}

/**
 * Very simple two column grid
 */
export class TwoColumnLayoutGrid extends PageLayoutGridBase {
    public render(): JSX.Element {
        return <div className="form-grid">
            {this.props.page.sections.map((section, index) => {
                return this._renderSection(section, index, {
                    className: `section${index + 1} section form-section`,
                    style: { width: "50%" }
                });
            })}
        </div>;
    }
}