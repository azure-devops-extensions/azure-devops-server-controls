import * as React from 'react';
import * as ReactDOM from "react-dom";

import { Component, Props, State } from "VSS/Flux/Component";
import { Store } from "VSS/Flux/Store";
import { Action } from "VSS/Flux/Action";
import { IVssIconProps, VssIcon, VssIconType } from "VSSUI/VssIcon";

import { DetailsList, SelectionMode, IColumn } from "OfficeFabric/DetailsList";
import { Link } from "OfficeFabric/Link";
import Resources = require("Dashboards/Scripts/Resources/TFS.Resources.Dashboards");

export interface QueryLink {
    url: string;
    /**
     * Name of Query
     */
    queryName: string;
    /**
     * Description of the linked query 
     */
    description: string;
}

export interface QueryLinksComponentProps extends Props {
    values: QueryLink[];
}

/**
 * (Not for use in production yet.)
 * Provides a view of links to Queries, for use with Report-Visuals and Analytics Widgets.
 */
export class QueryLinksComponent extends React.Component<QueryLinksComponentProps, State> {
    public render() {
        return <DetailsList
            items={this.props.values}
            columns={this.getColumns()}
            selectionMode={SelectionMode.none}
        />
    }

    private getColumns(): IColumn[] {
        return [{
            key: "queryName",
            name: Resources.QueryLinks_QueryName,
            fieldName: "queryName",
            minWidth: 100,
            maxWidth: 100,
            onRender: (item: any) => {
                return <Link href={item.url}>{item.entity}</Link>;
            }
        },
        {
            key: "description",
            name:Resources.QueryLinks_Description,
            fieldName: "description",
            minWidth: 300,
            isMultiline: true
        }];
    }
}
