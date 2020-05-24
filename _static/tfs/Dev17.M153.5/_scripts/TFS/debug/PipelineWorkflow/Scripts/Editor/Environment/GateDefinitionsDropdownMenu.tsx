// Copyright (c) Microsoft Corporation.  All rights reserved.

/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";

import { DefaultButton, IButton } from "OfficeFabric/Button";
import { DirectionalHint, IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { Image, ImageFit } from "OfficeFabric/Image";
import { css } from "OfficeFabric/Utilities";

import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import { TaskDefinition as GateDefinition } from "TFS/DistributedTask/Contracts";

import * as Utils_String from "VSS/Utils/String";
import { VssIcon, VssIconType } from "VSSUI/VssIcon";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Editor/Environment/GateDefinitionsDropdownMenu";

export interface IGateDefinitionsDropdownMenuProps extends Base.IProps {
    definitions: GateDefinition[];
    onGateAdd: (definition: GateDefinition) => void;
}

export class GateDefinitionsDropdownMenu extends Base.Component<IGateDefinitionsDropdownMenuProps, Base.IStateless> {
    public render(): JSX.Element {
        const isDisabled: boolean = !this.props.definitions || this.props.definitions.length <= 0;
        return (
            <DefaultButton
                componentRef={this._resolveRef("_addButtonReference")}
                className={css(this.props.cssClass ? this.props.cssClass : Utils_String.empty, "gate-add-menu-button")}
                disabled={isDisabled}
                iconProps={{ iconName: "Add" }}
                text={Resources.Add}
                ariaLabel={Resources.AddGateDescription}
                menuProps={{
                    ariaLabel: Resources.GateDefinitionsMenuDropdown,
                    directionalHint: DirectionalHint.bottomRightEdge,
                    items: this._getMenuItems()
                }} />
        );
    }

    public setFocus(): void {
        if (this._addButtonReference) {
            this._addButtonReference.focus();
        }
    }

    private _onMenuItemClick = (definition: GateDefinition): void => {
        if (this.props.onGateAdd) {
            this.props.onGateAdd(definition);
        }
    }

    private _getMenuItems(): IContextualMenuItem[] {
        const length: number = this.props.definitions ? this.props.definitions.length : 0;
        let items: IContextualMenuItem[] = [];

        for (let index: number = 0; index < length; index++) {
            const definition: GateDefinition = this.props.definitions[index];
            const item: IContextualMenuItem = {
                key: `gate-definition-menu-item-${index}`,
                className: "gate-definition-menu-item",
                name: definition.friendlyName,
                ariaLabel: definition.friendlyName,
                data: definition,
                onRender: this._renderMenuItem
            };

            items.push(item);
        }

        return items;
    }

    private _renderMenuItem = (item: any): JSX.Element => {
        const descriptionId: string = `gdmi-${Utils_String.generateUID()}`;
        const definition: GateDefinition = item ? item.data : {};
        const description: string = definition.description
            ? definition.description
            : definition.friendlyName ? definition.friendlyName : Utils_String.empty;

        return (
            <div role="menuitem"
                key={descriptionId}
                className={css("gate-definition-drop-down-item", "ms-ContextualMenu-link")}
                data-is-focusable="true"
                aria-label={definition.friendlyName}
                aria-describedby={descriptionId}
                onClick={() => { this._onMenuItemClick(definition); }}>
                <div id={descriptionId} className="hidden">{description}</div>
                {
                    this._getMenuItemContent(definition, description)
                }
            </div>
        );
    }

    private _getMenuItemContent(definition: GateDefinition, description: string): JSX.Element {
        const iconContent: JSX.Element = definition && definition.iconUrl
            ? <Image className="menu-item-image" src={definition.iconUrl} imageFit={ImageFit.contain} alt={Utils_String.empty} />
            : <VssIcon className="menu-item-image gdmi" iconName="toll" iconType={VssIconType.bowtie} />;

        return (
            <table>
                <thead></thead>
                <tbody>
                    <tr className="definition-row">
                        <td>{iconContent}</td>
                        <td>
                            <div className={css("gate-name-text")}>{definition.friendlyName}</div>
                            <div className={css("gate-desc")}>{description}</div>
                        </td>
                    </tr>
                </tbody>
            </table>
        );
    }

    private _addButtonReference: IButton;
}
