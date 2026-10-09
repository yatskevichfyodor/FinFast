import { singleFlight } from "@/utils/singleFlight";
import { authApi } from "./api/authApi";
import { expenseApi } from "./api/expenseApi";
import axios from "axios";

export default {
    wakeUpServices: () => {
        try {
            expenseApi.isAvailable();
            authApi.isAvailable();
        } catch (error) {
            if (axios.isAxiosError(error)) {
                return;
            }
        }
    },

    isExpenseServiceAvailable: singleFlight(expenseApi.isAvailable),

    isAuthServiceAvailable: singleFlight(authApi.isAvailable),
}