import * as StringUtils from "VSS/Utils/String";

export class Boolean {

    public static fromString(value: string): boolean {
        return value ? StringUtils.equals(value.trim(), this.trueString, true) : false;
    }

    public static toString(value: boolean): string {
        return value ? this.trueString : this.falseString;
    }

    public static isTrue(value: string): boolean {
        return this.fromString(value) === true;
    }

    public static isFalse(value: string, compareString?: boolean): boolean {
        if (compareString) {
            //check if the value in the string is "false" (ignoring case)
            return value ? StringUtils.equals(value.trim(), this.falseString, true) : false;            
        }

        // Treat any value other than "true" as boolean false.
        return !this.isTrue(value);
    }

    public static get trueString() {
        return "true";
    }

    public static get falseString(): string {
        return "false";
    }
}