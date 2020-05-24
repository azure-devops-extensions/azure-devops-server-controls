/// <reference types="react" />

import * as React from "react";
import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!WorkCustomization/Common/Components/ProcessNavBreadCrumb";
import { Breadcrumb, IBreadcrumbItem } from "OfficeFabric/Breadcrumb";
import { Component, Props, State } from "VSS/Flux/Component";
import { BreadCrumbStore } from "WorkCustomization/Scripts/Common/Stores/BreadCrumbStore";

import Resources = require("WorkCustomization/Scripts/Resources/TFS.Resources.WorkCustomization");

export class ProcessNavBreadCrumb extends Component<Props, State>
{
    private _componentMounted: boolean;
    private _store: BreadCrumbStore;

    constructor(props: Props) {
        super(props);
        this._componentMounted = false;
    }

    render() {
        return <Breadcrumb items={this.getStore().getItems()} className="process-nav-bread-crumb" ariaLabel={Resources.ProcessNavBreadCrumb} />;
    }

    public getStore(): BreadCrumbStore {
        if (!this._store) {
            this._store = new BreadCrumbStore();
        }
        return this._store;
    }

    public getState() {
        return {};
    }

    public onChange(): void {
        if (this._componentMounted) {
            super.onChange();
        }
    }

    public componentDidMount(): void {
        this._componentMounted = true;
        super.componentDidMount();
    }

    public componentWillUnmount(): void {
        super.componentWillUnmount();
        this._store.dispose();
    }
}