import * as React from "react";
import * as Container from "Search/Scenarios/Code/Components/Container";
import * as DropdownMenu from "Search/Scenarios/Shared/Components/DropdownMenu";
import * as _SharedContracts from "Search/Scripts/Generated/Search.SharedLegacy.Contracts";
import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { css } from "OfficeFabric/Utilities";
import { Link } from "OfficeFabric/Link";
import { AccountsButtonAriaLabel, AccountsButtonLabel } from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";
import "VSS/LoaderPlugins/Css!Search/Scenarios/Code/Components/CrossAccountContainer";

export const CrossAccountContainer = Container.create(
    ["accountStore"],
    ({ accountStoreState }, props) => {
        const { active, items, loadState } = accountStoreState,
            dropdownMenuItems = getContextualMenuItems(items, props.actionCreator.activateCrossAccountItem),
            dropdownMenuProps: DropdownMenu.IDropdownMenuProps = {
                active,
                className: "search-Accounts--container",
                items: dropdownMenuItems,
                loadState: accountStoreState.loadState,
                menuButtonAriaLabel: AccountsButtonAriaLabel,
                menuButtonLabel: AccountsButtonLabel,
                onDismiss: props.actionCreator.dismissCrossAccountMenu,
                onMenuButtonClick: props.actionCreator.toggleAccountMenu,
            }

        return (<DropdownMenu.DropdownMenu {...dropdownMenuProps} />)
    });

function getContextualMenuItems(filters: _SharedContracts.Filter[], onClick: (item: _SharedContracts.Filter) => void): IContextualMenuItem[] {
    return filters
        .filter((filter) => !filter.selected)
        .map((filter) => {
        return {
            key: filter.id,
            name: filter.name,
            onClick: () => { onClick(filter) },
            data: { facet: filter.resultCount },
            onRender: (item: IContextualMenuItem): React.ReactNode => {
                return (
                    <div
                        key={item.name}
                        className={css("search-Account-Item", "overflow")}
                        onClick={item.onClick}>
                        <Link className={css("account-Name")}>{item.name}</Link>
                        <span className={css("facet", "overflow")}>{item.data.facet}</span>
                    </div>
                );
            }
        } as IContextualMenuItem;
    });
}
