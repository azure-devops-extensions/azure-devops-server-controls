import * as React from "react";
import * as ReactDOM from "react-dom";
import {
    DatePicker,
    IDatePickerProps,
    IDatePickerStrings,
} from "OfficeFabric/DatePicker";
import { Fabric } from "OfficeFabric/Fabric";

import { datePickerProps } from "VSSPreview/OfficeFabric/Helpers";
import * as TfsContext from "VSS/Context";
import * as Utils_Date from "VSS/Utils/Date";

import { IFilterComponentProps } from  "Presentation/Scripts/TFS/Controls/Filters/Components/IFilterComponent";

import "VSS/LoaderPlugins/Css!fabric";

export interface DateComponentProps extends IFilterComponentProps {
    placeholder: string;
    ariaLabel: string;
}

export class DateComponent extends React.Component<DateComponentProps, {}>{

    public render(): JSX.Element {
        let defaultdateProps: IDatePickerProps = DateComponent.getDefaultDatePickerProps();
        let dateProps: IDatePickerProps = {
            strings: defaultdateProps.strings,
            firstDayOfWeek: defaultdateProps.firstDayOfWeek,
            allowTextInput: true,
            ariaLabel: this.props.ariaLabel,
            placeholder: this.props.placeholder,
            onSelectDate: (date: Date) => {
                this.fireDateUpdated(date);
            },
            formatDate: defaultdateProps.formatDate,
            parseDateFromString: defaultdateProps.parseDateFromString,
        };

        if ("filterValue" in this.props && this.props.filterValue != null) {
            dateProps.value = Utils_Date.convertClientTimeToUserTimeZone(new Date(this.props.filterValue));
        }
        return (
            <DatePicker {...dateProps} />
        );
    }

    public static getDefaultDatePickerProps(): IDatePickerProps {
        return datePickerProps("ddd MMM dd yyyy");
    }

    private fireDateUpdated(date: Date) {
        if (this.props.onUserInput) {
            let convertedDateString = date ? Utils_Date.convertUserTimeToClientTimeZone(date).toISOString() : "";
            this.props.onUserInput(this.props.filterKey, convertedDateString);
        }
    }

}
