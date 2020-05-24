import * as React from 'react';
import { FilterBarItem, IFilterBarItemState, IFilterBarItem, IFilterBarItemProps } from 'VSSUI/FilterBarItem';
import { TimeRangePicker, TimeRangePickerProps } from "Utilization/Scripts/Components/TimeRangePicker";

export interface ITimeRangePickerFilterBarItemProps extends TimeRangePickerProps, IFilterBarItemProps {
    componentRef?: (component: TimeRangePicker & IFilterBarItem) => void;
}

export interface ITimeRangePickerFilterBarItemState extends IFilterBarItemState<string> {
}

export class TimeRangePickerFilterBarItem extends FilterBarItem<string, ITimeRangePickerFilterBarItemProps, ITimeRangePickerFilterBarItemState> {

    public focus() {
    }

    public render(): JSX.Element {

        var timeRangeSplits = this.state.value.split(";", 2);
       
        return <TimeRangePicker
                    initialValue={timeRangeSplits[0]}
                    initialTimeBin={timeRangeSplits[1]}
                    onAccept={(value: string, timeBin: string) => {
                        this.setFilterValue({ value: value + ";" + timeBin });
                    }}
                />;
    }
}
