import { IFormFieldState, IValidationResult } from "Agile/Scripts/Common/ValidationContracts";
import * as CapacityPivotResources from "Agile/Scripts/Resources/TFS.Resources.SprintsHub.CapacityPivot";
import { IDaysOff } from "Agile/Scripts/SprintsHub/Capacity/CapacityContracts";
import * as Utils_String from "VSS/Utils/String";

export namespace DaysOffValidators {
    export function getDaysOffValidationResult(
        iterationStartDate: Date,
        iterationEndDate: Date,
        start?: Date,
        end?: Date): IValidationResult {

        // Check for null/empty, and whether start < end
        if (!start) {
            return {
                isValid: false,
                errorMessage: CapacityPivotResources.Dialog_StartDateRequired
            };
        } else if (!end) {
            return {
                isValid: false,
                errorMessage: CapacityPivotResources.Dialog_EndDateRequired
            };
        } else if (start > end) {
            return {
                isValid: false,
                errorMessage: CapacityPivotResources.Dialog_EndLaterThanStart
            };
        }

        // Validate date range is within the iteration
        if (iterationStartDate && start < iterationStartDate) {
            return {
                isValid: false,
                errorMessage: CapacityPivotResources.Dialog_StartWithinIteration
            };
        } else if (iterationEndDate && end > iterationEndDate) {
            return {
                isValid: false,
                errorMessage: CapacityPivotResources.Dialog_EndWithinIteration
            };
        }

        // This is a valid date range, calculate net days off
        return {
            isValid: true
        };

    }

    export function runDateRangeOverlapValidation(daysOff: IFormFieldState<IDaysOff>[]): IFormFieldState<IDaysOff>[] {
        const sortedDaysOff = daysOff.map((d, i) => ({ ...d, index: i })).slice();
        sortedDaysOff.sort(dialogDaysOffStartComparer);
        let endDate: Date;

        // For each days off, if the start date is within another date range, that one is invalid
        sortedDaysOff.reduce((accumulator, current) => {
            // Update the unsorted validation fields
            if (current.value.start && current.value.start <= endDate) {
                current.validationResult.isValid = false;
                current.validationResult.errorMessage = CapacityPivotResources.Dialog_DateRangeOverlap;
            } else if (Utils_String.equals(current.validationResult.errorMessage, CapacityPivotResources.Dialog_DateRangeOverlap)) {
                // Only reset overlap error messages
                current.validationResult.isValid = true;
                current.validationResult.errorMessage = null;
            }

            // Set the current to have the maximum end date to mark multiple overlaps
            if (!endDate || current.value.end > endDate) {
                endDate = current.value.end;
            }
            return current;
        },
            {
                value: {
                    start: null,
                    end: null,
                    netDaysOff: 0
                } as IDaysOff,
                index: -1,
                validationResult: {}
            }
        );

        return daysOff;
    }

    function dialogDaysOffStartComparer(a: IFormFieldState<IDaysOff>, b: IFormFieldState<IDaysOff>): number {
        if (!a.value.start && !b.value.start) {
            return 0;
        }
        if (!a.value.start) {
            return -1;
        }
        if (!b.value.start) {
            return 1;
        }

        return (a.value.start > b.value.start) ? 1 : ((a.value.start < b.value.start) ? -1 : 0);
    }
}