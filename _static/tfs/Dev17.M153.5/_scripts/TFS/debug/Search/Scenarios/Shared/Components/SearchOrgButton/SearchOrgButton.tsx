import * as React from "react";
import { ActionButton } from "OfficeFabric/Button";
import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { Icon } from "OfficeFabric/Icon";
import { ISearchOrgButtonProps } from "Search/Scenarios/Shared/Components/SearchOrgButton/SearchOrgButton.Props";

import "VSS/LoaderPlugins/Css!Search/Scenarios/Shared/Components/SearchOrgButton/SearchOrgButton";

export function getSearchOrgMenuItem(itemKey: string, props: ISearchOrgButtonProps): IContextualMenuItem {
    return {
        name: itemKey,
        key: itemKey,
        onRender: (item: IContextualMenuItem) => {
            return <SearchOrgButton {...props} />;
        }
    };
}

export const SearchOrgButton: React.StatelessComponent<ISearchOrgButtonProps> = (props: ISearchOrgButtonProps) => {
    const leftIconElement: JSX.Element = <span className="leftIcon"><Icon iconName={props.iconName}/> </span>;

    return (

        <div className="search-orgbutton--container">
            <ActionButton
                className="org-button"
                ariaLabel={props.buttonText}
                onClick={() => { props.onInvoked(props.searchText); }}>
                {leftIconElement}
                {props.buttonText}
            </ActionButton>
        </div>
    );
}
