import { singleFlight } from "@/utils/singleFlight";
import { authApi } from "./api/authApi";
import { expenseApi } from "./api/expenseApi";

export default {
    wakeUpServices: () => {
        expenseApi.isAvailable();
        authApi.isAvailable();
    },

    isExpenseServiceAvailable: singleFlight(() => expenseApi.isAvailable()),

    isAuthServiceAvailable: singleFlight(() => authApi.isAvailable()),
}