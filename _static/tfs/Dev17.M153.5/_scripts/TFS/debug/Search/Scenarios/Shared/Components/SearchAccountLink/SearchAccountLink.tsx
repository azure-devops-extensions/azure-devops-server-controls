import * as React from "react";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";
import * as _ContextualMenu from "OfficeFabric/components/ContextualMenu/ContextualMenu.types";
import { ActionButton } from "OfficeFabric/Button";
import { ISearchAccountLinkProps, IconPosition } from "Search/Scenarios/Shared/Components/SearchAccountLink/SearchAccountLink.Props";
import { Link } from "OfficeFabric/Link";
import "VSS/LoaderPlugins/Css!Search/Scenarios/Shared/Components/SearchAccountLink/SearchAccountLink";

export function getSearchAccountMenuItem(itemKey: string, props: ISearchAccountLinkProps): _ContextualMenu.IContextualMenuItem {
    return {
        name: itemKey,
        key: itemKey,
        onRender: (item: _ContextualMenu.IContextualMenuItem) => {
            return <SearchAccountLink {...props} />
        }
    };
}

export const SearchAccountLink: React.StatelessComponent<ISearchAccountLinkProps> = (props: ISearchAccountLinkProps) => {
    const orLabelElement: string | null = props.iconPlacement === IconPosition.Right ? Resources.OrLabel : null;
    const leftIconElement: JSX.Element | null = props.iconPlacement === IconPosition.Left
        ? <span className={`bowtie-icon leftIcon ${props.iconClassName}`} />
        : null;
    const rightIconElement: JSX.Element | null = props.iconPlacement === IconPosition.Right
        ? <span className={`bowtie-icon rightIcon ${props.iconClassName}`} />
        : null;

    return (
        <div className="search-accountlink--container">
            {orLabelElement}
            {
                (props.itemType === "link")
                    ? <Link className="account-link" href={props.url} onClick={() => { props.onInvoked() }}>
                        {leftIconElement}
                        {Resources.SearchThisAccountHyperLinkText}
                        {rightIconElement}
                    </Link>
                    : <ActionButton
                        className="account-button"
                        ariaLabel={Resources.SearchThisAccountButtonText}
                        onClick={() => { props.onInvoked(props.url) }}>
                        {leftIconElement}
                        {Resources.SearchThisAccountButtonText}
                        {rightIconElement}
                    </ActionButton>
            }
        </div>
    )
}