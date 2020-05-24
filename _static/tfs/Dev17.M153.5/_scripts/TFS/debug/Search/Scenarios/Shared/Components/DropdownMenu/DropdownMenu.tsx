import * as React from "react";
import { IDropdownMenuProps, LoadState } from "Search/Scenarios/Shared/Components/DropdownMenu/DropdownMenu.Props";
import { DefaultButton } from "OfficeFabric/Button";
import { Callout } from "OfficeFabric/Callout";
import { getId } from "OfficeFabric/Utilities";
import { ContextualMenu } from "OfficeFabric/ContextualMenu";
import { Spinner, SpinnerSize } from "OfficeFabric/Spinner";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { LoadingMessage, LoadFailedMessage } from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";

import "VSS/LoaderPlugins/Css!Search/Scenarios/Shared/Components/DropdownMenu/DropdownMenu";

export const DropdownMenu: React.StatelessComponent<IDropdownMenuProps> = (props: IDropdownMenuProps) => {
    const {
        active,
        loadState,
        items,
        className,
        menuButtonAriaLabel,
        onMenuButtonClick,
        menuButtonLabel,
        onDismiss
    } = props,
        isLoading = loadState === LoadState.Loading,
        loaded = loadState === LoadState.Loaded,
        loadFailed = loadState === LoadState.LoadFailed;

    const rootId = getId("search-Dropdown-");
    return (
        <div className={className}
            id={rootId}>
            <DefaultButton
                className={"search-DropdownMenuButton"}
                ariaLabel={menuButtonAriaLabel}
                aria-expanded={active}
                onClick={onMenuButtonClick}
                text={menuButtonLabel}
                iconProps={{
                    iconName: "ChevronDown",
                    className: "search-DropdownMenuIcon"
                }} />
            {
                active ?
                    (loaded
                        ? <ContextualMenu
                            target={`#${rootId}`}
                            isBeakVisible={true}
                            gapSpace={5}
                            beakWidth={10}
                            shouldFocusOnMount={true}
                            directionalHint={DirectionalHint.bottomLeftEdge}
                            items={items}
                            onDismiss={onDismiss} />
                        : <Callout
                            className="search-Dropdown-Callout"
                            target={`#${rootId}`}
                            isBeakVisible={false}
                            onDismiss={onDismiss}
                            directionalHint={DirectionalHint.bottomLeftEdge}>
                            {
                                isLoading
                                    ? <Spinner label={LoadingMessage} size={SpinnerSize.small} />
                                    : loadFailed
                                        ? <span className="content-load-failed">{LoadFailedMessage}</span>
                                        : null
                            }
                        </Callout>)
                    : null
            }
        </div>);
}
