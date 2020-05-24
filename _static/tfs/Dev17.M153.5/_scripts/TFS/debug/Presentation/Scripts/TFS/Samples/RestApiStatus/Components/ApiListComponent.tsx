import * as React from "react";

import {
    CheckboxVisibility,
    ConstrainMode,
    DetailsListLayoutMode,
    IColumn,
     SelectionMode,
} from "OfficeFabric/DetailsList";
import { Icon } from "OfficeFabric/Icon";

import { IGroup, IGroupDividerProps } from "OfficeFabric/GroupedList";
import { autobind, BaseComponent, IBaseProps } from "OfficeFabric/Utilities";
import * as ApiStore from "../Store/ApiStore";
import { VssDetailsList } from "VSSUI/VssDetailsList";

export interface IApiListProps extends IBaseProps {
    apis: ApiStore.Api[];
    groups: IGroup[];
    onSetSelectedApi?: (selection: { area?: string, api?: string }) => void;
}

export class ApiListComponent extends BaseComponent<IApiListProps, {}> {
    public render(): JSX.Element {
        return (
            <VssDetailsList
                checkboxVisibility={CheckboxVisibility.hidden}
                className={"api-list"}            
                columns={this._getColumns()}
                constrainMode={ConstrainMode.unconstrained}
                groups={this.props.groups}
                groupProps={{
                    headerProps: { onGroupHeaderClick: this._onGroupHeaderClick },
                    isAllGroupsCollapsed: true,
                }}
                items={this.props.apis}
                layoutMode={DetailsListLayoutMode.justified}
                onItemInvoked={api => {}}
                onRenderItemColumn={this._onRenderItemColumn}
                selectionMode={SelectionMode.single}
            />
        );
    }

    @autobind
    private _onGroupHeaderClick(area: IGroup) {
        if (typeof this.props.onSetSelectedApi === "function") {
            this.props.onSetSelectedApi({ area: area.name });
        }
    }

    private _getColumns(): IColumn[] {
        const columns: IColumn[] = [];

        columns.push(
            {
                key: "resource",
                fieldName: "resource",
                name: "Resource",
                minWidth: 150,
                maxWidth: 200,
                className: "resource-column",
            },
            {
                key: "httpMethod",
                fieldName: null,
                name: "Operation",
                minWidth: 80,
                maxWidth: 90,
                className: "http-method-column",
            },
            {
                key: "routeTemplate",
                fieldName: null,
                name: "Route",
                minWidth: 300,
                maxWidth: 350,
                isResizable: true
            },
            {
                key: "clients",
                fieldName: null,
                name: "Clients",
                minWidth: 200,
                maxWidth: 300,
                className: "clients-column",
                isResizable: true
            },
            {
                key: "methodName",
                fieldName: "methodName",
                name: "Client method",
                minWidth: 125,
                maxWidth: 200,
                className: "client-method-name-column",
                isResizable: true
            },
            {
                key: "scopes",
                fieldName: null,
                name: "Scopes",
                minWidth: 150,
                maxWidth: 200,
                className: "scopes-column",
                isResizable: true
            }
        );

        return columns;
    }

    private _onRenderItemColumn(api: ApiStore.Api, index?: number, column?: IColumn): any {
        let cell: JSX.Element | string;

        if (column.key === "httpMethod") {
            cell = (
                <span className={"http-method http-method-" + api.httpMethod}>
                    {api.httpMethod}
                </span>
            );
        } else if (column.key === "routeTemplate") {
            cell = api.routeTemplate.replace("{area}", api.area).replace("{resource}", api.resource);
        } else if (column.key === "clients") {
            if (api.clients) {
                const displayLangs: { [id: string]: string } = {
                    CSharp: "C#",
                    DocMD: "-",
                    Nodejs: "Node",
                    ApiStatus: "-",
                    "Swagger2.0": "-",
                    TypeScript: "TS",
                    TypeScriptWebPlatform: "-"
                };

                const displayClients: string[] = [];
                api.clients.forEach(lang => {
                    const d = displayLangs[lang];
                    if (d) {
                        if (d !== "-") {
                            displayClients.push(d);
                        }
                    } else {
                        displayClients.push(lang);
                    }
                });

                cell = displayClients.join(", ");
            }
        } else if (column.key === "scopes") {
            if (api.publicScopes) {
                const scopesValue = api.publicScopes.join(", ");
                cell = scopesValue;
            } else if (
                api.privateScopes &&
                api.privateScopes.length > 0 &&
                api.privateScopes.indexOf("vso.base") >= 0
            ) {
                cell = "All";
            }
        } else if (column.key === "nonBrowsable") {
            if (api.nonBrowsable) {
                cell = <Icon iconName="Cancel" className="cancel-icon" />;
            }
        } else {
            cell = (api as any)[column.key];
        }

        if (typeof cell === "string") {
            return <span title={cell}>{cell}</span>;        
        } else {
            return cell;
        }
    }
}
