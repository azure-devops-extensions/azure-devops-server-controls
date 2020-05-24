import React = require("react");
import ReactDOM = require("react-dom");

import Diag = require("VSS/Diag");
import * as FormLayout from "WorkItemTracking/Scripts/Form/Layout";

import { PageLayoutGridBase, SingleColumnLayoutGrid } from "WorkItemTracking/Scripts/Form/React/Components/PageGridLayouts";
import { ContributionComponent } from "WorkItemTracking/Scripts/Form/React/Components/ContributionComponent";

export interface IPageProps {
    layout: FormLayout.LayoutInformation;
    page: FormLayout.ILayoutPage;

    renderControl: (pageId: string, control: FormLayout.ILayoutControl) => JSX.Element;
}

export class PageComponent extends React.Component<IPageProps, {}> {
    public render(): JSX.Element {

        const GridType = this._getGrid();
        return <GridType { ...this.props } />;
    }

    private _getGrid(): typeof PageLayoutGridBase {
        const numberOfSectionsWithContent = this.props.layout.numberOfSectionsWithContent(this.props.page);

        if (numberOfSectionsWithContent === 1) {
            return SingleColumnLayoutGrid;
        }

        Diag.Debug.fail("No matching grid layout found");

        // Default to one column layout
        return SingleColumnLayoutGrid;
    }
}