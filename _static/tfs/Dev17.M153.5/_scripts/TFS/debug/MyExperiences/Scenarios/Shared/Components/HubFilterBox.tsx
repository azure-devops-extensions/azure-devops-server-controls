import * as React from "react";

import * as SearchBox from "VSSPreview/Flux/Components/SearchBox";
import * as Utils_Core from "VSS/Utils/Core";

import { MyExperiencesTelemetry } from "MyExperiences/Scripts/Telemetry";
import { IHubFilterProps } from "MyExperiences/Scenarios/Shared/Models";
import { HubActions } from "MyExperiences/Scenarios/Shared/Actions";

class HubFilter {
    value: string;
}

export var HubFilterBox: React.StatelessComponent<IHubFilterProps> = (props: IHubFilterProps): JSX.Element => {
    let throttleTimeInMilliseconds: number = 250;
    let hubFilter: HubFilter = { value: "" };

    let throttledOnChange: IArgsFunctionR<any> = Utils_Core.throttledDelegate(
        this,
        throttleTimeInMilliseconds,
        (hubFilter: HubFilter) => {
            HubActions.HubFilterAction.invoke(hubFilter.value);

            var hasValue = !!hubFilter.value;
            MyExperiencesTelemetry.LogFilterChanged(hasValue);
        },
        [hubFilter]);

    let searchBoxProps: SearchBox.Props = {
        labelText: props.watermark,
        onChange: (newValue: string) => {
            hubFilter.value = newValue.trim();
            throttledOnChange();
        },
    };

    let onFocus = (): void => {
        MyExperiencesTelemetry.LogFilterClick(props.watermark);
        if ($.isFunction(props.onFocus)) {
            props.onFocus();
        }
    };

    return (<div onFocus={() => onFocus()} role="search">
        <SearchBox.SearchBox {...searchBoxProps} />
    </div>);
}