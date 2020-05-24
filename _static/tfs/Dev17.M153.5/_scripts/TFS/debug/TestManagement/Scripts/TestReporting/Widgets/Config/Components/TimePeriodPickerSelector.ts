export class TimePeriodPickerSelector {
    private propertyName: string;
    
    constructor(propertyName: string) {
        this.propertyName = propertyName;
    }

    public getSelectedTimePeriod(properties: IDictionaryStringTo<any>): number {
        return properties[this.propertyName] as number;
    }
}