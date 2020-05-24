import * as React from "react";
import { css } from "OfficeFabric/Utilities";
import { announce } from "VSS/Utils/Accessibility";
import { VssIcon, VssIconType } from "VSSUI/VssIcon";
import { IMentionAutocompleteFooterProps } from "Mention/Scripts/Components/MentionAutocompleteFooter.Types";
import * as Resources from "Mention/Scripts/Resources/TFS.Resources.Mention";

export const MentionAutocompleteFooter: React.StatelessComponent<IMentionAutocompleteFooterProps> =
    (props: IMentionAutocompleteFooterProps): JSX.Element => {
        const searchButton = <div
            id={props.searchButtonId}
            className={css("mention-autocomplete-component-search-button", props.hightlightSearchButton && "highlight")}
            onClick={() => {
                props.onSearchButtonClick && props.onSearchButtonClick();
                props.getInputElement && props.getInputElement().focus();
            }}
        >
            <VssIcon className="mention-autocomplete-component-search-icon" iconName="Search" iconType={VssIconType.fabric} />
            <span className="mention-autocomplete-component-search-button-text">{Resources.AutocompleteSearchButtonText}</span>
        </div>;

        const status = <div className="mention-autocomplete-component-status">
            <span className="mention-autocomplete-component-status-text">{props.statusText}</span>
        </div>;

        announce(props.statusText, true);

        return <div className="mention-autocomplete-component-footer">
            {props.showSearchButton && searchButton}
            {status}
        </div>;
    };