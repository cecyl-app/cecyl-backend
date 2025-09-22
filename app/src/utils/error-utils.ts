export type ErrorInstanceToCodeMap = Map<new (...args) => Error, number>

export class ErrorUtils {
    /**
     * 
     * @param errorMap 
     * @returns 
     */
    static getRouteErrorCode(error: Error, errorMap: ErrorInstanceToCodeMap): {
        canBeHandled: true,
        statusCode: number
    } | {
        canBeHandled: false
    } {
        for (const [errType, code] of errorMap.entries()) {
            if (error instanceof errType)
                return {
                    canBeHandled: true,
                    statusCode: code
                }
        }

        return {
            canBeHandled: false
        }
    }
}